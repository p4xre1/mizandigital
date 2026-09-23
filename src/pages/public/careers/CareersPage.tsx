import { Link } from "react-router-dom";
import { ArrowLeftRight, Compass, GitBranch, ListChecks } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { canonicalFor } from "@/lib/canonical";
import { CareerDisclaimer } from "@/components/careers/CareerDisclaimer";
import { CareerFilters } from "@/components/careers/CareerFilters";
import { NearbyLawSchools } from "@/components/careers/NearbyLawSchools";
import { CAREERS, CAREER_CATEGORIES, CAREER_COMPETITIONS } from "@/lib/careers/data";
import { CAREERS_HUB_COPY, CAREERS_HUB_PATH } from "../../../../shared/careers/copy.js";

/**
 * /careers — دليل المسارات والمهن القانونية في المغرب.
 *
 * البنية تتبع مطلب الميزة حرفياً: جواب مباشر بعد H1، ثم الفلاتر، ثم البطاقات،
 * ثم مقارنة (حرة/عمومية/تقنية)، ثم الفرق بين الشهادة والمباراة، ثم شجرة القرار،
 * ثم أقرب الكليات، ثم الأسئلة الشائعة، ثم إخلاء المسؤولية والروابط الداخلية.
 *
 * النصّ نفسه (العناوين والجواب المباشر والأسئلة) يأتي من shared/careers/copy.js
 * — الوحدة التي يقرأها مولّد HTML الثابت أيضاً، فلا يرى الزاحف صيغة مختلفة.
 */
export function CareersPage() {
  const stats = [
    { label: CAREERS_HUB_COPY.statsLabels.careers, value: String(CAREERS.length) },
    { label: CAREERS_HUB_COPY.statsLabels.categories, value: String(CAREER_CATEGORIES.length) },
    {
      label: CAREERS_HUB_COPY.statsLabels.competitions,
      value: String(CAREER_COMPETITIONS.length),
    },
  ];

  return (
    <main className="container-wide py-10" dir="rtl" data-page="careers-hub">
      <SEOHead
        title={CAREERS_HUB_COPY.title}
        description={CAREERS_HUB_COPY.description}
        canonicalUrl={canonicalFor(CAREERS_HUB_PATH)}
        keywords={["المهن القانونية في المغرب", "مباريات القانون", "كيف تصبح محاميا", "الوظيفة العمومية"]}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: CAREERS_HUB_COPY.h1,
            description: CAREERS_HUB_COPY.description,
            url: canonicalFor(CAREERS_HUB_PATH),
            inLanguage: "ar-MA",
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "المهن القانونية في المغرب",
            numberOfItems: CAREERS.length,
            itemListElement: CAREERS.map((career, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: career.title_ar,
              url: canonicalFor(`/careers/${career.slug}`),
            })),
          },
        ]}
        // FAQPage يُضاف فقط لأن قسم الأسئلة الشائعة معروض فعلاً في الصفحة
        // (نفس شرط المواصفة: لا بيانات مهيكلة لقسم غير موجود).
        faq={CAREERS_HUB_COPY.faq.map((item) => ({ question: item.question, answer: item.answer }))}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "المسارات المهنية", url: CAREERS_HUB_PATH },
        ]}
      />

      <nav aria-label="مسار التصفح" className="mb-5 text-[12.5px] font-bold text-muted-foreground">
        <Link className="hover:text-foreground" to="/">
          الرئيسية
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">المسارات المهنية</span>
      </nav>

      <header className="rounded-3xl border border-border bg-gradient-to-l from-primary/10 via-card to-amber-500/10 p-6">
        <img
          src="/images/careers-roadmap-hero.png"
          alt=""
          aria-hidden="true"
          width={1024}
          height={683}
          loading="eager"
          decoding="async"
          className="float-left me-5 mb-2 hidden w-[180px] rounded-2xl border border-border/60 bg-white/60 md:block dark:bg-white/5"
        />
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Compass className="size-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[26px] font-black leading-[1.25] text-foreground md:text-[32px]">
          {CAREERS_HUB_COPY.h1}
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-8 text-foreground">{CAREERS_HUB_COPY.directAnswer}</p>
        <p className="mt-3 max-w-3xl text-[13.5px] leading-7 text-muted-foreground">{CAREERS_HUB_COPY.hubLead}</p>
        <CareerDisclaimer className="mt-5 max-w-3xl" />

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <dt className="text-[12px] font-bold text-muted-foreground">{item.label}</dt>
              <dd className="text-[22px] font-black text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-10">
        <CareerFilters />
      </section>

      <section className="mt-10" aria-labelledby="careers-comparison-title">
        <h2 id="careers-comparison-title" className="text-[20px] font-black text-foreground">
          {CAREERS_HUB_COPY.comparisonTitle}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {CAREERS_HUB_COPY.comparison.map((block) => (
            <article key={block.heading} className="rounded-3xl border border-border bg-card p-5">
              <h3 className="text-[16px] font-black text-foreground">{block.heading}</h3>
              <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">{block.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="careers-degree-competition-title">
        <h2
          id="careers-degree-competition-title"
          className="inline-flex items-center gap-2 text-[20px] font-black text-foreground"
        >
          <ArrowLeftRight className="size-5 text-primary" aria-hidden="true" />
          {CAREERS_HUB_COPY.degreeVsCompetitionTitle}
        </h2>
        <ul className="mt-4 space-y-2">
          {CAREERS_HUB_COPY.degreeVsCompetition.map((line) => (
            <li key={line} className="flex gap-2 text-[13.5px] leading-7 text-muted-foreground">
              <ListChecks className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="careers-decision-tree-title">
        <h2
          id="careers-decision-tree-title"
          className="inline-flex items-center gap-2 text-[20px] font-black text-foreground"
        >
          <GitBranch className="size-5 text-primary" aria-hidden="true" />
          {CAREERS_HUB_COPY.decisionTreeTitle}
        </h2>
        <ul className="mt-4 space-y-3">
          {CAREERS_HUB_COPY.decisionTree.map((node) => (
            <li key={node.question} className="rounded-2xl border border-border bg-card p-4 text-[13.5px] font-bold">
              <p className="text-foreground">{node.question}</p>
              <p className="mt-1 text-primary">{node.answer}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="careers-nearby-title">
        <h2 id="careers-nearby-title" className="text-[20px] font-black text-foreground">
          {CAREERS_HUB_COPY.nearbySectionTitle}
        </h2>
        <NearbyLawSchools className="mt-4" legalEducation="depends" />
      </section>

      <section className="mt-10" aria-labelledby="careers-faq-title">
        <h2 id="careers-faq-title" className="text-[20px] font-black text-foreground">
          {CAREERS_HUB_COPY.faqTitle}
        </h2>
        <dl className="mt-4 space-y-3">
          {CAREERS_HUB_COPY.faq.map((item) => (
            <div key={item.question} className="rounded-2xl border border-border bg-card p-4">
              <dt className="text-[14px] font-extrabold text-foreground">{item.question}</dt>
              <dd className="mt-2 text-[13.5px] leading-7 text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10" aria-labelledby="careers-links-title">
        <h2 id="careers-links-title" className="text-[20px] font-black text-foreground">
          {CAREERS_HUB_COPY.internalLinksTitle}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAREERS_HUB_COPY.internalLinks.map((link) => (
            <li key={link.path} className="rounded-2xl border border-border bg-card p-4">
              <Link className="text-[14px] font-extrabold text-primary" to={link.path}>
                {link.label}
              </Link>
              <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{link.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <CareerDisclaimer className="mt-10" />
    </main>
  );
}

export default CareersPage;
