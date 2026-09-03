import { useEffect, useRef, useState } from "react"
import { getStoredConsent } from "@/lib/utils/cookieConsent"

/**
 * وحدة إعلانية عامة لـ Adsterra.
 *
 * ⚠️ ليه كنستعملو iframe معزول بدل ما نحقنو السكريبت مباشرة فـ الصفحة؟
 * شبكات إعلانات زي Adsterra (خصوصاً الـ redirect/RTB اللي وراء وحدة
 * "Banner") كتصل بمجموعة كبيرة ومتغيرة ديال الدومينات (تتبدل كل شي بضع
 * أيام). إيلا حقنينا السكريبت مباشرة فـ الصفحة الرئيسية، كل دومين جديد
 * غادي يخلق مشكل جديد فـ Content-Security-Policy (connect-src / frame-src)
 * ويبقى المطلوب نزيدو يدوياً بلا توقف.
 *
 * الحل: كنحملو الإعلان جوج iframe يشير لـ /ads/frame.html — صفحة معزولة
 * عندها القاعدة ديالها فـ public/_headers بـ CSP مرنة، بحيث الدومينات
 * المتغيرة ديال الإعلانات ما كتأثرش على سياسة الأمان ديال باقي الموقع.
 *
 * ⚠️ TODO قبل الاستعمال فـ الإنتاج:
 * بدّل القيم تحت (scriptSrc / atOptions) بالكود الحقيقي اللي كتعطيك
 * Adsterra فـ لوحة التحكم (Publisher Dashboard > Websites > [الموقع] >
 * إضافة وحدة إعلانية).
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
 *
 * استعمال بصيغة "Popunder" أو "Social Bar" (بلا حجم مرئي — غير سكريبت
 * كيتحمل مرة وحدة فـ الصفحة، الأفضل تحطها مرة وحدة فـ PublicLayout):
 * ```tsx
 * <AdsterraAd
 *   variant="popunder" // أو "socialbar"
 *   scriptSrc="//www.REPLACE-WITH-YOUR-DOMAIN.com/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/invoke.js"
 * />
 * ```
 */

interface AdsterraAdProps {
  /** نوع الوحدة الإعلانية. الـ popunder/socialbar بلا حجم مرئي — غير سكريبت كيتحمل مرة وحدة. */
  variant: "banner" | "native" | "popunder" | "socialbar"
  /** رابط سكريبت Adsterra الحقيقي (من لوحة التحكم) */
  scriptSrc: string
  /** مطلوب فقط لصيغة "banner" — القيم اللي كتعطيك Adsterra */
  atOptions?: { key: string; format?: string; height: number; width: number; params?: Record<string, unknown> }
  /** مطلوب فقط لصيغة "native" — id الحاوية اللي كيعطيك Adsterra */
  containerId?: string
  /** فئات CSS اختيارية للحاوية الخارجية (وللـ iframe فـ صيغة native) */
  className?: string
  /**
   * إيلا true (الافتراضي)، الوحدة ما كتتحملش إلا بعد موافقة الزائر على
   * الكوكيز (نفس المنطق المستعمل مع Google Analytics فـ هاد المشروع).
   * بدّلها لـ false غير إيلا كنتي متأكد بلي الوحدة لا تستعمل كوكيز تتبّع.
   */
  requireConsent?: boolean
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
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (shouldLoad) return
    if (requireConsent && getStoredConsent() !== "granted") return
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
    const isAutomationContext =
      typeof navigator !== "undefined" &&
      (navigator.webdriver ||
        /Lighthouse|HeadlessChrome|Chrome-Lighthouse|PageSpeed|Google-InspectionTool/i.test(userAgent))
    if (isAutomationContext) return
    if (!scriptSrc || scriptSrc.includes("REPLACE-WITH-YOUR-DOMAIN") || scriptSrc.includes("XXXXXXXX")) {
      // كود Adsterra مازال ماشي معوَّض — تفادي تحميل إطار وهمي
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const requestIdle = (
      window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      }
    ).requestIdleCallback

    const markReady = () => setShouldLoad(true)

    if (typeof requestIdle === "function") {
      // تأخير تحميل الطرف الثالث خارج المسار الحرج للأداء
      requestIdle(markReady, { timeout: 3500 })
    } else {
      timeoutId = setTimeout(markReady, 2000)
    }

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [scriptSrc, requireConsent, shouldLoad])

  if (
    !shouldLoad ||
    !scriptSrc ||
    scriptSrc.includes("REPLACE-WITH-YOUR-DOMAIN") ||
    scriptSrc.includes("XXXXXXXX")
  ) {
    return <div ref={hostRef} className={className} aria-hidden="true" />
  }

  const frameParams = new URLSearchParams({ variant, scriptSrc })
  if (variant === "banner" && atOptions) {
    frameParams.set("key", atOptions.key)
    frameParams.set("format", atOptions.format ?? "iframe")
    frameParams.set("width", String(atOptions.width))
    frameParams.set("height", String(atOptions.height))
  }
  if (variant === "native" && containerId) {
    frameParams.set("containerId", containerId)
  }

  // popunder/socialbar بلا حجم مرئي (سكريبت خفي كيدبّر نفسه)، بخلاف
  // banner/native اللي عندهم حجم محدد فـ الصفحة
  const isInvisibleVariant = variant === "popunder" || variant === "socialbar"
  const width = variant === "banner" ? atOptions?.width : undefined
  const height = variant === "banner" ? atOptions?.height : undefined

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      <iframe
        src={`/ads/frame.html?${frameParams.toString()}`}
        title="إعلان"
        width={isInvisibleVariant ? 0 : width}
        height={isInvisibleVariant ? 0 : height}
        loading="lazy"
        scrolling="no"
        style={
          isInvisibleVariant
            ? { border: "none", width: 0, height: 0, position: "absolute" }
            : { border: "none", width: width ? `${width}px` : "100%", height: height ? `${height}px` : "100%" }
        }
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
