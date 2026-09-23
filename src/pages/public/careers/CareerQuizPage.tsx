import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpenCheck, Play, ShieldAlert } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { canonicalFor } from "@/lib/canonical";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { CareerDisclaimer } from "@/components/careers/CareerDisclaimer";
import { CareerLexiconTerms } from "@/components/careers/CareerLexiconTerms";
import { NotFound } from "@/pages/public/NotFound";
import { useQuizQuestions } from "@/hooks/useQuizQuestions";
import { useQuizProgress } from "@/hooks/useQuizProgress";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getCareerBySlug, getCareerTerms } from "@/lib/careers/data";
import { careerQuestions } from "@/lib/careers/training";
import {
  CAREERS_GUEST_SAVE_HINT,
  CAREERS_HUB_PATH,
  SECTION_TITLES,
  attemptLabelForCareer,
  buildCareerQuizDescription,
  buildCareerQuizTitle,
} from "../../../../shared/careers/copy.js";
import type { QuizAttempt } from "@/types/quiz";

/**
 * /quiz/careers/:careerSlug — اختبار معرفي تعليمي حول مسار واحد.
 *
 * قواعد التنفيذ:
 *   • 10 أسئلة افتراضياً بمزيج صعوبات من بنك ميزان (easy/medium/hard).
 *   • الزر لا يُفعَّل إلا عند وجود 8 أسئلة على الأقل للمسار (فحص آلي في
 *     tests/careers-quiz.test.ts يمنع نشر CTA بلا بنك كافٍ).
 *   • الزائر: كل شيء يعمل بلا حساب، والنتيجة تُحفظ محلياً في متصفحه وحده.
 *   • الكتابة في Supabase تحدث فقط بوجود جلسة: mode = general (المسرد المسموح
 *     في قيد quiz_attempts)، والوسم `career:<slug>` وحده لا يحمل أي معلومة
 *     شخصية. الزائر لا يكتب شيئاً (سياسة القاعدة ترفض إدراج anon أصلاً).
 */
export function CareerQuizPage() {
  const { careerSlug } = useParams<{ careerSlug: string }>();
  const career = getCareerBySlug(careerSlug ? decodeURIComponent(careerSlug) : undefined);
  const { questions, loading } = useQuizQuestions();
  const { recentQuestionIds } = useQuizProgress();
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);

  const pool = useMemo(() => (career ? careerQuestions(career, questions) : []), [career, questions]);

  if (!career) {
    return <NotFound />;
  }

  const canonical = canonicalFor(`/quiz/careers/${career.slug}`);
  const enoughQuestions = pool.length >= 8;
  const canStart = career.quiz_config.has_knowledge_quiz && enoughQuestions;
  const terms = getCareerTerms(career);

  const weakFromAttempt = lastAttempt
    ? lastAttempt.answers
        .filter((answer) => !answer.correct)
        .map((answer) => pool.find((question) => question.id === answer.questionId))
        .flatMap((question) => {
          const ids = (question as (typeof pool)[number] & { lexicon_term_ids?: string[] })?.lexicon_term_ids;
          return Array.isArray(ids) ? ids : [];
        })
        .filter((id, index, list) => list.indexOf(id) === index)
        .map((id) => terms.find((term) => term.id === id))
        .filter((term): term is (typeof terms)[number] => Boolean(term))
        .slice(0, 5)
    : [];

  if (started && canStart) {
    return (
      <main className="container-wide py-10" dir="rtl" data-page="career-quiz">
        <SEOHead
          title={buildCareerQuizTitle(career.title_ar)}
          description={buildCareerQuizDescription(career.title_ar)}
          canonicalUrl={canonical}
        />
        <QuizRunner
          questions={pool}
          mode="general"
          label={attemptLabelForCareer(career.slug)}
          tier="general"
          questionCount={10}
          excludeIds={recentQuestionIds}
          onExit={() => setStarted(false)}
          onComplete={(attempt) => {
            // QuizRunner هو من يسجّل المحاولة (محلياً + عبر submit_quiz_attempt
            // الآمنة). لا نضيف كتابة ثانية هنا حتى لا تتكرر المحاولة في السجل.
            setLastAttempt(attempt);
          }}
        />
        <CareerDisclaimer className="mt-6" variant="quiz" />
      </main>
    );
  }

  return (
    <main className="container-wide py-10" dir="rtl" data-page="career-quiz">
      <SEOHead
        title={buildCareerQuizTitle(career.title_ar)}
        description={buildCareerQuizDescription(career.title_ar)}
        canonicalUrl={canonical}
        keywords={[career.title_ar, `اختبار ${career.title_ar}`, "أسئلة قانونية"]}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Quiz",
            name: buildCareerQuizTitle(career.title_ar),
            description: buildCareerQuizDescription(career.title_ar),
            url: canonical,
            inLanguage: "ar-MA",
            isAccessibleForFree: true,
            about: career.title_ar,
          },
        ]}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "المسارات المهنية", url: CAREERS_HUB_PATH },
          { name: "اختبارات المسارات المهنية", url: "/quiz/careers" },
          { name: career.title_ar, url: `/quiz/careers/${career.slug}` },
        ]}
      />

      <nav aria-label="مسار التصفح" className="mb-5 text-[12.5px] font-bold text-muted-foreground">
        <Link className="hover:text-foreground" to="/quiz/careers">
          اختبارات المسارات المهنية
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{career.title_ar}</span>
      </nav>

      <header className="rounded-3xl border border-border bg-gradient-to-l from-primary/10 via-card to-amber-500/10 p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Play className="size-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[24px] font-black leading-[1.3] text-foreground md:text-[30px]">
          اختبر معلوماتك عن مهنة {career.title_ar}
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-8 text-foreground">
          اختبار تعليمي قصير (10 أسئلة) حول مفاهيم {career.title_ar}: {career.main_areas.slice(0, 4).join("، ")}.
          كل سؤال يأتي بشرح، والنتيجة تقيس معرفتك بمحتوى ميزان فقط.
        </p>
        <CareerDisclaimer className="mt-5 max-w-3xl" variant="quiz" />
      </header>

      <section className="mt-8 rounded-3xl border border-border bg-card p-5" aria-labelledby="career-quiz-start-title">
        <h2 id="career-quiz-start-title" className="text-[18px] font-black text-foreground">
          قبل أن تبدأ
        </h2>
        <ul className="mt-3 list-disc space-y-2 ps-5 text-[13.5px] leading-7 text-muted-foreground">
          <li>10 أسئلة مختارة عشوائياً من أسئلة هذا المسار، مع مزيج بين السهل والمتوسط والمتقدم.</li>
          <li>شرح مبسط بعد كل سؤال، وفي نهاية الجلسة ملخص بنقاط تحتاج مراجعة.</li>
          <li>لا حاجة إلى حساب: يمكنك التجربة كزائر، ونتيجتك تبقى في متصفحك.</li>
          <li>للتقدم المسجّل و«تدريبي المهني» في ملفك، سجّل الدخول قبل البدء.</li>
        </ul>

        {canStart ? (
          <button
            type="button"
            onClick={() => {
              setLastAttempt(null);
              setStarted(true);
            }}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90"
          >
            <BookOpenCheck className="size-4" aria-hidden="true" />
            ابدأ اختبار {career.title_ar} ({pool.length} سؤالاً متاحاً)
          </button>
        ) : (
          <p className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-[13px] leading-7 text-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              {loading
                ? "جارٍ تحميل بنك الأسئلة…"
                : "لم يكتمل بعد عدد كافٍ من الأسئلة التعليمية لهذا المسار (الحد الأدنى 8 أسئلة قبل تفعيل الاختبار). يمكنك في الوقت الحالي مراجعة مصطلحات المسار من القاموس، والتدريب عبر اختبارات المباريات العامة."}
            </span>
          </p>
        )}
      </section>

      {lastAttempt ? (
        <section className="mt-8 rounded-3xl border border-border bg-card p-5" aria-labelledby="career-quiz-review-title">
          <h2 id="career-quiz-review-title" className="text-[18px] font-black text-foreground">
            نتيجة تعليمية ونقاط للمراجعة
          </h2>
          <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
            نتيجتك في هذا الاختبار التعليمي: {lastAttempt.score}% ({lastAttempt.correct}/{lastAttempt.total}). هذا الرقم
            يقيس أداءك في أسئلة ميزان فقط، ولا يمثل تقييماً رسمياً ولا يحكم على أهليتك.
          </p>
          {weakFromAttempt.length ? (
            <>
              <h3 className="mt-4 text-[14.5px] font-extrabold text-foreground">نقاط تحتاج مراجعة</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {weakFromAttempt.map((term) => (
                  <li key={term.id}>
                    <Link
                      to={`/lexicon/${term.slug}`}
                      className="rounded-full border border-border px-3 py-1.5 text-[12.5px] font-bold text-foreground hover:border-primary/50"
                    >
                      {term.term_ar}
                      {term.term_fr ? <span className="ms-2 text-muted-foreground" dir="ltr">{term.term_fr}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">
              لم تُسجَّل أخطاء في هذه الجلسة، ويمكنك التوسع بمراجعة مصطلحات المسار كلها ثم اختبار مستوى أعلى.
            </p>
          )}
          {!user ? (
            <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 text-[13px] font-bold text-foreground">
              {CAREERS_GUEST_SAVE_HINT}{" "}
              <Link className="text-primary underline" to="/login">
                تسجيل الدخول أو إنشاء حساب
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      <CareerLexiconTerms career={career} className="mt-8" />

      <section className="mt-8" aria-labelledby="career-quiz-resources-title">
        <h2 id="career-quiz-resources-title" className="text-[18px] font-black text-foreground">
          {SECTION_TITLES.requirements} ومراجع المراجعة
        </h2>
        <ul className="mt-3 space-y-2 text-[13px] leading-7 text-muted-foreground">
          <li>
            <Link className="font-bold text-primary" to={`/careers/${career.slug}`}>
              صفحة مسار {career.title_ar}
            </Link>{" "}
            — الشروط والمصادر وخطوات المسار.
          </li>
          <li>
            <Link className="font-bold text-primary" to="/quiz/concours">
              اختبارات المباريات المهنية
            </Link>{" "}
            — تدريب على صيغة أسئلة المباريات العامة.
          </li>
          <li>
            <Link className="font-bold text-primary" to="/lexicon">
              القاموس القانوني
            </Link>{" "}
            — مراجعة المصطلحات بالعربية والفرنسية.
          </li>
        </ul>
      </section>

      <CareerDisclaimer className="mt-10" variant="quiz" />
    </main>
  );
}

export default CareerQuizPage;
