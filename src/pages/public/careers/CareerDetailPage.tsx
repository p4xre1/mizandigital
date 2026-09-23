import { Link, useParams } from "react-router-dom";
import { BadgeCheck, BookOpen, Briefcase, Compass, HelpCircle, ShieldCheck } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { canonicalFor } from "@/lib/canonical";
import { CareerDisclaimer } from "@/components/careers/CareerDisclaimer";
import { CareerLexiconTerms } from "@/components/careers/CareerLexiconTerms";
import { CareerLaws } from "@/components/careers/CareerLaws";
import { CareerRoadmapTimeline } from "@/components/careers/CareerRoadmapTimeline";
import { CareerTrainingPlan } from "@/components/careers/CareerTrainingPlan";
import { NearbyLawSchools } from "@/components/careers/NearbyLawSchools";
import { NotFound } from "@/pages/public/NotFound";
import {
  CAREERS_ANNUAL_NOTICE_BADGE,
  CAREERS_HUB_PATH,
  CAREERS_NO_SOURCE_NOTE,
  CAREERS_VERIFY_BADGE,
  COMPETITION_PATH_LABELS,
  DEGREE_LEVEL_LABELS,
  REQUIREMENT_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  SECTION_TITLES,
  buildCareerAnswerFirst,
  buildCareerPageDescription,
  buildCareerPageTitle,
} from "../../../../shared/careers/copy.js";
import { getCareerBySlug, getRelatedCareers, getCompetitionsForCareer, isCompetitionVerified } from "@/lib/careers/data";
import { CareerCard } from "@/components/careers/CareerCard";
import type { CareerRequirement } from "@/lib/careers/types";

/**
 * /careers/:slug — صفحة مسار مهني واحد.
 *
 * ترتيب الأقسام يطابق مواصفة الميزة: بطاقة الحقائق، ثم خطوات المسار (قائمة
 * مرتّبة ديناميكية)، ثم المهارات، ثم «هل يناسبك؟»، ثم مصطلحات القاموس، ثم
 * أقرب الكليات (إن كان المسار مرتبطاً بدراسة القانون)، ثم الاختبار، ثم
 * الشروط والمصادر، ثم المهن القريبة، ثم إخلاء المسؤولية.
 *
 * لا يوجد أي JobPosting في البيانات المهيكلة: لا إعلان توظيف حقيقي هنا،
 * والصفحة تعليمية.
 */
function requirementBadges(requirement: CareerRequirement): string[] {
  const badges: string[] = [];
  const type = requirement.requirement_type;
  if (type === "legal_text") badges.push("قانون");
  if (type === "annual_notice") badges.push("إعلان سنوي");
  if (type === "legal_or_annual_notice") badges.push("قانون", "إعلان سنوي");
  if (type === "professional_registration") badges.push("تسجيل مهني");
  if (type === "institution_practice") badges.push("مسطرة مؤسسية");
  if (type === "private_employer") badges.push("شروط مشغل خاص");
  badges.push("يحتاج إلى تحقق");
  return [...new Set(badges)];
}

export function CareerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const career = getCareerBySlug(slug ? decodeURIComponent(slug) : undefined);

  if (!career) {
    return <NotFound />;
  }

  const related = getRelatedCareers(career, 3);
  const competitions = getCompetitionsForCareer(career.id);
  const verifiedCompetition = competitions.find((record) => isCompetitionVerified(record));
  const canonical = canonicalFor(`/careers/${career.slug}`);
  const description = buildCareerPageDescription(career);

  const facts: Array<[string, string]> = [
    ["طبيعة العمل", career.work_model_ar],
    [
      "هل يمكن العمل الحر؟",
      career.can_freelance
        ? "ممكن داخل إطار تنظيمي بعد استيفاء شروط الولوج والتسجيل المهني."
        : "غير مطروح في هذا المسار؛ العلاقة نظامية أو مؤسسية.",
    ],
    ["أين يمكن العمل؟", career.employment_modes.join("، ")],
    ["الشهادة المعتادة", `${DEGREE_LEVEL_LABELS[career.typical_degree.level] ?? career.typical_degree.level} — ${career.typical_degree.label_ar}`],
    [
      "طريقة الولوج",
      COMPETITION_PATH_LABELS[career.quiz_config.competition_path] ?? "تحقق من الجهة المختصة",
    ],
    ["شرط السن", career.age_requirement.note_ar],
    ["آخر مراجعة", career.last_reviewed],
    ["حالة التحقق", REVIEW_STATUS_LABELS[career.review_status] ?? career.review_status],
  ];

  return (
    <main className="container-wide py-10" dir="rtl" data-page="career-detail" data-career={career.slug}>
      <SEOHead
        title={buildCareerPageTitle(career.title_ar)}
        description={description}
        canonicalUrl={canonical}
        modifiedTime={career.last_reviewed}
        keywords={[career.title_ar, career.title_fr, `شروط ${career.title_ar}`, "المهن القانونية في المغرب"]}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: buildCareerPageTitle(career.title_ar),
            headline: `كيف تصبح ${career.title_ar} في المغرب؟`,
            description,
            url: canonical,
            inLanguage: "ar-MA",
            dateModified: career.last_reviewed,
            isAccessibleForFree: true,
            about: { "@type": "Occupation", name: career.title_ar, alternateName: career.title_fr },
          },
        ]}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "المسارات المهنية", url: CAREERS_HUB_PATH },
          { name: career.title_ar, url: `/careers/${career.slug}` },
        ]}
      />

      <nav aria-label="مسار التصفح" className="mb-5 text-[12.5px] font-bold text-muted-foreground">
        <Link className="hover:text-foreground" to="/">
          الرئيسية
        </Link>
        <span className="mx-2">/</span>
        <Link className="hover:text-foreground" to={CAREERS_HUB_PATH}>
          المسارات المهنية
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{career.title_ar}</span>
      </nav>

      <header className="rounded-3xl border border-border bg-gradient-to-l from-primary/10 via-card to-amber-500/10 p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Compass className="size-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[26px] font-black leading-[1.3] text-foreground md:text-[32px]">
          كيف تصبح {career.title_ar} في المغرب؟
        </h1>
        <p className="mt-2 text-[13px] font-bold text-muted-foreground" dir="ltr">
          {career.title_fr}
        </p>
        <p className="mt-3 max-w-3xl text-[14px] leading-8 text-foreground">{buildCareerAnswerFirst(career)}</p>
        <p className="mt-3 flex flex-wrap gap-2 text-[12px] font-bold">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{career.work_model_ar}</span>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-500">
            {CAREERS_VERIFY_BADGE}
          </span>
          {career.requirements.some((requirement) => requirement.requirement_type === "annual_notice") ? (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-500">
              {CAREERS_ANNUAL_NOTICE_BADGE}
            </span>
          ) : null}
        </p>
        <CareerDisclaimer className="mt-5 max-w-3xl" />
      </header>

      <section className="mt-10" aria-labelledby="career-facts-title">
        <h2 id="career-facts-title" className="text-[18px] font-black text-foreground">
          {SECTION_TITLES.keyFacts}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-right text-[13px]">
            <caption className="sr-only">بطاقة معلومات {career.title_ar}</caption>
            <thead>
              <tr className="bg-muted/40">
                <th scope="col" className="border border-border p-3 font-extrabold">
                  المعلومة
                </th>
                <th scope="col" className="border border-border p-3 font-extrabold">
                  التفاصيل
                </th>
              </tr>
            </thead>
            <tbody>
              {facts.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row" className="w-[30%] border border-border p-3 text-right font-bold align-top">
                    {label}
                  </th>
                  <td className="border border-border p-3 leading-7 text-muted-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CareerRoadmapTimeline steps={career.entry_path} className="mt-10" />

      <section className="mt-10" aria-labelledby="career-skills-title">
        <h2 id="career-skills-title" className="text-[18px] font-black text-foreground">
          {SECTION_TITLES.skills}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {career.skills.map((skill) => (
            <li key={skill} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-bold text-foreground">
              {skill}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="career-fit-title">
        <h2 id="career-fit-title" className="inline-flex items-center gap-2 text-[18px] font-black text-foreground">
          <HelpCircle className="size-4 text-primary" aria-hidden="true" />
          {SECTION_TITLES.fit}
        </h2>
        <ul className="mt-3 space-y-2">
          {career.best_for.map((line) => (
            <li key={line} className="flex gap-2 text-[13.5px] leading-7 text-muted-foreground">
              <BadgeCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] font-bold text-amber-700 dark:text-amber-500">
          هذا وصف تعليمي لطبيعة المسار، وليس تقييماً لأهليتك أو ترجيحاً لقبولك.
        </p>
      </section>

      <CareerLexiconTerms career={career} className="mt-10" />

      {career.requires_legal_education !== "not_required" ? (
        <NearbyLawSchools career={career} className="mt-10" />
      ) : null}

      <section className="mt-10 rounded-3xl border border-border bg-card p-5" aria-labelledby="career-quiz-title">
        <h2 id="career-quiz-title" className="text-[18px] font-black text-foreground">
          {SECTION_TITLES.quiz}
        </h2>
        <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
          تمارين تعليمية أعدتها ميزان حول مفاهيم هذا المسار. لا تمثل اختباراً رسمياً ولا تضمن القبول في أي مباراة أو
          تولي أي مهام.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13.5px] font-extrabold text-primary-foreground transition hover:opacity-90"
            to={`/quiz/careers/${career.quiz_config.career_quiz_slug}`}
          >
            <BookOpen className="size-4" aria-hidden="true" />
            اختبر معلوماتك عن مهنة {career.title_ar}
          </Link>
          <Link
            className="inline-flex min-h-10 items-center rounded-xl border border-border px-5 py-2.5 text-[13.5px] font-extrabold text-foreground transition hover:border-primary/50"
            to={CAREERS_HUB_PATH}
          >
            كل المسارات المهنية
          </Link>
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {verifiedCompetition
            ? "توجد مباراة موثقة بمصدر رسمي في قاعدة ميزان لهذا المسار؛ يمكنك فتح صفحة التمارين المرتبطة بها."
            : "لا توجد مباراة رسمية مؤكدة حالياً في قاعدة بيانات ميزان. يمكنك التدريب على المفاهيم والمهارات المرتبطة بهذا المسار."}
        </p>
        {verifiedCompetition ? (
          <Link className="mt-2 inline-block text-[13px] font-extrabold text-primary" to={`/quiz/careers/${career.slug}/practice/${verifiedCompetition.id}`}>
            فتح تمارين المباراة الموثقة
          </Link>
        ) : null}
      </section>

      <CareerLaws career={career} className="mt-10" />

      <section className="mt-10" aria-labelledby="career-requirements-title">
        <h2
          id="career-requirements-title"
          className="inline-flex items-center gap-2 text-[18px] font-black text-foreground"
        >
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          {SECTION_TITLES.requirements}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-right text-[13px]">
            <caption className="sr-only">الشروط والمصادر لمهنة {career.title_ar}</caption>
            <thead>
              <tr className="bg-muted/40">
                <th scope="col" className="border border-border p-3 font-extrabold">
                  الشرط
                </th>
                <th scope="col" className="border border-border p-3 font-extrabold">
                  النوع
                </th>
                <th scope="col" className="border border-border p-3 font-extrabold">
                  التفصيل
                </th>
                <th scope="col" className="border border-border p-3 font-extrabold">
                  المصدر
                </th>
              </tr>
            </thead>
            <tbody>
              {career.requirements.map((requirement) => (
                <tr key={requirement.id}>
                  <th scope="row" className="border border-border p-3 text-right font-bold align-top">
                    {requirement.label_ar}
                  </th>
                  <td className="border border-border p-3 align-top">
                    <span className="flex flex-wrap gap-1.5">
                      {requirementBadges(requirement).map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-bold text-foreground"
                        >
                          {badge}
                        </span>
                      ))}
                    </span>
                    <span className="mt-1 block text-[11.5px] text-muted-foreground">
                      {REQUIREMENT_TYPE_LABELS[requirement.requirement_type] ?? ""}
                    </span>
                  </td>
                  <td className="border border-border p-3 leading-7 text-muted-foreground align-top">
                    {requirement.value_ar}
                  </td>
                  <td className="border border-border p-3 align-top text-[12.5px]">
                    {requirement.source_url ? (
                      <a className="font-bold text-primary" href={requirement.source_url} target="_blank" rel="nofollow noopener">
                        المصدر الرسمي
                      </a>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-500">{CAREERS_NO_SOURCE_NOTE}</span>
                    )}
                    {requirement.last_verified ? (
                      <span className="mt-1 block text-[11.5px] text-muted-foreground">
                        آخر تحقق: {requirement.last_verified}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-5 text-[15px] font-extrabold text-foreground">المصادر والإطارات المرجعية</h3>
        <ul className="mt-2 space-y-2">
          {career.sources.map((source) => (
            <li key={source.title_ar} className="rounded-2xl border border-border bg-card p-3 text-[12.5px]">
              <p className="font-bold text-foreground">{source.title_ar}</p>
              <p className="mt-1 text-muted-foreground">
                {source.url ? (
                  <a className="font-bold text-primary" href={source.url} target="_blank" rel="nofollow noopener">
                    {source.url}
                  </a>
                ) : (
                  CAREERS_NO_SOURCE_NOTE
                )}
                {source.last_verified ? ` — آخر تحقق: ${source.last_verified}` : ""}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] leading-6 text-muted-foreground">
          الشرط الرقمي (سن أو شهادة أو عدد مناصب) لا يُعرض هنا ما لم يكن منشوراً في مصدر رسمي متحقق منه؛ لذلك تبقى
          القيم الرقمية فارغة عن قصد.
        </p>
      </section>

      <CareerTrainingPlan career={career} className="mt-10" />

      {related.length ? (
        <section className="mt-10" aria-labelledby="career-related-title">
          <h2
            id="career-related-title"
            className="inline-flex items-center gap-2 text-[18px] font-black text-foreground"
          >
            <Briefcase className="size-4 text-primary" aria-hidden="true" />
            {SECTION_TITLES.related}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {related.map((item) => (
              <CareerCard key={item.slug} career={item} />
            ))}
          </div>
        </section>
      ) : null}

      <CareerDisclaimer className="mt-10" />
    </main>
  );
}

export default CareerDetailPage;
