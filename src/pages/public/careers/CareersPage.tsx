import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ListChecks } from "lucide-react";
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
/** قسم بعنوان واحد وخط فاصل خفيف؛ المسافة نفسها على كل الشاشات. */
function Section({ id, title, className = "", children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`scroll-mt-24 border-t border-border pt-10 sm:pt-12 ${className}`}>
      <h2 id={id} className="text-2xl font-black leading-snug text-foreground sm:text-3xl">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * /careers — دليل المسارات والمهن القانونية في المغرب.
 *
 * تصميم بسيط: لون واحد للتمييز، فواصل رفيعة بدل الصناديق الملونة، ونص أكبر.
 * الشبكة تتبدل حسب الشاشة:
 *   - الهاتف (أقل من 640px): عمود واحد، والنص 18px، وأزرار 44px على الأقل.
 *   - اللوح (640px فما فوق): عمودان للبطاقات والروابط، والصورة بجانب النص.
 *   - الحاسوب (1024px فما فوق): ثلاث بطاقات في الصف، وعمودان للأسئلة والشجرة.
 *
 * النصّ نفسه (العناوين والجواب المباشر والأسئلة) يأتي من shared/careers/copy.js
 * — الوحدة التي يقرأها مولّد HTML الثابت أيضاً، فلا يرى الزاحف صيغة مختلفة.
 */
export function CareersPage() {
  return (
    <main className="container-wide py-6 sm:py-10 lg:py-14" dir="rtl" data-page="careers-hub">
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

      <nav aria-label="مسار التصفح" className="text-base font-semibold text-muted-foreground">
        <Link className="hover:text-foreground" to="/">
          الرئيسية
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">المسارات المهنية</span>
      </nav>

      {/* الهيرو: عمود واحد في الهاتف، وعمودان من اللوح فما فوق */}
      <header className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-16">
        <div>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {CAREERS_HUB_COPY.h1}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground sm:text-xl">
            {CAREERS_HUB_COPY.directAnswer} {CAREERS_HUB_COPY.hubLead}
          </p>
          <p className="mt-4 text-base text-muted-foreground">
            معلومات توجيهية فقط، تحقق دائماً من المصدر الرسمي.{" "}
            <a href="#careers-disclaimer" className="font-bold text-primary underline underline-offset-4">
              النص الكامل
            </a>
          </p>
          <a
            href="#careers-filters"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-lg font-extrabold text-primary-foreground transition hover:opacity-90"
          >
            ابدأ باختيار وضعك
            <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
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
          className="hidden w-full rounded-2xl border border-border bg-white/60 md:block dark:bg-white/5"
        />
      </header>

      <section id="careers-filters" className="mt-12 scroll-mt-24 sm:mt-16">
        <CareerFilters />
      </section>

      <Section id="careers-comparison-title" title={CAREERS_HUB_COPY.comparisonTitle} className="mt-12 sm:mt-16">
        <div className="grid gap-4 md:grid-cols-3">
          {CAREERS_HUB_COPY.comparison.map((block) => (
            <article key={block.heading} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h3 className="text-xl font-black leading-snug text-foreground">{block.heading}</h3>
              <p className="mt-3 text-lg leading-relaxed text-foreground">{block.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="careers-degree-competition-title" title={CAREERS_HUB_COPY.degreeVsCompetitionTitle} className="mt-12 sm:mt-16">
        <ul className="grid gap-3 md:grid-cols-2">
          {CAREERS_HUB_COPY.degreeVsCompetition.map((line) => (
            <li key={line} className="flex gap-3 rounded-xl border border-border bg-card p-4 text-lg font-semibold leading-relaxed text-foreground sm:p-5">
              <ListChecks className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="careers-decision-tree-title" title={CAREERS_HUB_COPY.decisionTreeTitle} className="mt-12 sm:mt-16">
        <ul className="grid gap-4 lg:grid-cols-2">
          {CAREERS_HUB_COPY.decisionTree.map((node) => (
            <li key={node.question} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <p className="text-xl font-black leading-snug text-foreground">{node.question}</p>
              <p className="mt-3 text-lg font-bold leading-relaxed text-primary">{node.answer}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="careers-nearby-title" title={CAREERS_HUB_COPY.nearbySectionTitle} className="mt-12 sm:mt-16">
        <NearbyLawSchools legalEducation="depends" />
      </Section>

      <Section id="careers-faq-title" title={CAREERS_HUB_COPY.faqTitle} className="mt-12 sm:mt-16">
        <div className="grid gap-4 lg:grid-cols-2">
          {CAREERS_HUB_COPY.faq.map((item) => (
            <details key={item.question} className="group rounded-2xl border border-border bg-card p-5 sm:p-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-extrabold leading-snug text-foreground">
                {item.question}
                <span aria-hidden="true" className="text-2xl leading-none text-primary transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-lg leading-relaxed text-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="careers-links-title" title={CAREERS_HUB_COPY.internalLinksTitle} className="mt-12 sm:mt-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAREERS_HUB_COPY.internalLinks.map((link) => (
            <li key={link.path} className="rounded-2xl border border-border bg-card p-5">
              <Link className="text-lg font-extrabold text-primary underline-offset-4 hover:underline" to={link.path}>
                {link.label}
              </Link>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{link.description}</p>
            </li>
          ))}
        </ul>
      </Section>

      <div id="careers-disclaimer" className="mt-12 scroll-mt-24 border-t border-border pt-10 sm:mt-16 sm:pt-12">
        <CareerDisclaimer />
      </div>
    </main>
  );
}

export default CareersPage;
