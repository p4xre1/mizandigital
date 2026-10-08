import { Scale } from "lucide-react"

/**
 * معاينة بصرية للقاموس القانوني داخل الهيرو (ديسكتوب فقط).
 * تعرض مدخلاً حقيقياً من `src/data/lexicon.client.json` بلا عناوين (h1–h6)
 * حتى لا تتأثر بقواعد تسلسل العناوين في الصفحة الرئيسية.
 */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[640px]" role="img" aria-label="معاينة من القاموس القانوني: مدخل الشخص المعنوي">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[48px] bg-gradient-to-br from-[#dbeafe] via-transparent to-[#fef3c7] opacity-70 blur-2xl dark:from-[#1e3a5f]/30 dark:to-[#78350f]/10" />

      <div className="overflow-hidden rounded-[28px] border border-[#e2e8f0] bg-white shadow-[0_30px_80px_-20px_rgba(37,99,235,0.25)] dark:border-[#334155] dark:bg-[#1e293b]">
        <div className="flex items-center gap-3 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3 dark:border-[#334155] dark:bg-[#0f172a]">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#f87171]" />
            <span className="size-2.5 rounded-full bg-[#fbbf24]" />
            <span className="size-2.5 rounded-full bg-[#34d399]" />
          </div>
          <div dir="ltr" className="mx-auto rounded-full border border-[#e2e8f0] bg-white px-4 py-1 text-[12px] text-[#64748b] dark:border-[#334155] dark:bg-[#1e293b] dark:text-[#94a3b8]">
            mizan.page/lexicon
          </div>
        </div>

        <div className="p-8 lg:p-10">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[12px] font-bold text-[#2563eb] dark:bg-[#1e3a5f] dark:text-[#93c5fd]">قانون مدني</span>
            <span className="flex items-center gap-2 text-[13px] font-bold text-[#475569] dark:text-[#cbd5e1]">
              <Scale className="size-4 text-[#2563eb]" aria-hidden="true" />
              القاموس القانوني
            </span>
          </div>

          <p className="mt-7 text-[40px] font-black leading-tight text-[#0f172a] dark:text-white">الشخص المعنوي</p>
          <p dir="ltr" className="mt-1 text-start text-[18px] font-semibold italic text-[#2563eb] dark:text-[#93c5fd]">Personne morale</p>

          <p className="mt-6 border-r-4 border-[#2563eb] pr-5 text-[17px] leading-8 text-[#334155] dark:text-[#cbd5e1]">
            مجموعة من الأشخاص أو الأموال يمنحها القانون شخصية مستقلة وذمة مالية خاصة بها.
          </p>

          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-[#f1f5f9] p-4 dark:bg-[#0f172a]">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#10b981] text-[13px] font-black text-white">ق</div>
            <div>
              <p className="text-[14px] font-bold text-[#0f172a] dark:text-white">قانون الالتزامات والعقود</p>
              <p className="text-[13px] text-[#475569] dark:text-[#cbd5e1]">ق.ل.ع – الفصول 11-12</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -left-6 top-24 flex items-center gap-2 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-[14px] font-bold text-[#0f172a] shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:border-[#334155] dark:bg-[#1e293b] dark:text-white">
        <span className="size-2.5 rounded-full bg-[#10b981]" aria-hidden="true" />
        مجاني بالكامل
      </div>
      <div className="absolute -right-4 bottom-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-[14px] font-bold text-[#0f172a] shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:border-[#334155] dark:bg-[#1e293b] dark:text-white">
        بلا إعلانات تجارية
      </div>
    </div>
  )
}
