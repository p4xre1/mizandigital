import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarClock, Play, ShieldAlert } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { canonicalFor } from "@/lib/canonical";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { CareerDisclaimer } from "@/components/careers/CareerDisclaimer";
import { NotFound } from "@/pages/public/NotFound";
import { useQuizQuestions } from "@/hooks/useQuizQuestions";
import { useQuizProgress } from "@/hooks/useQuizProgress";
import {
  getCareerBySlug,
  getCompetitionById,
  isCompetitionVerified,
} from "@/lib/careers/data";
import {
  CAREERS_HUB_PATH,
  CAREERS_NO_VERIFIED_COMPETITION,
  COMPETITION_STATUS_LABELS,
  attemptLabelForCompetition,
  buildCompetitionPageDescription,
  buildCompetitionPageTitle,
} from "../../../../shared/careers/copy.js";

/**
 * /quiz/careers/:careerSlug/practice/:competitionId
 *
 * تمارين المباريات لا تُعرض إلا عند وجود سجل مباراة موثّق رسمياً
 * (official_notice_url + source_verified_at + last_reviewed، وتاريخ إعلان
 * للفئة open/upcoming). أي سجل غير موثّق — وهو حال كل السجلات الحالية —
 * يعرض النصّ الآمن مع شارة «تحقق من المصدر الرسمي»، ولا يعرض أي موعد ولا
 * عدد مناصب ولا شرط مُفبرك.
 */
export function CareerCompetitionPracticePage() {
  const { careerSlug, competitionId } = useParams<{ careerSlug: string; competitionId: string }>();
  const career = getCareerBySlug(careerSlug ? decodeURIComponent(careerSlug) : undefined);
  const record = getCompetitionById(competitionId ? decodeURIComponent(competitionId) : undefined);
  const { questions } = useQuizQuestions();
  const { recentQuestionIds } = useQuizProgress();
  const [started, setStarted] = useState(false);

  const verified = isCompetitionVerified(record);
  const pool = useMemo(() => {
    if (!career) return [];
    if (!verified) return [];
    return questions.filter((question) => {
      const meta = question as typeof question & { competition_id?: string | null; quiz_type?: string };
      return meta.quiz_type === "competition_practice" && meta.competition_id === record?.id;
    });
  }, [career, questions, record?.id, verified]);

  if (!career || !record || record.career_id !== career.id) {
    return <NotFound />;
  }

  const statusLabel = COMPETITION_STATUS_LABELS[record.status] ?? COMPETITION_STATUS_LABELS.unverified;
  const canonical = canonicalFor(`/quiz/careers/${career.slug}/practice/${record.id}`);

  if (started && verified && pool.length >= 8) {
    return (
      <main className="container-wide py-10" dir="rtl" data-page="career-competition-practice">
        <SEOHead
          title={buildCompetitionPageTitle(career.title_ar)}
          description={buildCompetitionPageDescription(career.title_ar)}
          canonicalUrl={canonical}
        />
        <QuizRunner
          questions={pool}
          mode="concours"
          label={attemptLabelForCompetition(record.id)}
          tier="concours"
          questionCount={10}
          excludeIds={recentQuestionIds}
          onExit={() => setStarted(false)}
          onComplete={() => {
            // التسجيل يتم داخل QuizRunner (محلياً + submit_quiz_attempt الآمنة).
            setStarted(false);
          }}
        />
        <CareerDisclaimer className="mt-6" variant="quiz" />
      </main>
    );
  }

  const careerKnowledgeHref = `/quiz/careers/${career.slug}`;

  return (
    <main className="container-wide py-10" dir="rtl" data-page="career-competition-practice">
      <SEOHead
        title={buildCompetitionPageTitle(career.title_ar)}
        description={buildCompetitionPageDescription(career.title_ar)}
        canonicalUrl={canonical}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: buildCompetitionPageTitle(career.title_ar),
            description: buildCompetitionPageDescription(career.title_ar),
            url: canonical,
            inLanguage: "ar-MA",
            isAccessibleForFree: true,
          },
        ]}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "المسارات المهنية", url: CAREERS_HUB_PATH },
          { name: career.title_ar, url: careerKnowledgeHref },
        ]}
      />

      <nav aria-label="مسار التصفح" className="mb-5 text-[12.5px] font-bold text-muted-foreground">
        <Link className="hover:text-foreground" to={`/quiz/careers/${career.slug}`}>
          اختبار {career.title_ar}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">تمارين المباراة</span>
      </nav>

      <header className="rounded-3xl border border-border bg-gradient-to-l from-primary/10 via-card to-amber-500/10 p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <CalendarClock className="size-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[24px] font-black leading-[1.3] text-foreground md:text-[30px]">
          {record.title_ar}
        </h1>
        <p className="mt-3 inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-[12.5px] font-extrabold text-amber-700 dark:text-amber-500">
          {statusLabel}
        </p>
        <p className="mt-3 max-w-3xl text-[14px] leading-8 text-foreground">
          {verified
            ? "توجد بيانات إعلان رسمي موثقة لهذا السجل في قاعدة ميزان؛ يمكن عرض التمارين التعليمية المرتبطة به."
            : CAREERS_NO_VERIFIED_COMPETITION}
        </p>
        {record.note_ar ? (
          <p className="mt-2 max-w-3xl text-[13px] leading-7 text-muted-foreground">{record.note_ar}</p>
        ) : null}
        <CareerDisclaimer className="mt-5 max-w-3xl" variant="quiz" />
      </header>

      <section className="mt-8 rounded-3xl border border-border bg-card p-5" aria-labelledby="competition-state-title">
        <h2 id="competition-state-title" className="text-[18px] font-black text-foreground">
          حالة المباراة في قاعدة ميزان
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-3">
            <dt className="text-[11.5px] font-bold text-muted-foreground">الإعلان الرسمي</dt>
            <dd className="text-[13px] font-bold text-foreground">
              {record.official_notice_url ? (
                <a href={record.official_notice_url} target="_blank" rel="nofollow noopener" className="text-primary">
                  رابط الإعلان الرسمي
                </a>
              ) : (
                "لم يُضف رابط إعلان رسمي بعد"
              )}
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3">
            <dt className="text-[11.5px] font-bold text-muted-foreground">تاريخ الإعلان الرسمي</dt>
            <dd className="text-[13px] font-bold text-foreground">{record.official_notice_date ?? "غير متوفر"}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3">
            <dt className="text-[11.5px] font-bold text-muted-foreground">تاريخ تحقق المصدر</dt>
            <dd className="text-[13px] font-bold text-foreground">{record.source_verified_at ?? "غير متحقق منه بعد"}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3">
            <dt className="text-[11.5px] font-bold text-muted-foreground">آخر مراجعة</dt>
            <dd className="text-[13px] font-bold text-foreground">{record.last_reviewed}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[12.5px] leading-6 text-muted-foreground">{record.disclaimer_ar}</p>

        {verified ? (
          pool.length >= 8 ? (
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              <Play className="size-4" aria-hidden="true" />
              ابدأ تمارين المباراة ({pool.length} سؤالاً)
            </button>
          ) : (
            <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-[13px] leading-7 text-foreground">
              الإعلان موثق، لكن بنك ميزان لا يحتوي بعد 8 أسئلة تدريبية لهذه المباراة، فلا يُفعَّل الاختبار (نتجنب
              تمريناً ناقصاً يبدو رسمياً).
            </p>
          )
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-[13px] leading-7 text-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              لا تُعرض أي مواعيد أو شروط أو عدد مناصب هنا، لأن ميزان لا يحفظ إعلاناً رسمياً مؤكداً لهذا السجل. راجع
              الجهة المنظمة الرسمية مباشرة قبل أي ترشح.
            </span>
          </p>
        )}

        <p className="mt-4 text-[13px] font-bold">
          <Link className="text-primary" to={careerKnowledgeHref}>
            التدريب على مفاهيم {career.title_ar} التعليمية →
          </Link>
        </p>
      </section>

      <CareerDisclaimer className="mt-10" variant="quiz" />
    </main>
  );
}

export default CareerCompetitionPracticePage;
