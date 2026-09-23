import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Play, RefreshCw } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { canonicalFor } from "@/lib/canonical";
import { CareerDisclaimer } from "@/components/careers/CareerDisclaimer";
import { CAREERS, getCareerTerms } from "@/lib/careers/data";
import { CAREER_FAMILIES, DISCOVERY_QUESTIONS, scoreDiscovery } from "@/lib/careers/discovery";
import { CAREERS_HUB_PATH, CAREERS_QUIZ_HUB_COPY } from "../../../../shared/careers/copy.js";

/**
 * /quiz/careers — بوابة الاختبارات المهنية التعليمية.
 *
 * قسمان: اختبار استكشافي (اختيار محلي داخل المتصفح، نتيجته ترتيب اقتراحي لا
 * حكم أهلية)، وقائمة اختبارات المعرفة لكل مسار. كل مسار يُربط باختباره فقط
 * عندما يوجد عدد كافٍ من الأسئلة (8 على الأقل) — لا زر يقود إلى بنك فارغ.
 */
export function CareerQuizHubPage() {
  const [answers, setAnswers] = useState<Array<string | null>>(
    () => DISCOVERY_QUESTIONS.map(() => null)
  );
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(() => scoreDiscovery(answers), [answers]);

  const quizzes = CAREERS.filter((career) => career.quiz_config.has_knowledge_quiz);

  return (
    <main className="container-wide py-10" dir="rtl" data-page="careers-quiz-hub">
      <SEOHead
        title={CAREERS_QUIZ_HUB_COPY.title}
        description={CAREERS_QUIZ_HUB_COPY.description}
        canonicalUrl={canonicalFor("/quiz/careers")}
        keywords={["اختبارات المهن القانونية", "تدريب قانوني", "أسئلة القانون المغربي"]}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Quiz",
            name: CAREERS_QUIZ_HUB_COPY.h1,
            description: CAREERS_QUIZ_HUB_COPY.description,
            url: canonicalFor("/quiz/careers"),
            inLanguage: "ar-MA",
            isAccessibleForFree: true,
            about: "المهن القانونية في المغرب",
          },
        ]}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "المسارات المهنية", url: CAREERS_HUB_PATH },
          { name: "اختبارات المسارات المهنية", url: "/quiz/careers" },
        ]}
      />

      <nav aria-label="مسار التصفح" className="mb-5 text-[12.5px] font-bold text-muted-foreground">
        <Link className="hover:text-foreground" to="/quiz">
          الاختبارات
        </Link>
        <span className="mx-2">/</span>
        <Link className="hover:text-foreground" to={CAREERS_HUB_PATH}>
          المسارات المهنية
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">اختبارات تعليمية</span>
      </nav>

      <header className="rounded-3xl border border-border bg-gradient-to-l from-primary/10 via-card to-amber-500/10 p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Compass className="size-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[26px] font-black leading-[1.3] text-foreground md:text-[30px]">
          {CAREERS_QUIZ_HUB_COPY.h1}
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-8 text-foreground">{CAREERS_QUIZ_HUB_COPY.directAnswer}</p>
        <CareerDisclaimer className="mt-5 max-w-3xl" variant="quiz" />
      </header>

      <section className="mt-10 rounded-3xl border border-border bg-card p-5" aria-labelledby="career-discovery-title">
        <h2 id="career-discovery-title" className="text-[18px] font-black text-foreground">
          {CAREERS_QUIZ_HUB_COPY.discoveryTitle}
        </h2>
        <p className="mt-1 text-[13.5px] leading-7 text-muted-foreground">
          {CAREERS_QUIZ_HUB_COPY.discoveryLead}
        </p>

        <ol className="mt-4 space-y-4">
          {DISCOVERY_QUESTIONS.map((question, index) => (
            <li key={question.id}>
              <fieldset className="rounded-2xl border border-border bg-background p-4">
                <legend className="px-1 text-[13.5px] font-extrabold text-foreground">
                  {index + 1}. {question.question_ar}
                </legend>
                <div className="mt-2 grid gap-2">
                  {question.options.map((option) => {
                    const selected = answers[index] === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-[13px] font-bold transition ${
                          selected ? "border-primary bg-primary/[0.06]" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={selected}
                          onChange={() => {
                            setAnswers((prev) => {
                              const next = [...prev];
                              next[index] = option.id;
                              return next;
                            });
                            setShowResult(false);
                          }}
                          className="mt-1 size-4 accent-primary"
                        />
                        <span className="text-foreground">{option.label_ar}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowResult(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13.5px] font-extrabold text-primary-foreground transition hover:opacity-90"
          >
            <Play className="size-4" aria-hidden="true" />
            اعرض النتيجة الاستكشافية
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers(DISCOVERY_QUESTIONS.map(() => null));
              setShowResult(false);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-[13.5px] font-extrabold text-foreground transition hover:border-primary/50"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            إعادة الاختيار
          </button>
          <span className="text-[12.5px] font-bold text-muted-foreground" role="status">
            أجبت عن {result.answered} من {result.total} أسئلة
          </span>
        </div>

        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">{CAREERS_QUIZ_HUB_COPY.discoveryNote}</p>

        {showResult ? (
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4" role="status">
            <p className="text-[14px] font-extrabold text-foreground">{result.verdict_ar}</p>
            <ul className="mt-3 space-y-3">
              {result.entries.slice(0, 3).map((entry) => (
                <li key={entry.family.id} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[13.5px] font-extrabold text-foreground">
                    {entry.family.label_ar}
                    <span className="ms-2 text-[12px] font-bold text-muted-foreground">تقارب {entry.percent}%</span>
                  </p>
                  <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{entry.family.lead_ar}</p>
                  <p className="mt-2 flex flex-wrap gap-2">
                    {entry.careers.map((career) => (
                      <Link
                        key={career.slug}
                        to={`/careers/${career.slug}`}
                        className="rounded-full border border-border px-3 py-1 text-[12px] font-bold text-foreground hover:border-primary/50"
                      >
                        {career.title_ar}
                      </Link>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
              النسب تعبّر عن اختياراتك في هذا الاستكشاف فقط، ولا تعني أهليتك ولا فرص قبولك في أي مسار.
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-10" aria-labelledby="career-quizzes-title">
        <h2 id="career-quizzes-title" className="text-[18px] font-black text-foreground">
          {CAREERS_QUIZ_HUB_COPY.careersListTitle}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((career) => {
            const terms = getCareerTerms(career).slice(0, 3);
            return (
              <li key={career.slug} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[14px] font-extrabold text-foreground">{career.title_ar}</p>
                <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{career.short_description}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {terms.map((term) => (
                    <Link
                      key={term.id}
                      to={`/lexicon/${term.slug}`}
                      className="rounded-full border border-border px-2.5 py-0.5 text-[11.5px] font-bold text-foreground hover:border-primary/50"
                    >
                      {term.term_ar}
                    </Link>
                  ))}
                </p>
                <p className="mt-3 flex flex-wrap gap-3 text-[12.5px] font-extrabold">
                  <Link className="text-primary" to={`/quiz/careers/${career.quiz_config.career_quiz_slug}`}>
                    ابدأ الاختبار التعليمي
                  </Link>
                  <Link className="text-foreground hover:text-primary" to={`/careers/${career.slug}`}>
                    عرض المسار
                  </Link>
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="career-quiz-families-title">
        <h2 id="career-quiz-families-title" className="text-[18px] font-black text-foreground">
          عائلات المسارات المهنية
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAREER_FAMILIES.map((family) => (
            <li key={family.id} className="rounded-2xl border border-border bg-card p-4 text-[12.5px] leading-6">
              <p className="text-[13.5px] font-extrabold text-foreground">{family.label_ar}</p>
              <p className="mt-1 text-muted-foreground">{family.lead_ar}</p>
            </li>
          ))}
        </ul>
      </section>

      <CareerDisclaimer className="mt-10" variant="quiz" />
    </main>
  );
}

export default CareerQuizHubPage;
