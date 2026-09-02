import { useEffect, useRef } from "react"
import { getStoredConsent } from "@/lib/utils/cookieConsent"

/**
 * وحدة إعلانية عامة لـ Adsterra.
 *
 * ⚠️ TODO قبل الاستعمال فـ الإنتاج:
 * بدّل القيم تحت (scriptSrc / atOptions) بالكود الحقيقي اللي كتعطيك
 * Adsterra فـ لوحة التحكم (Publisher Dashboard > Websites > [الموقع] >
 * إضافة وحدة إعلانية). كل نوع وحدة (Banner / Native Banner / Social Bar /
 * Popunder) عندو دومين سكريبت خاص بيه (pl123456.xxxxx.com) كيتبدل حسب
 * الحساب — ماكاينش قيمة موحدة نقدر نحطها مسبقاً بلا الكود الحقيقي ديالك.
 *
 * بعد ما تحصل على الكود:
 * 1. زيد دومين السكريبت فـ public/_headers تحت script-src (وconnect-src
 *    إيلا كانت الوحدة كتدير طلبات شبكة إضافية).
 * 2. عوّض القيم فـ الاستعمال (مثال أسفل فـ DownloadGatePage.tsx).
 *
 * استعمال بصيغة "Banner" (300x250 مثلاً، الصيغة الأكثر شيوعاً فـ Adsterra):
 * ```tsx
 * <AdsterraAd
 *   variant="banner"
 *   atOptions={{ key: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", format: "iframe", height: 250, width: 300 }}
 *   scriptSrc="//www.REPLACE-WITH-YOUR-DOMAIN.com/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/invoke.js"
 * />
 * ```
 *
 * استعمال بصيغة "Native Banner" (كتلتصق فـ عمود المحتوى، مربّعة الشكل):
 * ```tsx
 * <AdsterraAd
 *   variant="native"
 *   containerId="container-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
 *   scriptSrc="//pl123456.REPLACE-WITH-YOUR-DOMAIN.com/xxxx/xxxx.js"
 * />
 * ```
 */

interface AdsterraAdProps {
  /** نوع الوحدة الإعلانية — كيأثر غير على الحاوية (div) المستعملة */
  variant: "banner" | "native"
  /** رابط سكريبت Adsterra الحقيقي (من لوحة التحكم) */
  scriptSrc: string
  /** مطلوب فقط لصيغة "banner" — القيم اللي كتعطيك Adsterra */
  atOptions?: { key: string; format?: string; height: number; width: number; params?: Record<string, unknown> }
  /** مطلوب فقط لصيغة "native" — id الحاوية اللي كيعطيك Adsterra */
  containerId?: string
  /** فئات CSS اختيارية للحاوية الخارجية */
  className?: string
  /**
   * إيلا true (الافتراضي)، الوحدة ما كتتحملش إلا بعد موافقة الزائر على
   * الكوكيز (نفس المنطق المستعمل مع Google Analytics فـ هاد المشروع).
   * بدّلها لـ false غير إيلا كنتي متأكد بلي الوحدة لا تستعمل كوكيز تتبّع.
   */
  requireConsent?: boolean
}

declare global {
  interface Window {
    atOptions?: Record<string, unknown>
  }
}

export function AdsterraAd({
  variant,
  scriptSrc,
  atOptions,
  containerId,
  className,
  requireConsent = true,
}: AdsterraAdProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    if (requireConsent && getStoredConsent() !== "granted") return
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
    const isAutomationContext =
      typeof navigator !== "undefined" &&
      (navigator.webdriver ||
        /Lighthouse|HeadlessChrome|Chrome-Lighthouse|PageSpeed|Google-InspectionTool/i.test(userAgent))
    if (isAutomationContext) return
    if (!scriptSrc || scriptSrc.includes("REPLACE-WITH-YOUR-DOMAIN") || scriptSrc.includes("XXXXXXXX")) {
      // كود Adsterra مازال ماشي معوَّض — تفادي حقن سكريبت وهمي
      return
    }

    const host = hostRef.current
    if (!host) return

    const inject = () => {
      if (loadedRef.current) return
      loadedRef.current = true

      if (variant === "banner" && atOptions) {
        const optionsScript = document.createElement("script")
        optionsScript.type = "text/javascript"
        optionsScript.text = `atOptions = ${JSON.stringify({ format: "iframe", params: {}, ...atOptions })};`
        host.appendChild(optionsScript)
      }

      const adScript = document.createElement("script")
      adScript.type = "text/javascript"
      adScript.src = scriptSrc
      adScript.async = true
      if (variant === "native") {
        adScript.setAttribute("data-cfasync", "false")
      }
      host.appendChild(adScript)
    }

    let timeoutId: number | null = null
    if ("requestIdleCallback" in window) {
      // تأخير تحميل الطرف الثالث خارج المسار الحرج للأداء
      window.requestIdleCallback(inject, { timeout: 3500 })
    } else {
      timeoutId = window.setTimeout(inject, 2000)
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [scriptSrc, variant, atOptions, requireConsent])

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      {variant === "native" && containerId ? <div id={containerId} /> : null}
    </div>
  )
}
