import { AdsterraAd } from "./AdsterraAd"

/**
 * صندوق إعلان داخل المحتوى — يُستعمل فـ صفحات المقالات/الأخبار وصفحات
 * الكليات، بالإضافة للإعلانين العلوي والسفلي الموجودين ديجا فـ PublicLayout.
 *
 * حالياً كنستعملو نفس كود الوحدة 300x250 المستعملة فـ أسفل الصفحة (نفس
 * الحساب عند Adsterra يسمح يتكرر فـ أكثر من مكان بالصفحة). إيلا بغيتي
 * فورمة مختلفة لهاد المكان بالضبط (مثلاً "Native Banner" باش تندمج أكثر
 * مع تصميم المحتوى)، دير وحدة جديدة من لوحة تحكم Adsterra وعوّض
 * scriptSrc/atOptions تحت.
 */
export function InContentAd({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${className ?? ""}`}
      data-pdf-exclude="true"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
        إعلان
      </span>
      <AdsterraAd
        variant="banner"
        atOptions={{ key: "596caeba8a6e81b049c0c8f8f0586950", height: 250, width: 300 }}
        scriptSrc="//www.highrevenueformat.com/596caeba8a6e81b049c0c8f8f0586950/invoke.js"
        className="min-h-[250px] w-[300px]"
      />
    </div>
  )
}
