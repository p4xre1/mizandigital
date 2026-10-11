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
 *
 * التصميم: الجواب المختصر أولاً (كم مرجعاً منشوراً)، ثم بطاقة لكل مرجع بتسلسل
 * واضح. الشبكة: عمود في الهاتف، عمودان في اللوح، ثلاثة في الحاسوب.
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
      className={`scroll-mt-24 ${className}`}
      aria-labelledby="career-laws-title"
      data-career-laws="section"
    >
      <h2 id="career-laws-title" className="inline-flex items-center gap-3 text-2xl font-black leading-snug text-foreground sm:text-3xl">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Scale className="size-6" aria-hidden="true" />
        </span>
        {SECTION_TITLES.laws}
      </h2>

      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-foreground">
        هذه مراجع تنظيمية تعليمية مرتبطة بهذا المسار. تُربط بأرشيف القوانين في ميزان فقط عندما يكون النص منشوراً
        فعلاً في الأرشيف؛ وما عدا ذلك يبقى بدون رابط حتى لا نرسلك إلى صفحة غير موجودة.
      </p>

      {/* ملخص: رقم كبير وشريط تقدّم، بدل سطر نصي صغير */}
      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:p-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-primary sm:text-5xl">{archivedCount}</span>
          <span className="text-lg font-bold text-muted-foreground">من {entries.length} مرجعاً</span>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground" role="status">
            {archivedCount
              ? `${archivedCount} من ${entries.length} مرجعاً موجود في أرشيف ميزان، والباقي بانتظار الإضافة.`
              : "لا يوجد بعد نص قانوني منشور في أرشيف ميزان مطابق لهذه المراجع؛ تُعرض أسماؤها للتعريف فقط."}
          </p>
          <div
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="نسبة المراجع المنشورة في أرشيف ميزان"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry, index) => {
          const Icon = RELATIONSHIP_ICONS[entry.relationship_type] ?? Scale;
          return (
            <li
              key={`${entry.relationship_type}:${entry.label_ar}`}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"
              data-law-slug={entry.law_slug ?? ""}
              data-law-archived={entry.archive ? "true" : "false"}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground">
                  {index + 1}
                </span>
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>

              <h3 className="mt-4 text-xl font-black leading-snug text-foreground">{entry.label_ar}</h3>
              <p className="mt-2 text-lg leading-relaxed text-muted-foreground">{entry.relationship_ar}</p>

              {LAW_VERIFICATION_LABELS[entry.verification_status] ? (
                <p className="mt-4">
                  <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-base font-extrabold text-emerald-800 dark:text-emerald-200">
                    {LAW_VERIFICATION_LABELS[entry.verification_status]}
                  </span>
                </p>
              ) : null}

              {entry.archive ? (
                <div className="mt-auto space-y-3 border-t border-border pt-4">
                  <p className="text-lg font-bold leading-snug text-foreground">{entry.archive.title}</p>
                  <dl className="grid gap-2 text-base">
                    {entry.archive.law_number ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-bold text-muted-foreground">رقم النص:</dt>
                        <dd className="text-foreground">{entry.archive.law_number}</dd>
                      </div>
                    ) : null}
                    {entry.archive.official_gazette_number ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-bold text-muted-foreground">الجريدة الرسمية:</dt>
                        <dd className="text-foreground">{entry.archive.official_gazette_number}</dd>
                      </div>
                    ) : null}
                    {entry.archive.publication_date ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-bold text-muted-foreground">النشر:</dt>
                        <dd className="text-foreground">{entry.archive.publication_date}</dd>
                      </div>
                    ) : null}
                    {entry.archive.source_verified_at ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-bold text-muted-foreground">تاريخ التحقق من الإسناد:</dt>
                        <dd className="text-foreground">{entry.archive.source_verified_at}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {entry.href ? (
                    <Link
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-lg font-extrabold text-primary-foreground transition hover:opacity-90"
                      to={entry.href}
                    >
                      عرض النص في أرشيف ميزان
                    </Link>
                  ) : null}
                </div>
              ) : (
                <p className="mt-auto border-t border-border pt-4 text-base font-bold text-muted-foreground">
                  غير منشور في أرشيف ميزان بعد
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default CareerLaws;
