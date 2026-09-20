import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildLlmsTxt } from "./lib/llms-content.mjs";
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
const DOMAIN = "https://www.mizan.page";
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

const generateSlug = (text = "") =>
  String(text)
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\s/\\_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

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

// تُرمَّز المسارات غير اللاتينية (العربية) دائمًا بصيغة percent-encoded
// في canonical و og:url و hreflang وروابط المخططات. الزواحف (مثل Semrush)
// تقارن الرابط المطلوب فعلياً (مُرمَّز) برابط canonical؛ بدون هذا الترميز
// كانت الصفحات العربية تظهر كـ "Canonical to other page" بدل self-canonical.
const absoluteUrl = (path) =>
  `${DOMAIN}${encodeURI(path === "/" ? "/" : path)}`;

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

/* -------------------------------------------------------
   SEO helper suite (إصلاح حصيلة تدقيق Semrush)
   - اجعل كل العناوين أقل من 70 محرفاً (Title too long ×17).
   - أضف مسار تنقل مرئي + قسم "روابط ذات صلة" + ملاحة استكشافية
     إلى كل صفحة (Pages with only one internal link ×73).
   - أضف كتلة نصية تفسيرية بصيغة إجابة لرفع عدد الكلمات
     ونسبة النص إلى HTML فوق عتبة التحذير (Low text ratio / word count).
------------------------------------------------------- */

// قص النص عند أقرب فراغ حتى لا تنكسر كلمة عربية في منتصفها.
const truncateAtWord = (text, max) => {
  const value = String(text ?? "").trim();
  if (value.length <= max) return value;

  const cut = value.slice(0, max);
  const idx = cut.lastIndexOf(" ");

  const base = (idx > max * 0.55 ? cut.slice(0, idx) : cut).trimEnd();

  return `${base}…`;
};

// عنوان منضبط: يضمن ألّا يتجاوز الناتج النهائي 70 محرفاً حتى لو كان
// عنوان المادة طويلاً (المحرف العربي تحسبه أدوات التدقيق مثل محرف اللاتينية).
const seoTitle = (base, { suffix = "ميزان الرقمية", maxTotal = 68 } = {}) => {
  const maxBase = maxTotal - suffix.length - 3; // يخصم " | " واللاحقة
  return `${truncateAtWord(base, Math.max(maxBase, 10))} | ${suffix}`;
};

// "ما {X}؟" — عنوان سؤال قصير مناسب لفقرة التعريف الأولى (answer-first).
const questionHeading = (topic) => `ما ${topic}؟`;

// مسار تنقل مرئي يطابق مخطط BreadcrumbList (روابط داخلية إضافية).
const breadcrumbNavHtml = (items) => {
  if (!Array.isArray(items) || items.length < 2) return "";

  return `
    <nav class="breadcrumb-nav" aria-label="مسار التنقل" dir="rtl">
      <ol>
        ${items
          .map((item, index) =>
            index < items.length - 1
              ? `<li><a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a></li>`
              : `<li aria-current="page">${escapeHtml(item.name)}</li>`
          )
          .join("\n")}
      </ol>
    </nav>`;
};

// قسم روابط ذات صلة — يرفع متوسط الروابط الداخلية لكل صفحة من رابط
// وحيد إلى ثلاثة روابط على الأقل من محتوى متقارب.
const relatedSectionHtml = (title, items) => {
  if (!Array.isArray(items) || items.length === 0) return "";

  return `
    <section class="related-links" dir="rtl">
      <h2>${escapeHtml(title)}</h2>
      <ul>
        ${items
          .map(
            (item) => `
          <li>
            <a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a>${item.note ? ` — ${escapeHtml(item.note)}` : ""}
          </li>`
          )
          .join("\n")}
      </ul>
    </section>`;
};

// اختيار دائري لعناصر "ذات صلة": ربط كل صفحة بنفس الأربعة الأولى دائماً
// كان يحرم باقي الصفحات من أي رابط داخلي وارد. بهذا التناوب، ترسل كل
// صفحة روابط إلى العناصر التي تليها، فتنتشر الروابط الواردة بالتساوي.
const circularNext = (arr, index, count) => {
  if (arr.length < 2) return [];
  const n = Math.min(count, arr.length - 1);
  return Array.from({ length: n }, (_, i) => arr[(index + 1 + i) % arr.length]);
};

// ملاحة استكشافية ختامية مشتركة: صفحة واحدة بلا سياق داخلي كانت تكلف
// الدومين 73 تنبيهاً؛ هذا البلوك يمنح كل صفحة ثمانية روابط داخلية ثابتة.
const exploreNavHtml = `
    <nav class="explore-nav" aria-label="أقسام ميزان الرقمية" dir="rtl">
      <h2>ما الصفحة التي تود زيارتها من أقسام ميزان الرقمية؟</h2>
      <p>
        تتصل أقسام المنصة بعضها ببعض: القاموس يشرح المصطلح، والمقالات
        تعمق المنهجية، والأرشيف يوثق الامتحانات، والاختبارات تقيس الفهم.
        انتقل مباشرة إلى القسم الذي يخدم سؤالك القانوني أو الجامعي.
      </p>
      <ul>
        <li><a href="/">الصفحة الرئيسية</a></li>
        <li><a href="/articles">المقالات القانونية</a></li>
        <li><a href="/news">الأخبار والمستجدات القانونية</a></li>
        <li><a href="/lexicon">القاموس القانوني المغربي</a></li>
        <li><a href="/schools">دليل كليات الحقوق بالمغرب</a></li>
        <li><a href="/archive">الأرشيف الجامعي</a></li>
        <li><a href="/events">الندوات والفعاليات</a></li>
        <li><a href="/quiz">اختبارات تقويم الفهم</a></li>
        <li><a href="/faq">الأسئلة الشائعة</a></li>
      </ul>
    </nav>`;

// كيانات الناشر والمؤلف عبر المخططات المنظمة — تُبثد مضمنة في كل
// schema حتى لا تكون الشبكة معتمدة على مراجع @id خارجية (تصحيح
// أخطاء البيانات المنظمة في التدقيق).
const MIZAN_LOGO = `${DOMAIN}/icon.png`;

const publisherOrgSchema = () => ({
  "@type": "Organization",
  "@id": `${DOMAIN}/#org-mizan`,
  name: "ميزان الرقمية",
  url: DOMAIN,
  logo: {
    "@type": "ImageObject",
    "@id": `${DOMAIN}/#logo`,
    url: MIZAN_LOGO,
    width: 512,
    height: 512,
  },
});

const authorOrgSchema = () => ({
  "@type": "Organization",
  "@id": `${DOMAIN}/#org-mizan-team`,
  name: "فريق ميزان الرقمية",
  url: DOMAIN,
  logo: {
    "@type": "ImageObject",
    url: MIZAN_LOGO,
    width: 512,
    height: 512,
  },
});

// صورة كائنة كاملة — Google توصي بحقول url/width/height لصورة الصفحة.
const imageSchema = (url) => ({
  "@type": "ImageObject",
  url: url || DEFAULT_ARTICLE_IMAGE,
  representativeOfPage: true,
});

// أسماء الفصول الجامعية الستة (تُستخدم في الأرشيف وصفحات الفصول).
const SEMESTER_LABELS = {
  S1: "الفصل الأول",
  S2: "الفصل الثاني",
  S3: "الفصل الثالث",
  S4: "الفصل الرابع",
  S5: "الفصل الخامس",
  S6: "الفصل السادس",
};

/* روابط /pdf/:slug يجب أن تطابق منطق titledSlugById في
   src/lib/utils/generateSlug.ts حرفاً بحرفاً، وإلا فإن الرابط الذي يراه
   المستخدم داخل التطبيق لن يساوي الصفحة المولدة هنا. */
const generatePdfSlug = (text = "") =>
  String(text)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/ـ/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const pdfSlugsById = (items) => {
  const taken = new Set();
  const map = new Map();

  for (const item of items) {
    const base =
      generatePdfSlug(item.title) || generatePdfSlug(item.id) || item.id;
    let slug = base;
    if (taken.has(slug)) {
      slug = `${base}-${generatePdfSlug(item.id) || item.id}`;
    }
    taken.add(slug);
    map.set(item.id, slug);
  }

  return map;
};

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

const lexiconWithSlugs = lexicon.map((item) => {
  const base =
    generateSlug(item.term_ar) ||
    String(item.id);

  let slug = base;

  // ملاحظة: لازم هاد المنطق يبقى مطابق تماماً لـ uniqueLexiconSlug فـ
  // src/lib/utils/generateSlug.ts (base -> base-id)، لأن هادوك الدالة هي
  // اللي كتستعمل فـ TermPage.tsx / LexiconPage.tsx باش تبني الروابط اللي
  // كيشوفها الزائر. أي اختلاف بين الخوارزميتين كيولّد رابط كيأشر على صفحة
  // ماكاينش (404).
  if (usedLexiconSlugs.has(slug)) {
    slug = `${base}-${item.id}`;
  }

  // لا عشوائية هنا أبداً: لو تكرر base-id ثلاث مرات نستخدم لاحقاً عدّاداً
  // موحداً (…-2، …-3) حتى تبقى الروابط قابلة للاستنتاج من أي سكربت آخر
  // يتبع نفس الوصفة (sitemap، توليد الروابط داخل التطبيق).
  let suffix = 1;
  while (usedLexiconSlugs.has(slug)) {
    slug = `${base}-${item.id}-${++suffix}`;
  }

  usedLexiconSlugs.add(slug);

  return {
    ...item,
    slug,
  };
});

/* -------------------------------------------------------
   Entity identity
------------------------------------------------------- */

const publisherSchema = {
  "@type": "Organization",
  "@id": `${DOMAIN}/#organization`,
  name: "ميزان الرقمية",
  alternateName: ["Mizan Digital", "Mizan.page", "منصة الميزان الرقمية"],
  url: DOMAIN,
  logo: {
    "@type": "ImageObject",
    "@id": `${DOMAIN}/#logo`,
    url: `${DOMAIN}/logo-white-512.png`,
    contentUrl: `${DOMAIN}/logo-white-512.png`,
    width: 512,
    height: 512,
    caption: "ميزان الرقمية - شعار المنصة بخلفية بيضاء",
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
  users: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>`,
  star: `<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>`,
  scale: `<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>`,
  library: `<path d="m16 6 4 14"></path><path d="M12 6v14"></path><path d="M8 8v12"></path><path d="M4 4v16"></path>`,
  bookOpen: `<path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>`,
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
  ["الأخبار", "مباشر", ICON.cap, "bg-[#ec4899]", "مباشر"],
];

const homeHeroHtml = `
          <section class="relative bg-white dark:bg-[#0f172a] overflow-hidden">
            <div class="pointer-events-none hidden md:block absolute -top-24 left-1/2 -translate-x-1/2 size-[400px] rounded-full bg-[#dbeafe] dark:bg-[#1e3a5f]/10 blur-[50px]"></div>
            <div class="pointer-events-none hidden md:block absolute -bottom-24 -right-24 size-[200px] rounded-full bg-[#fef3c7] dark:bg-[#78350f]/5 blur-[40px]"></div>
            <div class="container relative mx-auto max-w-[800px] px-6 py-14 lg:py-20 flex flex-col items-center text-center">
              <h1 class="mt-6 flex flex-col gap-3 md:gap-4 text-[34px] md:text-[48px] font-black leading-[1.2] tracking-[-0.03em] text-[#0f172a] dark:text-white"><span>افتح إمكانياتك مع</span><span class="text-[#2563eb]">التعلم القانوني</span><span class="text-[20px] md:text-[24px] font-bold tracking-tight text-[#475569] dark:text-[#94a3b8] block">Online Learning</span></h1>
              <p class="mt-5 max-w-[560px] text-[14px] md:text-[15px] leading-7 text-[#475569] dark:text-[#94a3b8]">انطلق في رحلة من المعرفة والمهارة مع مواردنا الإلكترونية. سواء كنت تبحث عن اكتساب خبرات جديدة أو صقل مواهبك، منصتنا المتنوعة تقدم تجربة تعليمية مرنة وجذابة. تمكّن نفسك اليوم!</p>
              <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a href="/articles" class="inline-flex items-center gap-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-7 py-3 text-[14px] font-bold shadow-[0_4px_12px_rgba(37,99,235,0.2)] transition-colors">ابدأ الآن<span class="size-5 grid place-items-center rounded-full bg-white/20 text-[12px]">←</span></a>
                <a href="/quiz" class="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-7 py-3 text-[14px] font-bold text-[#0f172a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors">اختبر معرفتك القانونية<span class="size-5 grid place-items-center rounded-full bg-[#f1f5f9] dark:bg-[#334155] text-[12px]">←</span></a>
              </div>
              <div class="mt-7 flex items-center justify-center gap-4">
                <div class="flex -space-x-2 rtl:space-x-reverse">${[1, 2, 3, 4]
                  .map(
                    (i) =>
                      `\n                  <div class="size-8 rounded-full border-2 border-white dark:border-[#0f172a] bg-[#e2e8f0] dark:bg-[#334155] grid place-items-center text-[10px] font-bold text-[#475569] dark:text-white">${String.fromCharCode(64 + i)}</div>`
                  )
                  .join("")}
                </div>
                <div class="text-right">
                  <div class="font-black text-[12px] flex items-center gap-1 text-[#0f172a] dark:text-white">${svgIcon(ICON.users, "size-4 text-[#2563eb]", 16)}500+ طالب يثقون بنا</div>
                  <div class="text-[11px] text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1 justify-end">${svgIcon(ICON.star, "size-3 fill-[#f59e0b] text-[#f59e0b]", 12)}4.9 - محتوى أساسي مجاني</div>
                </div>
              </div>
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
   Home sections — تطابق DOM المعروض بعد تشغيل JavaScript

   تدقيق GEO لِـ AITDK قاس «Server-Rendered Content» فوجد أن ~49% من
   محتوى الرئيسية لا يظهر إلا بعد تشغيل JavaScript (يمسح AITDK النص
   الخام ويقارنه بنص الصفحة بعد الرندر). السبب أن HomePage.tsx يعرض
   أقساماً كاملة لم تكن موجودة في المتن المُهيَّأ: بطاقات المسارات،
   أحدث المقالات/الفعاليات، بطاقات القاموس، خطط الأسعار، «لماذا نحن»،
   شريط الإحصاءات، وقائمة الأسئلة الشائعة.

   المقاطع أدناه تُعيد بناء تلك الأقسام بنفس النصوص (ومن ملفات البيانات
   نفسها وقت البناء) حتى يجد أي زاحف بلا JavaScript الصفحة كاملة، وتصل
   نسبة «ما يراه الزاحف / ما يراه المستخدم» إلى ~100%. القواعد نفسها
   مستعملة: المقالات والفعاليات بلا صورة تُستبعد (كما يفعل React)،
   والقاموس يعرض أول 6 مصطلحات كما يفعل المدموج المحلي.

   كما تُضاف هنا إشارات GEO الثلاث التي أشار إليها التدقيق:
   - عناوين على شكل سؤال (Question-style headings) بعلامة الاستفهام
     العربية «؟» وكلمات استفهام عربية (ما / كيف / هل / كم / من).
   - بنية «الجواب أولاً»: كل مقطع يبدأ بجملة تعريفية مباشرة.
   - اقتباسات بعزو (blockquote + cite) وإحالات خارجية إلى مصادر رسمية
     مسماة — وهو ما يطلبه فحص Citations & Quotations.
------------------------------------------------------- */

// نفس خوارزمية src/lib/utils/diversify.ts (Round-robin بين التصنيفات)
// لتطابق اختيار «أحدث المقالات» مع ما سيعرضه React لنفس البيانات.
const diversifyByCategory = (items, limit) => {
  const sorted = [...items].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );
  const buckets = new Map();
  for (const item of sorted) {
    const key = item.category || "عام";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  const categories = Array.from(buckets.keys());
  const result = [];
  let cursor = 0;
  let safety = 0;
  const maxSafety = sorted.length * 2 + 10;
  while (result.length < limit && categories.length > 0 && safety < maxSafety) {
    const cat = categories[cursor % categories.length];
    const bucket = buckets.get(cat);
    if (bucket.length > 0) result.push(bucket.shift());
    cursor++;
    safety++;
    if (categories.every((c) => buckets.get(c).length === 0)) break;
  }
  return result;
};

// الأسئلة الخمسة المعروضة في أكورديون HomeFaqSection — يجب أن تبقى
// النصوص حرفياً كما في src/components/home/HomeFaqSection.tsx (مع
// نفس الأرقام) حتى تتطابق النسخة الثابتة مع المعروضة بعد React.
const homeFaqItems = [
  {
    question: "ماذا تقدم ميزان الرقمية؟",
    answer: `تجمع المنصة حالياً ${statistics.lexicon} مصطلحاً قانونياً، و${statistics.articles} مقالاً، إضافة إلى دليل يضم ${statistics.schools} كلية أو مؤسسة جامعية، بجانب الأخبار والندوات والمواد الدراسية. يتم تحديث هذه البيانات مع إضافة مواد جديدة.`,
  },
  {
    question: "كيف يمكن للطالب استخدام ميزان الرقمية؟",
    answer:
      "أفضل نقطة بداية هي تحديد نوع المعلومة التي تبحث عنها: استخدم القاموس للمصطلحات القانونية، والأرشيف للمواد الدراسية، والمقالات للمنهجية والتحليل، والأخبار للمستجدات، ودليل الكليات للحصول على معلومات المؤسسات الجامعية.",
  },
  {
    question: "ما هو القاموس القانوني في ميزان الرقمية؟",
    answer: `أداة بحث للمصطلحات القانونية تعرض المصطلح بالعربية والفرنسية مع تعريف مختصر، ويمكن أن يتضمن إحالات إلى مصادر أو نصوص قانونية مرتبطة بالمصطلح. يحتوي القاموس حالياً على ${statistics.lexicon} مصطلحاً.`,
  },
  {
    question: "ما هي مراحل الدراسة S1 إلى S6؟",
    answer:
      "يقسم الأرشيف الدراسي فـ ميزان الرقمية المواد إلى ستة فصول: S1 وS2 وS3 وS4 وS5 وS6، بما يساعد الطالب على الوصول إلى المواد وفق المرحلة الدراسية.",
  },
  {
    question: "ما هي مصادر المعلومات القانونية؟",
    answer:
      "يجب التعامل مع ميزان الرقمية باعتبارها منصة تعليمية وبحثية، وليس بديلاً عن النص القانوني الرسمي. عند دراسة قاعدة قانونية، يُنصح بالرجوع إلى الجريدة الرسمية والنص التشريعي الرسمي والمصادر الجامعية أو المؤسساتية ذات الصلة.",
  },
];

// أسئلة متن الصفحة التعريفي (كانت تُحقن سابقاً عبر AEOHead في المتصفح
// فقط، فلم يكن يراها الزاحف). صارت أقساماً ظاهرة أدناه وتدخل مخطط
// FAQPage الثابت — أسئلتها فريدة ولا تتكرر مع أسئلة الأكورديون.
const homeArticleQuestions = [
  {
    question: "ما هي منصة ميزان الرقمية؟",
    answer: `ميزان الرقمية منصة مغربية تعليمية لطلبة القانون، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك ميزان برو، تضم ملخصات S1-S6، وقاموساً قانونياً يضم ${statistics.lexicon} مصطلحاً عربي-فرنسي، ودليل ${statistics.schools} كلية حقوق وعلوم قانونية واقتصادية FSJES، ومقالات، وأخباراً تشريعية واختبارات QCM.`,
  },
  {
    question: "هل المحتوى مجاني؟",
    answer:
      "المحتوى الأساسي مجاني دون تسجيل: القاموس القانوني، وملخصات الأرشيف S1-S6، ودليل الكليات، والمقالات، والأخبار. المزايا المتقدمة مؤدّاة عبر اشتراك ميزان برو (49 درهماً شهرياً أو 399 درهماً سنوياً) أو عبر حزم الكريدتس.",
  },
  {
    question: "كم عدد كليات الحقوق في الدليل؟",
    answer: `دليل ميزان الرقمية يضم ${statistics.schools} كلية حقوق وعلوم قانونية واقتصادية FSJES بالمغرب: الرباط، الدار البيضاء، مراكش، فاس، طنجة، أكادير، وجدة، مكناس وغيرها.`,
  },
  {
    // نفس الفقرة الظاهرة في قسم «المصادر والتحقق» في HomePage.tsx
    // حرفياً (الجملتان)، حتى تتطابق أجوبة المخطط مع النص على الجانبين.
    question: "كيف تتحقق من المعلومة القانونية قبل الاستشهاد؟",
    answer:
      "المرجع النهائي لأي معلومة قانونية هو النص الرسمي المنشور في الجريدة الرسمية. محتوى ميزان الرقمية تعليمي يشرح وينظم المعلومة، وأما القاعدة القانونية الملزمة فتُقرأ من المصدر الرسمي أدناه قبل أي استشهاد.",
  },
];

// مخطط FAQPage الثابت — «Content Schema» في تدقيق AITDK. يلحق بعنوان
// الصفحة عبر page.extraSchema (يُحقن في <head> قبل </head>) فيظهر في
// HTML الخام قبل أي JavaScript. أسئلته التسعة فريدة وأجوبتها ظاهرة
// نصاً في الصفحة (الأكورديون أدناه + أقسام المتن)، كما تشترط Google.
const homeFaqPageSchema = {
  "@type": "FAQPage",
  "@id": `${DOMAIN}/#faq`,
  isPartOf: { "@id": `${DOMAIN}/#webpage` },
  inLanguage: "ar-MA",
  mainEntity: [...homeFaqItems, ...homeArticleQuestions].map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

// مصادر رسمية خارجية مُسمّاة — نصفَي فحص «Citations & Quotations»:
// إحالات خارجية إلى مراجع حكومية (الروابط) + اقتباسات بعزو (أدناه).
const homeOfficialSources = [
  {
    name: "بوابة عدالة — وزارة العدل المغربية",
    url: "https://adala.justice.gov.ma/",
    note: "مرجع رسمي للبحث في التشريع والمعلومة القانونية المغربية.",
  },
  {
    name: "الأمانة العامة للحكومة المغربية",
    url: "https://www.sgg.gov.ma/",
    note: "المصدر الرسمي المرتبط بالنصوص القانونية والجريدة الرسمية.",
  },
  {
    name: "الجريدة الرسمية المغربية",
    url: "https://www.sgg.gov.ma/arabe/JournalOfficiel.aspx",
    note: "التحقق من النشر الرسمي للنصوص القانونية وتواريخ دخولها حيز التنفيذ.",
  },
  {
    name: "وزارة التعليم العالي والبحث العلمي والابتكار",
    url: "https://www.enssup.gov.ma/",
    note: "مرجع مؤسساتي للمعلومات المرتبطة بالتعليم العالي في المغرب.",
  },
];

// اقتباسان قانونيان موثّقان بعزو واضح داخل <cite>.
const homeLegalQuotes = [
  {
    text: "كل فعل ارتكبه الإنسان عن بينة واختيار، ومن غير أن يسمح به القانون، فأحدث ضررا ماديا أو معنويا للغير، ألزم مرتكبه بتعويض هذا الضرر، إذا ثبت أن ذلك الفعل هو السبب المباشر في حصوله.",
    cite: "الفصل 77 من قانون الالتزامات والعقود المغربي (ظهير 12 غشت 1913)",
  },
  {
    text: "الزواج ميثاق تراض وترابط شرعي بين رجل وامرأة على وجه الدوام، غايته الإحكام والاستقرار، تحت إشراف الزوجين، وفق أحكام هذه المدونة.",
    cite: "المادة 4 من مدونة الأسرة (القانون رقم 70.03)",
  },
];

// اختيارات «الرئيسية» المعروضة في React، من ملفات البيانات نفسها:
const homeArticleCards = diversifyByCategory(
  articles
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      summary: item.excerpt,
      category: item.category,
      date: item.publishedAt,
      image: item.coverImage || item.image,
    }))
    .filter((a) => !!a.image && String(a.image).trim() !== ""),
  8
).slice(0, 4);

const homeEventCards = events
  .map((e) => ({
    id: e.id,
    slug: e.slug || e.id,
    title: e.title,
    excerpt: e.excerpt,
    city: e.city,
    date: e.eventDate || e.date,
    image: e.image,
    organizer: e.organizer,
  }))
  .filter((e) => !!e.image && String(e.image).trim() !== "")
  .slice(0, 4);

const homeLexiconTerms = lexicon.slice(0, 6);
const homeFeaturedTerm = homeLexiconTerms[0];
const homeLexiconGrid = homeLexiconTerms.slice(1);

const countTermRefs = (term) =>
  (term.legal_sources || []).reduce(
    (acc, source) => acc + (source.articles?.length || 0),
    0
  );

const homeEventDate = (value) => {
  try {
    return new Date(value).toLocaleDateString("ar-MA");
  } catch {
    return value;
  }
};

// المركزة الأولى من أقسام «الرئيسية» المعروضة: المسارات + أحدث المحتوى
// (المقالات/الفعاليات/القاموس) داخل section واحد كما في HomePage.tsx.
// homePathwaysHtml متن داخلي فقط — الغلاف يُضاف في staticBody أدناه.
const homePathwaysHtml = `
            <div class="text-center mb-8">
              <h2 class="text-[24px] md:text-[28px] font-black text-[#0f172a] dark:text-white">استكشف مساراتنا المميزة</h2>
              <p class="mt-2 text-[13px] text-[#64748b] max-w-[600px] mx-auto">منصة متكاملة بتصميم عصري نظيف — كل ما يحتاجه طالب القانون في مكان واحد</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">${[
              { title: "القاموس القانوني", desc: "250 مصطلح عربي-فرنسي", count: String(statistics.lexicon), href: "/lexicon" },
              { title: "الأرشيف الدراسي", desc: "ملخصات S1 إلى S6", count: "S1-S6", href: "/archive" },
              { title: "المقالات القانونية", desc: `${statistics.articles} مقال تحليلي`, count: String(statistics.articles), href: "/articles" },
              { title: "الأخبار", desc: "مستجدات تشريعية", count: "مباشر", href: "/news" },
            ]
              .map(
                (card) => `
              <a href="${card.href}" class="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border rounded-full px-2 py-1">${card.count}</span>
                </div>
                <h3 class="mt-4 font-black text-[15px] text-[#0f172a] dark:text-white">${card.title}</h3>
                <p class="mt-1 text-[12px] text-[#64748b] dark:text-[#94a3b8]">${card.desc}</p>
              </a>`
              )
              .join("")}
            </div>`;

// يعرض React ترويسة «أحدث المقالات» دائماً (حتى بلا بطاقات)، فنبقيها
// في المتن الثابت أيضاً، وتُضاف البطاقات فقط لما تتوفّر صورتها.
const homeArticlesHtml = `
          <div class="mt-12">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-black text-[16px] text-[#0f172a] dark:text-white">أحدث المقالات</h3>
              <a href="/articles" class="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل ←</a>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">${homeArticleCards
              .map(
                (item) => `
              <a href="/articles/${escapeHtml(item.slug)}" class="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden flex flex-col">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" class="w-full object-cover" width="320" height="120">
                <div class="p-4 flex flex-col flex-1">
                  <span class="text-[9px] font-bold text-[#2563eb]">${escapeHtml(item.category || "قانون")}</span>
                  <h4 class="font-bold text-[14px] leading-snug text-[#0f172a] dark:text-white">${escapeHtml(item.title)}</h4>
                  <p class="mt-2 text-[12px] leading-5 text-[#64748b] dark:text-[#94a3b8] flex-1">${escapeHtml(item.summary)}</p>
                  <p class="mt-3 text-[10px] text-[#64748b] dark:text-[#94a3b8] border-t border-[#f1f5f9] dark:border-[#334155] pt-3">5 دقائق - ميزان الرقمية</p>
                </div>
              </a>`
              )
              .join("")}
            </div>
          </div>`;

const homeEventsHtml =
  homeEventCards.length > 0
    ? `
          <div class="mt-12">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-black text-[16px] text-[#0f172a] dark:text-white">الفعاليات والندوات</h3>
              <a href="/events" class="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل ←</a>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">${homeEventCards
              .map(
                (ev) => `
              <a href="/events/${escapeHtml(ev.slug)}" class="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden flex flex-col">
                <img src="${escapeHtml(ev.image)}" alt="${escapeHtml(ev.title)}" loading="lazy" class="w-full object-cover" width="320" height="130">
                <div class="p-4 flex flex-col flex-1">
                  <span class="text-[9px] font-bold text-[#f59e0b]">ندوة</span>
                  ${ev.date ? `<p class="text-[10px] text-[#64748b]">${escapeHtml(homeEventDate(ev.date))}</p>` : ""}
                  <h4 class="font-bold text-[13.5px] leading-snug text-[#0f172a] dark:text-white">${escapeHtml(ev.title)}</h4>
                  <p class="mt-2 text-[11.5px] leading-5 text-[#64748b] dark:text-[#94a3b8] flex-1">${escapeHtml(ev.excerpt)}</p>
                  <p class="mt-3 text-[10px] text-[#64748b] dark:text-[#94a3b8] border-t border-[#f1f5f9] dark:border-[#334155] pt-3">${[ev.city, ev.organizer ? String(ev.organizer).slice(0, 20) : null].filter(Boolean).map(escapeHtml).join(" - ")}</p>
                </div>
              </a>`
              )
              .join("")}
            </div>
          </div>`
    : "";

const homeLexiconHtml =
  homeLexiconTerms.length > 0
    ? `
          <div class="mt-12">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-black text-[16px] text-[#0f172a] dark:text-white">القاموس القانوني — مع الشجرة القانونية</h3>
              <a href="/lexicon" class="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل ←</a>
            </div>
            ${
              homeFeaturedTerm && (homeFeaturedTerm.legal_sources || []).length > 0
                ? `
            <div class="mb-6 rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 overflow-hidden">
              <h4 class="font-black text-[16px] text-[#0f172a] dark:text-white">${escapeHtml(homeFeaturedTerm.term_ar)}${homeFeaturedTerm.term_fr ? ` <span class="text-[11px] text-muted-foreground font-mono">(${escapeHtml(homeFeaturedTerm.term_fr)})</span>` : ""}</h4>
              <p class="mt-2 text-[12.5px] leading-6 text-[#475569] dark:text-[#94a3b8] max-w-2xl">${escapeHtml(homeFeaturedTerm.definition)}</p>
              <p class="mt-2 text-[10px] font-bold text-[#2563eb]">شجرة قانونية: ${(homeFeaturedTerm.legal_sources || []).length} مصادر - ${countTermRefs(homeFeaturedTerm)} فصول</p>
              <ul class="mt-2 text-[11px] text-[#64748b] list-disc pr-5">${(homeFeaturedTerm.legal_sources || [])
                .map(
                  (source) => `
                <li>${escapeHtml(source.code_ar || source.code_short || "تشريع مغربي")}${source.code_fr ? ` (${escapeHtml(source.code_fr)})` : ""} — المواد: ${(source.articles || [])
                    .map((article) => escapeHtml(article.number))
                    .join("، ")}</li>`
                )
                .join("")}
              </ul>
              <a href="/lexicon/${escapeHtml(generateSlug(homeFeaturedTerm.term_ar))}" class="inline-block mt-3 rounded-full bg-[#2563eb] text-white px-4 py-2 text-[11px] font-bold">التفاصيل ←</a>
            </div>`
                : ""
            }
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${homeLexiconGrid
              .map(
                (term) => `
              <a href="/lexicon/${escapeHtml(generateSlug(term.term_ar))}" class="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl p-4 flex flex-col">
                <div class="flex items-start justify-between gap-2">
                  <h4 class="font-bold text-[13px] text-[#0f172a] dark:text-white">${escapeHtml(term.term_ar)}${term.term_fr ? ` <span class="text-[10px] text-muted-foreground font-mono">${escapeHtml(term.term_fr)}</span>` : ""}</h4>
                  <span class="text-[9px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border rounded-full px-2 py-1 shrink-0">${escapeHtml(term.category)}</span>
                </div>
                <p class="mt-3 text-[11.5px] leading-5 text-[#64748b] dark:text-[#94a3b8] flex-1">${escapeHtml(term.definition)}</p>
                ${
                  (term.legal_sources || []).length > 0
                    ? `<p class="mt-3 text-[10px] text-[#2563eb] font-bold border-t border-[#f1f5f9] dark:border-[#334155] pt-3">${(term.legal_sources || []).length} مصادر قانونية - ${countTermRefs(term)} فصول مرتبطة</p>`
                    : ""
                }
              </a>`
              )
              .join("")}
            </div>
          </div>`
    : "";

const homePricingHtml = `
          <section class="py-14 bg-white dark:bg-[#0f172a] border-y border-[#f1f5f9] dark:border-[#1e293b]">
            <div class="container relative mx-auto max-w-[1280px] px-6">
              <div class="text-center max-w-[640px] mx-auto">
                <span class="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-3 py-1 text-[11px] font-black text-[#2563eb] dark:text-[#60a5fa]">الأسعار - خطط مرنة</span>
                <h2 class="mt-4 text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">خطط تناسب كل طالب قانون</h2>
                <p class="mt-3 text-[13px] leading-6 text-[#64748b] dark:text-[#94a3b8]">ميزان برو يمول المحتوى المجاني. كل اشتراك يدعم استمرار الأرشيف والاختبارات للجميع.</p>
              </div>
              <div class="mt-10 grid md:grid-cols-3 gap-5 max-w-[1000px] mx-auto items-start">
                <div class="rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-6">
                  <h3 class="font-black text-[14px] text-[#0f172a] dark:text-white">المجاني</h3>
                  <p class="text-[11px] text-[#64748b]">للجميع - للأبد</p>
                  <p class="mt-5"><span class="text-[28px] font-black text-[#0f172a] dark:text-white">0</span><span class="text-[13px] font-bold text-[#64748b]"> د.م / للأبد</span></p>
                  <ul class="mt-5 space-y-2.5">
                    <li class="text-[12px] text-[#334155] dark:text-[#cbd5e1]">الوصول للأرشيف S1-S6</li>
                    <li class="text-[12px] text-[#334155] dark:text-[#cbd5e1]">القاموس 250 مصطلح</li>
                    <li class="text-[12px] text-[#334155] dark:text-[#cbd5e1]">المقالات المجانية</li>
                    <li class="text-[12px] text-[#334155] dark:text-[#cbd5e1]">الاختبارات الأساسية</li>
                    <li class="text-[12px] text-[#334155] dark:text-[#cbd5e1]">دليل الكليات ${statistics.schools} كلية</li>
                  </ul>
                  <a href="/articles" class="mt-6 flex w-full items-center justify-center gap-2 rounded-full border bg-white dark:bg-[#0f172a] py-3 text-[13px] font-bold">ابدأ مجاناً ←</a>
                </div>
                <div class="rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-6">
                  <h3 class="font-black text-[14px] text-[#0f172a] dark:text-white">شهري</h3>
                  <p class="text-[11px] text-[#64748b]">500 كريدتس</p>
                  <p class="mt-5"><span class="text-[28px] font-black">49</span><span class="text-[13px] font-bold text-[#64748b]"> د.م / شهر</span></p>
                  <ul class="mt-5 space-y-2.5">
                    <li class="text-[12px]">شجرة القوانين المتقدمة</li>
                    <li class="text-[12px]">تحديات مميزة</li>
                    <li class="text-[12px]">دعم أولوية</li>
                    <li class="text-[12px]">كل مزايا المجاني</li>
                  </ul>
                  <a href="/pricing" class="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#0f172a] dark:bg-white text-white dark:text-black py-3 text-[13px] font-bold">اختر الشهري ←</a>
                </div>
                <div class="rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-6">
                  <span class="inline-block mb-3 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold text-foreground">الأفضل قيمة — خصم 32%</span>
                  <h3 class="font-black text-[14px] text-foreground">سنوي</h3>
                  <p class="text-[11px] text-muted-foreground">7000 + 1000 هدية</p>
                  <p class="mt-5"><span class="text-[28px] font-black text-foreground">399</span><span class="text-[13px] font-bold text-muted-foreground"> د.م / سنة</span></p>
                  <p class="mt-1 text-[11px] text-muted-foreground font-bold">1000 كريدتس هدية + خصم 32%</p>
                  <ul class="mt-5 space-y-2.5">
                    <li class="text-[12px] text-foreground">كل مزايا الشهري</li>
                    <li class="text-[12px] text-foreground">خصم 32% عن الشهري</li>
                    <li class="text-[12px] text-foreground">1000 كريدتس هدية</li>
                    <li class="text-[12px] text-foreground">شهادة توصية</li>
                    <li class="text-[12px] text-foreground">شارات حصرية</li>
                  </ul>
                  <a href="/pricing" class="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] text-white py-3 text-[13px] font-bold">اختر السنوي ←</a>
                </div>
              </div>
            </div>
          </section>`;

const homeWhyUsHtml = `
          <section class="py-14 bg-[#f8fafc] dark:bg-[#0f172a]/50 border-y border-[#f1f5f9] dark:border-[#1e293b]">
            <div class="container mx-auto max-w-[1280px] px-6">
              <div class="max-w-[900px] mx-auto">
                <div class="text-center max-w-[640px] mx-auto mb-10">
                  <span class="inline-block text-[11px] font-black tracking-[0.15em] text-[#2563eb] uppercase bg-[#eff6ff] dark:bg-[#1e293b] border rounded-full px-3 py-1">لماذا نحن</span>
                  <h2 class="mt-4 text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">اكتشف المزايا المميزة لمنصتنا التعليمية القانونية</h2>
                </div>
                <div class="grid sm:grid-cols-2 gap-4">${[
                  ["مسارات متنوعة", "استكشف مجموعة متنوعة من المسارات التعليمية المصممة لتناسب اهتماماتك."],
                  ["أساتذة خبراء", "تعلم من خبراء وأساتذة متخصصين ملتزمين بنجاحك التعليمي."],
                  ["جدول مرن", "استمتع بمرونة التعلم عبر الإنترنت مع خيارات جدولة مرنة."],
                  ["دعم مستمر", "احصل على دعم مستمر ووصول إلى موارد إضافية لرحلة غنية."],
                ]
                  .map(
                    ([title, desc]) => `
                  <div class="rounded-2xl border bg-white dark:bg-[#1e293b] p-5">
                    <h3 class="font-black text-[13px]">${title}</h3>
                    <p class="mt-1 text-[11px] leading-5 text-[#64748b] dark:text-[#94a3b8]">${desc}</p>
                  </div>`
                  )
                  .join("")}
                </div>
              </div>
            </div>
          </section>`;

const homeStatsBandHtml = `
          <section class="py-10 bg-[#2563eb] dark:bg-[#1e40af] text-white relative">
            <div class="container mx-auto max-w-[1280px] px-6 relative">
              <div class="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">${[
                ["500+", "طالب مستفيد"],
                ["250+", "مصطلح قانوني"],
                [`${statistics.articles}+`, "مقال قانوني"],
                [`${statistics.schools}+`, "كلية جامعية"],
                ["100%", "مجاني"],
              ]
                .map(
                  ([value, label]) => `
                <div>
                  <div class="text-[24px] font-black">${value}</div>
                  <div class="text-[11px] opacity-80 font-bold mt-1">${label}</div>
                </div>`
                )
                .join("")}
              </div>
            </div>
          </section>`;

// مرآة حرفية لقسم «المصادر والتحقق» الذي يعرضه HomePage.tsx بعد شريط
// الإحصاءات. وجود النص نفسه على الجانبين (الخام وما بعد React) هو ما
// يجعل نسبة Server-Rendered Content ≈ 100% بدل 49%، ويغطي فحص
// «Citations & Quotations» (اقتباس بعزو + مصادر خارجية مسماة) على
// الجانبين أيضاً.
const homeVerifyHtml = `
          <section class="py-14 bg-white dark:bg-[#0f172a] border-t border-[#f1f5f9] dark:border-[#1e293b]" aria-labelledby="home-verify-heading">
            <div class="container mx-auto max-w-[800px] px-6">
              <div class="text-center max-w-[640px] mx-auto mb-8">
                <span class="inline-flex items-center gap-2 rounded-full bg-[#dcfce7] border border-[#bbf7d0] px-3 py-1 text-[11px] font-black text-[#16a34a]">المصادر والتحقق</span>
                <h2 id="home-verify-heading" class="mt-4 text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">كيف تتحقق من المعلومة القانونية قبل الاستشهاد؟</h2>
                <p class="mt-3 text-[13px] leading-6 text-[#64748b] dark:text-[#94a3b8]"><strong class="text-[#0f172a] dark:text-white">المرجع النهائي لأي معلومة قانونية هو النص الرسمي المنشور في الجريدة الرسمية</strong>. محتوى ميزان الرقمية تعليمي يشرح وينظم المعلومة، وأما القاعدة القانونية الملزمة فتُقرأ من المصدر الرسمي أدناه قبل أي استشهاد.</p>
              </div>
              <blockquote cite="https://adala.justice.gov.ma/" class="rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#1e293b] p-5">
                <p class="text-[13px] leading-6 font-bold text-[#0f172a] dark:text-white">«كل فعل ارتكبه الإنسان عن بينة واختيار، ومن غير أن يسمح به القانون، فأحدث ضررا ماديا أو معنويا للغير، ألزم مرتكبه بتعويض هذا الضرر، إذا ثبت أن ذلك الفعل هو السبب المباشر في حصوله»</p>
                <footer class="mt-2 text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8]">— <cite class="not-italic">الفصل 77 من قانون الالتزامات والعقود المغربي (ظهير 12 غشت 1913)</cite></footer>
              </blockquote>
              <ul class="mt-6 grid sm:grid-cols-2 gap-3" aria-label="مصادر رسمية للتحقق من القانون المغربي">${homeOfficialSources
                .map(
                  (source) => `
                <li><a href="${source.url}" target="_blank" rel="noopener noreferrer external" class="flex h-full flex-col gap-1 rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4"><span class="flex items-center gap-1.5 text-[12.5px] font-bold text-[#0f172a] dark:text-white">${source.name}</span><span class="text-[11px] text-[#64748b] dark:text-[#94a3b8]">${source.note}</span></a></li>`
                )
                .join("")}
              </ul>
            </div>
          </section>`;

// مرآة ثابتة لأكورديون الأسئلة الشائعة: نفس العناوين والأجوبة حرفياً
// (الأرقام من بيانات البناء نفسها). هنا الأسئلة <h3> حقيقية في HTML
// الخام، وفي نسخة React صارت الأسئلة أيضاً <h3> تحمل الزر (انظر
// HomeFaqSection) — فيفلح فحص «Question-Style Headings» على الجانبين.
const homeTotalFaqCount = (faqGroups ?? []).reduce(
  (total, group) => total + (group.items?.length ?? 0),
  0
);

const homeFaqHtml = `
          <section class="py-16 border-t border-border" aria-labelledby="home-faq-heading">
            <div class="container mx-auto max-w-3xl px-4">
              <div class="mb-10 text-center">
                <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">الأسئلة الشائعة</div>
                <h2 id="home-faq-heading" class="text-2xl font-black text-foreground sm:text-3xl">كل ما تحتاج معرفته عن المنصة</h2>
              </div>
              <div class="space-y-3">${homeFaqItems
                .map(
                  (faq) => `
                <div class="rounded-2xl border border-border bg-card overflow-hidden">
                  <h3 class="px-5 pt-4 text-sm font-bold text-foreground">${escapeHtml(faq.question)}</h3>
                  <p class="px-5 pt-2 pb-4 text-xs leading-relaxed text-muted-foreground">${escapeHtml(faq.answer)}</p>
                </div>`
                )
                .join("")}
              </div>
              <div class="mt-8 text-center">
                <a href="/faq" class="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-6 py-3 text-[13px] font-bold text-primary">المزيد من الأسئلة والأجوبة ←</a>
                <p class="mt-3 text-[11.5px] font-semibold leading-relaxed text-muted-foreground">${homeTotalFaqCount} سؤالاً في ${(faqGroups ?? []).length} مواضيع: ${faqTopics.join("، ")}</p>
              </div>
            </div>
          </section>`;

/* -------------------------------------------------------
   Static pages
------------------------------------------------------- */

const pages = [
  {
    path: "/",
    title: "ميزان الرقمية | ملخصات قانون S1-S6 وقاموس قانوني للطلبة المغاربة",

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
      about: {
        "@id": `${DOMAIN}/#organization`,
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

    // FAQPage — مخطط «محتوى» ظاهر سؤالاً وجواباً في الصفحة نفسها:
    // التدقيق وجد WebPage/Organization فقط واعتبر غياب مخطط محتوى
    // (Article/FAQPage/HowTo) تنبيهًا Content Schema. الأسئلة التسعة
    // ظاهرة نصًا في هذه الصفحة (الأكورديون + أقسام المتن أدناه).
    extraSchema: [homeFaqPageSchema],

    staticBody: `
      <div class="min-h-screen bg-background text-foreground">${homeHeaderHtml}
        <main class="min-h-screen bg-white dark:bg-[#0f172a] text-foreground" dir="rtl" lang="ar-MA">${homeHeroHtml}

        <!-- نفس ترتيب أقسام HomePage.tsx: غلاف واحد للمسارات وأحدث المحتوى -->
        <section class="py-14 bg-[#f8fafc] dark:bg-[#0f172a]">
          <div class="container mx-auto max-w-[1280px] px-6">${homePathwaysHtml}${homeArticlesHtml}${homeEventsHtml}${homeLexiconHtml}
          </div>
        </section>

        ${homePricingHtml}

        ${homeWhyUsHtml}

        ${homeStatsBandHtml}

        ${homeVerifyHtml}

        ${homeFaqHtml}

        <section class="bg-white dark:bg-[#0f172a] py-14 border-t border-[#f1f5f9] dark:border-[#1e293b]">
        <article class="container mx-auto max-w-[800px] px-6 text-[14px] leading-7 text-[#475569] dark:text-[#94a3b8]">

          <h2 class="text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">ميزان الرقمية — المعرفة القانونية للطلبة بالمغرب</h2>

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
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">${homeArticleQuestions[0].question}</h3>

            <p>
              <strong>ميزان الرقمية منصة مغربية تعليمية لطلبة القانون، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك ميزان برو.</strong>
              تضم ملخصات S1-S6، وقاموساً قانونياً يضم
              <strong>${statistics.lexicon} مصطلحاً عربي-فرنسي</strong>،
              ودليل <strong>${statistics.schools} كلية حقوق</strong>
              وعلوم قانونية واقتصادية FSJES، ومقالات، وأخباراً تشريعية واختبارات QCM.
            </p>
          </section>

          <section class="mt-10">
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">ماذا تقدم ميزان الرقمية؟</h3>

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

          <section class="mt-10">
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">${homeArticleQuestions[1].question}</h3>

            <p>
              <strong>المحتوى الأساسي مجاني دون تسجيل:</strong>
              القاموس القانوني، وملخصات الأرشيف S1-S6، ودليل الكليات،
              والمقالات، والأخبار. المزايا المتقدمة مؤدّاة عبر اشتراك
              ميزان برو (49 درهماً شهرياً أو 399 درهماً سنوياً) أو عبر
              حزم الكريدتس.
            </p>
          </section>

          <section class="mt-10">
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">كيف يمكن للطالب استخدام ميزان الرقمية؟</h3>

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
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">ما هو القاموس القانوني في ميزان الرقمية؟</h3>

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
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">ما هي مراحل الدراسة S1 إلى S6؟</h3>

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
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">${homeArticleQuestions[2].question}</h3>

            <p>
              <strong>دليل ميزان الرقمية يضم ${statistics.schools} كلية حقوق وعلوم قانونية واقتصادية FSJES بالمغرب.</strong>
              منها: الرباط، الدار البيضاء، مراكش، فاس، طنجة، أكادير، وجدة،
              مكناس وغيرها.
            </p>

            <p>
              يعرض الملف التعريفي لكل كلية الجامعة التابعة لها ومدينتها
              وروابطها الرسمية، مع ضرورة التحقق من مواعيد التسجيل والامتحانات
              من الموقع الرسمي للمؤسسة.
            </p>

            <p>
              <a href="/schools">
                تصفح دليل كليات الحقوق بالمغرب
              </a>
            </p>
          </section>

          <section class="mt-10">
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">ما هي مصادر المعلومات القانونية؟</h3>

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

            <p>
              ومثال على قراءة القاعدة من نصها الرسمي بدل نقولات عنه،
              تنص مدونة الأسرة على أن:
            </p>

            <blockquote cite="https://adala.justice.gov.ma/">
              <p>«${homeLegalQuotes[1].text}»</p>
              <footer>— <cite>${homeLegalQuotes[1].cite}</cite></footer>
            </blockquote>
          </section>

          <section class="mt-10">
            <h3 class="text-[20px] font-black text-[#0f172a] dark:text-white">من يقف وراء ميزان الرقمية؟</h3>

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
      "أرشيف دراسي لطلبة الحقوق بالمغرب مصنف حسب الفصول S1 إلى S6 يجمع الامتحانات والملخصات والمحاضرات مع مصادرها.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          ${breadcrumbNavHtml([
            { name: "الرئيسية", path: "/" },
            { name: "الأرشيف الدراسي", path: "/archive" },
          ])}
          <h1>الأرشيف الدراسي لطلبة الحقوق</h1>

          <p>
            <strong>
              الأرشيف الدراسي هو القسم المخصص لدروس القانون للطلبة، ويتيح الوصول إلى المواد التعليمية
              حسب الفصول الجامعية من S1 إلى S6.
            </strong>
          </p>

          <h2>ما هي فصول الأرشيف الدراسي؟</h2>

          <ul>
            ${(["S1", "S2", "S3", "S4", "S5", "S6"])
              .map(
                (sem) => `
            <li>
              <a href="/${sem.toLowerCase()}">${sem} — ${SEMESTER_LABELS[sem]}</a>
              (${documents.filter((d) => (d.semester || "").toUpperCase() === sem).length} وثيقة منشورة)
            </li>`
              )
              .join("\n")}
          </ul>

          <h2>ما آخر الوثائق المضافة إلى الأرشيف؟</h2>

          <ul>
            ${documents
              .slice(0, 9)
              .map(
                (doc) => `
            <li>
              <a href="/${(doc.semester || "").toLowerCase()}">${escapeHtml(
                doc.title
              )}</a>
              — مقرر ${escapeHtml(doc.module || "")} (${escapeHtml(
                doc.semester || ""
              )})، ${escapeHtml(doc.professor || "فريق الأرشيف")}.
            </li>`
              )
              .join("\n")}
          </ul>

          <h2>كيف أتحقق من وثائق الأرشيف قبل اعتمادها؟</h2>

          <p>
            تجمع وثائق الأرشيف الامتحانات السابقة والملخصات ونماذج الأجوبة
            المنشورة لدعم المذاكرة. بعض النماذج تعود لمواسم جامعية مختلفة،
            لذلك نقترح مطابقة النموذج مع برنامج المقرر الحالي قبل الاعتماد
            عليه، واستخدام <a href="/quiz">اختبارات تقويم الفهم</a> لقياس
            مدى استيعاب المادة بعد المذاكرة.
          </p>

          ${exploreNavHtml}
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
          ${breadcrumbNavHtml([
            { name: "الرئيسية", path: "/" },
            { name: "المقالات القانونية", path: "/articles" },
          ])}
          <h1>المقالات القانونية والمنهجية</h1>

          <p>
            <strong>
              هذا القسم يجمع مقالات شرح القانون المغربي والمنهجيات التي تساعد الطالب
              على فهم وتحليل الموضوعات القانونية.
            </strong>
          </p>

          <h2>ماذا ستجد في المقالات؟</h2>

          <p>
            تتناول مقالات ميزان الرقمية ثلاثة أنواع من المحتوى: مقالات
            التأسيس القانوني التي تشرح المفاهيم والنصوص الأساسية للنظام
            القانوني المغربي، ومقالات المنهجية الجامعية التي تبين كيف تُكتب
            البحوث والتعليقات على الأحكام واستراتيجيات المراجعة، ومقالات
            الرسائل الإخبارية للنظام التي تقرب السياق التعليمي والأكاديمي
            لطلبة كليات الحقوق بالمغرب.
          </p>

          <h2>${questionHeading("هي آخر المقالات القانونية المنشورة")}</h2>

          <ul>
            ${articles
              .map(
                (item) => `
            <li>
              <a href="/articles/${escapeHtml(
                item.slug || generateSlug(item.title) || String(item.id)
              )}">${escapeHtml(item.title)}</a>
              — ${escapeHtml(item.excerpt || item.description || "")}
            </li>`
              )
              .join("\n")}
          </ul>

          <h2>كيف نكتب مقالاتنا القانونية؟</h2>

          <p>
            تُبنى المقالة على صيغة «تساؤل ثم إجابة» مع مقاربة تربوية: نتعرف
            على المفهوم، ثم نحدد الأساس القانوني أو المنهجي، ثم نعطي أمثلة
            عملية من السياق المغربي، ونختم بخلاصة تنقل القارئ إلى وثيقة أو
            اختبار يساعده على تثبيت المعلومة داخل المنصة.
          </p>

          ${exploreNavHtml}
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
          ${breadcrumbNavHtml([
            { name: "الرئيسية", path: "/" },
            { name: "الأخبار والمستجدات", path: "/news" },
          ])}
          <h1>الأخبار والمستجدات التشريعية والقضائية</h1>

          <p>
            <strong>
              يقدم هذا القسم أخباراً ومستجدات مرتبطة بالمجال القانوني
              والتعليم الجامعي والأنشطة الأكاديمية.
            </strong>
          </p>

          <h2>${questionHeading("هي آخر المستجدات القانونية المنشورة")}</h2>

          <ul>
            ${news
              .map(
                (item) => `
            <li>
              <a href="/news/${escapeHtml(
                item.slug || generateSlug(item.title) || String(item.id)
              )}">${escapeHtml(item.title)}</a>
              ${item.publishedAt ? `<time datetime="${escapeHtml(
                safeDate(item.publishedAt)
              )}"></time>` : ""}
              — ${escapeHtml(item.summary || item.excerpt || "")}
            </li>`
              )
              .join("\n")}
          </ul>

          <h2>لماذا متابعة الأخبار القانونية؟</h2>

          <p>
            تساعد متابعة المستجدات الطالب على ربط المعرفة النظرية
            بالتطورات التشريعية والقضائية والأكاديمية. تشمل التغطية البيانات
            الرسمية عند صدور قوانين جديدة، وإعلانات المؤسسات الجامعية،
            والمناسبات التشريعية الهامة مثل دخول نصوص جديدة حيز التنفيذ،
            مع إحالة دائمة إلى النص الرسمي في المصادر المعتمدة للتثبت.
          </p>

          <h2>ما الفرق بين الخبر الصحفي والنص القانوني الرسمي؟</h2>

          <p>
            الخبر في ميزان الرقمية خدمة إخبارية للمتابعة والتوجيه، أما
            الأساس القانوني فهو دائماً النص المنشور في الجريدة الرسمية أو
            المواقع المؤسساتية الرسمية. لذلك تجد معظم الأخبار روابط مرجعية
            إلى مصدرها، وتبقى استشارة المصدر الرسمي خطوة لازمة قبل استعمال
            أي معلومة تشريعية.
          </p>

          ${exploreNavHtml}
        </article>
      </main>
    `,
  },

  {
    path: "/events",
    title: "الندوات والفعاليات القانونية | ميزان الرقمية",
    description:
      "أرشيف الندوات والفعاليات واللقاءات الأكاديمية والقانونية المنشورة في المواقع الجامعية الرسمية بالمغرب.",
    staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          ${breadcrumbNavHtml([
            { name: "الرئيسية", path: "/" },
            { name: "الندوات والفعاليات", path: "/events" },
          ])}
          <h1>الندوات والفعاليات القانونية</h1>

          <p>
            <strong>
              يضم هذا القسم معلومات عن الندوات واللقاءات والفعاليات
              المرتبطة بالمجال القانوني والأكاديمي.
            </strong>
          </p>

          <h2>${questionHeading("هي الندوات المؤرشفة حالياً")}</h2>

          <ul>
            ${events
              .map(
                (event) => `
            <li>
              <a href="/events/${escapeHtml(
                event.slug || generateSlug(event.title) || String(event.id)
              )}">${escapeHtml(event.title)}</a>
              — ${escapeHtml(event.city || "")}
              (<time datetime="${escapeHtml(event.eventDate || "")}">${escapeHtml(
                event.eventDate || ""
              )}</time>) — ${escapeHtml(event.excerpt || "")}
            </li>`
              )
              .join("\n")}
          </ul>

          <h2>كيف يستفيد الطالب من الندوات؟</h2>

          <p>
            توفر الندوات فرصة للتعرف على آراء الباحثين والممارسين ومناقشة
            قضايا قانونية وأكاديمية معاصرة. حسناً لمتابعة الأنشطة العلمية
            أن تسجل رابط الحدث الخارجي إن ورد، ثم تقرأ خلاصتنا الموضوعية
            وتصفح المحاور المعلن عنها كما وردت في الإعلان الجامعي، مع
            الانتباه إلى أن المواعيد قد تتغير من طرف المنظم.
          </p>

          <h2>ما مصدر بطاقات الندوات والفعاليات؟</h2>

          <p>
            تعتمد البطاقات على الأخبار والإعلانات المنشورة في المواقع
            الرسمية للجامعات والمؤسسات المنظمة، وتُحفظ في الأرشيف لترجع
            الباحث الى النشاط ومسار موضوعه. تُحيل البطاقة إلى المصدر الرسمي
            للتفاصيل والوثائق المرفقة.
          </p>

          ${exploreNavHtml}
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

  ...articles.map((item, itemIdx) => {
    const path = `/articles/${item.slug}`;
    const relatedArticles = circularNext(articles, itemIdx, 3);

    return {
      path,
      // عنوان منضبط أقل من 70 محرفاً (إصلاح Title too long في التدقيق)
      title: seoTitle(item.title),
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
        image: imageSchema(item.image || item.coverImage),
        // مؤلف وناشر مضمّنان بالكامل لتفادي مراجع @id العارية التي
        // تعتبرها أدوات التحقق بيانات منظمة غير صالحة.
        author: authorOrgSchema(),
        publisher: publisherOrgSchema(),
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

      staticBody: `
        ${breadcrumbNavHtml([
          { name: "الرئيسية", path: "/" },
          { name: "المقالات", path: "/articles" },
          { name: truncateAtWord(item.title, 42), path },
        ])}
        ${renderArticleStaticHtml(item)}
        ${relatedSectionHtml(
          "ما المقالات القانونية الأخرى المتقاربة مع هذا الموضوع؟",
          relatedArticles.map((other) => ({
            href: `/articles/${escapeHtml(other.slug)}`,
            title: other.title,
            note: other.excerpt || "",
          }))
        )}
        ${exploreNavHtml}
      `,
    };
  }),

  ...news.map((item, itemIdx) => {
    const slug =
      item.slug ||
      generateSlug(item.title) ||
      String(item.id);

    const path = `/news/${slug}`;
    const relatedNews = circularNext(news, itemIdx, 3);

    return {
      path,
      title: seoTitle(item.title),
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
        image: imageSchema(item.image || item.imageUrl || item.image_url),
        author: authorOrgSchema(),
        publisher: publisherOrgSchema(),
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

      staticBody: `
        ${breadcrumbNavHtml([
          { name: "الرئيسية", path: "/" },
          { name: "الأخبار", path: "/news" },
          { name: truncateAtWord(item.title, 42), path },
        ])}
        ${renderNewsStaticHtml(item)}
        ${relatedSectionHtml(
          "ما آخر المستجدات القانونية الأخرى المنشورة؟",
          relatedNews.map((other) => ({
            href: `/news/${escapeHtml(other.slug || generateSlug(other.title) || String(other.id))}`,
            title: other.title,
            note: other.summary || "",
          }))
        )}
        ${exploreNavHtml}
      `,
    };
  }),

  ...events.map((item, itemIdx) => {
    const path = `/events/${item.slug}`;

    return {
      path,
      title: seoTitle(item.title),
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
        // حقول موصى بها في وثائق Google للفعاليات (تصحيح أخطاء التدقيق).
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode:
          "https://schema.org/OfflineEventAttendanceMode",
        image: imageSchema(item.image),
        location: {
          "@type": "Place",
          name: item.venue || item.city || "المغرب",
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
          url: DOMAIN,
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
        ${breadcrumbNavHtml([
          { name: "الرئيسية", path: "/" },
          { name: "الندوات والفعاليات", path: "/events" },
          { name: truncateAtWord(item.title, 42), path },
        ])}
        <main dir="rtl" lang="ar-MA">
          <article>

            <h1>${escapeHtml(item.title)}</h1>

            <p>
              <strong>الإجابة المختصرة:</strong>
              ${escapeHtml(item.excerpt || "")}
            </p>

            <h2>أين تقام هذه الفعالية؟</h2>

            <p>
              ${escapeHtml(item.venue || item.city || "المغرب")}
              ${item.city ? ` — ${escapeHtml(item.city)}` : ""}
            </p>

            <h2>متى تقام الفعالية وبأي صيغة؟</h2>

            <p>
              ${escapeHtml(item.eventDate || "")}
              ${item.time ? ` على ${escapeHtml(item.time)}` : ""}
              ${item.mode ? ` — ${escapeHtml(item.mode)}` : ""}
              ${item.status ? ` (الحالة: ${escapeHtml(item.status)})` : ""}
            </p>

            ${
              item.organizer
                ? `
                  <h2>ما الجهة المنظمة للفعالية؟</h2>
                  <p>${escapeHtml(item.organizer)}</p>
                `
                : ""
            }

            ${
              Array.isArray(item.topics) && item.topics.length
                ? `
                  <h2>ما محاور الفعالية؟</h2>
                  <ul>
                    ${item.topics.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n")}
                  </ul>
                `
                : ""
            }

            ${
              Array.isArray(item.body) && item.body.length
                ? `
                  <h2>ما ورد في الإعلان الرسمي للفعالية؟</h2>
                  ${item.body.map((para) => `<p>${escapeHtml(para)}</p>`).join("\n")}
                `
                : ""
            }

            ${
              item.sourceUrl
                ? `
                  <h2>أين أجد المصدر الرسمي للفعالية؟</h2>
                  <p>
                    تُنشر التفاصيل التنظيمية والوثائق المرفقة لدى المؤسسة
                    المنظمة. راجع المصدر الرسمي:
                    <a href="${escapeHtml(item.sourceUrl)}" rel="noopener noreferrer">${escapeHtml(item.sourceLabel || "المصدر الرسمي")}</a>.
                  </p>
                `
                : ""
            }

            ${relatedSectionHtml(
              "ما الندوات الأخرى الموجودة في نفس الأرشيف؟",
              circularNext(events, itemIdx, 2).map((e) => ({
                href: `/events/${escapeHtml(e.slug || generateSlug(e.title) || String(e.id))}`,
                title: e.title,
                note: `${e.city || "المغرب"} — ${e.eventDate || ""}`,
              }))
            )}

            ${exploreNavHtml}

          </article>
        </main>
      `,
    };
  }),

  ...schools.map((item, itemIdx) => {
    const path = `/schools/${item.slug}`;
    const relatedSchools = circularNext(schools, itemIdx, 3);

    return {
      path,
      // لاحقة مختصرة "ميزان" بدل اللاحقة الطويلة (إصلاح Title too long)
      title: seoTitle(item.name, { suffix: "ميزان" }),
      description:
        item.synopsis ||
        `معلومات عن ${item.name}`,

      schema: {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "@id": `${absoluteUrl(path)}#organization`,
        name: item.name,
        description:
          item.synopsis || "",
        url:
          item.officialUrl ||
          absoluteUrl(path),
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

      staticBody: `
        ${breadcrumbNavHtml([
          { name: "الرئيسية", path: "/" },
          { name: "دليل الكليات", path: "/schools" },
          { name: item.name, path },
        ])}
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
              item.foundedYear
                ? `
                  <h2>متى تأسست الكلية؟</h2>
                  <p>${escapeHtml(item.foundedYear)}</p>
                `
                : ""
            }

            ${
              Array.isArray(item.studyAreas) && item.studyAreas.length
                ? `
                  <h2>ما مجالات الدراسة المتاحة؟</h2>
                  <ul>
                    ${item.studyAreas.map((area) => `<li>${escapeHtml(area)}</li>`).join("\n")}
                  </ul>
                `
                : ""
            }

            <h2>كيف أتحقق من معلومات التسجيل والانضمام؟</h2>

            <p>
              تُنشر مواعيد التعيين والتسجيل والانتقاء في المواقع الرسمية
              للجامعات والكليات، وقد تتغير من سنة إلى أخرى. تعطيك هذه
              البطاقة الملامح التعريفية للمؤسسة، بينما يظل الإعلان الجامعي
              الرسمي هو المرجع الوحيد لأي إجراء إداري أو أكاديمي. ولمتابعة
              مقررات الفصل الدراسي المرتبطة بتكوين هذه الكلية يمكن الرجوع
              إلى <a href="/archive">الأرشيف الدراسي</a> لطلبة الحقوق.
            </p>

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

            ${relatedSectionHtml(
              "ما كليات الحقوق الأخرى في دليل ميزان الرقمية؟",
              relatedSchools.map((other) => ({
                href: `/schools/${escapeHtml(other.slug)}`,
                title: other.name,
                note: other.city || "المغرب",
              }))
            )}

            ${exploreNavHtml}

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
  ].map(([slug, number]) => {
    const semester = slug.toUpperCase();
    const semesterDocs = documents.filter(
      (doc) => (doc.semester || "").toUpperCase() === semester
    );
    const semesterModules = [
      ...new Set(semesterDocs.map((doc) => doc.module).filter(Boolean)),
    ];

    return {
      path: `/${slug}`,
      title: `الفصل ${semester} | الأرشيف الدراسي | ميزان الرقمية`,
      description: `مواد وملخصات ومحاضرات ونماذج امتحانات الفصل ${number} لطلبة الحقوق بالمغرب.`,

      staticBody: `
      <main dir="rtl" lang="ar-MA">
        <article>
          ${breadcrumbNavHtml([
            { name: "الرئيسية", path: "/" },
            { name: "الأرشيف الدراسي", path: "/archive" },
            { name: `الفصل ${semester}`, path: `/${slug}` },
          ])}
          <h1>الفصل ${semester} — الفصل ${number}</h1>

          <p>
            <strong>
              هذا القسم مخصص لمواد الفصل ${number}
              ضمن الأرشيف الدراسي لطلبة الحقوق بالمغرب.
            </strong>
          </p>

          <h2>${questionHeading(`هي محتويات الفصل ${semester} في الأرشيف`)}</h2>

          <p>
            يجمع هذا القسم ${semesterDocs.length} وثيقة منشورة من امتحانات
            سابقة وملخصات ومحاضرات، ويمكن استخدامه للوصول إلى الوثائق
            التعليمية المرتبطة بالفصل ${semester} مع تمرينات اختبار
            تقويم الفهم ضمن قسم <a href="/quiz">اختبارات الهرم القانوني</a>.
          </p>

          ${
            semesterModules.length
              ? `
                <h2>ما المقررات المغطاة؟</h2>
                <ul>
                  ${semesterModules.map((m) => `<li>${escapeHtml(m)}</li>`).join("\n")}
                </ul>
              `
              : ""
          }

          ${
            semesterDocs.length
              ? `
                <h2>ما وثائق هذا الفصل؟</h2>
                <ul>
                  ${semesterDocs
                    .map(
                      (doc) => `
                    <li>
                      ${escapeHtml(doc.title)}
                      — مقرر ${escapeHtml(doc.module || "")}
                      ${doc.professor ? `، ${escapeHtml(doc.professor)}` : ""}
                    </li>`
                    )
                    .join("\n")}
                </ul>
              `
              : ""
          }

          <h2>كيف أستفيد من هذا الفصل في المذاكرة؟</h2>

          <p>
            خطة مقترحة: ابدأ بقراءة الملخصات المتاحة لتثبيت الهيكل
            العام للمادة، ثم اعمل على نماذج الامتحانات السابقة في وضع
            مؤقت، وتيقن عبر اختبارات التقويم. بعدها راجع المصطلحات
            الصعبة في <a href="/lexicon">القاموس القانوني</a> قبل يوم
            الامتحان.
          </p>

          ${relatedSectionHtml(
            "ما الفصول الأخرى في الأرشيف الدراسي؟",
            ["S1", "S2", "S3", "S4", "S5", "S6"]
              .filter((sem) => sem !== semester)
              .map((sem) => ({
                href: `/${sem.toLowerCase()}`,
                title: `${sem} — ${SEMESTER_LABELS[sem]}`,
                note: `${documents.filter((d) => (d.semester || "").toUpperCase() === sem).length} وثيقة منشورة`,
              }))
          )}

          ${exploreNavHtml}
        </article>
      </main>
    `,
    };
  }),

  ...lexiconWithSlugs.map((item, itemIdx) => {
    const path = `/lexicon/${item.slug}`;
    // روابط ذات الصلة بتوزيع دائري داخل نفس التصنيف أولاً، ثم على مستوى
    // القاموس كاملاً إذا كان التصنيف صغيراً — لضمان وصول روابط داخلية
    // إلى كل صفحة مصطلح على حدة.
    const sameCategory = lexiconWithSlugs.filter(
        (other) => other.category === item.category
      );
    // نمزج تخصصياً (نفس التصنيف) مع عمومياً (جيران دائريون فـ القائمة
    // الكاملة) ليتأكد أن كل مصطلح يستقبل روابط واردة كافية حتى لو
    // كانت مجموعة تصنيفه صغيرة.
    const relatedTerms = [
      ...circularNext(sameCategory, sameCategory.findIndex((o) => o.slug === item.slug), 3),
      ...circularNext(lexiconWithSlugs, itemIdx, 2),
    ]
      .filter((term, pos, arr) => term.slug !== item.slug && arr.findIndex((t) => t.slug === term.slug) === pos)
      .slice(0, 5);

    return {
      path,

      // عنوان منضبط — القاموس القانوني" كاملة مع اسم المصطلح قصيرة.
      title: seoTitle(
        item.term_fr
          ? `${item.term_ar} (${item.term_fr})`
          : item.term_ar,
        { suffix: "القاموس القانوني" }
      ),

      description:
        truncateAtWord(item.definition || "", 158),

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
        inDefinedTermSet: {
          "@id": `${DOMAIN}/lexicon#termset`,
        },
        inLanguage: "ar-MA",
        author: authorOrgSchema(),
      },

      extraSchema: [
        buildBreadcrumbSchema([
          { name: "الرئيسية", path: "/" },
          { name: "المعجم القانوني", path: "/lexicon" },
          { name: item.term_ar, path },
        ]),
      ],

      staticBody: `
        ${breadcrumbNavHtml([
          { name: "الرئيسية", path: "/" },
          { name: "القاموس القانوني", path: "/lexicon" },
          { name: item.term_ar, path },
        ])}
        ${renderTermStaticHtml(item)}

        <section dir="rtl" lang="ar-MA">
          <h2>أين يستعمل مصطلح «${escapeHtml(item.term_ar)}» عملياً؟</h2>
          <p>
            يظهر هذا المصطلح في النصوص القانونية والأحكام والأدبيات
            الجامعية بالسياق المغربي. إذا صادفته في مقرر أو نص، تعرّفه
            أولاً هنا، ثم راجع الإحالات التشريعية المرفقة لمعرفة المادة
            القانونية المحددة، واستعمل
            <a href="/quiz">اختبارات تقويم الفهم</a>
            للتأكد من تثبيت المعنى قبل الامتحان.
          </p>
          <h2>ما موقع هذا المصطلح داخل قاموس ميزان الرقمية؟</h2>
          <p>
            ${item.category ? `يصنف المصطلح ضمن «${escapeHtml(item.category)}» في قاموس المنصة` : "يُدرج المصطلح ضمن القسم الرئيسي من قاموس المنصة"}،
            ويعتبر تعريفه نقطة دخول، وليس بديلاً عن النص القانوني الرسمي.
            عند استعماله في بحث أو مناقشة، يوصى دائماً بالرجوع إلى المادة
            التشريعية الحاكمة كما هي منشورة في الجريدة الرسمية، لأن الصياغة
            التعليمية تبسّط الوصف لخدمة فهم الطالب.
          </p>
        </section>

        ${relatedSectionHtml(
          "ما المصطلحات المتقاربة مع هذا المصطلح؟",
          relatedTerms.map((other) => ({
            href: `/lexicon/${escapeHtml(other.slug)}`,
            title: other.term_fr
              ? `${other.term_ar} (${other.term_fr})`
              : other.term_ar,
            note: truncateAtWord(other.definition || "", 90),
          }))
        )}

        ${exploreNavHtml}
      `,
    };
  }),
];

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
          ${breadcrumbNavHtml([
            { name: "الرئيسية", path: "/" },
            { name: "من نحن", path: "/about" },
          ])}
          <h1>حول ميزان الرقمية</h1>

          <p>
            <strong>
              ميزان الرقمية مشروع معرفي عربي يهدف إلى تسهيل الوصول
              إلى المحتوى القانوني والأكاديمي لطلبة الحقوق في المغرب.
            </strong>
          </p>

          <h2>ما هدف المنصة؟</h2>

          <p>
            الهدف هو تنظيم المعرفة القانونية في مكان واحد وتقديمها بطريقة
            واضحة قابلة للبحث والاستخدام الأكاديمي: قاموس قانوني عربي —
            فرنسي، مقالات منهجية، أخبار تشريعية موثقة بالمصادر الرسمية،
            أرشيف امتحانات وملخصات، ودليل لكليات الحقوق والمؤسسات
            الجامعية بالمغرب.
          </p>

          <h2>من هو الجمهور المستهدف؟</h2>

          <p>
            طلبة القانون والباحثون والمهتمون بالقانون المغربي
            والمجال الأكاديمي، إضافة إلى من يرغب في فهم مصطلح قانوني أو
            متابعة مستجد تشريعي دون خلفية متخصصة.
          </p>

          <h2>${questionHeading("هي مبادئنا التحريرية")}</h2>

          <p>
            لا نقدم الاستشارات القانونية ولا نحل محل المهنيين؛ ننشر
            المعرفة التعليمية ونعيد تنظيمها، ونحيل دائماً إلى النصوص
            الرسمية للتثبت، ونصحح المحتوى الموثق عبر صفحة
            <a href="/contact">التواصل</a> كلما وردنا بلاغ مؤسس.
          </p>

          <h2>كيف تتطور ميزان الرقمية؟</h2>

          <p>
            تتوسع الأقسام تدريجياً استناداً إلى حاجة الطلبة الفعلية:
            أولوية لتعميق <a href="/lexicon">القاموس القانوني</a>
            وربطه بمقررات <a href="/archive">الأرشيف الجامعي</a>،
            ثم رفع جودة المقالات المنهجية والتغطية الإخبارية الموثقة.
            نعتمد زمنية نشر واقعية ونراجع المحتوى القديم دورياً ليبقى
            مطابقاً لآخر المستجدات التشريعية.
          </p>

          ${exploreNavHtml}
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
          ${breadcrumbNavHtml([
            { name: "الرئيسية", path: "/" },
            { name: "تواصل معنا", path: "/contact" },
          ])}
          <h1>تواصل معنا</h1>

          <p>
            <strong>
              يمكنك التواصل مع فريق ميزان الرقمية
              بخصوص المحتوى أو الأخطاء أو الاقتراحات.
            </strong>
          </p>

          <h2>كيف يمكن الإبلاغ عن خطأ؟</h2>

          <p>
            يرجى استخدام قناة التواصل الرسمية المتاحة في المنصة وإرفاق
            رابط الصفحة والمعلومة التي تحتاج إلى تصحيح. يلتزم الفريق
            بمراجعة البلاغات الموثقة وتصحيح المحتوى بعد التحقق من النص
            الرسمي أو المصدر الجامعي المعتمد.
          </p>

          <h2>ماذا يسهل علينا معالجة رسالتك؟</h2>

          <p>
            الإبلاغات الأسرع حلاً هي التي تتضمن: عنوان الصفحة أو رابطها،
            ووصفاً للخطأ، وسنداً (نص قانوني رسمي أو إعلان جامعي) يوثق
            المعلومة الصحيحة. قبل التواصل راجع
            <a href="/faq">صفحة الأسئلة الشائعة</a>
            فبعض الإجابات موجودة هناك، وأعد قراءة
            <a href="/about">مبادئنا التحريرية</a>
            لفهم طبيعة المحتوى المنشور.
          </p>

          <h2>هل تقدم المنصة استشارات قانونية فردية؟</h2>

          <p>
            لا. بطاقات القاموس والمقالات والأخبار في
            <a href="/">ميزان الرقمية</a> ذات طبيعة تعليمية عامة، ولا
            تُفصّل حالة قانونية بعينها ولا تشكل رأياً مهنياً. إذا كان
            سؤالك يخص نزاعاً أو ملفاً فردياً، فالطريق السليم هو استشارة
            محامٍ أو قانوني مرخص، مع الاعتماد على النص الرسمي المنشور في
            الجريدة الرسمية كمرجع نهائي.
          </p>

          ${exploreNavHtml}
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
            ${exploreNavHtml}
          </article>
        </main>
      `,
    };
  })(),

  {
    path: "/privacy",
    // إضافة لاحقة العلامة تكسر تطابق العنوان التام مع الـ h1 (Duplicate h1/title)
    title: `${PRIVACY_POLICY.title} | ميزان الرقمية`,
    description: PRIVACY_POLICY.description,
    // يُبنى من نفس بيانات صفحة React — لا نسخة يدوية مختصرة.
    staticBody: `${policyToHtml(PRIVACY_POLICY)}${exploreNavHtml}`,
  },

  {
    path: "/terms",
    title: `${TERMS_POLICY.title} | ميزان الرقمية`,
    description: TERMS_POLICY.description,
    // يُبنى من نفس بيانات صفحة React — لا نسخة يدوية مختصرة.
    staticBody: `${policyToHtml(TERMS_POLICY)}${exploreNavHtml}`,
  },

  {
    path: "/cookies",
    title: `${COOKIE_POLICY.title} | ميزان الرقمية`,
    description: COOKIE_POLICY.description,
    // يُبنى من نفس بيانات صفحة React — لا نسخة يدوية مختصرة.
    staticBody: `${policyToHtml(COOKIE_POLICY)}${exploreNavHtml}`,
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
    title: "اختبارات مباريات الأمن الوطني والقضاء والوظيفة العمومية | ميزان",
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
          <h2>${questionHeading("هو نظام الرتب في الاختبارات")}</h2>
          <p>
            كل إجابة صحيحة تمنحك نقاط خبرة تدرّجك على سلّم الرتب من D إلى SSS.
            الرتبة لا تُقيّم مستواك الجامعي فحسب، بل توثّق مسارك أمام النظام:
            ترتفع مع الانتظام والدقة وتتأثر بالأخطاء المتكررة. بعد التحديد،
            يقترح النظام محتوى يناسب رتبتك من
            <a href="/articles">مقالات المنهجية</a> و
            <a href="/lexicon">مصطلحات القاموس</a>.
          </p>
          <h2>إجمالي الأسئلة</h2>
          <p>${quizQuestions.length} سؤالاً موزّعة على المسارات الأربعة.</p>
          ${exploreNavHtml}
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
          ${breadcrumbNavHtml([
            { name: "الرئيسية", path: "/" },
            { name: "الاختبارات", path: "/quiz" },
            { name: item.heading, path: item.path },
          ])}
          <h1>${escapeHtml(item.heading)}</h1>
          <p><strong>${escapeHtml(item.lead)}</strong></p>
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

          <h2>كيف أستفيد أكثر من هذه الاختبارات؟</h2>

          <p>
            يعمل كل سؤال بمنطق «خطأ ثم درس»: تظهر الإجابة الصحيحة فوراً مع
            شرحها وسندها القانوني، فتثبت المعلومة عند نقطة الضعف مباشرة.
            طريقة مجربة: أنجز دورة أولى بدون ضغط لرصد الثغرات، ثم أعد تمارين
            المادة نفسها بعد مراجعة القاعدة، وانتقل بعدها إلى
            <a href="/quiz/placement">اختبار تحديد المستوى</a>
            لتحدد رتبتك الحالية على سلم ميزان.
          </p>

          <h2>ما الفرق بين هذا المسار وباقي المسارات؟</h2>

          <p>
            صممت ميزان الرقمية أربعة مسارات للاختبارات لأن حاجات الطلبة
            مختلفة: مسار كليات الحقوق يتبع المقررات الجامعية فصلاً فصلاً،
            والاختبار العشوائي يمتّع المراجعة اليومية بأسئلة متنوعة، ومسار
            المباريات يحاكي ضغط الأسئلة الرسمية بوقت محدد، أما مسار
            المقابلات فيجهز الخريج لأسئلة الواقع المهني العملي.
          </p>

          ${exploreNavHtml}
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
          <h2>${questionHeading("يجب الانتباه له قبل بدء الاختبار")}</h2>
          <p>
            أنجز الاختبار بهدوء وبدون مرجع مفتوح ليعكس النتيجة مستواك الحقيقي؛
            فالرتبة الابتدائية تقرر أي مسار ومحتوى سيقترحه عليك النظام لاحقاً،
            وأي تضخيم مؤقت للنتيجة يؤخر تقدمك الفعلي على المدى المتوسط.
          </p>
          <h2>سلم الرتب بعد التحديد</h2>
          <ul>
            <li>Rank D — مبتدئ: أول خطوة في الطريق.</li>
            <li>Rank C — متعلم: تمكنت من المصطلحات والمبادئ العامة.</li>
            <li>Rank B — متمكن: تجيب عن أسئلة الفصول المتوسطة بثبات.</li>
            <li>Rank A — متقدم: مستوى يؤهلك لمساعدة زملائك ونشر مقالاتك.</li>
          </ul>
          <h2>${questionHeading("هي الخطوة التالية بعد اختبار التحديد")}</h2>
          <p>
            بعد نيل رتبتك الابتدائية، يقودك النظام إلى المسار الأنسب: طلبة
            الجامعة يبدؤون باختبارات فصولهم في
            <a href="/quiz/university">مسار الكلية</a>، ومن يجهز مباراة
            مهنيا يلتحق ب<a href="/quiz/concours">مسار المباريات</a>،
            والباحث عن ثقافة عامة يرفع رتبته عبر
            <a href="/quiz/general">الاختبار العشوائي</a>،
            بينما يستعد الخريج المقبل على سوق العمل في
            <a href="/quiz/interview">مسار المقابلات</a>.
          </p>
          ${exploreNavHtml}
        </article>
      </main>
    `,
  }
);

/* -------------------------------------------------------
   صفحات تنزيل الملفات /pdf/:slug
------------------------------------------------------- */
// كانت هذه المسارات تعود قبل الإصلاح بالهيكل الفارغ للتطبيق (صفحة
// واحدة بلا محتوى ولا روابط)، بينما يظهر تسع منها في sitemap.xml.
// نولّد لكل وثيقة صفحة HTML ثابتة تطابق روابط التطبيق بدقة.
pages.push(
  ...documents.map((doc, itemIdx) => {
    const slugMap = pdfSlugsById(documents);
    const slug = slugMap.get(doc.id);
    const path = `/pdf/${slug}`;
    const semester = (doc.semester || "").toUpperCase();
    const relatedDocs = circularNext(documents, itemIdx, 3);

    return {
      path,
      title: seoTitle(doc.title),
      description: truncateAtWord(
        `${doc.title} — وثيقة ${doc.module || "قانون"} لطلبة الحقوق (${SEMESTER_LABELS[semester] || semester || "الأرشيف الجامعي"}) ${doc.professor ? ` من إعداد ${doc.professor}` : ""}، متاحة للتنزيل على ميزان الرقمية.`,
        158
      ),

      staticBody: `
        <main dir="rtl" lang="ar-MA">
          <article>
            ${breadcrumbNavHtml([
              { name: "الرئيسية", path: "/" },
              { name: "الأرشيف الدراسي", path: "/archive" },
              ...(SEMESTER_LABELS[semester]
                ? [{ name: `الفصل ${semester}`, path: `/${semester.toLowerCase()}` }]
                : []),
              { name: truncateAtWord(doc.title, 42), path },
            ])}
            <h1>${escapeHtml(doc.title)}</h1>

            <p>
              <strong>الإجابة المختصرة:</strong>
              هذه وثيقة أرشيف جامعي في مقرر
              ${escapeHtml(doc.module || "القانون")}
              ضمن ${SEMESTER_LABELS[semester] ? `${SEMESTER_LABELS[semester]} (${semester})` : "الأرشيف الدراسي"}
              ${doc.professor ? `، من إعداد ${escapeHtml(doc.professor)}` : ""}،
              ويمكن تنزيلها مباشرة بصيغة PDF من ميزان الرقمية.
            </p>

            <h2>ما محتوى هذه الصفحة؟</h2>

            <p>
              الصفحة تمهّد لتنزيل الملف بعد عدّاد قصير. إذا لم يبدأ التنزيل
              تلقائياً، استخدم زر التنزيل المباشر داخل التطبيق، أو ارجع إلى
              <a href="/${semester.toLowerCase()}">قسم الفصل ${semester}</a>
              لتصفح باقي وثائق المادة.
            </p>

            <h2>كيف أستفيد من الوثيقة في المذاكرة؟</h2>

            <p>
              اقرأ الوثيقة أولاً لرسم خريطة المادة وتثبيت التقسيم، ثم استخرج
              منها العناوين الرئيسية وحوّلها إلى بطاقات مراجعة، واختبر نفسك
              بعدها في <a href="/quiz/university">اختبارات الفصول الجامعية</a>
              للتأكد من انتقال المعلومة إلى الذاكرة طويلة المدى.
            </p>

            ${relatedSectionHtml(
              "ما الوثائق الأخرى في نفس الفصل الجامعي؟",
              relatedDocs.map((other) => ({
                href: `/pdf/${slugMap.get(other.id)}`,
                title: other.title,
                note: other.module || "الأرشيف الدراسي",
              }))
            )}

            ${exploreNavHtml}
          </article>
        </main>
      `,
    };
  })
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

function renderPage(template, page) {
  const canonical = absoluteUrl(page.path);

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
    `<title>${escapeHtml(page.title)}</title>`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bname=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(
      page.description
    )}">`
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
    `<meta property="og:title" content="${escapeHtml(
      page.title
    )}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bproperty=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(
      page.description
    )}">`
  );

  html = swap(
    html,
    /<meta\b[^>]*\bname=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(
      page.title
    )}">`
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

  if (page.staticBody) {
    html = swap(
      html,
      /<div id="root"><\/div>/i,
      `<div id="root">${page.staticBody}</div>`
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