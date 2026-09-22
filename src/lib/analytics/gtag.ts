/**
 * Google Analytics (gtag) — نقلت هذه الوحدة منطق السكربت المضمّن الذي كان في
 * index.html إلى حزمة التطبيق (bundle) لأسبب أمني دقيق:
 *
 * المخطط CSP المعزّز (strict-dynamic) لا يسمح بالسكربتات المضمّنة إلا عبر
 * hash ثابت، وأي سكربت مضمّن يحتوي على قيمة بيئة متغيرة (%VITE_GA_ID%)
 * سيختلف حجمه/محتواه بين البيئات فيتعذّر تثبيت hash صحيح له.
 * ضمن الحزمة نقرأ المعرّف من import.meta.env مباشرة، والسكربت الذي يحقنه
 * هذا الكود (محمّل gtag من googletagmanager.com) يرث "الثقة" من الحزمة
 * عبر trust chain الخاص بـ 'strict-dynamic' — دون أي allowlist في المتصفحات
 * الحديثة.
 *
 * السلوك مطابق تماماً للنسخة السابقة:
 *  - تعريف window.dataLayer / window.gtag (تستعين بها cookieConsent.ts).
 *  - الافتراض: analytics_storage: "denied" (Google Consent Mode v2).
 *  - التحميل الفعلي مؤجّل إلى وقت الخمول (requestIdleCallback، سقف 4 ثوانٍ)
 *    ولا يحدث إلا إن كان معرّف GA متوفراً.
 *  - تحترم موافقة الكوكي المخزنة (mizan-cookie-consent).
 */
import { CONSENT_STORAGE_KEY } from "@/lib/utils/cookieConsent"

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

  // type-cast تحوطاً: بعض المكتبات القديمة (أو بيئات غير متصفحية) قد لا توفرها
  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void
  }
  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(loadMizanAnalytics, { timeout: 4000 })
  } else {
    window.addEventListener(
      "load",
      () => setTimeout(loadMizanAnalytics, 2500),
      { once: true }
    )
  }
}
