import { Link } from "react-router-dom";
import { ArrowUpRight, BadgeCheck, Building2, GraduationCap, ShieldAlert } from "lucide-react";
import {
  CAREERS_VERIFY_BADGE,
  COMPETITION_PATH_LABELS,
  LEGAL_EDUCATION_LABELS,
  WORK_MODEL_LABELS,
} from "../../../shared/careers/copy.js";
import type { CareerRecord } from "@/lib/careers/types";

/**
 * بطاقة مسار في صفحة الدليل.
 *
 * ما تعرضه: العنوان العربي والفرنسي، شارة طبيعة العمل، الشهادة المعتادة،
 * طريقة الولوج، وضع العمل الحر، وحالة التحقق. الأزرار: عرض المسار، اختبر
 * معلوماتك، والمصدر الرسمي فقط إن وُجد رابط رسمي متحقق منه فعلاً.
 */
export function CareerCard({ career, className = "" }: { career: CareerRecord; className?: string }) {
  const officialSource = career.sources.find((source) => Boolean(source.url));
  const workLabel = WORK_MODEL_LABELS[career.work_model] ?? career.work_model_ar;
  const entryLabel = COMPETITION_PATH_LABELS[career.quiz_config.competition_path] ?? "مسار تحقق رسمي";

  return (
    <article
      className={`flex h-full flex-col rounded-3xl border border-border bg-card p-5 ${className}`}
      data-career-card={career.slug}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-black text-foreground">
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

      <p className="mt-3 text-[13px] leading-7 text-muted-foreground">{career.short_description}</p>

      <ul className="mt-3 space-y-1.5 text-[12.5px] text-muted-foreground">
        <li className="flex items-start gap-2">
          <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="font-bold text-foreground">الشهادة المعتادة: </span>
            {career.typical_degree.label_ar}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Building2 className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="font-bold text-foreground">طريقة الولوج: </span>
            {entryLabel}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="font-bold text-foreground">العمل الحر: </span>
            {career.can_freelance
              ? "ممكن داخل إطار تنظيمي بعد استيفاء الشروط"
              : "غير مطروح في هذا المسار"}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            <span className="font-bold text-foreground">التحقق: </span>
            {CAREERS_VERIFY_BADGE}
          </span>
        </li>
      </ul>

      <p className="mt-3 text-[11.5px] font-bold text-muted-foreground">
        {LEGAL_EDUCATION_LABELS[career.requires_legal_education] ?? ""}
      </p>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
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
