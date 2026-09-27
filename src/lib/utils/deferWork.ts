/**
 * deferWork — جدولة العمل غير الحرج خارج نافذة القياس.
 *
 * لماذا وحدة مشتركة:
 * ──────────────────
 * كان كل عمل «بعد التحميل» يُجدول بطريقته: requestIdleCallback هنا،
 * setTimeout هناك، و«load» في موضع ثالث. والنتيجة أن ثلاثة أشياء ثقيلة
 * (تحليلات GA، عميل Supabase، بيانات الصفحة الرئيسية) كانت تتنافس على النطاق
 * الترددي والخيط الرئيسي في الثواني الأولى — وهي بالضبط النافذة التي تُقاس
 * فيها Core Web Vitals. هذه الوحدة تجمع القاعدة في مكان واحد:
 *
 *   1) لا عمل غير حرج قبل أول رسم.
 *   2) يُشغَّل العمل عند أول خمول حقيقي (requestIdleCallback) مع سقف زمني
 *      يمنع تأجيله إلى الأبد في الصفحات المزدحمة.
 *   3) أو عند أول تفاعل حقيقي من المستخدم — التفاعل دليل أقوى على أن الصفحة
 *      صارت قابلة للاستعمال من أي مؤقّت زمني.
 *
 * كل الدوال ترجع دالة إلغاء، لتنظيف المستمعين والمؤقّتات داخل useEffect بلا
 * تسريبات (وإلا نادت الدالة بعد إزالة تركيب المكوّن).
 */

type IdleCapableWindow = Window & {
  requestIdleCallback?: (cb: (deadline: { didTimeout: boolean; timeRemaining(): number }) => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

/** أحداث تُعدّ دليلاً على أن المستخدم بدأ يتفاعل فعلاً. */
const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const

/**
 * يُشغِّل العمل عند أول خمول للمتصفح، وبعد `timeout` على الأكثر.
 * في المتصفحات بلا requestIdleCallback (Safari قديم) يسقط إلى مؤقّت عادي
 * بحدٍّ أقصى 2 ثانية حتى لا يتأخر العمل كثيراً.
 */
export function scheduleWhenIdle(cb: () => void, options: { timeout?: number } = {}): () => void {
  const timeout = options.timeout ?? 4000
  const idleWindow = window as IdleCapableWindow

  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(() => cb(), { timeout })
    return () => idleWindow.cancelIdleCallback?.(handle)
  }

  const timer = window.setTimeout(cb, Math.min(timeout, 2000))
  return () => window.clearTimeout(timer)
}

/**
 * يُشغِّل العمل عند أول تفاعل (نقرة/لمسة/مفتاح/تمرير).
 * المعالجات passive وبـ once، فلا تؤثر في سلاسة التمرير ولا تُستدعى مرتين.
 */
export function onFirstInteraction(cb: () => void): () => void {
  let done = false
  const run = () => {
    if (done) return
    done = true
    cleanup()
    cb()
  }
  const cleanup = () => {
    for (const event of INTERACTION_EVENTS) window.removeEventListener(event, run)
  }
  for (const event of INTERACTION_EVENTS) {
    window.addEventListener(event, run, { passive: true })
  }
  return cleanup
}

/**
 * يُشغِّل العمل بعد اكتمال تحميل الصفحة (load) — لا قبله.
 * مفيد للعمل الذي لا معنى له قبل وصول الصورة والخطوط: تشغيله أبكر يزاحم
 * موارد أول رسم بلا مقابل.
 */
export function afterWindowLoad(cb: () => void): () => void {
  if (document.readyState === "complete") {
    const timer = window.setTimeout(cb, 0)
    return () => window.clearTimeout(timer)
  }
  const run = () => cb()
  window.addEventListener("load", run, { once: true })
  return () => window.removeEventListener("load", run)
}

/**
 * أول مؤقّت من بين جدولات متعددة يصل — والباقي يُلغى.
 * مثال: «شغّل GA عند أول تفاعل أو بعد load + 10 ثوانٍ، أيهما أسبق».
 */
export function firstOf(
  ...schedulers: ((run: () => void) => () => void)[]
): (run: () => void) => () => void {
  return (run: () => void) => {
    let done = false
    const cancels: Array<() => void> = []

    const fire = () => {
      if (done) return
      done = true
      for (const cancel of cancels) cancel()
      run()
    }

    for (const schedule of schedulers) cancels.push(schedule(fire))
    return () => {
      done = true
      for (const cancel of cancels) cancel()
    }
  }
}
