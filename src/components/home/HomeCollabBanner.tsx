import { ExternalLink, Handshake } from "lucide-react"

const WADIFA_PUBLIC_URL = "https://www.wadifapublic.ma/ar"

/**
 * لافتة الشراكة في الصفحة الرئيسية — شريط بارز بعد قسم البطل يعرض تعاون
 * ميزان الرقمية مع «وظيفة بابليك» وينقل إلى موقع الشريك في تبويب جديد.
 *
 * القرارات المقصودة:
 *   • الشريط كله رابط واحد `<a>` (لا أزرار متداخلة داخله) — هدف واضح للنقر
 *     وللمساعدات التقنية، مع aria-label يسمّي الشريك.
 *   • `rel="noopener noreferrer sponsored"`: فتح آمن في تبويب جديد، ووسم
 *     `sponsored` يصحّح فهرسة رابط شراكة ترويجي (لا يمرّر وزناً للـSEO).
 *   • عنوان القسم ليس h2: اللافتة شريط ترويجي لا قسم محتوى، فتبقى خريطة
 *     العناوين في الصفحة كما هي (اختبار heading-order في lighthouse-fixes).
 *   • ألوان الشريط نفسها المستعملة في البطل (#2563eb) وقسم الموارد (#fbbf24)
 *     حتى تبقى الهوية بصرية واحدة في الوضعين الفاتح والداكن.
 */
export function HomeCollabBanner() {
  return (
    <section aria-label="شراكة مع وظيفة بابليك" className="bg-white pb-12 dark:bg-[#0f172a] md:pb-16">
      <div className="container mx-auto max-w-[1280px] px-6">
        <a
          href={WADIFA_PUBLIC_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group relative flex flex-col gap-6 overflow-hidden rounded-[28px] bg-gradient-to-l from-[#0f172a] via-[#1e3a8a] to-[#2563eb] p-6 text-white shadow-[0_24px_60px_-24px_rgba(37,99,235,0.45)] transition-shadow hover:shadow-[0_28px_70px_-20px_rgba(37,99,235,0.55)] md:flex-row md:items-center md:justify-between md:gap-10 md:p-9"
        >
          <div className="pointer-events-none absolute -top-20 -right-16 size-[280px] rounded-full bg-[#fbbf24]/20 blur-[70px]" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 size-[320px] rounded-full bg-[#60a5fa]/25 blur-[80px]" aria-hidden="true" />

          <div className="relative flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 md:size-14" aria-hidden="true">
              <Handshake className="size-6 text-[#fbbf24] md:size-7" />
            </span>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#fbbf24]/15 px-3 py-1 text-[12px] font-black text-[#fbbf24] ring-1 ring-[#fbbf24]/30">
                شراكة وتعاون
              </span>
              <p className="mt-2.5 text-[19px] font-black leading-8 md:text-[23px]">
                ميزان الرقمية × وظيفة بابليك
              </p>
              <p className="mt-1.5 max-w-[560px] text-[13px] leading-7 text-[#cbd5e1] md:text-[15px]">
                نتعاون مع وظيفة بابليك (Wadifa Public) للاطلاع على مسابقات التوظيف والعروض المهنية
                الشاغرة في الوظيفة العمومية بالمغرب.
              </p>
            </div>
          </div>

          <span className="relative inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-6 py-3 text-[14px] font-black text-[#1e3a8a] shadow-[0_10px_24px_rgba(15,23,42,0.25)] transition-transform group-hover:-translate-y-0.5 md:self-auto md:px-8">
            تصفّح وظيفة بابليك
            <ExternalLink className="size-4" aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  )
}
