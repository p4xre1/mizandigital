import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import {
  CAREERS_LAW_NOT_ARCHIVED,
  CAREERS_VERIFY_BADGE,
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
 *   2) عند غياب السجل يُعرض النصّ الحرفي:
 *      «⚠️ النص القانوني لم يضف بعد إلى أرشيف ميزان.»
 *   3) العنوان البشري («القانون المنظم لمهنة المحاماة» مثلاً) يبقى معروضاً حتى
 *      بلا سجل أرشيف: الطالب يعرف ما يبحث عنه، والقيمة القانونية لا تُختلق.
 *   4) لا رابط خارجي إلا إذا كان موثّقاً في الأرشيف نفسه (source_verified_at)،
 *      وكل ما دون ذلك يبقى نصاً بلا رابط.
 */
export interface CareerLawsProps {
  career: CareerRecord;
  className?: string;
}

export function CareerLaws({ career, className = "" }: CareerLawsProps) {
  const entries = resolveCareerLaws(career);
  if (!entries.length) return null;

  const archivedCount = entries.filter((entry) => entry.archive).length;

  return (
    <section className={className} aria-labelledby="career-laws-title" data-career-laws="section">
      <h2
        id="career-laws-title"
        className="inline-flex items-center gap-2 text-[18px] font-black text-foreground"
      >
        <Scale className="size-4 text-primary" aria-hidden="true" />
        {SECTION_TITLES.laws}
      </h2>

      <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
        هذه مراجع تنظيمية تعليمية مرتبطة بهذا المسار. تُربط بأرشيف القوانين في ميزان فقط عندما يكون النص منشوراً
        فعلاً في الأرشيف؛ وما عدا ذلك يبقى بدون رابط حتى لا نرسلك إلى صفحة غير موجودة.
      </p>

      <ul className="mt-4 space-y-3">
        {entries.map((entry) => (
          <li
            key={`${entry.relationship_type}:${entry.label_ar}`}
            className="rounded-2xl border border-border bg-card p-4"
            data-law-slug={entry.law_slug ?? ""}
            data-law-archived={entry.archive ? "true" : "false"}
          >
            <p className="text-[14px] font-extrabold text-foreground">{entry.label_ar}</p>

            <p className="mt-1 text-[12px] font-bold text-muted-foreground">
              {entry.relationship_ar} — {LAW_VERIFICATION_LABELS[entry.verification_status] ?? entry.verification_status}
            </p>

            {entry.archive ? (
              <>
                <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
                  <span className="font-bold text-foreground">{entry.archive.title}</span>
                  {entry.archive.law_number ? <span> — رقم النص: {entry.archive.law_number}</span> : null}
                  {entry.archive.official_gazette_number ? (
                    <span> — الجريدة الرسمية: {entry.archive.official_gazette_number}</span>
                  ) : null}
                  {entry.archive.publication_date ? <span> — النشر: {entry.archive.publication_date}</span> : null}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  تاريخ التحقق من الإسناد:{" "}
                  {entry.archive.source_verified_at ? (
                    entry.archive.source_verified_at
                  ) : (
                    <span className="font-bold text-amber-700 dark:text-amber-500">{CAREERS_VERIFY_BADGE}</span>
                  )}
                </p>
                {entry.href ? (
                  <Link className="mt-2 inline-block text-[12.5px] font-extrabold text-primary" to={entry.href}>
                    عرض النص في أرشيف ميزان
                  </Link>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-[12.5px] font-bold text-amber-700 dark:text-amber-500">
                {CAREERS_LAW_NOT_ARCHIVED}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[12px] leading-6 text-muted-foreground" role="status">
        {archivedCount
          ? `${archivedCount} من ${entries.length} مرجعاً موجود في أرشيف ميزان، والباقي بانتظار الإضافة.`
          : "لا يوجد بعد نص قانوني منشور في أرشيف ميزان مطابق لهذه المراجع؛ تُعرض أسماؤها للتعريف فقط."}
      </p>
    </section>
  );
}

export default CareerLaws;
