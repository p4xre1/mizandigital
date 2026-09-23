// ============================================================================
// صفحات دليل المسارات والمهن القانونية — مصادر صفحات prerender وsitemap
// ============================================================================
//
// لماذا وحدة مستقلة؟ لأن هذه الصفحات تُبنى في مكانين: scripts/prerender.mjs
// (HTML ثابت للزاحف) و scripts/generate-sitemap.mjs (خريطة الموقع). لو كُتب
// المسار مرتين لانحرف أحدهما عن الآخر — وهذا بالضبط سبب وجود الوحدة: مصدر
// واحد يقرأ نفس ملفات JSON ونفس النصوص من shared/careers/copy.js.
//
// قواعد ملزمة مطبَّقة هنا (وليست تعليقات شكلية):
//   1) لا JobPosting schema مطلقاً: الصفحة دليل تعليمي لا إعلان توظيف.
//   2) كل شرط رقمي يبقى فارغاً حتى التحقق الرسمي، ويُعرض بدلاً منه وسم
//      «⚠️ يحتاج إلى التحقق من المصدر الرسمي» أو «🟡 راجع الإعلان السنوي».
//   3) صفحات تمارين المباريات لا تُولَّد ولا تُفهرس إلا بسجل مباراة متحقق منه
//      (رابط إعلان رسمي + تاريخ تحقق)؛ وكل السجلات الحالية غير متحققة → صفر
//      صفحات تمارين في هذه النسخة.
//   4) إخلاء المسؤولية الإلزامي منقوش في كل صفحة، بنصّه الواحد.
//   5) الرابط القانوني بلا شرطة نهاية، وكل الروابط الداخلية من سياسة الروابط.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_ORIGIN, canonicalUrl } from "../../shared/seo/url-policy.js";
import {
  CAREERS_ANNUAL_NOTICE_BADGE,
  CAREERS_LAW_NOT_ARCHIVED,
  LAW_VERIFICATION_LABELS,
  CAREERS_DISCLAIMER,
  CAREERS_HUB_COPY,
  CAREERS_HUB_PATH,
  CAREERS_NO_SOURCE_NOTE,
  CAREERS_QUIZ_DISCLAIMER,
  CAREERS_QUIZ_HUB_COPY,
  CAREERS_QUIZ_PATH,
  CAREERS_VERIFY_BADGE,
  COMPETITION_PATH_LABELS,
  DEGREE_LEVEL_LABELS,
  REQUIREMENT_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  SECTION_TITLES,
  TRAINING_PLAN_WEEKS,
  buildCareerAnswerFirst,
  buildCareerH1,
  buildCareerPageDescription,
  buildCareerPageTitle,
  buildCareerQuizDescription,
  buildCareerQuizH1,
  buildCareerQuizTitle,
} from "../../shared/careers/copy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../../src/data");

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const absoluteUrl = (path) => canonicalUrl(path);

/** الحد الأدنى من الأسئلة التي يجعل اختبار المسار قابلاً للاستعمال. */
export const CAREER_QUIZ_MIN_QUESTIONS = 8;

export async function loadCareerData() {
  const [careers, categories, cities, competitions, lexiconTerms, quizQuestions, schools, lawArchive] =
    await Promise.all([
      readJson("careers.json"),
      readJson("career-categories.json"),
      readJson("morocco-cities.json"),
      readJson("career-competitions.json"),
      readJson("career-lexicon.json"),
      readJson("quiz-questions.json"),
      readJson("schools.json"),
      readJson("laws.client.json"),
    ]);
  return {
    careers,
    categories,
    cities,
    competitions,
    lexiconTerms,
    quizQuestions,
    schools,
    // لقطة أرشيف القوانين (يولّدها generate-law-archive-snapshot.mjs). قد تكون
    // فارغة تماماً حين لا يتوفر CMS — عندها تُعرض التسميات بلا أي رابط.
    lawArchive: Array.isArray(lawArchive?.laws) ? lawArchive.laws : [],
  };
}

/** أسئلة مسار واحد — نفس منطق src/lib/careers/training.ts بالضبط. */
export function careerQuestionsOf(career, quizQuestions) {
  return quizQuestions.filter((question) => (question.career_ids ?? []).includes(career.id));
}

/** سجل مباراة «متحقق منه» بمعنى أن له إعلاناً رسمياً مؤرّخاً. */
export function isCompetitionVerified(record) {
  if (!record) return false;
  if (!record.official_notice_url) return false;
  if (!record.source_verified_at) return false;
  if (!record.last_reviewed) return false;
  if ((record.status === "open" || record.status === "upcoming") && !record.official_notice_date) {
    return false;
  }
  return true;
}

const requirementBadges = (requirement) => {
  const badges = [CAREERS_VERIFY_BADGE];
  if (requirement.requirement_type === "annual_notice" || requirement.requirement_type === "legal_or_annual_notice") {
    badges.push(CAREERS_ANNUAL_NOTICE_BADGE);
  }
  return badges.join(" · ");
};

/* ── الصفحة الركنية /careers ───────────────────────────────────────────── */

function hubPage({ careers, categories, schools, competitions }) {
  const faq = CAREERS_HUB_COPY.faq ?? [];

  return {
    path: CAREERS_HUB_PATH,
    title: CAREERS_HUB_COPY.title,
    description: CAREERS_HUB_COPY.description,
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: CAREERS_HUB_COPY.title,
      description: CAREERS_HUB_COPY.description,
      url: absoluteUrl(CAREERS_HUB_PATH),
      inLanguage: "ar-MA",
      isAccessibleForFree: true,
    },
    extraSchema: [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "المهن القانونية في المغرب",
        numberOfItems: careers.length,
        itemListElement: careers.map((career, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: career.title_ar,
          url: absoluteUrl(`/careers/${career.slug}`),
        })),
      },
      ...(faq.length
        ? [
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ]
        : []),
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "المسارات المهنية", item: absoluteUrl(CAREERS_HUB_PATH) },
        ],
      },
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>${escapeHtml(CAREERS_HUB_COPY.h1)}</h1>

          <p>
            <strong>${escapeHtml(CAREERS_HUB_COPY.directAnswer)}</strong>
          </p>

          <p>${escapeHtml(CAREERS_HUB_COPY.hubLead)}</p>

          <h2>${escapeHtml(CAREERS_HUB_COPY.careerCardsTitle)} (${careers.length})</h2>
          <ul>
            ${careers
              .map(
                (career) =>
                  `<li><a href="/careers/${career.slug}">${escapeHtml(career.title_ar)}</a> (${escapeHtml(
                    career.title_fr
                  )}) — ${escapeHtml(career.short_description)} — ${escapeHtml(career.work_model_ar)}</li>`
              )
              .join("\n            ")}
          </ul>

          <h2>${escapeHtml(CAREERS_HUB_COPY.comparisonTitle)}</h2>
          <ul>
            ${CAREERS_HUB_COPY.comparison
              .map((block) => `<li><strong>${escapeHtml(block.heading)}</strong> — ${escapeHtml(block.body)}</li>`)
              .join("\n            ")}
          </ul>

          <h2>${escapeHtml(CAREERS_HUB_COPY.degreeVsCompetitionTitle)}</h2>
          <ul>
            ${CAREERS_HUB_COPY.degreeVsCompetition
              .map((line) => `<li>${escapeHtml(line)}</li>`)
              .join("\n            ")}
          </ul>

          <h2>${escapeHtml(CAREERS_HUB_COPY.decisionTreeTitle)}</h2>
          <dl>
            ${CAREERS_HUB_COPY.decisionTree
              .map(
                (node) =>
                  `<dt>${escapeHtml(node.question)}</dt><dd>${escapeHtml(node.answer)}</dd>`
              )
              .join("\n            ")}
          </dl>

          <h2>${escapeHtml(CAREERS_HUB_COPY.faqTitle)}</h2>
          <dl>
            ${faq
              .map((item) => `<dt>${escapeHtml(item.question)}</dt><dd>${escapeHtml(item.answer)}</dd>`)
              .join("\n            ")}
          </dl>

          <h2>${escapeHtml(CAREERS_HUB_COPY.internalLinksTitle)}</h2>
          <ul>
            ${CAREERS_HUB_COPY.internalLinks
              .map(
                (link) =>
                  `<li><a href="${link.path}">${escapeHtml(link.label)}</a> — ${escapeHtml(link.description)}</li>`
              )
              .join("\n            ")}
            <li><a href="${CAREERS_QUIZ_PATH}">اختبارات تعليمية للمسارات المهنية</a></li>
          </ul>

          <h2>أرقام الدليل</h2>
          <ul>
            <li>${careers.length} ${escapeHtml(CAREERS_HUB_COPY.statsLabels.careers)}</li>
            <li>${categories.length} ${escapeHtml(CAREERS_HUB_COPY.statsLabels.categories)}</li>
            <li>${schools.length} ${escapeHtml(CAREERS_HUB_COPY.statsLabels.schools)}</li>
            <li>${competitions.length} ${escapeHtml(CAREERS_HUB_COPY.statsLabels.competitions)}</li>
          </ul>

          <p>${escapeHtml(CAREERS_DISCLAIMER)}</p>
          <p>${escapeHtml(CAREERS_QUIZ_DISCLAIMER)}</p>
        </article>
      </main>
    `,
  };
}

/* ── صفحات المسارات /careers/<slug> ────────────────────────────────────── */

function careerDetailPage(career, { lexiconTerms, quizQuestions, careers, lawArchive }) {
  const path = `${CAREERS_HUB_PATH}/${career.slug}`;
  const terms = career.lexicon_term_ids
    .map((id) => lexiconTerms.find((term) => term.id === id))
    .filter(Boolean);
  const questions = careerQuestionsOf(career, quizQuestions);
  const hasQuiz = career.quiz_config.has_knowledge_quiz && questions.length >= CAREER_QUIZ_MIN_QUESTIONS;
  const related = career.related_career_ids
    .slice(0, 3)
    .map((id) => careers.find((item) => item.id === id))
    .filter(Boolean);

  const lawBySlug = new Map(lawArchive.map((record) => [record.slug, record]));
  const legalFramework = (career.legal_framework ?? []).map((entry) => {
    const archive = entry.law_slug ? lawBySlug.get(entry.law_slug) ?? null : null;
    return { ...entry, archive };
  });

  const facts = [
    ["طبيعة العمل", career.work_model_ar],
    [
      "الشهادة المعتادة",
      `${DEGREE_LEVEL_LABELS[career.typical_degree.level] ?? career.typical_degree.level} — ${career.typical_degree.label_ar}`,
    ],
    ["طريقة الولوج", COMPETITION_PATH_LABELS[career.quiz_config.competition_path] ?? ""],
    ["شرط السن", career.age_requirement.note_ar],
    ["آخر مراجعة", career.last_reviewed],
    ["حالة التحقق", REVIEW_STATUS_LABELS[career.review_status] ?? career.review_status],
  ];

  return {
    path,
    title: buildCareerPageTitle(career.title_ar),
    description: buildCareerPageDescription(career),
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: buildCareerPageTitle(career.title_ar),
      headline: buildCareerH1(career.title_ar),
      description: buildCareerPageDescription(career),
      url: absoluteUrl(path),
      inLanguage: "ar-MA",
      dateModified: career.last_reviewed,
      isAccessibleForFree: true,
      about: { "@type": "Occupation", name: career.title_ar, alternateName: career.title_fr },
    },
    extraSchema: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "المسارات المهنية", item: absoluteUrl(CAREERS_HUB_PATH) },
          { "@type": "ListItem", position: 3, name: career.title_ar, item: absoluteUrl(path) },
        ],
      },
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>${escapeHtml(buildCareerH1(career.title_ar))}</h1>
          <p dir="ltr">${escapeHtml(career.title_fr)}</p>

          <p>
            <strong>${escapeHtml(buildCareerAnswerFirst(career))}</strong>
          </p>

          <p><a href="${CAREERS_HUB_PATH}">كل المسارات والمهن القانونية في المغرب</a></p>

          <h2>${escapeHtml(SECTION_TITLES.keyFacts)}</h2>
          <dl>
            ${facts
              .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
              .join("\n            ")}
          </dl>

          <h2>${escapeHtml(SECTION_TITLES.roadmap)}</h2>
          <ol>
            ${career.entry_path
              .map(
                (step) =>
                  `<li><strong>${escapeHtml(step.title_ar)}</strong> — ${escapeHtml(step.description_ar)}</li>`
              )
              .join("\n            ")}
          </ol>

          <h2>${escapeHtml(SECTION_TITLES.skills)}</h2>
          <ul>
            ${career.skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("\n            ")}
          </ul>

          <h2>${escapeHtml(SECTION_TITLES.fit)}</h2>
          <ul>
            ${career.best_for.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n            ")}
          </ul>
          <p>هذا وصف تعليمي لطبيعة المسار، وليس تقييماً لأهليتك ولا ترجيحاً لقبولك.</p>

          <h2>${escapeHtml(SECTION_TITLES.lexicon)}</h2>
          <ul>
            ${terms
              .map(
                (term) =>
                  `<li><a href="/lexicon/${term.slug}">${escapeHtml(term.term_ar)}</a>${
                    term.term_fr ? ` (${escapeHtml(term.term_fr)})` : ""
                  }</li>`
              )
              .join("\n            ")}
          </ul>

          <h2>${escapeHtml(SECTION_TITLES.plan)}</h2>
          <ol>
            ${TRAINING_PLAN_WEEKS.map(
              (week) => `<li><strong>${escapeHtml(week.title_ar)}</strong> — ${escapeHtml(week.description_ar ?? "")}</li>`
            ).join("\n            ")}
          </ol>

          <h2>${escapeHtml(SECTION_TITLES.requirements)}</h2>
          <ul>
            ${career.requirements
              .map(
                (requirement) =>
                  `<li><strong>${escapeHtml(requirement.label_ar)}</strong> — ${escapeHtml(
                    requirement.value_ar
                  )} — ${escapeHtml(REQUIREMENT_TYPE_LABELS[requirement.requirement_type] ?? "")} — ${escapeHtml(requirementBadges(requirement))}</li>`
              )
              .join("\n            ")}
          </ul>
          <p>${escapeHtml(CAREERS_NO_SOURCE_NOTE)}</p>
          <p>
            ${escapeHtml(career.quiz_config.competition_note_ar)}
          </p>

          <h2>${escapeHtml(SECTION_TITLES.laws)}</h2>
          <ul>
            ${legalFramework
              .map((entry) => {
                const meta = `<strong>${escapeHtml(entry.label_ar)}</strong> — ${escapeHtml(
                  entry.relationship_ar
                )} — ${escapeHtml(LAW_VERIFICATION_LABELS[entry.verification_status] ?? entry.verification_status)}`;
                if (!entry.archive) {
                  return `<li>${meta} — ${escapeHtml(CAREERS_LAW_NOT_ARCHIVED)}</li>`;
                }
                const link = entry.archive.public_path
                  ? ` <a href="${entry.archive.public_path}">عرض النص في أرشيف ميزان</a>`
                  : "";
                return `<li>${meta} — ${escapeHtml(entry.archive.title)}${
                  entry.archive.law_number ? ` — رقم النص: ${escapeHtml(entry.archive.law_number)}` : ""
                }${link}</li>`;
              })
              .join("\n            ")}
          </ul>

          <h2>${escapeHtml(SECTION_TITLES.quiz)}</h2>
          ${
            hasQuiz
              ? `<p><a href="${CAREERS_QUIZ_PATH}/${career.quiz_config.career_quiz_slug}">${escapeHtml(
                  buildCareerQuizH1(career.title_ar)
                )}</a></p>`
              : `<p>لم يكتمل بعد عدد كافٍ من الأسئلة التعليمية لهذا المسار.</p>`
          }

          <h2>${escapeHtml(SECTION_TITLES.related)}</h2>
          <ul>
            ${related
              .map(
                (item) =>
                  `<li><a href="${CAREERS_HUB_PATH}/${item.slug}">${escapeHtml(item.title_ar)}</a> — ${escapeHtml(
                    item.short_description
                  )}</li>`
              )
              .join("\n            ")}
          </ul>

          <p>${escapeHtml(CAREERS_DISCLAIMER)}</p>
        </article>
      </main>
    `,
  };
}

/* ── /quiz/careers وصفحات الاختبارات ───────────────────────────────────── */

function quizHubPage({ careers }) {
  return {
    path: CAREERS_QUIZ_PATH,
    title: CAREERS_QUIZ_HUB_COPY.title,
    description: CAREERS_QUIZ_HUB_COPY.description,
    schema: {
      "@context": "https://schema.org",
      "@type": "Quiz",
      name: CAREERS_QUIZ_HUB_COPY.h1,
      description: CAREERS_QUIZ_HUB_COPY.description,
      url: absoluteUrl(CAREERS_QUIZ_PATH),
      inLanguage: "ar-MA",
      isAccessibleForFree: true,
      about: "المهن القانونية في المغرب",
    },
    extraSchema: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "المسارات المهنية", item: absoluteUrl(CAREERS_HUB_PATH) },
          { "@type": "ListItem", position: 3, name: "اختبارات المسارات المهنية", item: absoluteUrl(CAREERS_QUIZ_PATH) },
        ],
      },
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>${escapeHtml(CAREERS_QUIZ_HUB_COPY.h1)}</h1>
          <p><strong>${escapeHtml(CAREERS_QUIZ_HUB_COPY.directAnswer)}</strong></p>
          <p><a href="${CAREERS_HUB_PATH}">كل المسارات والمهن القانونية في المغرب</a></p>
          <p>${escapeHtml(CAREERS_QUIZ_HUB_COPY.discoveryLead)}</p>
          <p>${escapeHtml(CAREERS_QUIZ_HUB_COPY.discoveryNote)}</p>

          <h2>${escapeHtml(CAREERS_QUIZ_HUB_COPY.careersListTitle)}</h2>
          <ul>
            ${careers
              .map(
                (career) =>
                  `<li><a href="${CAREERS_QUIZ_PATH}/${career.quiz_config.career_quiz_slug}">${escapeHtml(
                    buildCareerQuizH1(career.title_ar)
                  )}</a> — <a href="/careers/${career.slug}">${escapeHtml(career.title_ar)}</a></li>`
              )
              .join("\n            ")}
          </ul>

          <p>${escapeHtml(CAREERS_QUIZ_DISCLAIMER)}</p>
          <p>${escapeHtml(CAREERS_DISCLAIMER)}</p>
        </article>
      </main>
    `,
  };
}

function quizPage(career, { quizQuestions }) {
  const questions = careerQuestionsOf(career, quizQuestions);
  const path = `${CAREERS_QUIZ_PATH}/${career.quiz_config.career_quiz_slug}`;

  return {
    path,
    title: buildCareerQuizTitle(career.title_ar),
    description: buildCareerQuizDescription(career.title_ar),
    schema: {
      "@context": "https://schema.org",
      "@type": "Quiz",
      name: buildCareerQuizTitle(career.title_ar),
      description: buildCareerQuizDescription(career.title_ar),
      url: absoluteUrl(path),
      inLanguage: "ar-MA",
      isAccessibleForFree: true,
      about: career.title_ar,
    },
    extraSchema: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "المسارات المهنية", item: absoluteUrl(CAREERS_HUB_PATH) },
          { "@type": "ListItem", position: 3, name: "اختبارات المسارات المهنية", item: absoluteUrl(CAREERS_QUIZ_PATH) },
          { "@type": "ListItem", position: 4, name: career.title_ar, item: absoluteUrl(path) },
        ],
      },
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>${escapeHtml(buildCareerQuizH1(career.title_ar))}</h1>
          <p>
            اختبار تعليمي قصير حول مفاهيم ${escapeHtml(career.title_ar)}، وأسئلته من إعداد ميزان الرقمية
            (${questions.length} سؤالاً متاحاً في بنك الأسئلة)، مع شرح بعد كل سؤال.
          </p>
          <p><a href="${CAREERS_HUB_PATH}">كل المسارات والمهن القانونية</a> — دليل ميزان التعليمي.</p>
          <p><a href="/careers/${career.slug}">${escapeHtml(career.title_ar)}</a> — الشروط والمسار والمصادر.</p>
          <p>${escapeHtml(CAREERS_QUIZ_DISCLAIMER)}</p>
          <p>${escapeHtml(CAREERS_DISCLAIMER)}</p>
        </article>
      </main>
    `,
  };
}

/**
 * كل صفحات الدليل الثابتة: الركنية + 14 مساراً + بوابة الاختبارات + 14 اختباراً.
 *
 * ملاحظة: صفحات تمارين المباريات (`/quiz/careers/<slug>/practice/<id>`) غير
 * مولَّدة لأن كل السجلات الحالية غير متحققة (لا رابط إعلان رسمي). تُبنى هذه
 * الصفحات في الواجهة فقط عندما يُضاف سجل متحقق منه.
 */
export async function buildCareerPages() {
  const data = await loadCareerData();
  const { careers, categories, schools, competitions, lexiconTerms, quizQuestions, lawArchive } = data;

  return [
    hubPage({ careers, categories, schools, competitions }),
    ...careers.map((career) => careerDetailPage(career, { lexiconTerms, quizQuestions, careers, lawArchive })),
    quizHubPage({ careers }),
    ...careers
      .filter((career) => career.quiz_config.has_knowledge_quiz)
      .map((career) => quizPage(career, { quizQuestions })),
  ];
}

/** مدخلات خريطة الموقع لهذه الصفحات (بلا صفحات تمارين غير متحققة). */
export async function buildCareerSitemapEntries() {
  const { careers } = await loadCareerData();
  const today = new Date().toISOString().slice(0, 10);

  return [
    { path: CAREERS_HUB_PATH, lastmod: today, changefreq: "weekly", priority: "0.9" },
    ...careers.map((career) => ({
      path: `${CAREERS_HUB_PATH}/${career.slug}`,
      lastmod: career.last_reviewed || today,
      changefreq: "monthly",
      priority: "0.8",
    })),
    { path: CAREERS_QUIZ_PATH, lastmod: today, changefreq: "weekly", priority: "0.8" },
    ...careers
      .filter((career) => career.quiz_config.has_knowledge_quiz)
      .map((career) => ({
        path: `${CAREERS_QUIZ_PATH}/${career.quiz_config.career_quiz_slug}`,
        lastmod: career.last_reviewed || today,
        changefreq: "monthly",
        priority: "0.7",
      })),
  ];
}

export { SITE_ORIGIN };
