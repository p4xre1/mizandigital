import { AdsterraAd } from "./AdsterraAd"

/**
 * وحدة "Popunder" — بلا أي حيّز مرئي فـ الصفحة (شوف isInvisibleVariant فـ
 * AdsterraAd.tsx). كتُدرج مرة واحدة فقط على مستوى PublicLayout.
 *
 * ⚠️ TODO قبل الاستعمال فـ الإنتاج: بدّل scriptSrc تحت بالكود الحقيقي
 * لوحدة "Popunder" من لوحة تحكم Adsterra.
 */
export function PopunderAd() {
  return (
    <AdsterraAd
      variant="popunder"
      scriptSrc="//REPLACE-WITH-YOUR-DOMAIN.com/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/invoke.js"
    />
  )
}
