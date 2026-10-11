import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  DoorOpen,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Hourglass,
  Landmark,
  ShieldCheck,
  Store,
} from "lucide-react";
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
  CAREERS_NO_VERIFIED_COMPETITION,
  COMPETITION_PATH_LABELS,
  DEGREE_LEVEL_LABELS,
  REQUIREMENT_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  SECTION_TITLES,
  buildCareerAnswerFirst,
  buildCareerOccupationSchema,
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
  if (requirement.status !== "verified") badges.push("يحتاج إلى تحقق");
  return [...new Set(badges)];
}

/** قسم بعنوان واحد وخط فاصل؛ المسافة نفسها على كل الشاشات. */
function Section({ id, title, icon, className = "", children }: { id: string; title: string; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`scroll-mt-24 border-t border-border pt-10 sm:pt-12 ${className}`}>
      <h2 id={id} className="inline-flex items-center gap-2 text-2xl font-black leading-snug text-foreground sm:text-3xl">
        {icon}
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
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
      career.entry_method_ar ?? COMPETITION_PATH_LABELS[career.quiz_config.competition_path] ?? "تحقق من الجهة المختصة",
    ],
    ["شرط السن", career.age_requirement.note_ar],
    ["آخر مراجعة", career.last_reviewed],
    ["حالة التحقق", REVIEW_STATUS_LABELS[career.review_status] ?? career.review_status],
  ];

  const factMap = Object.fromEntries(facts) as Record<string, string>;
  const KEY_ANSWERS = [
    { key: "work", label: "طبيعة العمل", icon: Briefcase },
    { key: "degree", label: "الشهادة المعتادة", icon: GraduationCap },
    { key: "entry", label: "طريقة الولوج", icon: DoorOpen },
  ] as const;
  const DETAIL_FACTS: Array<{ label: string; icon: typeof Store; tone?: "ok" | "warn" }> = [
    { label: "هل يمكن العمل الحر؟", icon: Store },
    { label: "أين يمكن العمل؟", icon: Building2 },
    // الشارات مشتقّة من بيانات المسار نفسه: لا تُعلن «موثّق» إلا عند التحقق من النص الرسمي.
    ...(career.age_requirement.has_requirement
      ? [{ label: "شرط السن", icon: Hourglass, tone: "warn" as const }]
      : [{ label: "شرط السن", icon: Hourglass }]),
    { label: "آخر مراجعة", icon: CalendarDays },
    {
      label: "حالة التحقق",
      icon: ShieldCheck,
      tone: career.review_status === "official_text_verified" || career.review_status === "verified" ? ("ok" as const) : ("warn" as const),
    },
  ];

  return (
    <main className="container-wide py-6 sm:py-10 lg:py-14" dir="rtl" data-page="career-detail" data-career={career.slug}>
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
            about: buildCareerOccupationSchema(career),
          },
        ]}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "المسارات المهنية", url: CAREERS_HUB_PATH },
          { name: career.title_ar, url: `/careers/${career.slug}` },
        ]}
      />

      <nav aria-label="مسار التصفح" className="text-base font-semibold text-muted-foreground">
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

      {/* الهيرو: بطاقة واحدة بعرض الصفحة؛ الحقائق تأتي في القسم التالي */}
      <header className="mt-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 lg:p-10">
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-5xl">
            كيف تصبح {career.title_ar} في المغرب؟
          </h1>
          <p className="mt-3 text-lg font-bold text-muted-foreground" dir="ltr">
            {career.title_fr}
          </p>
          <p className="mt-5 text-lg leading-relaxed text-foreground sm:text-xl">{buildCareerAnswerFirst(career)}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-base font-bold">
            <span className="rounded-full bg-primary/10 px-4 py-1.5 text-primary">{career.work_model_ar}</span>
            {career.requirements.some((requirement) => requirement.requirement_type === "annual_notice") ? (
              <span className="rounded-full bg-amber-500/10 px-4 py-1.5 text-amber-700 dark:text-amber-500">
                {CAREERS_ANNUAL_NOTICE_BADGE}
              </span>
            ) : null}
          </div>
          <CareerDisclaimer className="mt-6" />
        </div>

      </header>

      {/* قفزات سريعة: تظهر القوانين أولاً، والبقية بنقرة واحدة على الهاتف واللوح والحاسوب */}
      <nav aria-label="أقسام الصفحة" className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {[
            ["#career-laws-title", "القوانين والمراجع"],
            ["#career-facts-title", "بطاقة المسار باختصار"],
            ["#career-requirements-title", "الشروط والمصادر"],
            ["#career-quiz-title", "الاختبار"],
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 py-2 text-base font-bold text-foreground transition hover:border-primary/50 hover:text-primary"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <CareerLaws career={career} className="mt-10 sm:mt-12" />

      <Section id="career-facts-title" title={SECTION_TITLES.keyFacts} className="mt-12 sm:mt-16">
        {/* الأجوبة الثلاثة الأهم في الأعلى، ثم التفاصيل مع شارات حالة سريعة */}
        {/* الأجوبة الثلاثة: كل واحد في سطر كامل، الأيقونة بجانب العنوان والقيمة */}
        <ul className="grid grid-cols-1 gap-4">
          {KEY_ANSWERS.map(({ label, icon: Icon, key }) => (
            <li
              key={key}
              className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:gap-6 sm:p-6"
            >
              <span className="absolute inset-y-0 start-0 w-1 bg-primary" aria-hidden="true" />
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-black leading-snug text-foreground sm:text-2xl">{factMap[label]}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* كل تفصيلة في سطر كامل، بالشكل نفسه لبطاقة «طريقة الولوج» */}
        <ul className="mt-4 grid grid-cols-1 gap-4">
          {DETAIL_FACTS.map(({ label, icon: Icon, tone }) => (
            <li key={label} className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
              <span className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-bold text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-black leading-snug text-foreground sm:text-2xl">{factMap[label]}</p>
              {tone ? (
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1 text-base font-extrabold ${
                    tone === "warn"
                      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                      : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                  }`}
                >
                  {tone === "warn" ? "يحتاج إلى تحقق" : "موثّق"}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <CareerRoadmapTimeline steps={career.entry_path} className="mt-12 sm:mt-16" />

      <Section id="career-skills-title" title={SECTION_TITLES.skills} className="mt-12 sm:mt-16">
        <ul className="flex flex-wrap gap-2 sm:gap-3">
          {career.skills.map((skill) => (
            <li key={skill} className="rounded-full border border-border bg-card px-4 py-2 text-base font-bold text-foreground">
              {skill}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="career-fit-title" title={SECTION_TITLES.fit} icon={<HelpCircle className="size-6 text-primary" aria-hidden="true" />} className="mt-12 sm:mt-16">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-8">
          <ul className="grid gap-4 md:grid-cols-2">
            {career.best_for.map((line) => (
              <li key={line} className="flex gap-3 text-lg leading-relaxed text-foreground">
                <BadgeCheck className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-lg font-bold leading-relaxed text-emerald-800 dark:text-emerald-200">
            هذا وصف تعليمي لطبيعة المسار، وليس تقييماً لأهليتك أو ترجيحاً لقبولك.
          </p>
        </div>
      </Section>

      <CareerLexiconTerms career={career} className="mt-12 sm:mt-16" />

      {career.requires_legal_education !== "not_required" ? (
        <NearbyLawSchools career={career} className="mt-12 sm:mt-16" />
      ) : null}

      <Section id="career-quiz-title" title={SECTION_TITLES.quiz} className="mt-12 sm:mt-16">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <p className="text-lg leading-relaxed text-muted-foreground">
            تمارين تعليمية أعدتها ميزان حول مفاهيم هذا المسار. لا تمثل اختباراً رسمياً ولا تضمن القبول في أي مباراة أو
            تولي أي مهام.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-lg font-extrabold text-primary-foreground transition hover:opacity-90"
              to={`/quiz/careers/${career.quiz_config.career_quiz_slug}`}
            >
              <BookOpen className="size-5" aria-hidden="true" />
              اختبر معلوماتك عن مهنة {career.title_ar}
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-6 py-3 text-lg font-extrabold text-foreground transition hover:border-primary/50"
              to={CAREERS_HUB_PATH}
            >
              كل المسارات المهنية
            </Link>
          </div>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {verifiedCompetition
              ? "توجد مباراة موثقة بمصدر رسمي في قاعدة ميزان لهذا المسار؛ يمكنك فتح صفحة التمارين المرتبطة بها."
              : CAREERS_NO_VERIFIED_COMPETITION}
          </p>
          {verifiedCompetition ? (
            <Link
              className="mt-3 inline-flex min-h-11 items-center text-lg font-extrabold text-primary underline underline-offset-4"
              to={`/quiz/careers/${career.slug}/practice/${verifiedCompetition.id}`}
            >
              فتح تمارين المباراة الموثقة
            </Link>
          ) : null}
        </div>
      </Section>


      <Section
        id="career-requirements-title"
        title={SECTION_TITLES.requirements}
        icon={<ShieldCheck className="size-6 text-primary" aria-hidden="true" />}
        className="mt-12 sm:mt-16"
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {career.requirements.map((requirement) => (
            <li key={requirement.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {requirementBadges(requirement).map((badge) => (
                  <span key={badge} className="rounded-full bg-muted px-3 py-1 text-base font-bold text-foreground">
                    {badge}
                  </span>
                ))}
              </div>
              <h3 className="text-xl font-black leading-snug text-foreground">{requirement.label_ar}</h3>
              {REQUIREMENT_TYPE_LABELS[requirement.requirement_type] ? (
                <p className="text-base font-bold text-muted-foreground">{REQUIREMENT_TYPE_LABELS[requirement.requirement_type]}</p>
              ) : null}
              <p className="text-lg leading-relaxed text-foreground">{requirement.value_ar}</p>
              <div className="mt-auto border-t border-border pt-4 text-base">
                {requirement.source_url ? (
                  <a
                    className="inline-flex min-h-11 items-center font-extrabold text-primary underline underline-offset-4"
                    href={requirement.source_url}
                    target="_blank"
                    rel="nofollow noopener"
                  >
                    المصدر الرسمي
                  </a>
                ) : requirement.source_ref_ar ? (
                  <span className="font-bold leading-relaxed text-foreground">{requirement.source_ref_ar}</span>
                ) : (
                  <span className="font-bold leading-relaxed text-emerald-800 dark:text-emerald-200">{CAREERS_NO_SOURCE_NOTE}</span>
                )}
                {requirement.last_verified ? (
                  <span className="mt-1 block text-base text-muted-foreground">آخر تحقق: {requirement.last_verified}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 sm:p-8">
          <h3 className="inline-flex items-center gap-2 text-2xl font-black text-foreground">
            <Landmark className="size-6 text-primary" aria-hidden="true" />
            المصادر والإطارات المرجعية
          </h3>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {career.sources.map((source) => {
              const SourceIcon = source.source_type === "professional_body" ? Building2 : Landmark;
              const kindLabel = source.source_type === "professional_body" ? "هيئة مهنية" : "نص رسمي";
              const verified = source.status === "verified";
              return (
                <li key={source.title_ar} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <SourceIcon className="size-6" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-base font-bold text-foreground">{kindLabel}</span>
                  </div>

                  <h4 className="text-xl font-extrabold leading-snug text-foreground">{source.title_ar}</h4>

                  <dl className="grid gap-3 border-t border-border pt-4 text-base">
                    <div>
                      <dt className="font-bold text-muted-foreground">الحالة</dt>
                      <dd className="mt-1">
                        <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 font-extrabold text-emerald-800 dark:text-emerald-200">
                          {verified ? "مؤكد رسمياً" : (source.verification_note_ar ?? CAREERS_NO_SOURCE_NOTE)}
                        </span>
                      </dd>
                    </div>

                    {source.last_verified ? (
                      <div>
                        <dt className="font-bold text-muted-foreground">آخر تحقق</dt>
                        <dd className="mt-1 font-bold text-foreground">{source.last_verified}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {source.url ? (
                    <a
                      className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-lg font-extrabold text-primary-foreground hover:opacity-90"
                      href={source.url}
                      target="_blank"
                      rel="nofollow noopener"
                    >
                      فتح المصدر الرسمي
                      <ExternalLink className="size-5" aria-hidden="true" />
                      <span className="sr-only">: {source.title_ar}</span>
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-6 rounded-2xl bg-card p-5 text-lg leading-relaxed text-foreground">
            {career.status_note_ar ??
              "الشرط الرقمي (سن أو شهادة أو عدد مناصب) لا يُعرض هنا ما لم يكن منشوراً في مصدر رسمي متحقق منه؛ لذلك تبقى القيم الرق"}
          </p>
        </div>
      </Section>

      <CareerTrainingPlan career={career} className="mt-12 sm:mt-16" />

      {related.length ? (
        <Section
          id="career-related-title"
          title={SECTION_TITLES.related}
          icon={<Briefcase className="size-6 text-primary" aria-hidden="true" />}
          className="mt-12 sm:mt-16"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {related.map((item) => (
              <CareerCard key={item.slug} career={item} />
            ))}
          </div>
        </Section>
      ) : null}

      <div className="mt-12 border-t border-border pt-10 sm:mt-16 sm:pt-12">
        <CareerDisclaimer />
      </div>
    </main>
  );
}

export default CareerDetailPage;
