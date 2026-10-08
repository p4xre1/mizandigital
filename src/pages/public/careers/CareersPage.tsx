import { Link } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Compass, GitBranch, ListChecks } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { canonicalFor } from "@/lib/canonical";
import { CareerDisclaimer } from "@/components/careers/CareerDisclaimer";
import { CareerFilters } from "@/components/careers/CareerFilters";
import { NearbyLawSchools } from "@/components/careers/NearbyLawSchools";
import { CAREERS, CAREER_CATEGORIES, CAREER_COMPETITIONS } from "@/lib/careers/data";
import { CAREERS_HUB_COPY, CAREERS_HUB_PATH } from "../../../../shared/careers/copy.js";

/** خلفية لكل بطاقة مقارنة (أزرق، أخضر، كهرماني) مع حدّ رفيع. */
const COMPARISON_TONES = [
  "border-blue-600/25 bg-blue-50 dark:border-blue-400/30 dark:bg-blue-950/40",
  "border-emerald-600/25 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-950/40",
  "border-amber-600/25 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-950/40",
];

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

      <header className="rounded-3xl border border-border bg-gradient-to-l from-primary/15 via-card to-primary/5 p-6 md:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Compass className="size-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-[28px] font-black leading-[1.25] text-foreground md:text-[36px]">
              {CAREERS_HUB_COPY.h1}
            </h1>
            <p className="mt-4 text-[15px] leading-8 text-foreground">
              {CAREERS_HUB_COPY.directAnswer} {CAREERS_HUB_COPY.hubLead}
            </p>
            <p className="mt-4 text-[13px] font-bold text-muted-foreground">
              معلومات توجيهية فقط، تحقق دائماً من المصدر الرسمي.{" "}
              <a href="#careers-disclaimer" className="text-primary underline underline-offset-4">
                النص الكامل
              </a>
            </p>
            <a
              href="#careers-filters"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              ابدأ باختيار وضعك
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            </a>
          </div>
          <img
            src="/images/careers-roadmap-hero.png"
            alt=""
            aria-hidden="true"
            width={1024}
            height={683}
            loading="eager"
            decoding="async"
            className="hidden w-full max-w-[360px] shrink-0 rounded-2xl border border-border/60 bg-white/60 md:block dark:bg-white/5"
          />
        </div>
      </header>

      <section id="careers-filters" className="mt-10 scroll-mt-24">
        <CareerFilters />
      </section>

      <section className="mt-10" aria-labelledby="careers-comparison-title">
        <h2 id="careers-comparison-title" className="inline-flex items-center gap-2 rounded-xl border border-blue-600/25 bg-blue-50 px-4 py-3 text-[20px] font-black text-blue-800 dark:border-blue-400/30 dark:bg-blue-950/40 dark:text-blue-200">
          {CAREERS_HUB_COPY.comparisonTitle}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {CAREERS_HUB_COPY.comparison.map((block, index) => (
            <article
              key={block.heading}
              className={`rounded-3xl border p-6 ${COMPARISON_TONES[index % COMPARISON_TONES.length]}`}
            >
              <h3 className="text-[18px] font-black leading-snug text-black dark:text-white">{block.heading}</h3>
              <p className="mt-3 text-[16px] leading-8 text-black dark:text-white">{block.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="careers-degree-competition-title">
        <h2
          id="careers-degree-competition-title"
          className="inline-flex items-center gap-2 rounded-xl border border-blue-600/25 bg-blue-50 px-4 py-3 text-[20px] font-black text-blue-800 dark:border-blue-400/30 dark:bg-blue-950/40 dark:text-blue-200"
        >
          <ArrowLeftRight className="size-5 text-primary" aria-hidden="true" />
          {CAREERS_HUB_COPY.degreeVsCompetitionTitle}
        </h2>
        <ul className="mt-5 space-y-4 rounded-xl border border-border p-5">
          {CAREERS_HUB_COPY.degreeVsCompetition.map((line) => (
            <li key={line} className="flex gap-3 text-[16px] font-semibold leading-8 text-black dark:text-white">
              <ListChecks className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="careers-decision-tree-title">
        <h2
          id="careers-decision-tree-title"
          className="inline-flex items-center gap-2 rounded-xl border border-blue-600/25 bg-blue-50 px-4 py-3 text-[20px] font-black text-blue-800 dark:border-blue-400/30 dark:bg-blue-950/40 dark:text-blue-200"
        >
          <GitBranch className="size-5 text-primary" aria-hidden="true" />
          {CAREERS_HUB_COPY.decisionTreeTitle}
        </h2>
        <ul className="mt-5 space-y-5">
          {CAREERS_HUB_COPY.decisionTree.map((node) => (
            <li key={node.question} className="rounded-2xl border border-border bg-card p-6">
              <p className="text-[17px] font-black leading-8 text-black dark:text-white">{node.question}</p>
              <p className="mt-3 text-[16px] font-bold leading-8 text-primary">{node.answer}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="careers-nearby-title">
        <h2 id="careers-nearby-title" className="inline-flex items-center gap-2 rounded-xl border border-blue-600/25 bg-blue-50 px-4 py-3 text-[20px] font-black text-blue-800 dark:border-blue-400/30 dark:bg-blue-950/40 dark:text-blue-200">
          {CAREERS_HUB_COPY.nearbySectionTitle}
        </h2>
        <NearbyLawSchools className="mt-4" legalEducation="depends" />
      </section>

      <section className="mt-10" aria-labelledby="careers-faq-title">
        <h2 id="careers-faq-title" className="text-[20px] font-black text-foreground">
          {CAREERS_HUB_COPY.faqTitle}
        </h2>
        <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {CAREERS_HUB_COPY.faq.map((item) => (
            <details key={item.question} className="group p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-extrabold text-foreground">
                {item.question}
                <span aria-hidden="true" className="text-[20px] leading-none text-primary transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[14px] leading-7 text-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
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

      <div id="careers-disclaimer" className="mt-10 scroll-mt-24">
        <CareerDisclaimer />
      </div>
    </main>
  );
}

export default CareersPage;
