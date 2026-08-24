// utils/cookieConsent.ts
// إدارة موافقة الكوكيز (Google Consent Mode v2) — يجب أن يبقى مفتاح التخزين متطابقاً مع index.html

export const CONSENT_STORAGE_KEY = "mizan-cookie-consent"
export type ConsentValue = "granted" | "denied"

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

export function getStoredConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
  return stored === "granted" || stored === "denied" ? stored : null
}

export function setStoredConsent(value: ConsentValue) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value)

  // إعلام Google Consent Mode بالتحديث فوراً دون الحاجة لإعادة تحميل الصفحة
  // يشمل كوكيز التحليل (Analytics) وكوكيز الإعلانات (AdSense) معاً
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: value,
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
    })
  }
}
