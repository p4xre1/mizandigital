// ============================================================================
// طبقة مرجعيات الذكاء الاصطناعي (/reference)
//
// تحوّل كل بيانات الموقع — src/data/*.json + المحتوى المنشور من CMS — إلى
// مرجع نظيف للوكلاء والنماذج اللغوية: لكل مجموعة بيانات ملفان:
//   <name>.json — البيانات المُهيكَّلة كاملة (كل الحقول + url قانونية لكل سجل)
//   <name>.md  — نسخة Markdown مقروءة بروابط (للمنماذج التي تقرأ نصاً)
// ومعهما فهرس موحّد: index.json (آلي) و index.md (للنماذج/البشر).
//
// قواعد:
//   1) كل رابط يُبنى عبر shared/seo/url-policy.js — نفس سياسة الروابط
//      المستعملة في sitemap وprerender والواجهة (رابط في المرجع بلا صفحة
//      يقابله خطأ من نفس نوع أخطاء «Discovered – currently not indexed»).
//   2) ترتيب الدمج (local ثم CMS، الأول يفوز بالتكرار) مطابق لـ prerender
//      وgenerate-sitemap — وإلا أصبح للمرجع روايتان عن المحتوى.
//   3) فشل جلب CMS غير قاتل (بناء معزول/بلا مفاتيح) — يُكتفى بالبيانات
//      المحلية، كما في بقية سكربتات prebuild.
//   4) المخرجات تُكتب في public/reference/ وتُنتشر مع الموقع؛ النسخة
//      المحلية (بلا CMS) تُعاد توليدها عند النشر مع CMS — نفس عرف
//      llms-full.txt.
//
// الشغّل: node scripts/generate-reference.mjs  (ضمن prebuild)
// ============================================================================

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SITE_ORIGIN as DOMAIN,
  articleSlug,
  canonicalArticle,
  canonicalEvent,
  canonicalLexicon,
  canonicalNews,
  canonicalPdf,
  canonicalSchool,
  contentSlug,
  docSlug,
  eventSlug,
  lexiconSlug,
  newsSlug,
  pathOfUrl,
  schoolSlug,
} from "../shared/seo/url-policy.js";
import { fetchPublishedCmsContent } from "./lib/cms-content.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../src/data");
const OUT = join(__dirname, "../public/reference");
const NOW = new Date().toISOString();

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));

const [localArticles, localNews, lexicon, schools, events, docs, faqGroups, quiz] =
  await Promise.all([
    readJson("articles.json"),
    readJson("news.json"),
    readJson("lexicon.json"),
    readJson("schools.json"),
    readJson("events.json"),
    readJson("docs.json"),
    readJson("faq.json"),
    readJson("quiz-questions.json"),
  ]);

const { ok: cmsOk, error: cmsError, articles: cmsArticles, news: cmsNews, pdfs: cmsPdfs, laws: cmsLaws } =
  await fetchPublishedCmsContent();

if (!cmsOk) {
  console.warn(`⚠️  reference: ${cmsError} — يُكتفى بالبيانات المحلية (بلا laws/CMS).`);
}

/* ── أدوات ─────────────────────────────────────────────────────────────────
   dedupe: يحذف التكرار بمفتاح (المسار النهائي) — الأول يفوز، وهو ترتيب
   prerender بالضبط (local ثم CMS).
   ──────────────────────────────────────────────────────────────────────── */
const dedupeBy = (keyFn) => (items) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const joinBody = (value) =>
  Array.isArray(value) ? value.join("\n\n") : String(value || "").trim();

/* ── مجموعات البيانات ─────────────────────────────────────────────────────
   كل مجموعة: { name, title, section, urlPattern, items }
   items: سجلات نظيفة — الحقول الأصلية + url (مسار مطلق يبدأ بـ /).
   ──────────────────────────────────────────────────────────────────────── */

// المقالات: local ثم CMS (النشر الرسمي يفوز فقط إن لم يوجد local بنفس الرابط)
const articles = dedupeBy((a) => a.url)([
  ...localArticles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: articleSlug(a),
    url: pathOfUrl(canonicalArticle(articleSlug(a))),
    type: a.type || "مقال",
    category: a.category || null,
    excerpt: a.excerpt || "",
    publishedAt: a.publishedAt || null,
    readingTime: a.readingTime || null,
    highlights: a.highlights || [],
    content: joinBody(a.body),
  })),
  ...cmsArticles.map((a) => {
    const slug = contentSlug(a);
    return {
      id: a.id,
      title: a.title,
      slug,
      url: pathOfUrl(canonicalArticle(slug)),
      type: "مقال",
      category: null,
      excerpt: a.meta_description || a.excerpt || "",
      publishedAt: a.published_at || a.created_at || null,
      readingTime: null,
      highlights: [],
      content: joinBody(a.content),
      source: "cms",
    };
  }),
]);

// المستجدات: نفس النمط (local ثم CMS)
const news = dedupeBy((n) => n.url)([
  ...localNews.map((n) => ({
    id: n.id,
    title: n.title,
    url: pathOfUrl(canonicalNews(newsSlug(n))),
    category: n.category || "مستجدات",
    type: n.type || null,
    summary: n.summary || "",
    date: n.date || null,
    author: n.author || null,
    tags: n.tags || [],
    content: joinBody(n.content),
  })),
  ...cmsNews.map((n) => {
    const slug = contentSlug(n);
    return {
      id: n.id,
      title: n.title,
      url: pathOfUrl(canonicalNews(slug)),
      category: "مستجدات",
      type: null,
      summary: n.summary || "",
      date: n.published_at || n.created_at || null,
      author: n.source || null,
      tags: [],
      content: joinBody(n.content),
      source: "cms",
    };
  }),
]);

// المعجم: 250 مصطلحاً — الحقول كاملة (المرجع الكامل) + url محسوبة
// بالسياسة نفسها التي تخدم بها الواجهة (المعرّف العربي أولاً).
// استدعاء واحد لكل مصطلح: lexiconSlug يضيف النتيجة للمجموعة بنفسه.
const lexiconTaken = new Set();
const lexiconRef = lexicon.map((term) => {
  const slug = lexiconSlug(term, lexiconTaken);
  return {
    ...term,
    slug,
    url: pathOfUrl(canonicalLexicon(slug)),
  };
});

// الكليات
const schoolsRef = schools.map((s) => ({
  id: s.id,
  name: s.name,
  short_name: s.short_name || null,
  university: s.university,
  city: s.city,
  foundedYear: s.foundedYear || null,
  officialUrl: s.officialUrl || null,
  studyAreas: s.studyAreas || [],
  synopsis: s.synopsis || "",
  registrationInfo: s.registrationInfo || null,
  usefulLinks: s.usefulLinks || [],
  socialMedia: s.socialMedia || null,
  verifiedAt: s.verifiedAt || null,
  url: pathOfUrl(canonicalSchool(schoolSlug(s))),
}));

// الفعاليات
const eventsRef = events.map((e) => ({
  id: e.id,
  title: e.title,
  organizer: e.organizer || null,
  city: e.city || null,
  venue: e.venue || null,
  eventDate: e.eventDate || null,
  time: e.time || null,
  mode: e.mode || null,
  status: e.status || null,
  topics: e.topics || [],
  excerpt: e.excerpt || "",
  sourceUrl: e.sourceUrl || null,
  content: joinBody(e.body),
  url: pathOfUrl(canonicalEvent(eventSlug(e))),
}));

// الأرشيف (ملفات PDF + ملخصات): local ثم pdf_summaries من CMS —
// مرور واحد بالترتيب (docs → pdfs → laws) والمجموعة المشتركة واحدة،
// مطابقاً لـ generate-sitemap. docSlug يضيف نتيجته للمجموعة بنفسه.
const pdfTaken = new Set();
const docsRef = [
  ...docs.map((d) => {
    const slug = docSlug(d, pdfTaken);
    return {
      id: d.id,
      title: d.title,
      semester: d.semester || null,
      module: d.module || null,
      professor: d.professor || null,
      systemTag: d.systemTag || null,
      fileUrl: d.fileUrl || null,
      updatedAt: d.updatedAt || null,
      url: pathOfUrl(canonicalPdf(slug)),
    };
  }),
  ...cmsPdfs.map((p) => {
    const slug = docSlug(p, pdfTaken);
    return {
      id: p.id,
      title: p.title,
      semester: p.semester || null,
      module: p.module || null,
      professor: p.professor || null,
      systemTag: null,
      description: p.description || "",
      fileUrl: p.file_url || null,
      updatedAt: p.updated_at || null,
      url: pathOfUrl(canonicalPdf(slug)),
      source: "cms",
    };
  }),
];

// القوانين (CMS فقط): السجلات الأثقل قيمة — نص القانون الكامل في عمود content
const lawsRef = cmsLaws.map((l) => {
  const slug = docSlug(l, pdfTaken);
  return {
    id: l.id,
    title: l.title,
    law_number: l.law_number || null,
    official_gazette_number: l.official_gazette_number || null,
    publication_date: l.publication_date ? String(l.publication_date).slice(0, 10) : null,
    description: l.description || "",
    content: joinBody(l.content),
    pdf_url: l.pdf_url || null,
    url: pathOfUrl(canonicalPdf(slug)),
  };
});

// الأسئلة الشائعة: عناصر مسطّحة مع اسم المجموعة (رابط القسم — لا صفحة لكل سؤال)
const faqRef = (faqGroups || []).flatMap((g) =>
  (g.items || []).map((item) => ({
    group: g.title || g.category || "عام",
    question: item.question,
    answer: item.answer,
    url: "/faq",
  }))
);

// أسئلة الاختبارات: tiers → روابط أقسام الاختبار الأربعة
const QUIZ_TIER_URL = {
  university: "/quiz/university",
  general: "/quiz/general",
  concours: "/quiz/concours",
  interview: "/quiz/interview",
};
const quizRef = quiz.map((q) => ({
  id: q.id,
  tier: q.tier,
  semester: q.semester || null,
  module: q.module || null,
  difficulty: q.difficulty || null,
  question: q.question,
  options: q.options || [],
  answer: q.answer ?? null,
  explanation: q.explanation || "",
  reference: q.reference || null,
  url: QUIZ_TIER_URL[q.tier] || "/quiz",
}));

const DATASETS = [
  {
    name: "articles",
    title: "المقالات القانونية",
    section: "/articles",
    urlPattern: "/articles/{slug}",
    description: "مقالات قانونية تعليمية: العنوان، المقتطف، النص الكامل، التصنيف والتاريخ.",
    items: articles,
  },
  {
    name: "news",
    title: "المستجدات التشريعية والقضائية",
    section: "/news",
    urlPattern: "/news/{slug}",
    description: "أخبار تشريعية وقضائية مغربية: الملخص، النص الكامل، المصدر والتاريخ.",
    items: news,
  },
  {
    name: "lexicon",
    title: "المعجم القانوني",
    section: "/lexicon",
    urlPattern: "/lexicon/{slug}",
    description: "250 مصطلحاً قانونياً عربياً-فرنسياً: التعريف، التفسير المبسط، الأمثلة، المصادر القانونية والكلمات المفتاحية للامتحانات.",
    items: lexiconRef,
  },
  {
    name: "schools",
    title: "دليل كليات الحقوق",
    section: "/schools",
    urlPattern: "/schools/{slug}",
    description: "21 كلية حقوق بالمغرب: الجامعة، المدينة، التخصصات، التسجيل، الروابط الرسمية.",
    items: schoolsRef,
  },
  {
    name: "events",
    title: "الفعاليات والندوات",
    section: "/events",
    urlPattern: "/events/{slug}",
    description: "فعاليات أكاديمية وقانونية: الجهة المنظمة، المكان، التاريخ والمواضيع.",
    items: eventsRef,
  },
  {
    name: "docs",
    title: "الأرشيف الدراسي (ملفات وملخصات)",
    section: "/archive",
    urlPattern: "/pdf/{slug}",
    description: "ملفات PDF وملخصات مصنفة حسب الفصل S1-S6 والمادة والأستاذ.",
    items: docsRef,
  },
  {
    name: "laws",
    title: "النصوص القانونية",
    section: "/pdf",
    urlPattern: "/pdf/{slug}",
    description: "قوانين مغربية من قاعدة البيانات: رقم القانون، الجريدة الرسمية، تاريخ الصدور، الموجز والنص الكامل.",
    items: lawsRef,
  },
  {
    name: "faq",
    title: "الأسئلة الشائعة",
    section: "/faq",
    urlPattern: "/faq",
    description: "إجابات مباشرة (AEO) على الأسئلة المتكررة حول الدراسة القانونية والمنصة.",
    items: faqRef,
  },
  {
    name: "quiz",
    title: "بنك أسئلة الاختبارات",
    section: "/quiz",
    urlPattern: "/quiz/{tier}",
    description: "أسئلة QCM بأربعة مسارات (كلية S1-S6، عام، مباريات، مقابلات): السؤال، الخيارات، الإجابة والتفسير والمرجع.",
    items: quizRef,
  },
];

/* ── التوليد ────────────────────────────────────────────────────────────── */
await mkdir(OUT, { recursive: true });

const clamp = (text, max = 400) => {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
};

// نسخة Markdown: الهامش + لكل سجل عنوان + رابط + الحقول المقروءة
const renderMd = (dataset) => {
  const lines = [];
  lines.push(`# ${dataset.title} — مرجع ميزان الرقمية`);
  lines.push("");
  lines.push(
    `${dataset.items.length} سجلاً. القسم العام: ${DOMAIN}${dataset.section} — النمط: ${DOMAIN}${dataset.urlPattern}`
  );
  lines.push(
    "محتوى تعليمي وبحثي؛ النص الرسمي النافذ يُتحقق منه عبر الجريدة الرسمية (sgg.gov.ma)."
  );
  lines.push("");

  for (const item of dataset.items) {
    const title = item.title || item.term_ar || item.name || item.question || item.id;
    lines.push(`## ${title}`);
    lines.push("");
    lines.push(`${DOMAIN}${item.url}`);
    lines.push("");
    switch (dataset.name) {
      case "lexicon":
        lines.push(`- **الفرنسية:** ${item.term_fr || "—"}`);
        if (item.category) lines.push(`- **التصنيف:** ${item.category}`);
        if (item.definition) lines.push(`- **التعريف:** ${item.definition}`);
        if (item.simple_explanation) lines.push(`- **ببساطة:** ${clamp(item.simple_explanation, 300)}`);
        if (item.exam_keywords?.length) lines.push(`- **كلمات الامتحان:** ${item.exam_keywords.join("، ")}`);
        break;
      case "schools":
        lines.push(`- **الجامعة:** ${item.university || "—"} — **المدينة:** ${item.city || "—"}`);
        if (item.studyAreas?.length) lines.push(`- **التخصصات:** ${item.studyAreas.join("، ")}`);
        if (item.synopsis) lines.push(`- **النبذة:** ${clamp(item.synopsis, 300)}`);
        if (item.officialUrl) lines.push(`- **الموقع الرسمي:** ${item.officialUrl}`);
        break;
      case "quiz":
        lines.push(`- **المسار:** ${item.tier}${item.semester ? ` — ${item.semester}` : ""}${item.module ? ` — ${item.module}` : ""}`);
        lines.push(`- **السؤال:** ${item.question}`);
        (item.options || []).forEach((opt, i) => lines.push(`  ${"أبجدهو".charAt(i) || i + 1}) ${opt}`));
        // answer مخزن كترقيم (index) — في النسخة النصية نعرض نص الخيار نفسه
        if (item.answer != null) {
          const answerText =
            typeof item.answer === "number" && item.options?.[item.answer]
              ? item.options[item.answer]
              : item.answer;
          lines.push(`- **الإجابة:** ${answerText}`);
        }
        if (item.explanation) lines.push(`- **التفسير:** ${clamp(item.explanation, 300)}`);
        break;
      case "faq":
        lines.push(`- **المجموعة:** ${item.group}`);
        lines.push(`- **س:** ${item.question}`);
        lines.push(`- **ج:** ${item.answer}`);
        break;
      case "events":
        lines.push(`- **الجهة:** ${item.organizer || "—"} — **المكان:** ${item.venue || item.city || "—"}`);
        if (item.eventDate) lines.push(`- **التاريخ:** ${item.eventDate} ${item.time || ""}`.trim());
        if (item.topics?.length) lines.push(`- **المواضيع:** ${item.topics.join("، ")}`);
        if (item.excerpt) lines.push(`- **النبذة:** ${clamp(item.excerpt, 300)}`);
        break;
      case "docs":
        lines.push(`- **الفصل:** ${item.semester || "—"} — **المادة:** ${item.module || "—"} — **الأستاذ:** ${item.professor || "—"}`);
        if (item.description) lines.push(`- **الوصف:** ${clamp(item.description, 300)}`);
        break;
      case "laws":
        if (item.law_number) lines.push(`- **رقم القانون:** ${item.law_number}`);
        if (item.official_gazette_number) lines.push(`- **الجريدة الرسمية:** ${item.official_gazette_number}`);
        if (item.publication_date) lines.push(`- **تاريخ الصدور:** ${item.publication_date}`);
        if (item.description) lines.push(`- **الموجز:** ${clamp(item.description, 300)}`);
        break;
      default:
        if (item.excerpt) lines.push(`- **المقتطف:** ${clamp(item.excerpt, 300)}`);
        if (item.content) lines.push(`- **المحتوى:** ${clamp(item.content, 600)}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
};

const indexJson = {
  name: "Mizan Digital AI Reference",
  version: "1.0.0",
  generatedAt: NOW,
  domain: DOMAIN,
  description:
    "Machine-readable reference of all Mizan Digital content for AI agents and language models: structured JSON (full fields) and readable Markdown (with links) per dataset, every record carrying its canonical URL.",
  disclaimer:
    "Educational and research content for Moroccan law students. Verify legal claims against official sources: sgg.gov.ma (Official Gazette) and adala.justice.gov.ma (Adala portal).",
  totalRecords: DATASETS.reduce((acc, d) => acc + d.items.length, 0),
  sources: {
    local: "src/data JSON datasets",
    cms: cmsOk
      ? `Supabase (published: ${cmsArticles.length} articles, ${cmsNews.length} news, ${cmsPdfs.length} pdfs, ${cmsLaws.length} laws)`
      : "unavailable at build time — local data only",
  },
  mcp: {
    endpoint: `${DOMAIN}/mcp`,
    tools: [
      "mizan_reference_index — lists every dataset (counts, file URLs, URL patterns)",
      "mizan_reference_search — full-text search across datasets (Arabic/French/English)",
    ],
  },
  datasets: DATASETS.map((d) => ({
    name: d.name,
    title: d.title,
    count: d.items.length,
    json: `/reference/${d.name}.json`,
    markdown: `/reference/${d.name}.md`,
    section: d.section,
    urlPattern: d.urlPattern,
    description: d.description,
  })),
};

for (const dataset of DATASETS) {
  const payload = {
    dataset: dataset.name,
    title: dataset.title,
    generatedAt: NOW,
    count: dataset.items.length,
    section: `${DOMAIN}${dataset.section}`,
    urlPattern: `${DOMAIN}${dataset.urlPattern}`,
    items: dataset.items,
  };
  await writeFile(join(OUT, `${dataset.name}.json`), `${JSON.stringify(payload, null, 1)}\n`, "utf8");
  await writeFile(join(OUT, `${dataset.name}.md`), renderMd(dataset), "utf8");
}

await writeFile(join(OUT, "index.json"), `${JSON.stringify(indexJson, null, 1)}\n`, "utf8");

const indexMd = [
  `# مرجع ميزان الرقمية للذكاء الاصطناعي (AI Reference)`,
  ``,
  `> ${indexJson.description}`,
  ``,
  `- **النطاق:** ${DOMAIN}`,
  `- **تاريخ التوليد:** ${NOW}`,
  `- **إجمالي السجلات:** ${indexJson.totalRecords}`,
  `- **الصادر:** ${cmsOk ? "بيانات محلية + CMS (المحتوى المنشور)" : "بيانات محلية فقط (CMS غير متاح وقت البناء)"}`,
  ``,
  `## مجموعات البيانات`,
  ``,
  `| المجموعة | السجلات | JSON | Markdown | القسم |`,
  `|---|---|---|---|---|`,
  ...DATASETS.map(
    (d) =>
      `| ${d.title} (${d.name}) | ${d.items.length} | [/reference/${d.name}.json](${DOMAIN}/reference/${d.name}.json) | [/reference/${d.name}.md](${DOMAIN}/reference/${d.name}.md) | [${d.section}](${DOMAIN}${d.section}) |`
  ),
  ``,
  `## كيف تستعمل هذا المرجع (للوكلاء)`,
  ``,
  `- **بيانات مهيكّلة:** اقرأ ملف \`<name>.json\` — كل الحقول + \`url\` لكل سجل.`,
  `- **قراءة نصية:** ملف \`<name>.md\` بروابط جاهزة.`,
  `- **بحث:** أداة MCP \`mizan_reference_search\` على ${DOMAIN}/mcp (عربي/فرنسي/إنجليزي).`,
  `- **فهرس آلي:** /reference/index.json — عُدّه نقطة البداية عند كل استعمال.`,
  ``,
  `## تنبيه`,
  ``,
  `${indexJson.disclaimer}`,
  ``,
].join("\n");
await writeFile(join(OUT, "index.md"), indexMd, "utf8");

console.log(
  `✓ public/reference — ${DATASETS.length} مجموعات، ${indexJson.totalRecords} سجلاً` +
    `${cmsOk ? "" : " (بلا CMS)"} — index.json + index.md + ${DATASETS.length * 2} ملفات.`,
);
