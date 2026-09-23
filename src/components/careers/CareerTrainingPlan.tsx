import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Star, Target } from "lucide-react";
import { SECTION_TITLES, CAREERS_PLAN_DISCLAIMER } from "../../../shared/careers/copy.js";
import { useQuizQuestions } from "@/hooks/useQuizQuestions";
import { useQuizProgress } from "@/hooks/useQuizProgress";
import { useAuth } from "@/lib/auth/AuthProvider";
import { buildCareerTrainingStats, buildTrainingPlan } from "@/lib/careers/training";
import { setCareerFollowing } from "@/lib/careers/trainingService";
import type { CareerRecord } from "@/lib/careers/types";

/**
 * خطة مراجعة تعليمية من أربعة أسابيع، مبنية على:
 *   • مصطلحات المسار من قاموس ميزان (lexicon_term_ids)،
 *   • أسئلة المسار المتاحة في بنك الأسئلة (career knowledge)،
 *   • نقاط الضعف الحقيقية للمستخدم المسجّل أو الزائر (من محاولاته المحلية).
 *
 * الخطة تعليمية بحتة: لا تحتوي أي وعد قبول ولا محاكاة رسمية، وإخلاء
 * المسؤولية الإلزامي مطبوع داخلها (من shared/careers/copy.js).
 */
export function CareerTrainingPlan({
  career,
  className = "",
}: {
  career: CareerRecord;
  className?: string;
}) {
  const { questions } = useQuizQuestions();
  const { progress } = useQuizProgress();
  const { user } = useAuth();
  const [followState, setFollowState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const stats = useMemo(
    () => buildCareerTrainingStats(career, progress.attempts ?? [], questions),
    [career, progress.attempts, questions]
  );
  const plan = useMemo(() => buildTrainingPlan(career, stats), [career, stats]);

  const handleFollow = async () => {
    setFollowState("saving");
    const result = await setCareerFollowing(career.slug, true);
    setFollowState(result.ok ? "saved" : "error");
  };

  return (
    <section
      aria-labelledby="career-training-plan-title"
      className={`rounded-3xl border border-border bg-card p-5 ${className}`}
      data-career-training-plan={career.slug}
    >
      <h2 id="career-training-plan-title" className="text-[18px] font-black text-foreground">
        {SECTION_TITLES.plan}
      </h2>
      <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
        خطة مقترحة لمراجعة {career.title_ar} عبر محتوى ميزان: مصطلحات المسار، ثم المفاهيم، ثم معالجة ما أخطأت فيه.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background p-3">
          <dt className="text-[11.5px] font-bold text-muted-foreground">جلسات تدريب مسجّلة</dt>
          <dd className="text-[18px] font-black text-foreground">{stats.sessions}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <dt className="text-[11.5px] font-bold text-muted-foreground">أفضل نتيجة</dt>
          <dd className="text-[18px] font-black text-foreground">
            {stats.sessions ? `${stats.bestScore}%` : "—"}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <dt className="text-[11.5px] font-bold text-muted-foreground">تغطية تمارين المسار</dt>
          <dd className="text-[18px] font-black text-foreground">{stats.coveragePercent}%</dd>
        </div>
      </dl>

      <ol className="mt-4 space-y-3" data-career-training-weeks="ol">
        {plan.map((week) => (
          <li key={week.week} className="rounded-2xl border border-border bg-background p-4">
            <p className="flex items-center gap-2 text-[14px] font-extrabold text-foreground">
              <CalendarCheck className="size-4 text-primary" aria-hidden="true" />
              {week.title_ar}
            </p>
            <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{week.description_ar}</p>
            {week.terms.length ? (
              <p className="mt-2 flex flex-wrap gap-2">
                {week.terms.map((term) => (
                  <Link
                    key={`${week.week}-${term.id}`}
                    to={`/lexicon/${term.slug}`}
                    className="rounded-full border border-border px-3 py-1 text-[12px] font-bold text-foreground hover:border-primary/50"
                  >
                    {term.term_ar}
                  </Link>
                ))}
              </p>
            ) : null}
            <p className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] font-bold">
              <Link className="inline-flex items-center gap-1 text-primary" to={week.quizHref}>
                <Target className="size-3.5" aria-hidden="true" />
                ابدأ اختبار الأسبوع ({week.level === "easy" ? "سهل" : week.level === "medium" ? "متوسط" : "متقدم"})
              </Link>
              {week.week === 4 ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Star className="size-3.5" aria-hidden="true" />
                  ثم راجع الإعلان أو النص الرسمي بنفسك
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[12.5px] leading-6 text-muted-foreground">{CAREERS_PLAN_DISCLAIMER}</p>

      {user ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleFollow}
            disabled={followState === "saving"}
            className="inline-flex min-h-10 items-center rounded-xl border border-primary/40 px-4 py-2 text-[13px] font-extrabold text-primary transition hover:bg-primary/5 disabled:opacity-60"
          >
            تابع هذا المسار في تدريبي المهني
          </button>
          {followState !== "idle" ? (
            <span className="text-[12.5px] font-bold text-muted-foreground" role="status">
              {followState === "saved"
                ? "أُضيف المسار إلى «تدريبي المهني»."
                : followState === "error"
                  ? "تعذر الحفظ في حسابك الآن؛ يمكنك المتابعة محلياً."
                  : "جارٍ الحفظ…"}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default CareerTrainingPlan;
