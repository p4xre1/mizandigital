import { AdsterraAd } from "./AdsterraAd"

/**
 * شريط إعلاني لاصق بأسفل الصفحة (Social Bar) — يظهر مرة واحدة على مستوى
 * التخطيط العام (PublicLayout)، وليس داخل كل صفحة على حدة.
 *
 * ⚠️ TODO قبل الاستعمال فـ الإنتاج: بدّل scriptSrc تحت بالكود الحقيقي
 * لوحدة "Social Bar" من لوحة تحكم Adsterra. طالما scriptSrc يحتوي على
 * "REPLACE-WITH-YOUR-DOMAIN"، AdsterraAd ما غاديش يحمّل أي إطار (نفس
 * سلوك باقي وحدات الإعلان فـ هاد المشروع).
 */
export function SocialBarAd() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]"
      data-pdf-exclude="true"
    >
      <AdsterraAd
        variant="socialbar"
        scriptSrc="//REPLACE-WITH-YOUR-DOMAIN.com/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/invoke.js"
        className="w-full"
      />
    </div>
  )
}
