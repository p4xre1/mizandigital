/**
 * Google Analytics (gtag) — نقلت هذه الوحدة منطق السكربت المضمّن الذي كان في
 * index.html إلى حزمة التطبيق (bundle) لأسباب أمنية:
 *
 * 1) سكربت مضمّن يحمل قيمة بيئة متغيرة (%VITE_GA_ID%) يتغيّر حجمه/محتواه بين
 *    البيئات، فيتعذّر تثبيت hash صحيح له في CSP.
 * 2) داخل الحزمة نقرأ المعرّف من import.meta.env مباشرة، فلا سكربت مضمّن أصلاً.
 *
 * المحمّل الذي يحقنه هذا الكود (googletagmanager.com/gtag/js) يُسمح به عبر
 * قائمة المضيفين في script-src — لا حاجة إلى trust chain: سياسة
 * 'strict-dynamic' أُزيلت لأنها كانت تحجب حزمة التطبيق نفسها (hash لا يطابق
 * سكربتاً خارجياً بلا integrity — انظر public/_headers وSECURITY.md).
 *
 * السلوك مطابق تماماً للنسخة السابقة:
 *  - تعريف window.dataLayer / window.gtag (تستعين بها cookieConsent.ts).
 *  - الافتراض: analytics_storage: "denied" (Google Consent Mode v2).
 *  - التحميل الفعلي مؤجّل إلى وقت الخمول ولا يحدث إلا إن كان معرّف GA متوفراً.
 *  - تحترم موافقة الكوكي المخزنة (mizan-cookie-consent).
 *
 * تعديل الأداء (تقرير Lighthouse: «3rd party — Google Tag Manager 191 KiB،
 * مهمة 99ms على الخيط الرئيسي»، و«unused JavaScript ≈ 102 KiB» منه):
 * ─────────────────────────────────────────────────────────────────────────
 * كان التحميل يُجدول بـ requestIdleCallback بسقف 4 ثوانٍ من لحظة الإقلاع،
 * فوقع في نافذة قياس Core Web Vitals نفسها: 191KB تنافس الخط والحزمة على
 * النطاق الترددي على 4G بطيء، ومهمة طويلة على الخيط الرئيسي.
 * القاعدة الآن: لا يُحمَّل أي كود تحليلات قبل أن تصبح الصفحة قابلة للاستعمال:
 *   • عند أول تفاعل حقيقي (نقرة/لمسة/مفتاح/تمرير) → التحميل فوري.
 *   • أو بعد اكتمال load + خمول بسقف 10 ثوانٍ → لمن لا يتفاعل أصلاً.
 * وبهذا لا يتنافس GA مع موارد أول رسم إطلاقاً، ولا يُقايَض شيء من البيانات:
 * كل زيارة تُقاس (تفاعل أو مهلة)، والتفاعل يقدّم القياس لا يؤخّره.
 */
import { CONSENT_STORAGE_KEY } from "@/lib/utils/cookieConsent"
import { afterWindowLoad, firstOf, onFirstInteraction, scheduleWhenIdle } from "@/lib/utils/deferWork"

declare global {
  interface Window {
    __mizanAnalyticsLoaded?: boolean
  }
}

const GA_ID: string | undefined = import.meta.env.VITE_GA_ID

let bootstrapped = false

export function initAnalytics(): void {
  if (bootstrapped) return
  bootstrapped = true

  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
    }
  }
  window.gtag("consent", "default", { analytics_storage: "denied", wait_for_update: 500 })

  function loadMizanAnalytics(): void {
    if (window.__mizanAnalyticsLoaded) return
    window.__mizanAnalyticsLoaded = true
    try {
      if (window.localStorage.getItem(CONSENT_STORAGE_KEY) === "granted") {
        window.gtag?.("consent", "update", { analytics_storage: "granted" })
      }
    } catch {
      /* التخزين المحلي قد يكون محظوراً — نتجاهل ونكمل دون موافقة */
    }
    if (!GA_ID || GA_ID.indexOf("%") === 0) return
    window.gtag?.("js", new Date())
    window.gtag?.("config", GA_ID, { anonymize_ip: true, send_page_view: false })
    const s = document.createElement("script")
    s.async = true
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID)
    document.head.appendChild(s)
  }

  // جدولة مزدوجة: أول تفاعل، أو بعد load + خمول (سقف 10 ثوانٍ) — أيّهما أسبق.
  // السقف الطويل مقصود: من يقرأ الصفحة بلا تفاعل لا يحتاج كود القياس على
  // المسار الحرج، ومن يتفاعل يُقاس في الحال.
  const schedule = firstOf(onFirstInteraction, (run) => afterWindowLoad(() => scheduleWhenIdle(run, { timeout: 10000 })))
  schedule(loadMizanAnalytics)
}
