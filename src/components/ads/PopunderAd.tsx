import { useEffect, useState } from "react"
import { AdsterraAd } from "./AdsterraAd"

/**
 * وحدة "Popunder" — بلا أي حيّز مرئي فـ الصفحة (شوف isInvisibleVariant فـ
 * AdsterraAd.tsx). كتُدرج مرة واحدة فقط على مستوى PublicLayout.
 *
 * ⚠️ حماية الزائر: تحديد تكرار محلي (frequency cap) — بلا هاد الحد، سكريبت
 * الـ Popunder غادي يحاول يخدم عند كل نقرة أولى فـ كل صفحة/تحميل جديد،
 * وهاد الشيء كيبان مزعج/مشبوه للزائر. كنسمحو بمرة وحدة كل 24 ساعة لكل
 * متصفح (بواسطة localStorage)، بغضّ النظر عن أي frequency capping إضافي
 * معطى من لوحة تحكم Adsterra نفسها.
 */
const POPUNDER_CAP_KEY = "mizan-popunder-last-shown"
const POPUNDER_CAP_MS = 24 * 60 * 60 * 1000 // 24 ساعة

function isPopunderAllowedNow(): boolean {
  try {
    const last = window.localStorage.getItem(POPUNDER_CAP_KEY)
    if (!last) return true
    const lastTs = Number(last)
    if (Number.isNaN(lastTs)) return true
    return Date.now() - lastTs > POPUNDER_CAP_MS
  } catch {
    // localStorage غير متاح (وضع خاص/تصفح متشدد) — نسمحو بالتحميل بدل ما
    // نمنعو الإعلان بشكل دائم بسبب خطأ تقني
    return true
  }
}

export function PopunderAd() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (isPopunderAllowedNow()) {
      try {
        window.localStorage.setItem(POPUNDER_CAP_KEY, String(Date.now()))
      } catch {
        /* تجاهل — إيلا localStorage غير متاح، غير كنسمحو بالتحميل هاد المرة */
      }
      setAllowed(true)
    }
  }, [])

  if (!allowed) return null

  return (
    <AdsterraAd
      variant="popunder"
      scriptSrc="//pl31171139.profitableratecpmnetwork.com/12/81/c2/1281c23a986c79fb5176d6d6fe0f9886.js"
    />
  )
}
