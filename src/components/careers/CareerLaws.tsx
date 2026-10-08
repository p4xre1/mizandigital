import { Link } from "react-router-dom";
import { BookOpen, Building2, CalendarDays, GraduationCap, Scale, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  LAW_VERIFICATION_LABELS,
  SECTION_TITLES,
} from "../../../shared/careers/copy.js";
import type { CareerRecord } from "@/lib/careers/types";
import { resolveCareerLaws } from "@/lib/careers/laws";

/**
 * «القوانين والمراجع المنظمة للمسار» — ربط المسار بأرشيف القوانين في ميزان.
 *
 * قواعد صارمة مطبَّقة في هذا المكوّن:
 *   1) لا رابط داخلي إلا لسجل موجود فعلاً في الأرشيف (والرابط يأتي من اللقطة
 *      المولَّدة وقت البناء، لا يُبنى هنا) — فلا رابط مكسور ولا رابط مُفترض.
 *   2) عند غياب السجل لا يُعرض أي تنبيه داخل البطاقة (تُعرض المرجعية فقط).
 *   3) العنوان البشري («القانون المنظم لمهنة المحاماة» مثلاً) يبقى معروضاً حتى
 *      بلا سجل أرشيف: الطالب يعرف ما يبحث عنه، والقيمة القانونية لا تُختلق.
 *   4) لا رابط خارجي إلا إذا كان موثّقاً في الأرشيف نفسه (source_verified_at)،
 *      وكل ما دون ذلك يبقى نصاً بلا رابط.
 */
export interface CareerLawsProps {
  career: CareerRecord;
  className?: string;
}

const RELATIONSHIP_ICONS: Record<string, LucideIcon> = {
  governing_framework: Scale,
  access_conditions: GraduationCap,
  training: BookOpen,
  professional_ethics: ShieldCheck,
  public_employment: Building2,
  annual_notice_reference: CalendarDays,
};

export function CareerLaws({ career, className = "" }: CareerLawsProps) {
  const entries = resolveCareerLaws(career);
  if (!entries.length) return null;

  const archivedCount = entries.filter((entry) => entry.archive).length;
  const percent = Math.round((archivedCount / entries.length) * 100);

  return (
    <section
      className={`rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8 ${className}`}
      aria-labelledby="career-laws-title"
      data-career-laws="section"
    >
      <h2
        id="career-laws-title"
        className="inline-flex items-center gap-2 text-[22px] font-black text-foreground"
      >
        <Scale className="size-5 text-primary" aria-hidden="true" />
        {SECTION_TITLES.laws}
      </h2>

      <p className="mt-3 text-[16px] leading-8 text-foreground">
        هذه مراجع تنظيمية تعليمية مرتبطة بهذا المسار. تُربط بأرشيف القوانين في ميزان فقط عندما يكون النص منشوراً
        فعلاً في الأرشيف؛ وما عدا ذلك يبقى بدون رابط حتى لا نرسلك إلى صفحة غير موجودة.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[16px] font-extrabold text-foreground">المراجع المنشورة في أرشيف ميزان</span>
          <span className="rounded-full bg-primary px-3 py-1 text-[15px] font-black text-primary-foreground">
            {archivedCount} من {entries.length}
          </span>
        </div>
        <div
          className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="نسبة المراجع المنشورة في أرشيف ميزان"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground" role="status">
          {archivedCount
            ? `${archivedCount} من ${entries.length} مرجعاً موجود في أرشيف ميزان، والباقي بانتظار الإضافة.`
            : "لا يوجد بعد نص قانوني منشور في أرشيف ميزان مطابق لهذه المراجع؛ تُعرض أسماؤها للتعريف فقط."}
        </p>
      </div>

      <ol className="mt-6 grid gap-4 md:grid-cols-2">
        {entries.map((entry, index) => {
          const Icon = RELATIONSHIP_ICONS[entry.relationship_type] ?? Scale;
          return (
            <li
              key={`${entry.relationship_type}:${entry.label_ar}`}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 md:p-6"
              data-law-slug={entry.law_slug ?? ""}
              data-law-archived={entry.archive ? "true" : "false"}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-[16px] font-black text-primary-foreground">
                  {index + 1}
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>

              <h3 className="mt-4 text-[17px] font-extrabold leading-7 text-foreground">{entry.label_ar}</h3>
              <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{entry.relationship_ar}</p>

              {LAW_VERIFICATION_LABELS[entry.verification_status] ? (
                <p className="mt-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-[13px] font-extrabold ${
                      entry.archive
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    {LAW_VERIFICATION_LABELS[entry.verification_status]}
                  </span>
                </p>
              ) : null}

              {entry.archive ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-[14px] leading-7 text-muted-foreground">
                    <span className="font-bold text-foreground">{entry.archive.title}</span>
                    {entry.archive.law_number ? <span> — رقم النص: {entry.archive.law_number}</span> : null}
                    {entry.archive.official_gazette_number ? (
                      <span> — الجريدة الرسمية: {entry.archive.official_gazette_number}</span>
                    ) : null}
                    {entry.archive.publication_date ? <span> — النشر: {entry.archive.publication_date}</span> : null}
                  </p>
                  {entry.archive.source_verified_at ? (
                    <p className="mt-1 text-[14px] text-muted-foreground">
                      تاريخ التحقق من الإسناد: {entry.archive.source_verified_at}
                    </p>
                  ) : null}
                  {entry.href ? (
                    <Link className="mt-3 inline-block text-[15px] font-extrabold text-primary" to={entry.href}>
                      عرض النص في أرشيف ميزان
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default CareerLaws;
