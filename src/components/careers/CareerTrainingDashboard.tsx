import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpenCheck, TrendingUp } from "lucide-react";
import {
  CAREERS_GUEST_SAVE_HINT,
  CAREERS_TRAINING_NOTE,
  SECTION_TITLES,
} from "../../../shared/careers/copy.js";
import { useQuizProgress } from "@/hooks/useQuizProgress";
import { useQuizQuestions } from "@/hooks/useQuizQuestions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CAREERS } from "@/lib/careers/data";
import { buildTrainingOverview } from "@/lib/careers/training";
import { fetchFollowedCareers } from "@/lib/careers/trainingService";

/**
 * لوحة «تدريبي المهني» داخل /profile (لا مسار /profiles جديد).
 *
 * تعرض: المسارات المتابَعة، جلسات التدريب لكل مسار، أفضل نتيجة، آخر تاريخ
 * تدريب، مجموع الأسئلة المنجزة، نقاط الضعف من مصطلحات القاموس، والاختبار
 * المقترح التالي. كل الأرقام تعليمية وتقيس محتوى ميزان فقط.
 *
 * الزائر: يرى نتائجه المحفوظة محلياً في المتصفح + دعوة لإنشاء حساب، ولا تُكتب
 * أي بيانات في قاعدة البيانات (لا جلسة أصلاً، فلا كتابة).
 */
export function CareerTrainingDashboard({ className = "" }: { className?: string }) {
  const { questions } = useQuizQuestions();
  const { progress } = useQuizProgress();
  const { user } = useAuth();
  const [followed, setFollowed] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setFollowed([]);
      return () => {
        mounted = false;
      };
    }
    fetchFollowedCareers().then((result) => {
      if (mounted && result.ok) setFollowed(result.slugs);
    });
    return () => {
      mounted = false;
    };
  }, [user]);

  const overview = useMemo(
    () => buildTrainingOverview(CAREERS, progress.attempts ?? [], questions),
    [progress.attempts, questions]
  );

  const followedCareers = useMemo(
    () => CAREERS.filter((career) => followed.includes(career.slug)),
    [followed]
  );

  return (
    <section
      id="career-training"
      aria-labelledby="career-training-title"
      className={`rounded-3xl border border-border bg-card p-5 ${className}`}
      data-career-training="dashboard"
    >
      <h2 id="career-training-title" className="text-[18px] font-black text-foreground">
        {SECTION_TITLES.training}
      </h2>
      <p className="mt-1 text-[13px] leading-7 text-muted-foreground">{CAREERS_TRAINING_NOTE}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-background p-3">
          <dt className="text-[11.5px] font-bold text-muted-foreground">مسارات تدربت فيها</dt>
          <dd className="text-[18px] font-black text-foreground">{overview.totals.followedCareers}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <dt className="text-[11.5px] font-bold text-muted-foreground">جلسات التدريب</dt>
          <dd className="text-[18px] font-black text-foreground">{overview.totals.sessions}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <dt className="text-[11.5px] font-bold text-muted-foreground">مجموع الأسئلة المنجزة</dt>
          <dd className="text-[18px] font-black text-foreground">{overview.totals.questions}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <dt className="text-[11.5px] font-bold text-muted-foreground">إجابات صحيحة</dt>
          <dd className="text-[18px] font-black text-foreground">{overview.totals.correctAnswers}</dd>
        </div>
      </dl>

      {overview.stats.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-[13px] leading-7 text-muted-foreground">
          لم تسجّل أي جلسة تدريب مسار بعد. ابدأ من{" "}
          <Link className="font-bold text-primary" to="/careers">
            دليل المسارات المهنية
          </Link>{" "}
          ثم اختر اختباراً تعليمياً قصيراً لأحد المسارات.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {overview.stats.map((entry) => (
            <li key={entry.career.slug} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-extrabold text-foreground">
                  <Link className="hover:text-primary" to={`/careers/${entry.career.slug}`}>
                    {entry.career.title_ar}
                  </Link>
                </p>
                <p className="flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground">
                  <TrendingUp className="size-3.5 text-primary" aria-hidden="true" />
                  أفضل نتيجة: {entry.bestScore}% — تغطية تمارين المسار: {entry.coveragePercent}%
                </p>
              </div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                الجلسات: {entry.sessions} — الأسئلة: {entry.attemptedQuestions}/{entry.totalQuestions} — آخر تدريب:{" "}
                {entry.lastPracticedAt ? entry.lastPracticedAt.slice(0, 10) : "—"}
              </p>
              {entry.weakTerms.length ? (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="font-extrabold text-foreground">نقاط تحتاج مراجعة:</span>
                  {entry.weakTerms.map((term) => (
                    <Link
                      key={`${entry.career.slug}-${term.id}`}
                      to={`/lexicon/${term.slug}`}
                      className="rounded-full border border-border px-3 py-1 font-bold text-foreground hover:border-primary/50"
                    >
                      {term.term_ar}
                    </Link>
                  ))}
                </p>
              ) : null}
              <p className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] font-bold">
                <Link className="inline-flex items-center gap-1 text-primary" to={`/quiz/careers/${entry.career.slug}`}>
                  <BookOpenCheck className="size-3.5" aria-hidden="true" />
                  الاختبار المقترح التالي
                </Link>
                <span className="text-muted-foreground">{entry.suggestedNextStepAr}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        followedCareers.length ? (
          <p className="mt-4 text-[12.5px] leading-6 text-muted-foreground">
            مسارات تتابعها: {followedCareers.map((career) => career.title_ar).join("، ")}.
          </p>
        ) : null
      ) : (
        <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 text-[13px] font-bold text-foreground">
          {CAREERS_GUEST_SAVE_HINT}{" "}
          <Link className="text-primary underline" to="/login">
            تسجيل الدخول أو إنشاء حساب
          </Link>
        </p>
      )}
    </section>
  );
}

export default CareerTrainingDashboard;
