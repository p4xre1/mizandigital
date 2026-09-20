import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildLlmsTxt } from "./lib/llms-content.mjs";
import {
  SITE_ORIGIN,
  articleSlug,
  canonicalArticle,
  canonicalEvent,
  canonicalLexicon,
  canonicalNews,
  canonicalPage,
  canonicalPdf,
  canonicalSchool,
  canonicalUrl,
  contentSlug,
  docSlug,
  eventSlug,
  isItemPath,
  isIndexablePath,
  lexiconSlug,
  newsSlug,
  pathOfUrl,
  schoolSlug,
  slugify,
} from "../shared/seo/url-policy.js";
import { dateOf, fetchPublishedCmsContent } from "./lib/cms-content.mjs";
import {
  MAX_TITLE,
  UTILITY_ROUTES,
  abbreviateFaculty,
  buildMetaDescription,
  fitTitle,
} from "./lib/meta-description.mjs";
import { policyToHtml } from "../src/content/legal/markup.js";
import {
  PRIVACY_POLICY,
  COOKIE_POLICY,
  TERMS_POLICY,
} from "../src/content/legal/policies.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "../dist");
const DATA = join(__dirname, "../src/data");
// النطاق من سياسة الروابط — لا يُكتب هنا باليد، وإلا انفصل ما يولّده prerender
// عمّا تنشره sitemap (shared/seo/url-policy.js).
const DOMAIN = SITE_ORIGIN;
const NOW = new Date().toISOString();

const readJson = async (name) => {
  const file = await readFile(join(DATA, name), "utf8");
  return JSON.parse(file);
};

const [
  articles,
  events,
  schools,
  lexicon,
  news,
  faqGroups,
  documents,
  quizQuestions,
] = await Promise.all([
  readJson("articles.json"),
  readJson("events.json"),
  readJson("schools.json"),
  readJson("lexicon.json"),
  readJson("news.json"),
  readJson("faq.json"),
  readJson("docs.json"),
  readJson("quiz-questions.json"),
]);

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const count = (value) => Array.isArray(value) ? value.length : 0;

// الاسم محفوظ للاستعمالات الكثيرة أدناه، والتنفيذ من سياسة الروابط وحدها:
// نسخة prerender ونسخة الواجهة (src/lib/utils/generateSlug.ts) ونسخة sitemap
// صارت دالة واحدة، فلا يُولَّد ملف باسم ويُنشر رابط باسم آخر.
const generateSlug = (text = "") => slugify(text);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* -------------------------------------------------------
   Term auto-linking for server-side prerendering
   Converts lexicon terms to internal links in articles/news
------------------------------------------------------- */
function escapeRegex(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
}

function linkTermsInContent(text, terms, linkedIds = new Set(), maxLinks = 12) {
  if (!text || !terms || terms.length === 0) return text
  if (linkedIds.size >= maxLinks) return text

  // Filter and sort by length descending - longest first
  const sorted = [...terms]
    .filter(t => t.term_ar && t.term_ar.length >= 4)
    .sort((a, b) => b.term_ar.length - a.term_ar.length)
    .slice(0, 60)

  let result = text
  let linkCount = 0

  for (const term of sorted) {
    if (linkCount >= maxLinks) break
    if (linkedIds.has(term.id)) continue

    const regex = new RegExp(escapeRegex(term.term_ar), "g")
    const matches = result.match(regex)
    if (matches) {
      // Replace first occurrence only
      result = result.replace(regex, (match, offset, full) => {
        // Avoid replacing inside existing <a> tags - simple check
        const before = full.slice(Math.max(0, offset - 50), offset)
        if (before.includes('<a') && !before.includes('</a>')) return match
        if (linkedIds.has(term.id)) return match
        if (linkCount >= maxLinks) return match
        
        linkedIds.add(term.id)
        linkCount++
        return `<a href="/lexicon/${term.slug}" class="mizan-term-link" title="تعريف: ${term.term_ar}">${match}</a>`
      })
    }
  }

  return result
}

function linkTermsInHtmlContent(htmlContent, terms) {
  const linkedIds = new Set()
  // Split by paragraphs and link
  return htmlContent.split("\n\n").map(para => {
    if (para.trim().startsWith("#") || para.trim().startsWith("!") || para.trim().startsWith(">") || para.trim().startsWith("-")) {
      return para
    }
    return linkTermsInContent(para, terms, linkedIds, 12)
  }).join("\n\n")
}


const escapeJsonForHtml = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

/**
 * الرابط القانوني المطلق لمسار — بلا شرطة نهاية، حتى على الجذر.
 *
 * كانت النسخة السابقة تُرجع `${DOMAIN}/` للصفحة الرئيسية، فيُطبع في
 * dist/index.html: <link rel="canonical" href="https://www.mizan.page/">.
 * الجذرُ برابطَيَن (بشرطة وبلا شرطة) هو أسوأ تكرار في الموقع كله، لأن
 * صفحتَه الرئيسية أقوى صفحة في Domain Rating فتقسمها نسختان.
 */
const absoluteUrl = (path) => canonicalUrl(path);

/**
 * يُوحّد شكل السجل المحلي (articles.json / news.json / events.json) وسجل
 * نظام الإدارة (Supabase) في كائن واحد، لأن مولّدات الـ staticBody ومخططات
 * schema.org يجب أن تتغذى من مصدر واحد وإلا اختلف نص الصفحة عن بياناتها
 * المهيكلة عند إضافة محتوى من لوحة التحكم.
 */
function normalizeEntry(entry) {
  const raw = entry.item ?? {};
  const title = raw.title || entry.name || "محتوى ميزان الرقمية";
  const excerpt =
    raw.meta_description || raw.excerpt || raw.summary || raw.description || entry.summary || "";
  const bodyRaw = raw.content || raw.body || raw.text || "";
  const content = Array.isArray(bodyRaw) ? bodyRaw.join("\n\n") : bodyRaw || "";

  return {
    ...raw,
    title,
    excerpt,
    content,
    category: raw.category || null,
    publishedAt: raw.publishedAt || raw.published_at || raw.date || null,
    updatedAt: raw.updatedAt || raw.updated_at || null,
    image: raw.image || raw.imageUrl || raw.image_url || raw.coverImage || raw.cover_image || null,
    slug: entry.slug || String(entry.path || "").split("/").filter(Boolean).pop() || "",
  };
}

// مخطط مسار التنقل (BreadcrumbList) — يُستخدم عبر صفحات المقالات والأخبار
// والقاموس القانوني لتفعيل خاصية "مسار التنقل" فـ نتائج البحث.
// items: [{ name, path }] حيث path نسبي (يبدأ بـ "/") أو رابط كامل.
const buildBreadcrumbSchema = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.path.startsWith("http") ? item.path : absoluteUrl(item.path),
  })),
});

// صورة افتراضية للمقالات/الأخبار اللي ماعندهاش صورة خاصة بها فـ البيانات
// المحلية (articles.json / news.json) — أحسن من ترك "image" ناقصة تماماً
// فـ الـ schema (Google كيعتبرها optional بصح موصى بيها).
const DEFAULT_ARTICLE_IMAGE = `${DOMAIN}/og-image.png`;

const safeDate = (value, fallback = NOW) => {
  if (!value) return fallback;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? fallback
    : date.toISOString();
};

/* -------------------------------------------------------
   Dataset statistics
------------------------------------------------------- */

const statistics = {
  articles: count(articles),
  news: count(news),
  events: count(events),
  schools: count(schools),
  lexicon: count(lexicon),
  documents: count(documents),
};

const totalContent =
  statistics.articles +
  statistics.news +
  statistics.events +
  statistics.schools +
  statistics.lexicon +
  statistics.documents;

const uniqueSorted = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));

const legalDomains = uniqueSorted(lexicon.map((term) => term.category));
const articleCategories = uniqueSorted(articles.map((article) => article.category));
const schoolCities = uniqueSorted(schools.map((school) => school.city));
const faqTopics = uniqueSorted((faqGroups ?? []).map((group) => group.title));

/* -------------------------------------------------------
   Lexicon slugs
------------------------------------------------------- */

const usedLexiconSlugs = new Set();

// lexiconSlug() من سياسة الروابط هي نفسها التي تستعملها الواجهة في
// TermPage.tsx / LexiconPage.tsx (عبر src/lib/utils/generateSlug.ts):
// المعرّف العربي أولاً، وعند التكرار يُلحق به المعرّف (لا المقابل الفرنسي).
// أي انحراف بين الطرفَين يولّد رابطاً في القائمة أو في sitemap يشير إلى
// ملف غير موجود — وحدث هذا فعلاً مع «الرهن الحيازي».
// عدد تكرار المصطلح العربي: سجلّان بـ«الرهن الحيازي» مثلاً كانا يولّدان
// عنواناً واحداً لصفحتين — يقرأه الزاحف تكراراً فيُرجّح نسخة ويرفع الأخرى
// من الفهرس («Duplicate, Google chose different canonical»). المقابلة
// الفرنسية تفصل بينهما، ولا تُذكر إلا حين يلزم.
const termArCount = new Map();
for (const item of lexicon) {
  const key = String(item.term_ar || "").trim();
  if (key) termArCount.set(key, (termArCount.get(key) || 0) + 1);
}

const lexiconWithSlugs = lexicon.map((item) => {
  const slug = lexiconSlug(item, usedLexiconSlugs);
  const term = String(item.term_ar || "").trim();
  const duplicated = (termArCount.get(term) || 0) > 1;
  const titleLabel =
    duplicated && item.term_fr ? `${term} (${String(item.term_fr).trim()})` : term;

  return {
    ...item,
    slug,
    titleLabel,
  };
});

// معرّف المصطلح ← مساره الداخلي. الصلات في بطاقات lexicon.json معرّفات،
// وتُطبع هنا كروابط حتى ترى النسخة المُسبقـة التخزين ما تراه النسخة الحيّة
// (وبنفس slugs التي ولّدتها lexiconSlug أعلاه، فلا رابط إلى ملف غير موجود).
const cleanTermLabel = (value) => String(value || "").replace(/\s+/g, " ").trim();

const termLinkById = new Map(
  lexiconWithSlugs
    .filter((term) => term.id)
    .map((term) => [
      term.id,
      {
        path: `/lexicon/${term.slug}`,
        label: cleanTermLabel(term.titleLabel || term.term_ar),
      },
    ])
);


/* -------------------------------------------------------
   قوائم المحتوى + محتوى نظام الإدارة (CMS)
-------------------------------------------------------

  الاختيار هنا واحد للحالتين: الروابط التي تُطبع في صفحات المحاور،
  والمسارات التي تُولَّد لها ملفات HTML. لا يمكن أن يختلفا لأن كليهما يُبنى
  من نفس الكائنات في هذه الكتلة، بنفس دوال سياسة الروابط.

  محتوى CMS اختياري: إن تعذّر الوصول إلى Supabase (بناء بلا شبكة) تُترك
  القائمة على البيانات المحلية ويُطبع تحذير — ولا يفشل البناء، لأن الفهرسة
  لا يجوز أن تتعلق بتوفر خدمة خارجية.

  usedContentPaths تمنع مساراً مكرراً: مقالات CMS المنشورة قد تحمل نفس
  معرّفات articles.json، ولو تُرِك التكرار لانفجر فحص
  «Duplicate route protection» أدناه أو لنُسخ نفس المحتوى في صفحتين.
------------------------------------------------------- */

const cms = await fetchPublishedCmsContent();

if (!cms.ok) {
  console.warn(`⚠️  prerender: ${cms.error} — تُولَّد الصفحات المحلية فقط.`);
}

const usedContentPaths = new Set();

const skippedContent = [];

function pushContent(list, entry) {
  if (!entry || !entry.path || usedContentPaths.has(entry.path)) return;

  // سجلّ بلا معرّف صالح (لا slug ولا title ولا id) كان يعطي «/articles/»،
  // أي مسار بوابة المقالات نفسها بعد التطبيع — فتنشأ صفحة مكرَّرة أو يفشل
  // البناء على تكرار المسار. نتجاهل السجلّ ونُعلنه، ولا نكسر النشر.
  if (!isItemPath(entry.path)) {
    skippedContent.push(entry.path);
    return;
  }

  usedContentPaths.add(entry.path);
  list.push(entry);
}

const articlePages = [];
const newsPages = [];
const eventPages = [];
const docPages = [];

const usedDocSlugs = new Set();

for (const item of articles) {
  pushContent(articlePages, {
    name: item.title,
    path: pathOfUrl(canonicalArticle(articleSlug(item))),
    summary: item.excerpt || item.summary || "",
    item,
  });
}

for (const item of cms.articles) {
  pushContent(articlePages, {
    name: item.title,
    // contentSlug نفسه المستعمل في الواجهة والخريطة: slug مملوء ← عنوان ← id.
    path: pathOfUrl(canonicalArticle(contentSlug(item))),
    summary: item.meta_description || item.excerpt || "",
    item,
    fromCms: true,
  });
}

for (const item of news) {
  pushContent(newsPages, {
    name: item.title,
    path: pathOfUrl(canonicalNews(newsSlug(item))),
    summary: item.summary || item.excerpt || "",
    item,
  });
}

for (const item of cms.news) {
  pushContent(newsPages, {
    name: item.title,
    path: pathOfUrl(canonicalNews(contentSlug(item))),
    summary: item.summary || "",
    item,
    fromCms: true,
  });
}

for (const item of events) {
  pushContent(eventPages, {
    name: item.title,
    path: pathOfUrl(canonicalEvent(eventSlug(item))),
    summary: item.excerpt || "",
    item,
  });
}

for (const item of [...documents, ...cms.pdfs, ...cms.laws]) {
  const slug = docSlug(item, usedDocSlugs);

  pushContent(docPages, {
    name: item.title,
    path: pathOfUrl(canonicalPdf(slug)),
    summary: item.description || "",
    item,
    slug,
  });
}


if (skippedContent.length) {
  console.warn(
    `⚠️  محتوى متجاهَل في prerender: ${skippedContent.length} سجلّاً بلا معرّف صالح ` +
    `(لا slug ولا title ولا id) — أمثلة: ${skippedContent.slice(0, 4).join(", ")}`
  );
}

/* -------------------------------------------------------
   Entity identity
------------------------------------------------------- */

const publisherSchema = {
  "@type": "Organization",
  "@id": `${DOMAIN}/#organization`,
  name: "ميزان الرقمية",
  // نفس أسماء العلامة البديلة في index.html وSchemaOrg.tsx وschema.ts:
  // كيان واحد بتسمية واحدة في كل الطبقات (Brand Consistency في GEO).
  alternateName: ["Mizan Digital", "Mizan"],
  url: DOMAIN,
  logo: {
    "@type": "ImageObject",
    "@id": `${DOMAIN}/#logo`,
    url: `${DOMAIN}/logo-512.png`,
    contentUrl: `${DOMAIN}/logo-512.png`,
    width: 512,
    height: 512,
    caption: "ميزان الرقمية - شعار المنصة على بلاطة معتمة تظهر فوق الخلفية البيضاء",
  },
  image: {
    "@type": "ImageObject",
    url: `${DOMAIN}/og-image.png`,
    width: 1200,
    height: 630,
  },
  sameAs: [
    "https://www.facebook.com/profile.php?id=61593607157317",
    "https://www.instagram.com/mizan.page",
    "https://www.tiktok.com/@mizan_page",
    "https://www.pinterest.com/mohamedredayassinn/",
    "https://x.com/MIZANPAGE",
    "https://whatsapp.com/channel/0029Vb97ZZE23n3WE7R6Tf1m",
    "https://github.com/p4xre1/mizandigital",
  ],
};

const authorSchema = {
  "@type": "Organization",
  "@id": `${DOMAIN}/#author`,
  name: "فريق ميزان الرقمية",
  url: `${DOMAIN}/about`,
};

const websiteSchema = {
  "@type": "WebSite",
  "@id": `${DOMAIN}/#website`,
  name: "ميزان الرقمية",
  url: DOMAIN,
  inLanguage: "ar-MA",
  publisher: {
    "@id": `${DOMAIN}/#organization`,
  },
};

/* -------------------------------------------------------
   Critical shell — الهيكل الأولي المُصمَّم للصفحة الرئيسية
-------------------------------------------------------

  لماذا يوجد هذا؟
  ────────────────
  كان #root يُملأ بنص SEO مجرد من أي كلاسّات (عناوين وفقرات بالتنسيق
  الافتراضي للمتصفح)، ثم يستبدله React بالكامل عند mount عبر
  createRoot().render(). أي أن أول رسم يعرض مستنداً نصياً plain، والرسم
  الثاني يعرض الواجهة الحقيقية — فينتقل كل عنصر ظاهر في إطار العرض من
  مكانه. هذا هو السبب المباشر لـ CLS = 0.44 في تقرير Lighthouse،
  ولأن عنصر LCP (عنوان الصفحة) كان يُستبدل فيتأخر إلى 5.3 ثانية.

  الحل: أن يُطابق الهيكل المُهيّأ مسبقاً ما يرسمه React فوق خط الطي
  (header + hero) بنفس الكلاسّات والبنية والبيانات، فيصبح الاستبدال
  غير محسوس بصرياً ولا يحرّك شيئاً داخل إطار العرض. كل الكلاسّات
  المستعملة هنا موجودة أصلاً في src (Header/PublicNavigation/HomePage)
  فهي ضمن حزمة CSS المبنية دون أي إضافة.

  ملاحظة صيانة: عند تغيير hero الصفحة الرئيسية أو الـ Header، حدّث هذا
  الهيكل معه — أي فرق في البنية يعود فيظهر كانزياح تخطيط.
------------------------------------------------------- */

const svgIcon = (body, cls, size = 24) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${body}</svg>`;

const ICON = {
  search: `<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>`,
  moon: `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>`,
  menu: `<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>`,
  scale: `<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>`,
  library: `<path d="m16 6 4 14"></path><path d="M12 6v14"></path><path d="M8 8v12"></path><path d="M4 4v16"></path>`,
  bookOpen: `<path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>`,
  shieldCheck: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path>`,
  clock: `<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>`,
  cap: `<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>`,
};

const NAV_LINKS = [
  ["الرئيسية", "/", true],
  ["المقالات", "/articles", false],
  ["الأخبار", "/news", false],
  ["القاموس", "/lexicon", false],
  ["الكليات", "/schools", false],
  ["الأرشيف", "/archive", false],
  ["الفعاليات", "/events", false],
  ["الاختبارات", "/quiz", false],
];

const NAV_BASE = "px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all";
const NAV_ACTIVE = "bg-[#2563eb] text-white shadow-sm";
const NAV_IDLE = "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white";

// المصادقة صارت Supabase Auth (أُزيل Clerk): زر «دخول» يظهر دائماً في
// الهيكل المُسبق (prerender)، ولا يعتمد على أي مفتاح وقت البناء. حالة
// الجلسة تُحسم في المتصفح، وAuthControls يعرض هيكلاً بنفس العرض حتى لا
// يقفز الشريط (CLS) ريثما تُقرأ الجلسة من كوكي sb-*.

const homeHeaderHtml = `
        <header class="sticky top-0 z-[50] w-full bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-[#e2e8f0] dark:border-[#1e293b]">
          <div class="container mx-auto max-w-[1280px] px-4 h-16 flex items-center justify-between gap-3">
            <a href="/" class="flex shrink-0 items-center gap-2.5">
              <img src="/Logo.svg" alt="ميزان الرقمية" class="size-9 rounded-xl shadow-sm object-cover" width="36" height="36" loading="eager" fetchpriority="high" decoding="async">
              <span>
                <span class="block text-[15px] font-black tracking-tight leading-none text-[#0f172a] dark:text-white">ميزان الرقمية</span>
                <span class="block text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8] tracking-wide">المعرفة القانونية للطلبة</span>
              </span>
            </a>
            <nav class="hidden lg:flex items-center gap-1">${NAV_LINKS.map(
              ([label, href, active]) =>
                `\n              <a href="${href}"${active ? ` aria-current="page"` : ""} class="${NAV_BASE} ${active ? NAV_ACTIVE : NAV_IDLE}">${label}</a>`
            ).join("")}
            </nav>
            <!-- البحث في وسط الشريط (سطح المكتب). نفس بنية NavbarSearch.tsx؛
                 form حقيقي بـ method=get فيعمل Enter حتى قبل تحميل JS،
                 و React يستبدله عند الـ hydration بحقل مرتبط بـ validateSearch
                 وباختصار K. -->
            <div class="hidden md:flex min-w-0 flex-1 justify-center px-2">
              <form action="/search" method="get" role="search" aria-label="البحث في ميزان الرقمية" class="relative flex w-full max-w-[320px] items-center">
                <div class="flex h-9 w-full items-center gap-2 rounded-full border border-[#e2e8f0] bg-[#f8fafc] pr-1 pl-2 dark:border-[#334155] dark:bg-[#1e293b]">
                  <div class="grid size-7 shrink-0 place-items-center rounded-full bg-[#2563eb] text-white">${svgIcon(ICON.search, "size-4", 16)}</div>
                  <input type="search" name="q" placeholder="ابحث..." maxlength="100" autocomplete="off" spellcheck="false" aria-label="ابحث في المقالات والأخبار والقاموس والكليات" class="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-normal placeholder:text-[#94a3b8] dark:text-white">
                  <kbd class="grid h-6 shrink-0 place-items-center rounded-md border border-[#e2e8f0] bg-white px-1.5 font-sans text-[11px] font-black text-[#64748b] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#94a3b8]" title="اختصار البحث: K">K</kbd>
                </div>
              </form>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <a href="/search" class="grid md:hidden size-9 place-items-center rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-colors" aria-label="البحث">${svgIcon(ICON.search, "", 16)}</a>
              <button type="button" class="grid size-9 place-items-center rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-colors" aria-label="تبديل الوضع الليلي">${svgIcon(ICON.moon, "text-[#475569]", 16)}</button>
              <div class="hidden md:flex items-center gap-2">
                <a href="/login" class="rounded-full border border-[#e2e8f0] dark:border-[#334155] px-4 py-2 text-[13px] font-bold text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] transition-colors">دخول</a>
              </div>
              <button type="button" class="lg:hidden grid size-9 place-items-center rounded-full bg-[#0f172a] dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity" aria-label="فتح القائمة">${svgIcon(ICON.menu, "", 18)}</button>
            </div>
          </div>
        </header>`;

const homeStatCards = [
  ["القاموس", "250 مصطلح", ICON.scale, "bg-[#2563eb]", String(statistics.lexicon)],
  ["الأرشيف", "S1-S6", ICON.library, "bg-[#f59e0b]", "S1-S6"],
  ["المقالات", `${statistics.articles} مقال`, ICON.bookOpen, "bg-[#10b981]", String(statistics.articles)],
  ["الأخبار", "مستجدات تشريعية", ICON.cap, "bg-[#b91c1c]", String(statistics.news)],
];

const homeHeroHtml = `
          <section class="relative bg-white dark:bg-[#0f172a] overflow-hidden">
            <div class="container relative mx-auto max-w-[800px] px-6 py-14 lg:py-20 flex flex-col items-center text-center">
              <p class="text-[13px] font-bold tracking-[0.08em] text-[#2563eb]">ميزان الرقمية</p>
              <h1 class="mt-3 text-[30px] md:text-[42px] font-black leading-[1.25] tracking-[-0.02em] text-[#0f172a] dark:text-white">المعرفة القانونية لطلبة الحقوق في المغرب</h1>
              <p class="lead mt-5 max-w-[620px] text-[15px] md:text-[16px] font-bold leading-7 text-[#334155] dark:text-[#cbd5e1]">ميزان الرقمية منصة مغربية تعليمية لطلبة الحقوق، محتواها الأساسي مجاني، وتجمع القاموس القانوني، وملخصات الفصول S1-S6، ودليل كليات الحقوق بالمغرب في مكان واحد.</p>
              <p class="mt-4 max-w-[560px] text-[14px] md:text-[15px] leading-7 text-[#475569] dark:text-[#94a3b8]">ابدأ من الأرشيف الدراسي بملخصات الفصول، أو قِس مستواك باختبار تجريبي، وتابع المقالات التحليلية والمستجدات التشريعية.</p>
              <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a href="/articles" class="inline-flex items-center gap-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-7 py-3 text-[14px] font-bold transition-colors">ابدأ الآن<span class="size-5 grid place-items-center rounded-full bg-white/20 text-[12px]">←</span></a>
                <a href="/quiz" class="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-7 py-3 text-[14px] font-bold text-[#0f172a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors">اختبر معرفتك القانونية<span class="size-5 grid place-items-center rounded-full bg-[#f1f5f9] dark:bg-[#334155] text-[12px]">←</span></a>
              </div>
              <ul class="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-bold text-[#475569] dark:text-[#94a3b8]">
                <li class="flex items-center gap-1.5">${svgIcon(ICON.shieldCheck, "size-4 text-[#2563eb]", 16)}محتوى أساسي مجاني</li>
                <li class="flex items-center gap-1.5">${svgIcon(ICON.clock, "size-4 text-[#2563eb]", 16)}تحديث مستمر للمستجدات</li>
                <li class="flex items-center gap-1.5">${svgIcon(ICON.library, "size-4 text-[#2563eb]", 16)}ملخصات الفصول S1-S6</li>
              </ul>

              <div class="mt-10 w-full max-w-[560px] grid grid-cols-2 gap-3">${homeStatCards
                .map(
                  ([title, desc, icon, color, badge]) => `
                <div class="text-right rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-4 shadow-sm">
                  <div class="flex items-center justify-between">
                    <div class="grid size-9 place-items-center rounded-xl ${color} text-white shadow-sm">${svgIcon(icon, "size-4", 16)}</div>
                    <span class="text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border border-[#e2e8f0] dark:border-[#475569] rounded-full px-2 py-1">${badge}</span>
                  </div>
                  <h2 class="mt-3 font-black text-[12px] text-[#0f172a] dark:text-white">${title}</h2>
                  <p class="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">${desc}</p>
                </div>`
                )
                .join("")}
              </div>
            </div>
          </section>`;

/* -------------------------------------------------------
   Static pages
------------------------------------------------------- */

const pages = [
  {
    path: "/",
    title: "ميزان الرقمية – منصة طلبة الحقوق في المغرب",

    description:
      "ميزان الرقمية منصة مغربية لطلبة القانون، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك ميزان برو: ملخصات S1-S6، قاموس قانوني 250 مصطلح عربي-فرنسي، دليل 21 كلية حقوق FSJES، مقالات، أخبار تشريعية واختبارات QCM.",

    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${DOMAIN}/#webpage`,
      url: DOMAIN,
      name: "ميزان الرقمية | ملخصات S1-S6، قاموس قانوني ودليل كليات الحقوق بالمغرب",
      description:
        "منصة مغربية لطلبة القانون بأساس مجاني ومزايا متقدمة باشتراك: ملخصات S1-S6، قاموس 250 مصطلح، دليل 21 كلية حقوق، مقالات، أخبار واختبارات QCM.",
      inLanguage: "ar-MA",
      isPartOf: {
        "@id": `${DOMAIN}/#website`,
      },
      // GEO (Content Schema): عقدة WebPage كانت تحمل مرجع الكيان وحده، فيقرأ
      // التدقيق صفحة بلا موضوع معلن. `about` يحمل الآن المرجع + Thing مسمّى،
      // و`primaryTopic` يعلن الموضوع الرئيسي صراحةً — كما في index.html
      // وفي عقدة src/pages/public/HomePage.tsx، فالعقدة الثلاثية واحدة.
      about: [
        { "@id": `${DOMAIN}/#organization` },
        { "@type": "Thing", name: "التعليم القانوني في المغرب" },
      ],
      primaryTopic: {
        "@type": "Thing",
        name: "ملخصات ومصطلحات قانونية لطلبة الحقوق",
      },
      publisher: {
        "@id": `${DOMAIN}/#organization`,
      },
      author: {
        "@id": `${DOMAIN}/#author`,
      },
      datePublished: "2026-07-21T00:00:00Z",
      dateModified: NOW,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: 6,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "القاموس القانوني",
            url: `${DOMAIN}/lexicon`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "الأرشيف الدراسي",
            url: `${DOMAIN}/archive`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "المقالات",
            url: `${DOMAIN}/articles`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "الأخبار",
            url: `${DOMAIN}/news`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "الندوات",
            url: `${DOMAIN}/events`,
          },
          {
            "@type": "ListItem",
            position: 6,
            name: "كليات الحقوق",
            url: `${DOMAIN}/schools`,
          },
        ],
      },
    },

    /*
     * GEO (Content Schema): كانت نسخة الزاحف تحمل WebPage وحدها — بلا أي
     * عقدة محتوى من النوع الذي تعدّه أنظمة الاستشهاد (Article/FAQPage/HowTo).
     * الصفحة تعرض أسئلة وأجوبة فعلية في متنها الثابت، فتُنشر هنا FAQPage
     * بالأسئلة نفسها وبأجوبة مطابقة لما يُقرأ في الصفحة (شرط Google: الجواب
     * المرئي هو نفسه المُنمذج).
     */
    extraSchema: [
      {
        "@type": "FAQPage",
        "@id": `${DOMAIN}/#home-faq`,
        url: DOMAIN,
        name: "أسئلة شائعة حول منصة ميزان الرقمية",
        inLanguage: "ar-MA",
        mainEntity: [
          {
            "@type": "Question",
            name: "ما هي منصة ميزان الرقمية؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "ميزان الرقمية منصة عربية مغربية تعليمية للمعرفة القانونية والأكاديمية، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك. توفر للطلبة والباحثين ملخصات الأرشيف الدراسي S1-S6، والقاموس القانوني، والمقالات، والأخبار، ودليل كليات الحقوق بالمغرب.",
            },
          },
          {
            "@type": "Question",
            name: "ماذا تقدم ميزان لطلبة الحقوق؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: `تجمع المنصة ${statistics.lexicon} مصطلحاً قانونياً، و${statistics.articles} مقالاً، و${statistics.news} خبراً، و${statistics.events} فعالية أو ندوة، إضافة إلى دليل يضم ${statistics.schools} كلية أو مؤسسة جامعية في البيانات المتاحة للمنصة.`,
            },
          },
          {
            "@type": "Question",
            name: "كيف تستعمل منصة ميزان في مراجعتك؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "حدّد أولاً نوع المعلومة التي تحتاجها: القاموس للمصطلحات القانونية، والأرشيف للمواد الدراسية المصنفة حسب الفصل S1-S6، والمقالات للمنهجية والتحليل، والأخبار للمستجدات، ودليل الكليات لمعلومات المؤسسات الجامعية.",
            },
          },
          {
            "@type": "Question",
            name: "ما هي مصادر المعلومات القانونية في منصة ميزان الرقمية؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "المنصة تعليمية وبحثية وليست بديلاً عن النص القانوني الرسمي: يُراجع النص النافذ في البوابة الرسمية للجريدة الرسمية (sgg.gov.ma) وبوابة العدالة الرقمية لوزارة العدل (adala.justice.gov.ma)، مع الإحالات التشريعية المتاحة في بيانات كل مصطلح.",
            },
          },
        ],
      },
    ],

    staticBody: `
      <div class="min-h-screen bg-background text-foreground">${homeHeaderHtml}
        <main class="min-h-screen bg-white dark:bg-[#0f172a] text-foreground" dir="rtl" lang="ar-MA">${homeHeroHtml}

        <section class="bg-white dark:bg-[#0f172a] py-14 border-t border-[#f1f5f9] dark:border-[#1e293b]">
        <article class="container mx-auto max-w-[800px] px-6 text-[14px] leading-7 text-[#475569] dark:text-[#94a3b8]">

          <h2 class="text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">ما هي منصة ميزان الرقمية؟</h2>

          <p>
            <strong>ميزان الرقمية هي منصة عربية مغربية للمعرفة القانونية والأكاديمية، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك.</strong>
            توفر للطلبة والباحثين أدوات للبحث في المصطلحات القانونية،
            والمقالات، والأخبار، والندوات، والمواد الدراسية وكليات الحقوق بالمغرب.
          </p>

          <p>
            تُعد ميزان الرقمية من المنصات المغربية المتخصصة في ملخصات ومصطلحات القانون
            الموجهة لطلبة كليات الحقوق بالمغرب. يتاح محتواها الأساسي — المعجم والأرشيف
            الدراسي والمقالات والأخبار ودليل الكليات — مجاناً دون إنشاء حساب، بينما
            تُؤدّى المزايا المتقدمة عبر اشتراك ميزان برو أو حزم الكريدتس.
            المنصة تعليمية ولا تقدّم استشارات قانونية؛ فتقديم الاستشارات في الميدان
            القانوني من مهام المحامي بمقتضى القانون رقم 28.08، ويدير المنصة طالب
            قانون لا محامٍ مقيّد.
          </p>

          <section class="mt-10">
            <h2 class="text-[20px] font-black text-[#0f172a] dark:text-white">ماذا تقدم ميزان لطلبة الحقوق؟</h2>

            <p>
              تجمع المنصة حالياً
              <strong>${statistics.lexicon} مصطلحاً قانونياً</strong>،
              و<strong>${statistics.articles} مقالاً</strong>،
              و<strong>${statistics.news} خبراً</strong>،
              و<strong>${statistics.events} فعالية أو ندوة</strong>،
              إضافة إلى دليل يضم
              <strong>${statistics.schools} كلية أو مؤسسة</strong>
              في البيانات المتاحة للمنصة.
            </p>

            <p>
              تمثل هذه البيانات أساس المحتوى الأكاديمي المنشور على المنصة،
              ويتم تحديثها مع إضافة مواد جديدة.
            </p>
          </section>

          <!-- عنوان بصيغة سؤال (GEO: Question-Style Headings) وجوابه فوراً
               بعده (Answer-First): المحتوى نفسه معروض في الصفحة الحيّة. -->
          <section class="mt-10">
            <h2 class="text-[20px] font-black text-[#0f172a] dark:text-white">لماذا تختار منصة ميزان الرقمية؟</h2>

            <p>
              <strong>لأن المحتوى مكتوب بالعربية التي يدرس بها الطالب، ومنظّم حسب الفصل الذي يدرسه الآن لا حسب موضوع عام.</strong>
              ويبقى أساسه مجانياً، مع فصل صريح بين الشرح التعليمي والنص القانوني الرسمي.
            </p>

            <ul>
              <li>المصطلح والنص والملخّص في مسار واحد: بطاقة المصطلح لا تكتفي بالتعريف.</li>
              <li>المقابل الفرنسي لكل مصطلح، لأن جزءاً من المراجع الجامعية يُقرأ بالفرنسية.</li>
              <li>أرشيف مصنّف حسب الفصل S1 → S6، فيصل الطالب إلى ما يدرسه هذا الفصل مباشرة.</li>
              <li>المصادر الرسمية معلنة ومربوطة، ويمكن التحقق من كل قاعدة في نصها النافذ.</li>
            </ul>
          </section>

          <section class="mt-10">
            <h2 class="text-[20px] font-black text-[#0f172a] dark:text-white">كيف تستعمل منصة ميزان في مراجعتك؟</h2>

            <p>
              <strong>أفضل نقطة بداية هي تحديد نوع المعلومة التي تبحث عنها.</strong>
              استخدم القاموس للمصطلحات القانونية، والأرشيف للمواد الدراسية،
              والمقالات للمنهجية والتحليل، والأخبار للمستجدات،
              ودليل الكليات للحصول على معلومات المؤسسات الجامعية.
            </p>

            <ul>
              <li>
                <a href="/lexicon">القاموس القانوني</a>
                — تعريفات المصطلحات القانونية بالعربية والفرنسية.
              </li>

              <li>
                <a href="/archive">الأرشيف الدراسي</a>
                — مواد مصنفة حسب S1 إلى S6.
              </li>

              <li>
                <a href="/articles">المقالات القانونية</a>
                — منهجية ومهارات البحث والتحليل القانوني.
              </li>

              <li>
                <a href="/news">الأخبار</a>
                — المستجدات القانونية والأكاديمية.
              </li>

              <li>
                <a href="/events">الندوات والفعاليات</a>
                — لقاءات وأنشطة ذات صلة بالمجال القانوني.
              </li>

              <li>
                <a href="/schools">دليل كليات الحقوق</a>
                — معلومات عن مؤسسات العلوم القانونية والاقتصادية والاجتماعية.
              </li>
            </ul>
          </section>

          <section class="mt-10">
            <h2 class="text-[20px] font-black text-[#0f172a] dark:text-white">ما هو القاموس القانوني في ميزان الرقمية؟</h2>

            <p>
              <strong>القاموس القانوني هو أداة بحث للمصطلحات القانونية.</strong>
              يعرض المصطلح بالعربية والفرنسية، مع تعريف مختصر،
              ويمكن أن يتضمن إحالات إلى مصادر أو نصوص قانونية مرتبطة بالمصطلح.
            </p>

            <p>
              يحتوي القاموس حالياً على
              <strong>${statistics.lexicon} مصطلحاً</strong>
              وفق البيانات المنشورة في المنصة.
            </p>

            <p>
              <a href="/lexicon">
                تصفح القاموس القانوني
              </a>
            </p>
          </section>

          <section class="mt-10">
            <h2 class="text-[20px] font-black text-[#0f172a] dark:text-white">ما هي مراحل الدراسة S1 إلى S6؟</h2>

            <p>
              يقسم الأرشيف الدراسي في ميزان الرقمية المواد إلى ستة فصول:
              S1 وS2 وS3 وS4 وS5 وS6، بما يساعد الطالب على الوصول إلى المواد
              وفق المرحلة الدراسية.
            </p>

            <ol>
              <li><a href="/s1">S1 — الفصل الأول</a></li>
              <li><a href="/s2">S2 — الفصل الثاني</a></li>
              <li><a href="/s3">S3 — الفصل الثالث</a></li>
              <li><a href="/s4">S4 — الفصل الرابع</a></li>
              <li><a href="/s5">S5 — الفصل الخامس</a></li>
              <li><a href="/s6">S6 — الفصل السادس</a></li>
            </ol>
          </section>

          <section class="mt-10">
            <h2 class="text-[20px] font-black text-[#0f172a] dark:text-white">ما هي مصادر المعلومات القانونية؟</h2>

            <p>
              يجب التعامل مع ميزان الرقمية باعتبارها منصة تعليمية وبحثية،
              وليس بديلاً عن النص القانوني الرسمي.
              عند دراسة قاعدة قانونية، يُنصح بالرجوع إلى الجريدة الرسمية
              والنص التشريعي الرسمي والمصادر الجامعية أو المؤسساتية ذات الصلة.
            </p>

            <p>
              تقدم المنصة روابط وإحالات عندما تكون متاحة في بيانات المحتوى،
              مع محاولة الحفاظ على الفصل بين المحتوى التعليمي والمصدر القانوني الأصلي.
            </p>

            <!-- استشهادات بمصادر رسمية مسمّاة (GEO: Citations & Quotations).
                 الروابط الخارجية بـ rel="noopener noreferrer" وبلا nofollow:
                 مصادر رسمية نرشد إليها القارئ، لا روابط مدفوعة. -->
            <p>
              جميع النصوص القانونية والقواعد المذكورة في منصة ميزان الرقمية
              محالة إلى مصادر رسمية يمكن التحقق منها مباشرة:
              <a href="https://www.sgg.gov.ma" target="_blank" rel="noopener noreferrer">البوابة الرسمية للجريدة الرسمية (الأمانة العامة للحكومة)</a>
              و<a href="https://adala.justice.gov.ma" target="_blank" rel="noopener noreferrer">بوابة العدالة الرقمية (وزارة العدل)</a>.
              النصّ المنشور في الجريدة الرسمية يبقى المرجع النهائي عند كل خلاف
              على عبارة أو على تاريخ سريان.
            </p>
          </section>

          <section class="mt-10">
            <h2 class="text-[20px] font-black text-[#0f172a] dark:text-white">من يقف وراء ميزان الرقمية؟</h2>

            <p>
              ميزان الرقمية مشروع معرفي عربي موجه أساساً إلى طلبة القانون
              والباحثين والمهتمين بالقانون المغربي.
            </p>

            <p>
              <a href="/about">تعرف على المنصة وفريقها</a>
              —
              <a href="/contact">تواصل معنا</a>
              —
              <a href="/faq">الأسئلة الشائعة</a>
            </p>
          </section>

          <footer>
            <p>
              آخر تحديث للبيانات:
              <time datetime="${NOW}">
                ${NOW.slice(0, 10)}
              </time>
            </p>

            <p>
              <a href="/privacy">سياسة الخصوصية</a> |
              <a href="/terms">الشروط</a> |
              <a href="/cookies">سياسة ملفات الارتباط</a>
            </p>
          </footer>

        </article>
        </section>

      </main>
      </div>
    `,
  },

  {
    path: "/archive",
    title: "الأرشيف الدراسي | ميزان الرقمية",
    description:
      "أرشيف دراسي لطلبة الحقوق بالمغرب مصنف حسب الفصول S1 إلى S6.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الأرشيف الدراسي لطلبة الحقوق</h1>

          <p>
            <strong>
              الأرشيف الدراسي هو القسم المخصص لدروس القانون للطلبة، ويتيح الوصول إلى المواد التعليمية
              حسب الفصول الجامعية من S1 إلى S6.
            </strong>
          </p>

          <h2>ما هي فصول الأرشيف الدراسي؟</h2>

          <ul>
            <li><a href="/s1">S1 — الفصل الأول</a></li>
            <li><a href="/s2">S2 — الفصل الثاني</a></li>
            <li><a href="/s3">S3 — الفصل الثالث</a></li>
            <li><a href="/s4">S4 — الفصل الرابع</a></li>
            <li><a href="/s5">S5 — الفصل الخامس</a></li>
            <li><a href="/s6">S6 — الفصل السادس</a></li>
          </ul>
          <h2>ما الملفات المتاحة في الأرشيف؟</h2>

${renderCrawlList(docPages, { heading: "قائمة ملفات الملخصات والامتحانات" })}
        </article>
      </main>
    `,
  },

  {
    path: "/articles",
    title: "المقالات القانونية | ميزان الرقمية",
    description:
      "شرح القانون المغربي عبر مقالات ومنهجيات ومهارات قانونية موجهة لطلبة الحقوق والباحثين.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>المقالات القانونية والمنهجية</h1>

          <p>
            <strong>
              هذا القسم يجمع مقالات شرح القانون المغربي والمنهجيات التي تساعد الطالب
              على فهم وتحليل الموضوعات القانونية.
            </strong>
          </p>

          <h2>ماذا ستجد في المقالات؟</h2>

          <p>
            تتناول المقالات موضوعات قانونية وأكاديمية ومنهجية،
            ويمكن أن تساعد في إعداد البحوث والتعليقات القانونية
            وفهم المفاهيم الأساسية.
          </p>
${renderCrawlList(articlePages, { heading: "قائمة المقالات المنشورة" })}
        </article>
      </main>
    `,
  },

  {
    path: "/news",
    title: "الأخبار والمستجدات التشريعية والقضائية | ميزان الرقمية",
    description:
      "متابعة مستمرة لأهم المستجدات التشريعية والقضائية بالمغرب: البلاغات الرسمية، منشورات الجريدة الرسمية، وأخبار المحاكم والمؤسسات القانونية والأكاديمية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الأخبار والمستجدات التشريعية والقضائية</h1>

          <p>
            <strong>
              يقدم هذا القسم أخباراً ومستجدات مرتبطة بالمجال القانوني
              والتعليم الجامعي والأنشطة الأكاديمية.
            </strong>
          </p>

          <h2>لماذا متابعة الأخبار القانونية؟</h2>

          <p>
            تساعد متابعة المستجدات الطالب على ربط المعرفة النظرية
            بالتطورات التشريعية والقضائية والأكاديمية.
          </p>
${renderCrawlList(newsPages, { heading: "قائمة الأخبار والمستجدات" })}
        </article>
      </main>
    `,
  },

  {
    path: "/events",
    title: "الندوات والفعاليات القانونية | ميزان الرقمية",
    description:
      "أرشيف الندوات والفعاليات واللقاءات الأكاديمية والقانونية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الندوات والفعاليات القانونية</h1>

          <p>
            <strong>
              يضم هذا القسم معلومات عن الندوات واللقاءات والفعاليات
              المرتبطة بالمجال القانوني والأكاديمي.
            </strong>
          </p>

          <h2>كيف يستفيد الطالب من الندوات؟</h2>

          <p>
            توفر الندوات فرصة للتعرف على آراء الباحثين والممارسين
            ومناقشة قضايا قانونية وأكاديمية معاصرة.
          </p>
${renderCrawlList(eventPages, { heading: "قائمة الندوات والفعاليات" })}
        </article>
      </main>
    `,
  },

  {
    path: "/schools",
    title: "دليل كليات الحقوق والجامعات المغربية | ميزان الرقمية",
    description:
      "دليل كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب ومعلوماتها الأساسية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>كليات الحقوق بالمغرب</h1>

          <p>
            <strong>
              دليل تعريفي لكليات ومؤسسات العلوم القانونية والاقتصادية
              والاجتماعية بالمغرب.
            </strong>
          </p>

          <p>
            يحتوي الدليل حالياً على
            <strong>${statistics.schools} مؤسسة</strong>
            في البيانات المنشورة.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/lexicon",
    title: "القاموس القانوني المغربي | ميزان الرقمية",
    description:
      "قاموس قانوني عربي فرنسي يضم مصطلحات وتعريفات وإحالات قانونية.",
    schema: {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      "@id": `${DOMAIN}/lexicon#termset`,
      name: "القاموس القانوني",
      description:
        `قاموس قانوني يضم ${statistics.lexicon} مصطلحاً في البيانات الحالية.`,
      url: `${DOMAIN}/lexicon`,
      inLanguage: "ar-MA",
      publisher: {
        "@id": `${DOMAIN}/#organization`,
      },
    },
    extraSchema: [
      buildBreadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: "المعجم القانوني", path: "/lexicon" },
      ]),
    ],
    staticBody: renderLexiconIndexStaticHtml(
      lexiconWithSlugs
    ),
  },

  ...articlePages.map((entry) => {
    // كل عناصر articles.json تحت /articles/ مهما كان حقل type — وهو نفس
    // المسار الذي تبنيه الواجهة في ArticlePage وتدخله sitemap. ومحتوى لوحة
    // التحكم المنشور يُولَّد هنا أيضاً، فلا تُنشر sitemap لرابط بلا ملف.
    const item = normalizeEntry(entry);
    const path = entry.path;

    return {
      path,
      title: `${item.title} | ميزان الرقمية`,
      description:
        item.excerpt || item.description || "",

      schema: {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${absoluteUrl(path)}#article`,
        headline: item.title,
        description:
          item.excerpt || item.description || "",
        url: absoluteUrl(path),
        datePublished: safeDate(
          item.publishedAt
        ),
        dateModified: safeDate(
          item.updatedAt || item.publishedAt
        ),
        inLanguage: "ar-MA",
        image: item.image || item.coverImage || DEFAULT_ARTICLE_IMAGE,
        author: {
          "@id": `${DOMAIN}/#author`,
        },
        publisher: {
          "@id": `${DOMAIN}/#organization`,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": absoluteUrl(path),
        },
      },

      extraSchema: [
        buildBreadcrumbSchema([
          { name: "الرئيسية", path: "/" },
          { name: "المقالات", path: "/articles" },
          { name: item.title, path },
        ]),
      ],

      staticBody: renderArticleStaticHtml(item),
    };
  }),

  ...newsPages.map((entry) => {
    // بيانات news.json المحلية لا تملك عمود slug، فيُبنى المعرّف من العنوان
    // بنفس دالة sitemap و NewsPage — وإلا ذهبت روابط القائمة إلى /news/<id>
    // والملفات الثابتة وُلدت تحت /news/<slug-from-title>.
    const item = normalizeEntry(entry);
    const path = entry.path;

    return {
      path,
      title: `${item.title} | ميزان الرقمية`,
      description:
        item.summary ||
        item.excerpt ||
        "",

      schema: {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "@id": `${absoluteUrl(path)}#newsarticle`,
        headline: item.title,
        description:
          item.summary ||
          item.excerpt ||
          "",
        url: absoluteUrl(path),
        datePublished: safeDate(
          item.date ||
          item.publishedAt
        ),
        dateModified: safeDate(
          item.updatedAt ||
          item.date ||
          item.publishedAt
        ),
        inLanguage: "ar-MA",
        image: item.image || DEFAULT_ARTICLE_IMAGE,
        author: {
          "@id": `${DOMAIN}/#author`,
        },
        publisher: {
          "@id": `${DOMAIN}/#organization`,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": absoluteUrl(path),
        },
      },

      extraSchema: [
        buildBreadcrumbSchema([
          { name: "الرئيسية", path: "/" },
          { name: "الأخبار", path: "/news" },
          { name: item.title, path },
        ]),
      ],

      staticBody: renderNewsStaticHtml(item),
    };
  }),

  ...eventPages.map((entry) => {
    const item = normalizeEntry(entry);
    const path = entry.path;

    return {
      path,
      title: `${item.title} | ميزان الرقمية`,
      description: item.excerpt || "",

      schema: {
        "@context": "https://schema.org",
        "@type": "Event",
        "@id": `${absoluteUrl(path)}#event`,
        name: item.title,
        description: item.excerpt || "",
        url: absoluteUrl(path),
        startDate: safeDate(
          item.eventDate
        ),
        location: {
          "@type": "Place",
          name: item.city || "المغرب",
          address: {
            "@type": "PostalAddress",
            addressLocality:
              item.city || "المغرب",
            addressCountry: "MA",
          },
        },
        organizer: {
          "@type": "Organization",
          name:
            item.organizer ||
            "ميزان الرقمية",
        },
        inLanguage: "ar-MA",
      },

      extraSchema: [
        buildBreadcrumbSchema([
          { name: "الرئيسية", path: "/" },
          { name: "الندوات والفعاليات", path: "/events" },
          { name: item.title, path },
        ]),
      ],

      staticBody: `
        <main dir="rtl" lang="ar-MA">
          <article>

            <h1>${escapeHtml(item.title)}</h1>

            <p>
              <strong>الإجابة المختصرة:</strong>
              ${escapeHtml(item.excerpt || "")}
            </p>

            <h2>أين تقام هذه الفعالية؟</h2>

            <p>
              ${escapeHtml(item.city || "المغرب")}
            </p>

            <h2>متى تقام الفعالية؟</h2>

            <p>
              ${escapeHtml(item.eventDate || "")}
            </p>

          </article>
        </main>
      `,
    };
  }),

  ...schools.map((item) => {
    const path = pathOfUrl(canonicalSchool(schoolSlug(item)));

    // الاسم الكامل للكلية (48 حرفاً أحياناً) مع التفصيل يصعد فوق 65، فيُبتَر
    // في نتيجة البحث. نجربّ الكامل أولاً فإن لم يتّسع نختصر «كلية العلوم
    // القانونية والاقتصادية والاجتماعية» إلى «كلية الحقوق» — الصيغة التي
    // يبحثها الطالب فعلاً؛ الاسم الكامل يبقى في H1 وفي EducationalOrganization.
    const fullTitle = fitTitle(`${item.name} | دليل الطالب`);
    const title =
      fullTitle.length <= MAX_TITLE
        ? fullTitle
        : fitTitle(`${abbreviateFaculty(item.name)} | دليل الطالب`);

    return {
      path,
      title,

      // الوصف من synopsis حين يكفي، وإلا جملة الدليل العملي التي تخصّ الكلية
      // باسمها ومدينتها: نصّ مختلف لكل كلية، لا «معلومات عن …».
      description:
        item.synopsis && item.synopsis.length >= 140
          ? item.synopsis
          : `دليل عملي لطلبة ${item.name}: مواد الدراسة وطرق المراجعة وملخصات ومصطلحات قانونية، مع معلومات التسجيل والعنوان داخل منصة ميزان الرقمية.`,

      // url = الرابط القانوني لصفحة الدليل دائماً. الموقع الرسمي للكلية
      // يذهب إلى sameAs، لأنه ملكُ المؤسسة لا ملكُ هذه الصفحة: وضعه في url
      // يجعل عقدة الكيان تشير إلى نطاق خارجي فتنفصل عن WebPage/mainEntity.
      schema: {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "@id": `${absoluteUrl(path)}#organization`,
        name: item.name,
        description:
          item.synopsis || "",
        url: absoluteUrl(path),
        sameAs: item.officialUrl || undefined,
        foundingDate: item.foundedYear ? String(item.foundedYear) : undefined,
        parentOrganization: {
          "@type": "CollegeOrUniversity",
          name:
            item.university ||
            "جامعة مغربية",
        },
        address: {
          "@type": "PostalAddress",
          addressLocality:
            item.city || "المغرب",
          addressCountry: "MA",
        },
        inLanguage: "ar-MA",
      },

      // عقدة WebPage تفصل «هذه الصفحة» عن «المؤسسة» فتُقرأ الأولى كمستند
      // قابل للفهرسة والثانية ككيان يشير إليه الموقع الرسمي.
      extraSchema: [
        {
          "@type": "WebPage",
          "@id": `${absoluteUrl(path)}#webpage`,
          url: absoluteUrl(path),
          name: `${item.name} | دليل كليات الحقوق بالمغرب`,
          description: item.synopsis || `معلومات عن ${item.name}`,
          inLanguage: "ar-MA",
          isPartOf: { "@id": `${DOMAIN}/#website` },
          about: { "@id": `${absoluteUrl(path)}#organization` },
          publisher: { "@id": `${DOMAIN}/#organization` },
        },
        buildBreadcrumbSchema([
          { name: "الرئيسية", path: "/" },
          { name: "كليات الحقوق", path: "/schools" },
          { name: item.name, path },
        ]),
      ],

      staticBody: `
        <main dir="rtl" lang="ar-MA">
          <article>

            <h1>${escapeHtml(item.name)}</h1>

            <p>
              <strong>نبذة:</strong>
              ${escapeHtml(item.synopsis || "")}
            </p>

            <h2>في أي مدينة توجد الكلية؟</h2>

            <p>
              ${escapeHtml(item.city || "المغرب")}
            </p>

            ${
              item.university
                ? `
                  <h2>ما الجامعة التابعة لها؟</h2>
                  <p>${escapeHtml(item.university)}</p>
                `
                : ""
            }

            ${
              item.officialUrl
                ? `
                  <p>
                    <a
                      href="${escapeHtml(item.officialUrl)}"
                      rel="noopener noreferrer"
                    >
                      زيارة الموقع الرسمي
                    </a>
                  </p>
                `
                : ""
            }

          </article>
        </main>
      `,
    };
  }),

  ...[
    ["s1", "الأول"],
    ["s2", "الثاني"],
    ["s3", "الثالث"],
    ["s4", "الرابع"],
    ["s5", "الخامس"],
    ["s6", "السادس"],
  ].map(([slug, number]) => ({
    path: `/${slug}`,
    title:
      `الفصل ${slug.toUpperCase()} | الأرشيف الدراسي | ميزان الرقمية`,
    description:
      `مواد وملخصات ومحاضرات ونماذج امتحانات الفصل ${number} لطلبة الحقوق بالمغرب.`,

    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>

          <h1>الفصل ${slug.toUpperCase()} — الفصل ${number}</h1>

          <p>
            <strong>
              هذا القسم مخصص لمواد الفصل ${number}
              ضمن الأرشيف الدراسي لطلبة الحقوق بالمغرب.
            </strong>
          </p>

          <h2>ماذا يوجد في هذا الفصل؟</h2>

          <p>
            يمكن استخدام هذا القسم للوصول إلى الملخصات
            والمحاضرات ونماذج الامتحانات والوثائق التعليمية
            المرتبطة بالفصل ${slug.toUpperCase()}.
          </p>

          <p>
            <a href="/archive">
              العودة إلى الأرشيف الدراسي
            </a>
          </p>

        </article>
      </main>
    `,
  })),

  ...lexiconWithSlugs.map((item) => {
    const path = `/lexicon/${item.slug}`;

    return {
      path,

      // نفس ما يبنيه SEOHead في المتصفح: العنوان بلا المصطلح الفرنسي
      // (يظهر في H1 وفي alternateName)، والعلامة تُضاف في النهاية.
      // المصطلحات المتكرّرة (الرهن الحيازي، الصلح، الكفالة لها سجلّان) كانت
      // تتشارك العنوان نفسه بصفحتين مختلفتين، فيرى الزاحف تكراراً ويُرجّح
      // نسخة واحدة؛ المقابلة الفرنسية تفصل بينهما ولا تُذكر إن لم تكن لازمة.
      title: `${item.titleLabel} في القانون المغربي | ميزان الرقمية`,

      description: `تعريف ${item.term_ar} في القانون المغربي: ${item.definition || ""}`,

      schema: {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "@id": `${absoluteUrl(path)}#term`,
        name: item.term_ar,
        alternateName:
          item.term_fr || undefined,
        description:
          item.definition || "",
        url: absoluteUrl(path),
        // عقدة كاملة (نطاق + اسم) بدل @id alone: القارئ الآلي يتتبع
        // inDefinedTermSet.url مباشرة إلى صفحة القاموس.
        inDefinedTermSet: {
          "@type": "DefinedTermSet",
          "@id": `${canonicalUrl("/lexicon")}#termset`,
          name: "القاموس القانوني المغربي",
          url: canonicalUrl("/lexicon"),
        },
        inLanguage: "ar-MA",
        author: {
          "@id": `${DOMAIN}/#author`,
        },
      },

      extraSchema: [
        buildBreadcrumbSchema([
          { name: "الرئيسية", path: "/" },
          { name: "المعجم القانوني", path: "/lexicon" },
          { name: item.term_ar, path },
        ]),
      ],

      staticBody:
        renderTermStaticHtml(item),
    };
  }),

  /* -----------------------------------------------------------
     صفحات الملفات (الأرشيف) /pdf/<slug>
     كانت هذه الروابط تُنشر في sitemap وحدها بلا أي ملف ثابت: 9 روابط
     لا يفتحها زاحف ولا زائر (لا SPA fallback على Cloudflare Pages).
     التوليد هنا يجعل الرابط حقيقياً، ويضيف للواجهة ملفاً يُقرأ قبل
     hydration فيظهر عنوان الملف بدل صفحة فارغة.
  ----------------------------------------------------------- */
  ...docPages.map((entry) => {
    const item = normalizeEntry(entry);
    const path = entry.path;
    const fileUrl = entry.item?.fileUrl || entry.item?.file_url || "";

    return {
      path,
      title: `${item.title} | تحميل مجاني وشرح | ميزان الرقمية`,
      description:
        item.excerpt ||
        `ملخص قانوني جاهز للمراجعة: ${item.module || item.subject || item.semester || "ملف من أرشيف ميزان الرقمية"}. متاح للتحميل المجاني لطلبة الحقوق داخل منصة ميزان الرقمية مع بطاقة توضّح مادته وفصله.`,

      schema: {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "@id": `${absoluteUrl(path)}#work`,
        name: item.title,
        description: item.excerpt || "",
        url: absoluteUrl(path),
        inLanguage: "ar-MA",
        about: item.module || item.semester || "الدراسات القانونية",
        publisher: { "@id": `${DOMAIN}/#organization` },
      },

      extraSchema: [
        buildBreadcrumbSchema([
          { name: "الرئيسية", path: "/" },
          { name: "الأرشيف الدراسي", path: "/archive" },
          { name: item.title, path },
        ]),
      ],

      staticBody: `
        <main dir="rtl" lang="ar-MA">
          <article>

            <h1>${escapeHtml(item.title)}</h1>

            <p>
              <strong>نبذة:</strong>
              ${escapeHtml(item.excerpt || "ملف تعليمي من أرشيف ميزان الرقمية.")}
            </p>

            ${
              item.semester
                ? `<p><strong>الفصل:</strong> ${escapeHtml(String(item.semester).toUpperCase())}</p>`
                : ""
            }

            ${
              item.module
                ? `<p><strong>المادة:</strong> ${escapeHtml(item.module)}</p>`
                : ""
            }

            ${
              item.professor
                ? `<p><strong>الأستاذ(ة):</strong> ${escapeHtml(item.professor)}</p>`
                : ""
            }

            ${
              fileUrl
                ? `<p><a href="${escapeHtml(fileUrl)}" rel="nofollow noopener" download>تحميل الملف</a></p>`
                : ""
            }

            <p><a href="/archive">العودة إلى الأرشيف الدراسي</a></p>

          </article>
        </main>
      `,
    };
  }),

  /* -----------------------------------------------------------
     صفحة الأسعار /pricing — تُولَّد بملف ثابت ونصّ خاص بها حتى تُقرأ عند
     المشاركة وتُخدَج بحالة 200، لكن بلا فهرسة: جولة الميتا طلبت إخراج
     صفحات المنفعة (بحث، دخول، ملف، أسعار، لوحة تحكم) من الفهرس، وهي أصلاً
     خارج sitemap. لا canonical كاذب ولا إرث لرابط الرئيسية.
  ----------------------------------------------------------- */
  {
    path: "/pricing",
    noindex: true,
    title: "أسعار ميزان برو وحزم الكريدتس | ميزان الرقمية",
    description:
      "أسعار ميزان برو الشهري والسنوي وحزم الكريدتس بالدرهم المغربي، مع مقارنة واضحة بين ما تحصل عليه مجاناً وما يفتحه الاشتراك من أدوات مراجعة قبل أي التزام.",

    schema: {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${canonicalUrl("/pricing")}#product`,
      name: "اشتراك ميزان برو",
      description:
        "اشتراك يمنح أدوات ميزان برو ومزايا متقدمة على منصة ميزان الرقمية القانونية.",
      category: "Education",
      brand: { "@id": `${DOMAIN}/#organization` },
      url: canonicalUrl("/pricing"),
      offers: [
        {
          "@type": "Offer",
          name: "ميزان برو — شهري",
          price: "49",
          priceCurrency: "MAD",
          availability: "https://schema.org/InStock",
          url: canonicalUrl("/pricing"),
        },
        {
          "@type": "Offer",
          name: "ميزان برو — سنوي",
          price: "399",
          priceCurrency: "MAD",
          availability: "https://schema.org/InStock",
          url: canonicalUrl("/pricing"),
        },
      ],
    },

    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>

          <h1>أسعار ميزان الرقمية</h1>

          <p>
            <strong>
              محتوى ميزان الرقمية الأساسي مجاني بالكامل: المعجم القانوني، والأرشيف
              الدراسي، والمقالات، والأخبار، ودليل الكليات. المزايا المتقدمة — أدوات
              ميزان برو — متاحة باشتراك شهري 49 درهماً أو سنوي 399 درهماً.
            </strong>
          </p>

          <h2>ماذا يشمل الاشتراك؟</h2>

          <ul>
            <li>أدوات البحث والتدريب القانوني المتقدمة.</li>
            <li>حزم الكريدتس للمزايا غير الدورية.</li>
          </ul>

          <p><a href="/">العودة إلى الصفحة الرئيسية</a></p>

        </article>
      </main>
    `,
  },
];

/* -------------------------------------------------------
   الصفحات الركنية (cornerstone) في خطة السيو: /platform و /guides/*
------------------------------------------------------- */

/*
 * هذه الصفحات تُقرأ من ملفات البيانات نفسها التي تقرأها مكوّنات React
 * (src/pages/public/PlatformPage.tsx و src/pages/public/guides/*)، فالنسخة
 * المُسبقـة التخزين والنسخة الحيّة لا تتناقضان: أرقام، ومثال مصطلح، وخبر،
 * وكلية — كلها من JSON. وتُعرَّف الحروف هنا لا داخل النص كي لا يتقادم رقم.
 */
const platformStats = {
  lexicon: statistics.lexicon,
  schools: statistics.schools,
  news: statistics.news,
  documents: statistics.documents,
};

const guideSampleTerm = lexicon.find((t) => t.id === "obligation") || lexicon[0];
const guideSampleNews = news[0];
const guideSampleSchool =
  schools.find((school) => (school.city || "").includes("طنجة")) || schools[0];
/* تاريخ آخر مراجعة محررية منشور في البيانات نفسها (enrich-lexicon.mjs) — لا
   تاريخ بناء السكربت: الأخير يتغير مع كل CI أما الأول فيبقى صادقاً. */
const REVIEW_DATE =
  lexicon.find((t) => t && t.last_reviewed)?.last_reviewed ||
  new Date().toISOString().slice(0, 10);
const guideReviewNote = `آخر مراجعة للبيانات: ${REVIEW_DATE}`;

pages.push(
  {
    path: "/platform",
    title: "ميزان الرقمية: المنصة المغربية المجانية لطلبة الحقوق",
    description:
      "منصة ميزان الرقمية تجمع ملخصات القانون، المصطلحات القانونية، ومعلومات كليات الحقوق في مكان واحد. مجانية لطلبة الحقوق بالمغرب، بلا حساب إجباري للتصفح.",
    schema: {
      "@type": "WebApplication",
      name: "ميزان الرقمية: المنصة المغربية المجانية لطلبة الحقوق",
      url: absoluteUrl("/platform"),
      applicationCategory: "EducationalApplication",
      isAccessibleForFree: true,
      inLanguage: ["ar-MA", "fr-MA"],
      dateModified: NOW,
      offers: { "@type": "Offer", price: "0", priceCurrency: "MAD" },
    },
    extraSchema: [
      buildBreadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: "المنصة", path: "/platform" },
      ]),
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>ميزان الرقمية: المنصة المغربية المجانية لطلبة الحقوق</h1>

          <p>
            <strong>
              منصة ميزان الرقمية تجمع ملخصات القانون، والمصطلحات القانونية، ومعلومات
              كليات الحقوق في مكان واحد، مجاناً ولطلبة الحقوق بالمغرب.
            </strong>
            لا حساب إجباري على المحتوى الأساسي: الأرشيف الدراسي، والمعجم القانوني،
            ودليل الكليات، ومستجدات النصوص متاحة للتصفح مباشرة.
          </p>

          <h2>ماذا تقدم ميزان لطلبة الحقوق؟</h2>

          <ul>
            <li>
              <a href="/archive">الأرشيف الدراسي</a>
              — ملخصات ومحاضرات ومصطلحات وأسئلة دورات سابقة مصنّفة حسب الفصول
              S1 إلى S6، منها ${platformStats.documents} وثيقة في البيانات المنشورة.
            </li>
            <li>
              <a href="/lexicon">المعجم القانوني</a>
              — ${platformStats.lexicon} مصطلحاً بالعربية ومقابلها بالفرنسية، مع تعريف
              مختصر وشرح مبسّط للطلبة وإحالة إلى النص القانوني عند توفره.
            </li>
            <li>
              <a href="/schools">دليل كليات الحقوق</a>
              — ${platformStats.schools} كلية للعلوم القانونية والاقتصادية والاجتماعية:
              الجامعة، المدينة، المسالك، والرابط الرسمي.
            </li>
            <li>
              <a href="/news">المستجدات</a>
              — ${platformStats.news} مادة بين خبر تشريعي وإعلان جامعي وملخّص مقتضب.
            </li>
            <li>
              <a href="/guides/new-law-student-morocco">دليل الطالب الجديد</a>
              و<a href="/guides/free-legal-resources-morocco">دليل الموارد المجانية</a>
              — ما يكفي لأول أسبوع ولمن يبني مكتبته من المصادر المفتوحة.
            </li>
          </ul>

          <h2>لماذا تختار ميزان؟</h2>

          <ul>
            <li>المصطلح والنص والملخّص في مسار واحد: بطاقة المصطلح لا تكتفي بالتعريف.</li>
            <li>محتوى مكتوب بالعربية التي يدرس بها الطالب، مع المقابل الفرنسي للمصطلح.</li>
            <li>منظّم حسب الفصل الذي تدرسه الآن، لا حسب موضوع عام.</li>
            <li>مجاناً في أساسه؛ اشتراك «ميزان برو» يفتح أدوات متقدمة فقط.</li>
            <li>المحتوى التعليمي مفصول عن المصدر القانوني: الجريدة الرسمية تبقى المرجع.</li>
          </ul>

          <p>
            ابدأ من <a href="/archive">الفصل الذي تدرسه</a>، أو ابحث في
            <a href="/lexicon">المعجم القانوني</a> عن المصطلح الذي تعثّرت فيه اليوم.
          </p>

          <p>${guideReviewNote}.</p>

          <p><a href="/">العودة إلى الصفحة الرئيسية</a></p>
        </article>
      </main>
    `,
  },

  {
    path: "/guides/free-legal-resources-morocco",
    title: "أفضل الموارد المجانية لطلبة القانون في المغرب 2026 | ميزان",
    description:
      "دليل عملي لأفضل الموارد القانونية المجانية لطلبة القانون في المغرب: منصة ميزان الرقمية، والجريدة الرسمية، ومواقع الكليات، ومنصات النصوص المفتوحة.",
    schema: {
      "@type": "Guide",
      headline: "أفضل الموارد المجانية لطلبة القانون في المغرب 2026",
      url: absoluteUrl("/guides/free-legal-resources-morocco"),
      inLanguage: "ar-MA",
      dateModified: NOW,
      author: { "@type": "Organization", name: publisherSchema.name, url: DOMAIN },
    },
    extraSchema: [
      buildBreadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: "الموارد المجانية", path: "/guides/free-legal-resources-morocco" },
      ]),
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>أفضل الموارد المجانية لطلبة القانون في المغرب 2026 | ميزان</h1>

          <p>
            <strong>
              ثلاثة أنواع من الموارد يحتاجها طالب الحقوق: ملخّص دراسي منظّم بالفصل،
              ونصّ رسمي يراجع عنده القاعدة، وإعلان من كليته. البقية تكرار.
            </strong>
            هذا الدليل يصف كل مورد بما يصلح له، ومتى تتوقف عنده وتنتقل إلى المصدر الرسمي.
          </p>

          <h2>1. منصة ميزان الرقمية — المورد الأول للطلبة</h2>

          <p>
            ملخصات ومحاضرات مصنّفة حسب الفصل (S1 إلى S6)، ومعجم قانوني بـ${platformStats.lexicon}
            مصطلحاً، ودليل ${platformStats.schools} كلية حقوق، وصفحة مستجدات. قيمته ليست في كونه
            موسوعة، بل في أنه مكتوب بلغة الامتحان ومنظّم حسب ما تدرسه فعلاً هذا الفصل:
            <a href="/platform">تعرّف على المنصة</a>.
          </p>

          <h2>2. الجريدة الرسمية: النص كما نُشر</h2>

          <p>
            عند أي خلاف على عبارة أو على تاريخ سريان، المرجع هو موقع النشر الإلكتروني الرسمي
            (<a href="https://www.sgg.gov.ma" rel="noopener noreferrer">sgg.gov.ma</a>):
            الجريدة الرسمية ونصوص القوانين كما نُشرت فيها. لا يُغني ملخّص ولا معجم — بما في ذلك
            ما تنشره ميزان — عن قراءة الفصل في مصدره، ولا سيما في المواد التي عُدّلت بعد تحرير
            الملخّص. راجع أيضاً نصوص وزارة العدل المنشورة على
            <a href="https://adala.justice.gov.ma" rel="noopener noreferrer">adala.justice.gov.ma</a>.
          </p>

          <h2>3. مواقع الكليات والجامعات</h2>

          <p>
            إعلان الكلية هو المصدر الوحيد الموثوق للمواعيد: تاريخ الامتحان، تركيبة اللجنة، لائحة
            مباراة، أو تغيير طريقة اختبار. لا تنشره أي منصة عامة. دليل
            <a href="/schools">كليات الحقوق في ميزان</a> يعطيك الجامعة والمدينة والمسالك والرابط
            الرسمي لكل كلية لتنطلق منه إلى موقع مؤسستك.
          </p>

          <h2>4. منصات وموارد أخرى مفيدة</h2>

          <table>
            <caption>المورد، نوعه، ومتى يستخدمه طالب القانون في المغرب</caption>
            <thead>
              <tr><th scope="col">المورد</th><th scope="col">نوعه</th><th scope="col">متى تستخدمه</th></tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row"><a href="/platform">منصة ميزان الرقمية</a></th>
                <td>منصة تعليمية</td>
                <td>ملخصات بالفصل، معجم مصطلحات، دليل كليات، ومستجدات.</td>
              </tr>
              <tr>
                <th scope="row"><a href="/lexicon">المعجم القانوني</a></th>
                <td>أداة مراجعة</td>
                <td>حين تتعثر في مصطلح داخل محاضرة أو نص.</td>
              </tr>
              <tr>
                <th scope="row"><a href="https://www.sgg.gov.ma" rel="noopener noreferrer">الجريدة الرسمية</a></th>
                <td>نص رسمي</td>
                <td>التحقق من العبارة وتاريخ الدخول حيز التنفيذ.</td>
              </tr>
              <tr>
                <th scope="row"><a href="/schools">مواقع الكليات</a></th>
                <td>مؤسسة جامعية</td>
                <td>المواعيد والمباريات والإعلانات الإدارية.</td>
              </tr>
              <tr>
                <th scope="row"><a href="https://www.doaj.org" rel="noopener noreferrer">منصات الوصول المفتوح</a></th>
                <td>مقالات وبحوث</td>
                <td>إعداد فرض أو مذكرة، مع التحقق من تاريخ النشر.</td>
              </tr>
            </tbody>
          </table>

          <h2>الخلاصة</h2>

          <ol>
            <li>للمراجعة اليومية: <a href="/archive">أرشيف ميزان</a> حسب فصلك، ومعجم المصطلحات عند الحاجة.</li>
            <li>للتحقق من قاعدة: الجريدة الرسمية، ثم النص كما عُدّل آخر مرة.</li>
            <li>للمواعيد: موقع كليتك، ودليل الكليات للوصول إليه.</li>
            <li>أول أسبوع في الحقوق له ترتيب خاص في <a href="/guides/new-law-student-morocco">دليل الطالب الجديد</a>.</li>
          </ol>

          <p>${guideReviewNote}.</p>

          <p><a href="/">العودة إلى الصفحة الرئيسية</a></p>
        </article>
      </main>
    `,
  },

  {
    path: "/guides/new-law-student-morocco",
    title: "دليل طالب الحقوق الجديد في المغرب 2026 | ميزان",
    description:
      "دليل عملي لأول أسبوع في كلية الحقوق بالمغرب: كيف تدرس، وكيف تقرأ نصّاً قانونياً، وما الموارد المجانية التي تكفيك وحدها — بأمثلة من منصة ميزان الرقمية.",
    schema: {
      "@type": "Guide",
      headline: "دليل طالب الحقوق الجديد في المغرب 2026",
      url: absoluteUrl("/guides/new-law-student-morocco"),
      inLanguage: "ar-MA",
      dateModified: NOW,
      author: { "@type": "Organization", name: publisherSchema.name, url: DOMAIN },
    },
    extraSchema: [
      buildBreadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: "دليل الطالب الجديد", path: "/guides/new-law-student-morocco" },
      ]),
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>دليل طالب الحقوق الجديد في المغرب 2026 | ميزان</h1>

          <p>
            <strong>
              أول أسبوع في الحقوق لا يحتاج مكتبة، يحتاج نظاماً: مصدر واحد لكل مادة،
              وبطاقة مصطلحات كل يوم، وسؤال دورة واحدة في نهاية الأسبوع.
            </strong>
          </p>

          <h2>الأسبوع الأول: ما تفعله يوماً بيوم</h2>

          <ol>
            <li>اليوم 1–2: اعرف بنية الفصل — الوحدات، معاملاتها، ونمط الاختبار تطبيقي أم نظري.</li>
            <li>اليوم 3: اجمع سلاسل المادة، وحدّد مصدراً واحداً لكل مادة لا ثلاثة.</li>
            <li>اليوم 4–5: ابدأ من ملخّص واحد لتثبيت البنية (<a href="/archive">الأرشيف حسب الفصل</a>)، ثم عد إلى المحاضرة للتفصيل.</li>
            <li>اليوم 6: اكتب ثلاث كلمات قانونية في اليوم وشرحها بنفسك — عبر <a href="/lexicon">المعجم القانوني</a>.</li>
            <li>اليوم 7: جرّب سؤال دورة سابقة في الوقت المحدد، وصحّح بعناصر الإجابة.</li>
          </ol>

          <h2>مثال: كيف تقرأ بطاقة مصطلح</h2>

          <p>
            <strong>${escapeHtml(guideSampleTerm.term_ar)} (${escapeHtml(guideSampleTerm.term_fr)})</strong>
            — ${escapeHtml(guideSampleTerm.simple_explanation || guideSampleTerm.definition)}
          </p>

          <ul>
            ${(guideSampleTerm.examples || []).slice(0, 3).map((example) => `<li>${escapeHtml(example)}</li>`).join("\n            ")}
          </ul>

          <p>
            هذه البطاقة واحدة من ${platformStats.lexicon} بطاقة في
            <a href="/lexicon/التقادم">قاموس ميزان</a>.
          </p>

          <h2>ما يكفيك من الموارد في السنة الأولى</h2>

          <table>
            <caption>المورد، نوعه، ومتى تستخدمه</caption>
            <thead>
              <tr><th scope="col">المورد</th><th scope="col">نوعه</th><th scope="col">متى تستخدمه</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row"><a href="/archive">ملخّص الفصل</a></th><td>مراجعة</td><td>تثبيت بنية المادة قبل المحاضرة وبعدها.</td></tr>
              <tr><th scope="row"><a href="/lexicon">المعجم القانوني</a></th><td>مصطلحات</td><td>عندما يتعثر الفهم عند كلمة، لا عند الجملة كلها.</td></tr>
              <tr><th scope="row"><a href="https://www.sgg.gov.ma" rel="noopener noreferrer">النص الرسمي</a></th><td>مرجع</td><td>للتأكد من العبارة سارية المفعول.</td></tr>
              <tr><th scope="row"><a href="/schools">إعلان الكلية</a></th><td>مواعيد</td><td>اللجان والتداريب والمباريات.</td></tr>
            </tbody>
          </table>

          <h2>نصائح للمراجعة</h2>

          <ul>
            <li>اكتب القاعدة في جملة واحدة، ثم أغلق الكتاب وارجع إليها.</li>
            <li>لا تحفظ رقم الفصل وحده: احفظ معه الحالة التي يُطبَّق فيها.</li>
            <li>قارن كل مصطلحين متجاورين (البيع والهبة، الرهن والكفالة) بجدول من ثلاثة أسطر.</li>
            <li>آخر ساعة من الأسبوع لدورة أسئلة سابقة، لا لقراءة جديدة.</li>
          </ul>

          <h2>من كليّتك ومن مستجدّات المنصة</h2>

          <p>
            ${guideSampleSchool ? escapeHtml(guideSampleSchool.short_name || guideSampleSchool.name) : ""}${
              guideSampleSchool && guideSampleSchool.university ? ` — ${escapeHtml(guideSampleSchool.university)}` : ""
            }.${
              guideSampleSchool && Array.isArray(guideSampleSchool.studyAreas) && guideSampleSchool.studyAreas.length
                ? ` من مسالكها: ${escapeHtml(guideSampleSchool.studyAreas.slice(0, 3).join("، "))}.`
                : ""
            } المواعيد والإعلانات تُنشر في موقع المؤسسة، ودليل
            <a href="/schools">الكليات</a> يوصلك به.
          </p>

          <p>
            من آخر ما نُشر في المستجدات:
            ${guideSampleNews ? `<a href="/news/${encodeURIComponent(guideSampleNews.id)}">${escapeHtml(guideSampleNews.title)}</a>` : ""}
          </p>

          <h2>أسئلة شائعة</h2>

          <h3>هل أشتري الكتب في الأسبوع الأول؟</h3>
          <p>لا تنتظر نهاية الأسبوع الأول: ابدأ بالسلاسل التي يحدّدها أستاذ المادة، واقتنِ كتاباً واحداً حين تعرف نمط الاختبار.</p>

          <h3>كم ساعة أحتاج يومياً في الحقوق؟</h3>
          <p>ساعة إلى ساعتين بتركيز على المادة الحالية. الفارق ليس عدد الساعات بل عدد مرات استرجاع القاعدة من الذاكرة.</p>

          <p>
            الموارد مقارنة بالمصادر الرسمية في
            <a href="/guides/free-legal-resources-morocco">دليل الموارد المجانية</a>،
            وما هو متاح في <a href="/platform">صفحة المنصة</a>.
          </p>

          <p>${guideReviewNote}.</p>

          <p><a href="/">العودة إلى الصفحة الرئيسية</a></p>
        </article>
      </main>
    `,
  }
);

/* -------------------------------------------------------
   Additional trust pages
------------------------------------------------------- */

pages.push(
  {
    path: "/about",
    title: "حول ميزان الرقمية | من نحن",
    description:
      "تعرف على مشروع ميزان الرقمية وأهدافه ومجالات المحتوى القانوني.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>حول ميزان الرقمية</h1>

          <p>
            <strong>
              ميزان الرقمية مشروع معرفي عربي يهدف إلى تسهيل الوصول
              إلى المحتوى القانوني والأكاديمي لطلبة الحقوق في المغرب.
            </strong>
          </p>

          <h2>ما هدف المنصة؟</h2>

          <p>
            الهدف هو تنظيم المعرفة القانونية في مكان واحد
            وتقديمها بطريقة واضحة وقابلة للبحث والاستخدام الأكاديمي.
          </p>

          <h2>من هو الجمهور المستهدف؟</h2>

          <p>
            طلبة القانون والباحثون والمهتمون بالقانون المغربي
            والمجال الأكاديمي.
          </p>
        </article>
      </main>
    `,
  },

  {
    path: "/contact",
    title: "تواصل معنا | ميزان الرقمية",
    description:
      "صفحة التواصل مع فريق ميزان الرقمية.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>تواصل معنا</h1>

          <p>
            يمكنك التواصل مع فريق ميزان الرقمية
            بخصوص المحتوى أو الأخطاء أو الاقتراحات.
          </p>

          <h2>كيف يمكن الإبلاغ عن خطأ؟</h2>

          <p>
            يرجى استخدام قناة التواصل الرسمية المتاحة
            في المنصة وإرفاق رابط الصفحة والمعلومة التي تحتاج إلى تصحيح.
          </p>
        </article>
      </main>
    `,
  },

  (() => {
    const allFaqs = faqGroups.flatMap((group) => group.items);

    return {
      path: "/faq",
      title: "الأسئلة الشائعة | ميزان الرقمية",
      description:
        "إجابات وافية عن أكثر الأسئلة تكراراً حول منصة الميزان الرقمية: طبيعة المحتوى، الاستشارات القانونية، سياسة الخصوصية، وكيفية المساهمة في إثراء المنصة.",
      schema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: allFaqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      staticBody: `
        <main dir="rtl" lang="ar-MA">
          <article>
            <h1>الأسئلة الشائعة</h1>
            ${faqGroups
              .map(
                (group) => `
              <section>
                <h2>${escapeHtml(group.title)}</h2>
                ${group.items
                  .map(
                    (item) => `
                  <h3>${escapeHtml(item.question)}</h3>
                  <p>${escapeHtml(item.answer)}</p>
                `
                  )
                  .join("\n")}
              </section>
            `
              )
              .join("\n")}
          </article>
        </main>
      `,
    };
  })(),

  {
    path: "/privacy",
    title: PRIVACY_POLICY.title,
    description: PRIVACY_POLICY.description,
    // يُبنى من نفس بيانات صفحة React — لا نسخة يدوية مختصرة.
    staticBody: policyToHtml(PRIVACY_POLICY),
  },

  {
    path: "/terms",
    title: TERMS_POLICY.title,
    description: TERMS_POLICY.description,
    // يُبنى من نفس بيانات صفحة React — لا نسخة يدوية مختصرة.
    staticBody: policyToHtml(TERMS_POLICY),
  },

  {
    path: "/cookies",
    title: COOKIE_POLICY.title,
    description: COOKIE_POLICY.description,
    // يُبنى من نفس بيانات صفحة React — لا نسخة يدوية مختصرة.
    staticBody: policyToHtml(COOKIE_POLICY),
  }
);


/* -------------------------------------------------------
   Quiz pages (محور الاختبارات — 4-Tier Quiz System)
------------------------------------------------------- */
// تُبنى من بنك الأسئلة المحلي (src/data/quiz-questions.json) حتى يحتوي
// الـ HTML المُصدَّر مسبقاً على محتوى حقيقي (عناوين المواد، الفصول،
// الجهات...) بدل صفحة فارغة — وهو ما تفهرسه محركات البحث فعلياً.
const quizByTier = (tier) => quizQuestions.filter((item) => item.tier === tier);
const countBy = (items, key) => {
  const map = new Map();
  items.forEach((item) => {
    const value = item[key];
    if (!value) return;
    map.set(value, (map.get(value) ?? 0) + 1);
  });
  return Array.from(map.entries());
};

const QUIZ_TIERS = [
  {
    path: "/quiz/university",
    tier: "university",
    title: "اختبارات طلبة كليات الحقوق من S1 إلى S6 | ميزان",
    description:
      "اختبارات قانونية مرتبطة بالمقررات الجامعية الرسمية لكل فصل دراسي: القانون المدني، الجنائي، الإداري، الدستوري، المساطر، الشغل، ومدونة الأسرة.",
    heading: "اختبارات طلبة الكلية",
    lead: "أسئلة مصنّفة بحسب الفصل الدراسي (S1 حتى S6) والمادة، مع شرح وسند قانوني لكل سؤال.",
    groups: () =>
      ["S1", "S2", "S3", "S4", "S5", "S6"].map((semester) => ({
        title: `الفصل ${semester}`,
        items: countBy(
          quizByTier("university").filter((item) => item.semester === semester),
          "module"
        ).map(([name, total]) => `${name} (${total} سؤالاً)`),
      })),
  },
  {
    path: "/quiz/general",
    tier: "general",
    title: "الاختبار العشوائي العام — ثقافة قانونية ونقاط خبرة | ميزان",
    description:
      "أسئلة قانونية متنوعة تظهر عشوائياً: أجب فتجمع نقاط الخبرة، وأخطئ فيمنحك النظام الإجابة الصحيحة مع شرح مبسط ومفاجئ.",
    heading: "الاختبار العشوائي العام",
    lead: "تسلية معرفية تكسر ملل المراجعة اليومية، وتمنحك نقاط خبرة (XP) ترفع رتبتك من D حتى SSS.",
    groups: () => [
      {
        title: "محاور الأسئلة",
        items: [
          `إجمالي الأسئلة المتاحة: ${quizByTier("general").length}`,
          "الثقافة القانونية المغربية",
          "الحقوق والحريات",
          "المؤسسات الدستورية",
        ],
      },
    ],
  },
  {
    path: "/quiz/concours",
    tier: "concours",
    title: "اختبارات المباريات المهنية — الأمن الوطني والقضاء والوظيفة العمومية | ميزان",
    description:
      "تدريب على صيغة أسئلة المباريات الرسمية بالمغرب: الأمن الوطني، القوات المساعدة، الجمارك، القضاء، والوظيفة العمومية، مع وضع مؤقّت كالمباراة الفعلية.",
    heading: "اختبارات المباريات المهنية",
    lead: "أسئلة تخصصية بصيغة قريبة من الامتحانات الرسمية السابقة، مع عدّاد زمني يحاكي ضغط المباراة.",
    groups: () => [
      {
        title: "المباريات المتاحة",
        items: [
          `الأمن الوطني (${quizByTier("concours").filter((item) => item.body === "police").length} سؤالاً)`,
          `القضاء وكتابة الضبط (${quizByTier("concours").filter((item) => item.body === "judiciary").length} سؤالاً)`,
          `الوظيفة العمومية (${quizByTier("concours").filter((item) => item.body === "civil_service").length} سؤالاً)`,
          `القوات المساعدة (${quizByTier("concours").filter((item) => item.body === "auxiliary").length} سؤالاً)`,
          `الجمارك (${quizByTier("concours").filter((item) => item.body === "customs").length} سؤالاً)`,
        ],
      },
    ],
  },
  {
    path: "/quiz/interview",
    tier: "interview",
    title: "اختبارات المقابلات المهنية وتداريب العمل القانوني | ميزان",
    description:
      "مواقف عملية وأسئلة مقابلات حقيقية لإعداد الخريجين والباحثين عن تدريب أو وظيفة قانونية في مكاتب المحاماة والشركات والمؤسسات.",
    heading: "مقابلات التدريب والعمل",
    lead: "أسئلة عملية ومواقف تطبيقية من الواقع المهني لتأكيد الجاهزية العملية.",
    groups: () => [
      {
        title: "محاور التدريب",
        items: [
          `تدريب في مكتب محاماة أو محكمة (${quizByTier("interview").filter((item) => item.track === "internship").length} سؤالاً)`,
          `وظيفة قانونية (${quizByTier("interview").filter((item) => item.track === "job").length} سؤالاً)`,
          `أخلاقيات المهنة (${quizByTier("interview").filter((item) => item.track === "ethics").length} سؤالاً)`,
          `مهارات التواصل والعمل (${quizByTier("interview").filter((item) => item.track === "softskills").length} سؤالاً)`,
        ],
      },
    ],
  },
];

pages.push(
  {
    path: "/quiz",
    title: "اختبارات القانون المغربي — الكلية، المباريات، المقابلات | ميزان",
    description:
      "اختبر نفسك في القانون المغربي عبر أربعة مسارات: اختبارات طلبة الكلية من S1 إلى S6، اختبار عشوائي للثقافة القانونية، مباريات الأمن الوطني والقضاء والوظيفة العمومية، وتدريبات المقابلات المهنية.",
    schema: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "مسارات الاختبارات القانونية في ميزان",
      itemListElement: QUIZ_TIERS.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.heading,
        url: absoluteUrl(item.path),
      })),
    },
    extraSchema: [
      buildBreadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: "الاختبارات", path: "/quiz" },
      ]),
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الاختبارات القانونية</h1>
          <p>
            أربعة مسارات لاختبار نفسك في القانون المغربي: تحضير امتحانات الكلية،
            ثقافة قانونية عامة، التدريب على صيغة المباريات المهنية، والتأهيل العملي
            لمقابلات التدريب والعمل. كل إجابة صحيحة تمنحك نقاط خبرة وترقّيك من الرتبة D حتى SSS.
          </p>
          <ul>
            ${QUIZ_TIERS.map(
              (item) => `<li><a href="${item.path}">${escapeHtml(item.heading)}</a> — ${escapeHtml(item.description)}</li>`
            ).join("\n            ")}
            <li><a href="/quiz/placement">اختبار تحديد المستوى</a> — 15 سؤالاً تحدد رتبتك الابتدائية.</li>
          </ul>
          <h2>إجمالي الأسئلة</h2>
          <p>${quizQuestions.length} سؤالاً موزّعة على المسارات الأربعة.</p>
        </article>
      </main>
    `,
  },

  ...QUIZ_TIERS.map((item) => ({
    path: item.path,
    title: item.title,
    description: item.description,
    schema: {
      "@context": "https://schema.org",
      "@type": "Quiz",
      name: item.heading,
      description: item.description,
      educationalLevel: item.tier === "university" ? "جامعي" : undefined,
      about: "القانون المغربي",
      inLanguage: "ar-MA",
      url: absoluteUrl(item.path),
    },
    extraSchema: [
      buildBreadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: "الاختبارات", path: "/quiz" },
        { name: item.heading, path: item.path },
      ]),
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>${escapeHtml(item.heading)}</h1>
          <p>${escapeHtml(item.lead)}</p>
          ${item
            .groups()
            .map(
              (group) => `
          <section>
            <h2>${escapeHtml(group.title)}</h2>
            <ul>
              ${group.items.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("\n              ")}
            </ul>
          </section>`
            )
            .join("\n          ")}
        </article>
      </main>
    `,
  })),

  {
    path: "/quiz/placement",
    title: "اختبار تحديد المستوى في القانون — حدد رتبتك في 5 دقائق | ميزان",
    description:
      "15 سؤالاً متدرجة تحدد مستواك الابتدائي في القانون المغربي وتمنحك الرتبة المناسبة، مع خيار التجاوز المدفوع للمحامين والخبراء.",
    schema: {
      "@context": "https://schema.org",
      "@type": "Quiz",
      name: "اختبار تحديد المستوى",
      description: "15 سؤالاً متدرجة تحدد الرتبة الابتدائية في منصة ميزان.",
      inLanguage: "ar-MA",
      url: absoluteUrl("/quiz/placement"),
    },
    extraSchema: [
      buildBreadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: "الاختبارات", path: "/quiz" },
        { name: "تحديد المستوى", path: "/quiz/placement" },
      ]),
    ],
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>اختبار تحديد المستوى</h1>
          <p>
            خمسة عشر سؤالاً تكفي ليرسم النظام صورة عن مستواك: نبدأ بأسئلة سهلة في
            الثقافة القانونية، ثم نصعد تدريجياً حتى مستوى مباريات القضاء.
          </p>
          <h2>سلم الرتب بعد التحديد</h2>
          <ul>
            <li>Rank D — مبتدئ: أول خطوة في الطريق.</li>
            <li>Rank C — متعلم: تمكنت من المصطلحات والمبادئ العامة.</li>
            <li>Rank B — متمكن: تجيب عن أسئلة الفصول المتوسطة بثبات.</li>
            <li>Rank A — متقدم: مستوى يؤهلك لمساعدة زملائك ونشر مقالاتك.</li>
          </ul>
        </article>
      </main>
    `,
  }
);

/* -------------------------------------------------------
   Renderers
------------------------------------------------------- */

function renderLexiconIndexStaticHtml(terms) {
  const items = terms
    .map((t) => `
      <li>
        <a href="/lexicon/${escapeHtml(t.slug)}">
          ${escapeHtml(t.term_ar)}
          ${
            t.term_fr
              ? ` (${escapeHtml(t.term_fr)})`
              : ""
          }
        </a>

        ${
          t.category
            ? ` — <span>${escapeHtml(t.category)}</span>`
            : ""
        }
      </li>
    `)
    .join("");

  return `
    <main dir="rtl" lang="ar-MA">
      <article>

        <h1>القاموس القانوني العربي الفرنسي</h1>

        <p>
          <strong>
            القاموس القانوني هو أداة للبحث عن المصطلحات القانونية
            وتعريفاتها بالعربية والفرنسية.
          </strong>
        </p>

        <p>
          يضم القاموس حالياً
          <strong>${terms.length} مصطلحاً</strong>
          وفق البيانات المتاحة.
        </p>

        <h2>كيف تستخدم القاموس؟</h2>

        <p>
          اختر المصطلح المطلوب للحصول على تعريفه
          ومعلوماته القانونية والإحالات المتوفرة.
        </p>

        <ul>
          ${items}
        </ul>

      </article>
    </main>
  `;
}

/**
 * الشرح المبسّط والأمثلة وكلمات المراجعة والمصطلحات ذات صلة — الحقول التي
 * يضيفها scripts/enrich-lexicon.mjs إلى lexicon.json. كل قسم يُطبع فقط إذا كان
 * موجوداً في السجل، فلا تُنشأ عناوين فارغة في النسخة الثابتة، ولا يختلف ما
 * يقرؤه الزاحف عمّا يقرؤه الطالب في الواجهة.
 */
function termEnrichmentHtml(item) {
  const examples = (Array.isArray(item.examples) ? item.examples : []).slice(0, 3);
  const keywords = Array.isArray(item.exam_keywords) ? item.exam_keywords : [];
  const selfPath = termLinkById.get(item.id)?.path;
  const related = (Array.isArray(item.related_terms) ? item.related_terms : [])
    .map((id) => ({ id, ...(termLinkById.get(id) || {}) }))
    .filter((entry) => entry.path && entry.path !== selfPath)
    .slice(0, 6);

  const blocks = [];

  // حقول FR (simple_explanation_fr / examples_fr) لا تُطبع هنا ولا في الواجهة:
  // مُولَّدة من التعريف ولم يراجعها بشر بعد، فتنشر حين تتحول published.
  if (item.simple_explanation) {
    blocks.push(`
      <section>
        <h2>كيف يُشرح هذا المصطلح ببساطة؟</h2>
        ${item.simple_explanation ? `<p>${escapeHtml(item.simple_explanation)}</p>` : ""}
      </section>
    `);
  }

  if (examples.length) {
    blocks.push(`
      <section>
        <h2>أمثلة وتمارين للمراجعة</h2>
        <ul>
          ${examples.map((example) => `<li>${escapeHtml(example)}</li>`).join("\n          ")}
        </ul>
      </section>
    `);
  }

  if (keywords.length) {
    blocks.push(`
      <section>
        <h2>كلمات مفتاحية للامتحان</h2>
        <ul>
          ${keywords.map((keyword) => `<li>${escapeHtml(keyword)}</li>`).join("\n          ")}
        </ul>
      </section>
    `);
  }

  if (related.length) {
    blocks.push(`
      <section>
        <h2>مصطلحات ذات صلة</h2>
        <ul>
          ${related
            .map((entry) => `<li><a href="${entry.path}">${escapeHtml(entry.label)}</a></li>`)
            .join("\n          ")}
        </ul>
      </section>
    `);
  }

  if (item.last_reviewed) {
    blocks.push(`
      <p>
        <time datetime="${escapeHtml(item.last_reviewed)}">
          آخر مراجعة تحريرية: ${escapeHtml(item.last_reviewed)}
        </time>
        ${
          item.review_status === "published"
            ? " — راجعها فريق المحتوى ونُشرت."
            : " — صيغة آلية في انتظار مراجعة متخصص."
        }
      </p>
    `);
  }

  return blocks.join("\n");
}

function renderTermStaticHtml(item) {
  const sources = (item.legal_sources || [])
    .map((src) => {
      const articlesHtml =
        (src.articles || [])
          .map(
            (article) => `
              <li>
                <strong>
                  الفصل ${escapeHtml(article.number)}
                  من
                  ${escapeHtml(
                    src.code_ar ||
                    src.code_short ||
                    "التشريع المغربي"
                  )}
                :
                </strong>

                ${escapeHtml(article.phrase || "")}
              </li>
            `
          )
          .join("");

      return `
        <section>
          <h2>
            ما هي الإحالات التشريعية المرتبطة بالمصطلح؟
          </h2>

          <p>
            ${escapeHtml(
              src.code_ar ||
              src.code_short ||
              ""
            )}
          </p>

          <ul>
            ${articlesHtml}
          </ul>
        </section>
      `;
    })
    .join("");

  return `
    <main dir="rtl" lang="ar-MA">
      <article>

        <h1>
          ${escapeHtml(item.term_ar)}
          ${
            item.term_fr
              ? ` (${escapeHtml(item.term_fr)})`
              : ""
          }
        </h1>

        <section>

          <h2>ما هو ${escapeHtml(item.term_ar)}؟</h2>

          <p>
            <strong>التعريف المباشر:</strong>
            ${escapeHtml(item.definition)}
          </p>

        </section>

        ${termEnrichmentHtml(item)}

        ${
          item.category
            ? `
              <section>
                <h2>ما هو تصنيف هذا المصطلح؟</h2>
                <p>${escapeHtml(item.category)}</p>
              </section>
            `
            : ""
        }

        ${sources}

        <p>
          <a href="/lexicon">
            العودة إلى القاموس القانوني
          </a>
        </p>

      </article>
    </main>
  `;
}

function renderArticleStaticHtml(item) {
  const rawBody = item.content || item.body || item.text || item.excerpt || "";
  const rawContent = Array.isArray(rawBody) ? rawBody.join("\n\n") : rawBody;
  
  // Server-side term linking for SEO - link lexicon terms
  const linkedIds = new Set()
  let linkedContent = rawContent
  try {
    linkedContent = linkTermsInHtmlContent(rawContent, lexiconWithSlugs)
  } catch (e) {
    linkedContent = rawContent
  }

  // For display, escape but keep our term links
  const escapedWithLinks = escapeHtml(linkedContent)
    .replace(/&lt;a href=&quot;\/lexicon\/([^&]+)&quot; class=&quot;mizan-term-link&quot; title=&quot;([^&]+)&quot;&gt;([^&]+)&lt;\/a&gt;/g, 
      '<a href="/lexicon/$1" class="mizan-term-link" title="$2">$3</a>')

  return `
    <main dir="rtl" lang="ar-MA">
      <article>

        <h1>${escapeHtml(item.title)}</h1>

        <p>
          <strong>الإجابة المختصرة:</strong>
          ${escapeHtml(item.excerpt || rawContent.slice(0, 300))}
        </p>

        <h2>ما موضوع هذا المقال؟</h2>

        <div>
          ${escapedWithLinks}
        </div>

        ${
          item.category
            ? `
              <p>
                <strong>التصنيف:</strong>
                ${escapeHtml(item.category)}
              </p>
            `
            : ""
        }

        ${
          item.publishedAt
            ? `
              <p>
                تاريخ النشر:
                <time datetime="${escapeHtml(
                  item.publishedAt
                )}">
                  ${escapeHtml(item.publishedAt)}
                </time>
              </p>
            `
            : ""
        }

      </article>
    </main>
  `;
}

function renderNewsStaticHtml(item) {
  const summary =
    item.summary ||
    item.excerpt ||
    "";

  const rawBody = item.content || item.body || item.text || "";
  const rawContent = Array.isArray(rawBody) ? rawBody.join("\n\n") : rawBody;

  // Server-side term linking for news too
  let linkedSummary = summary
  let linkedContent = rawContent
  try {
    linkedSummary = linkTermsInContent(summary, lexiconWithSlugs, new Set(), 5)
    linkedContent = linkTermsInHtmlContent(rawContent, lexiconWithSlugs)
  } catch (e) {
    linkedSummary = summary
    linkedContent = rawContent
  }

  const escapedSummaryWithLinks = escapeHtml(linkedSummary)
    .replace(/&lt;a href=&quot;\/lexicon\/([^&]+)&quot; class=&quot;mizan-term-link&quot; title=&quot;([^&]+)&quot;&gt;([^&]+)&lt;\/a&gt;/g, 
      '<a href="/lexicon/$1" class="mizan-term-link" title="$2">$3</a>')

  const escapedContentWithLinks = escapeHtml(linkedContent)
    .replace(/&lt;a href=&quot;\/lexicon\/([^&]+)&quot; class=&quot;mizan-term-link&quot; title=&quot;([^&]+)&quot;&gt;([^&]+)&lt;\/a&gt;/g, 
      '<a href="/lexicon/$1" class="mizan-term-link" title="$2">$3</a>')

  return `
    <main dir="rtl" lang="ar-MA">
      <article>

        <h1>${escapeHtml(item.title)}</h1>

        <p>
          <strong>ما هو الخبر؟</strong>
        </p>

        <p>
          ${escapedSummaryWithLinks}
        </p>

        ${
          item.category
            ? `
              <p>
                <strong>التصنيف:</strong>
                ${escapeHtml(item.category)}
              </p>
            `
            : ""
        }

        ${
          linkedContent
            ? `
              <h2>تفاصيل الخبر</h2>
              <div>${escapedContentWithLinks}</div>
            `
            : ""
        }

        <p>
          تاريخ النشر:
          ${escapeHtml(
            item.date ||
            item.publishedAt ||
            ""
          )}
        </p>

      </article>
    </main>
  `;
}

/* -------------------------------------------------------
   قائمة روابط لكل صفحة محور (hub)
-------------------------------------------------------

   لماذا؟ الصفحات الثابتة هي ما يقرأه الزاحف. كانت صفحات /articles و /news
   و /events و /archive تعرض نصاً تعريفياً بلا أي link إلى صفحاتها
   الفرعية، فتبقى 300+ صفحة مولّدة «يتيمة» لا يصلها زاحف إلا من sitemap
   (التي لا تضمن الزحف ولا ترتيب الفهرسة)، وترتفع في التدقيق قائمة
   «صفحات يتيمة (بلا رابط داخلي)». القوائم هنا داخل الـ staticBody فقط؛
   الواجهة تظل تعرض بطاقاتها المعتادة بعد hydration.
------------------------------------------------------- */

function renderCrawlList(items, { heading, emptyText = "لا توجد عناصر منشورة حالياً." } = {}) {
  const rows = (items || [])
    .filter((item) => item && item.path && item.name)
    .map(
      (item) =>
        `        <li>
          <a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>${
          item.summary ? ` — ${escapeHtml(String(item.summary).slice(0, 120))}` : ""
        }
        </li>`
    )
    .join("\n");

  return `
          <h2>${escapeHtml(heading)}</h2>

          <p>
            القائمة الكاملة للعناصر المنشورة، للوصول المباشر من هذه الصفحة:
          </p>

          <ul>
${rows || `        <li>${escapeHtml(emptyText)}</li>`}
          </ul>
`
}

/* -------------------------------------------------------
   Duplicate route protection
------------------------------------------------------- */

const seen = new Map();

for (const page of pages) {
  if (seen.has(page.path)) {
    throw new Error(
      `Duplicate prerender path ${page.path} (${seen.get(page.path)} vs ${page.title})`
    );
  }

  seen.set(page.path, page.title);
}

/* -------------------------------------------------------
   HTML rendering
------------------------------------------------------- */

/*
 * وصف الميتا للمولَّد مسبقاً = نفس دالة التطبيق (scripts/lib/meta-description.mjs)
 * زائد عبارة سياقية للقطاع تُكمّل النص القصير. بلا هذا يختلف ما تراه الزاحفة
 * التي لا تشغّل JS عمّا يراه المتصفح بعد hydration، فتُقتبس صفحة بضع كلمات.
 */
const SECTION_CONTEXT = {
  "/": "ميزان الرقمية — منصة المعرفة القانونية لطلبة الحقوق بالمغرب.",
  "/lexicon": "قاموس المصطلحات القانونية بالعربية والفرنسية في القانون المغربي.",
  "/news": "متابعة مستجدات التشريع والقضاء المغربي لطلبة الحقوق والباحثين.",
  "/articles": "مقالات ودراسات قانونية مبسّطة لطلبة الحقوق في كليات القانون.",
  "/events": "ندوات وأيام دراسية قانونية في كليات الحقوق المغربية.",
  "/schools": "معلومات كليات الحقوق والجامعات المغربية ضمن دليل ميزان.",
  "/archive": "ملخصات ومحاضرات ونماذج امتحانات مع تصحيحاتها من أرشيف كليات الحقوق، مرتّبة حسب الفصل والمادة وجاهزة للتحميل المجاني.",
  "/pdf": "وثائق وملخصات دراسية بصيغة PDF من أرشيف ميزان الرقمية.",
  "/guides": "أدلة وموارد دراسية لطلبة الحقوق في المغرب.",
};

const sectionContextFor = (path) => {
  const first = String(path || "").split("/").filter(Boolean)[0];
  return SECTION_CONTEXT[first ? `/${first}` : "/"] || SECTION_CONTEXT["/"];
};

/*
 * طول العنوان ونطاقاه (هدف 60، سقف 65) وسقوف الوصف (140-160) كلُّها في
 * shared/seo/meta-copy.js، وهي نفسها التي يقرأها SEOHead في المتصفح وفاحص
 * `pnpm seo:audit`. لا نسخة ثانية هنا: الانحراف بين النسختين هو ما جعل
 * الزاحفة ترى عنوان الرئيسية على صفحات لا ملفَّ لها.
 */

function renderPage(template, page) {
  const canonical = absoluteUrl(page.path);
  const metaDescription = buildMetaDescription(page.description, page.metaContext || [sectionContextFor(page.path)]);
  const title = fitTitle(page.title);

  const swap = (html, regex, replacement) => {
    if (!regex.test(html)) {
      throw new Error(
        `Prerender: pattern not found — ${regex}`
      );
    }

    return html.replace(regex, replacement);
  };

  let html = template;

  html = swap(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bname=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(metaDescription)}">`
  );

  html = swap(
    html,
    /<link\b[^>]*\brel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonical}">`
  );

  html = swap(
    html,
    /<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']ar["'][^>]*>/i,
    `<link rel="alternate" hreflang="ar" href="${canonical}">`
  );

  html = swap(
    html,
    /<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']x-default["'][^>]*>/i,
    `<link rel="alternate" hreflang="x-default" href="${canonical}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${canonical}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bproperty=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(title)}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(metaDescription)}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bname=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bname=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(
      page.description
    )}">`
  );

  if (page.schema) {
    const schema = {
      "@context": "https://schema.org",
      ...page.schema,
    };

    html = html.replace(
      "</head>",
      `    <script type="application/ld+json">${escapeJsonForHtml(
        schema
      )}</script>
  </head>`
    );
  }

  // مخطط إضافي (مثل BreadcrumbList) يُحقن كـ <script> منفصل بدل دمجه
  // داخل page.schema، تفادياً لتعارض خاصية "@context" الواحدة لكل عقدة.
  if (Array.isArray(page.extraSchema) && page.extraSchema.length) {
    for (const node of page.extraSchema) {
      const withContext = { "@context": "https://schema.org", ...node };
      html = html.replace(
        "</head>",
        `    <script type="application/ld+json">${escapeJsonForHtml(
          withContext
        )}</script>
  </head>`
      );
    }
  }

  if (page.noindex) {
    // صفحة خارج الفهرسة: لا تُرسَل بسياسة «index, follow» ثم تُترك تُخدَج
    // ضمن النتائج (حالة /404 وواجهات الانتظار).
    html = swap(
      html,
      /<meta\b[^>]*\bname=["']robots["'][^>]*>/i,
      `<meta name="robots" content="noindex, follow">`
    );
  }

  if (page.staticBody) {
    // نفس هيكل الصفحة الحيّة: شريط علوي فيه <header> قبل <main>. بدونه تفقد
    // النسخة المُسبقــة معلم الـ banner وروابط التنقل التي يراها المستخدم،
    // فيبقى الزاحف الذي لا يشغّل JS على صفحة بلا مخرج.
    const body = /<header[\s>]/i.test(page.staticBody)
      ? page.staticBody
      : `<div class="min-h-screen bg-white dark:bg-[#0f172a] text-foreground">${homeHeaderHtml}${page.staticBody}</div>`;

    html = swap(
      html,
      /<div id="root"><\/div>/i,
      `<div id="root">${body}</div>`
    );
  }

  return html;
}

/* -------------------------------------------------------
   Build
------------------------------------------------------- */

const template = await readFile(
  join(DIST, "index.html"),
  "utf8"
);

for (const page of pages) {
  const destination =
    page.path === "/"
      ? join(DIST, "index.html")
      : join(DIST, `${page.path.slice(1)}.html`);

  await mkdir(dirname(destination), {
    recursive: true,
  });

  await writeFile(
    destination,
    renderPage(template, page),
    "utf8"
  );
}

/* -------------------------------------------------------
   صفحة 404 حقيقية: dist/404.html
-------------------------------------------------------

  بلا هذا الملف تُخدم كل بوابة غير مُولَّدة من index.html بحالة 200 و
  <link rel="canonical" href="https://www.mizan.page"> — أي أن كل رابط منسيّ
  أو قديم يُبلِغ Google أن الصفحة نفسها هي الصفحة الرئيسية (soft 400 + تسرّب
  canonical). مع 404.html يمنح Pages الحالة 404 لنفس المسارات، ويظل هيكل
  التطبيق مُضمَّنًا فتعمل توجيهات الواجهة (/login، /admin/…) عند الفتح المباشر:
  React يركّب على #root ويقرأ المسار من المتصفح لا من اسم الملف.
------------------------------------------------------- */

const notFoundPage = {
  path: "/404",
  noindex: true,
  title: "الصفحة غير موجودة | ميزان الرقمية",
  description:
    "الرابط المطلوب غير موجود في ميزان الرقمية. تابع من القاموس القانوني أو الأرشيف الدراسي أو دليل كليات الحقوق.",
  staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>الصفحة غير موجودة</h1>
          <p><strong>لا يوجد محتوى بهذا الرابط في ميزان الرقمية.</strong></p>
          <h2>المتابعة من أقسام المنصة</h2>
          <ul>
            <li><a href="/lexicon">القاموس القانوني</a> — مصطلحات وتعريفات بالعربية والفرنسية.</li>
            <li><a href="/archive">الأرشيف الدراسي</a> — ملخصات ومحاضرات ونماذج امتحانات.</li>
            <li><a href="/articles">المقالات</a> — شروحات وتحليل قانوني.</li>
            <li><a href="/news">الأخبار والمستجدات</a> — تشريع وقضاء بالمغرب.</li>
            <li><a href="/schools">كليات الحقوق</a> — دليل الجامعات المغربية.</li>
            <li><a href="/events">الندوات والفعاليات</a> — أيام دراسية ومسابقات.</li>
          </ul>
          <p><a href="/">العودة إلى الصفحة الرئيسية</a></p>
        </article>
      </main>
  `,
};

await writeFile(
  join(DIST, "404.html"),
  renderPage(template, notFoundPage),
  "utf8"
);
console.log("✓ dist/404.html — صفحة 404 حقيقية (noindex) بدل fallback بحالة 200.");

/*
   ملفات shells للمسارات التطبيقية التي لا تُفهرس (login، profile، admin…).
   بلا ملف مقابل صارت هذه المسارات تُخدَج في حالة 404 بعد إضافة 404.html،
   وهي مسارات صحيحة يفتحها المستخدم بالتحديث المباشر أو بالحفظ في المفضّلة،
   فتحتاج 200 + noindex بدل 200 يرث canonical الصفحة الرئيسية.
   React يُركَّب على #root ويقرأ المسار من المتصفح، فالواجهة تعمل كما كانت؛
   النصّ هنا هو محتوى انتظار فقط لزيار بلا JavaScript.
*/
const APP_SHELL_ROUTES = [
  "/login",
  "/signup",
  "/signin",
  "/forgot-password",
  "/profile",
  "/saved",
  "/payments",
  "/search",
  "/admin",
  "/pro-tools",
  "/guidelines",
];



// لا مسار في APP_SHELL_ROUTES بلا نصّ في UTILITY_ROUTES؛ هذا النصّ وحده
// مشترك، ولو استعملناه لكل الصفحات لكان هو مصدر «الأوصاف المكرّرة».
const FALLBACK_SHELL_DESCRIPTION =
  "صفحة تفاعلية داخل منصة ميزان الرقمية تتطلب جلسة مستخدم وتفعّل JavaScript. للمحتوى المفتوح: القاموس القانوني، الأرشيف الدراسي، المقالات والأخبار، ودليل كليات الحقوق بالمغرب.";

let shellCount = 0;

for (const shellPath of APP_SHELL_ROUTES) {
  // لا ملف لتوجيه يُفهرَس: هذا عمل المولّدات لا prerender، وإلا ظهر تعارض
  // بين sitemap والملف الثابت في بوابة التغطية.
  if (isIndexablePath(shellPath) || seen.has(shellPath)) continue;

  const shellDestination = join(DIST, `${shellPath.slice(1)}.html`);

  await mkdir(dirname(shellDestination), { recursive: true });
  await writeFile(
    shellDestination,
    renderPage(template, {
      path: shellPath,
      noindex: true,
      title: (UTILITY_ROUTES[shellPath] || {}).title || "صفحة داخل المنصة | ميزان الرقمية",
      description:
        (UTILITY_ROUTES[shellPath] || {}).description || FALLBACK_SHELL_DESCRIPTION,
      staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>${shellPath === "/admin" ? "لوحة التحكم" : "هذه الصفحة داخل المنصة"}</h1>
          <p><strong>تحتاج هذه الصفحة إلى تسجيل الدخول وتفعيل JavaScript.</strong></p>
          <h2>المحتوى العام المتاح فوراً</h2>
          <ul>
            <li><a href="/lexicon">القاموس القانوني</a></li>
            <li><a href="/archive">الأرشيف الدراسي</a></li>
            <li><a href="/articles">المقالات</a></li>
            <li><a href="/news">الأخبار والمستجدات</a></li>
            <li><a href="/schools">كليات الحقوق</a></li>
            <li><a href="/">الصفحة الرئيسية</a></li>
          </ul>
        </article>
      </main>
  `,
    }),
    "utf8"
  );

  shellCount += 1;
}

/*
   هيكل التطبيق للمسارات الديناميكية التي لا ملف لها: /u/<username>،
   /download/<id>، /admin/<...>، /pro-tools/<slug>. بعد إضافة 404.html هذه
   المسارات كانت ستُخدَج في 404 أمام مشاركي الروابط (واتساب/لينكد إن) مع أن
   الصفحات حقيقية وتُبنى في المتصفح. دالة Pages تُسلّم هذا الملف بحالة 200
   عند غياب الأصل، بلا canonical ولا hreflang: لا شيء هنا قابل للفهرسة.
*/
const appShellHtml = template
  .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml("ميزان الرقمية — المنصة")}</title>`)
  .replace(
    /<meta\b[^>]*\bname=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(
      "صفحة داخل منصة ميزان الرقمية: الملف الشخصي والتحميلات ولوحة التحكم تتطلب تسجيل دخول. المحتوى العام متاح للجميع: القاموس والأرشيف والمقالات ودليل كليات الحقوق."
    )}">`
  )
  .replace(
    /<meta\b[^>]*\bname=["']robots["'][^>]*>/i,
    `<meta name="robots" content="noindex, follow">`
  )
  .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, "")
  .replace(/<link\b[^>]*\bhreflang=["'][^>]*>\s*/gi, "")
  .replace(
    /<div id="root"><\/div>/i,
    `<div id="root"><div class="min-h-screen bg-white dark:bg-[#0f172a] text-foreground">${homeHeaderHtml}
      <main dir="rtl" lang="ar-MA">
        <article>
          <h1>ميزان الرقمية</h1>
          <p><strong>هذه الصفحة تُعرض داخل المنصة بعد تسجيل الدخول.</strong></p>
          <h2>المحتوى العام المتاح فوراً</h2>
          <ul>
            <li><a href="/lexicon">القاموس القانوني</a></li>
            <li><a href="/archive">الأرشيف الدراسي</a></li>
            <li><a href="/articles">المقالات</a></li>
            <li><a href="/news">الأخبار والمستجدات</a></li>
            <li><a href="/schools">كليات الحقوق</a></li>
            <li><a href="/">الصفحة الرئيسية</a></li>
          </ul>
        </article>
      </main></div>
    </div>`
  );

await writeFile(join(DIST, "app.html"), appShellHtml, "utf8");
console.log("✓ dist/app.html — هيكل التطبيق للمسارات الديناميكية (noindex، بلا canonical).");

if (shellCount) {
  console.log(
    `✓ ${shellCount} shell للمسارات التطبيقية غير المفهرسَة (200 + noindex بدل وراثة canonical الرئيسية).`
  );
}

/* -------------------------------------------------------
   خريطة الموقع النهائية: dist/sitemap.xml
-------------------------------------------------------

  public/sitemap.xml يُولَّد في prebuild (قبل أن تُعرف صفحات CMS التي
  وصلت وقت البناء فعلاً). هذه الخطوة تكتب النسخة المُقدَّمة للزاحف:
  كل <url> لا يقابله ملف HTML مولَّد يُحذف، مع تحذير صريح.

  لماذا التصفية هنا لا في المولّد؟ لأن مصدر الحقيقة الوحيد هو «هل وُلِّدَت
  الصفحة؟». لو تعطلت الشبكة وفشل جلب CMS، تبقى الخريطة المنشورة خالية من
  الروابط الميتة — وهذا بالضبط ما يمنع رسائل «Discovered – currently not
  indexed» و«Soft 404» في Search Console.
------------------------------------------------------- */

const ROUTES_FILE = join(__dirname, "..", "public", "sitemap.xml");
const generatedRoutes = new Set(pages.map((page) => pathOfUrl(page.path)));

const sourceSitemap = await readFile(ROUTES_FILE, "utf8").catch(() => null);

if (sourceSitemap) {
  const blocks = sourceSitemap.match(/<url>[\s\S]*?<\/url>/g) ?? [];

  const kept = [];
  const dropped = [];

  for (const block of blocks) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(block)?.[1];

    if (!loc) {
      dropped.push("(بلا <loc>)");
      continue;
    }

    let routePath = "";

    try {
      routePath = decodeURIComponent(new URL(loc).pathname);
    } catch {
      dropped.push(loc);
      continue;
    }

    routePath = pathOfUrl(routePath);

    if (!generatedRoutes.has(routePath) || !isIndexablePath(routePath)) {
      dropped.push(loc);
      continue;
    }

    kept.push(block);
  }

  if (dropped.length) {
    console.warn(
      `⚠️  sitemap: حُذفت ${dropped.length} بوابة بلا صفحة مولّدة، أمثلة: ${dropped.slice(0, 4).join(", ")}`
    );
  }

  const finalSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${kept.join("\n")}
</urlset>
`;

  if (/\n\s*<loc>[^<]*\/\s*<\/loc>/.test(finalSitemap)) {
    throw new Error("sitemap: رابط ينتهي بشرطة مائلة في dist/sitemap.xml — مخالف لسياسة الروابط.");
  }

  await writeFile(join(DIST, "sitemap.xml"), finalSitemap, "utf8");

  console.log(
    `Sitemap: ${kept.length}/${blocks.length} entries kept (only generated pages).`
  );
}

/* -------------------------------------------------------
   llms.txt
------------------------------------------------------- */

/*
  llms.txt — دليل الموقع لوكلاء الذكاء الاصطناعي.

  كان هذا الملف يُكتب هنا بصيغة «شبه YAML» (مفاتيح + مسافات بادئة + عناوين
  مجرّدة على شكل سطور)، فيستبدل النسخة Markdown الصحيحة التي يولّدها
  scripts/generate-llms.mjs أثناء prebuild. النتيجة أن /llms.txt المنشور
  كان بلا أي رابط Markdown — وهو سبب فشل تدقيق llms-txt في Lighthouse
  («يبدو أنّ الملف لا يحتوي على أي روابط») وضياع درجة «التصفّح المستنِد
  إلى الذكاء الاصطناعي الوكيل».

  الصيغة الآن تتبع مواصفة llmstxt.org حرفياً:
    عنوان H1 واحد → وصف في اقتباس (>) → فقرات/قوائم اختيارية
    → أقسام H2 بقوائم من الروابط [العنوان](الرابط): الوصف
    → قسم Optional للروابط الثانوية.
  كل البيانات الوصفية السابقة (الأعداد، المجالات القانونية، التغطية
  الجغرافية، تلميحات الزحف) محفوظة، لكن بصيغة Markdown قابلة للتفسير.
*/

const llmsTxt = buildLlmsTxt({
  domain: DOMAIN,
  generatedAt: NOW,
  statistics,
  totalContent,
  legalDomains,
  articleCategories,
  faqTopics,
  schoolCities,
});

await writeFile(
  join(DIST, "llms.txt"),
  llmsTxt,
  "utf8"
);

console.log(
  `Prerendered ${pages.length} routes successfully.`
);

console.log(
  `Content: ${totalContent} data records.`
);