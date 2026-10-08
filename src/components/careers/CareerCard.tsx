import { Link } from "react-router-dom";
import { ArrowUpRight, GraduationCap } from "lucide-react";
import { LEGAL_EDUCATION_LABELS, WORK_MODEL_LABELS } from "../../../shared/careers/copy.js";
import type { CareerRecord } from "@/lib/careers/types";

/**
 * بطاقة مسار في صفحة الدليل — مختصرة عمداً.
 *
 * ما تعرضه: العنوان، شارة طبيعة العمل، سطر وصف واحد، الشهادة المعتادة، وأزرار
 * الفعل. ما لا تكرره: طريقة الولوج والعمل الحر وشارة التحقق تتكرر في كل بطاقة
 * بالنص نفسه، فتُعرض في صفحة المسار نفسها، والتحذير الكامل مرة واحدة أسفل الصفحة.
 */
export function CareerCard({ career, className = "" }: { career: CareerRecord; className?: string }) {
  const officialSource = career.sources.find((source) => Boolean(source.url));
  const workLabel = WORK_MODEL_LABELS[career.work_model] ?? career.work_model_ar;
  const legalLabel = LEGAL_EDUCATION_LABELS[career.requires_legal_education] ?? "";

  return (
    <article
      className={`flex h-full flex-col rounded-3xl border border-border bg-card p-5 ${className}`}
      data-career-card={career.slug}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-black leading-snug text-foreground">
            <Link to={`/careers/${career.slug}`} className="hover:text-primary">
              {career.title_ar}
            </Link>
          </h3>
          <p className="text-[12.5px] font-semibold text-muted-foreground" dir="ltr">
            {career.title_fr}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[11.5px] font-extrabold text-primary">
          {workLabel}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-[14px] leading-7 text-foreground/80">{career.short_description}</p>

      <p className="mt-3 flex items-start gap-2 text-[13px] text-foreground/80">
        <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          <span className="font-bold text-foreground">الشهادة المعتادة: </span>
          {career.typical_degree.label_ar}
        </span>
      </p>

      {legalLabel ? <p className="mt-2 text-[12.5px] font-bold text-muted-foreground">{legalLabel}</p> : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Link
          to={`/careers/${career.slug}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-extrabold text-primary-foreground transition hover:opacity-90"
        >
          عرض المسار
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
        {career.quiz_config.has_knowledge_quiz ? (
          <Link
            to={`/quiz/careers/${career.quiz_config.career_quiz_slug}`}
            className="inline-flex min-h-10 items-center rounded-xl border border-border px-4 py-2 text-[13px] font-extrabold text-foreground transition hover:border-primary/50"
          >
            اختبر معلوماتك
          </Link>
        ) : null}
        {officialSource ? (
          <a
            className="inline-flex min-h-10 items-center rounded-xl border border-border px-4 py-2 text-[13px] font-extrabold text-foreground transition hover:border-primary/50"
            href={officialSource.url}
            target="_blank"
            rel="nofollow noopener"
          >
            المصدر الرسمي
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default CareerCard;
