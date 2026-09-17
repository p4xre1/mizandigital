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

const absoluteUrl = (path) =>
  `${DOMAIN}${path === "/" ? "/" : path}`;

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

  while (usedLexiconSlugs.has(slug)) {
    slug = `${base}-${item.id}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
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
              <div class="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-4 py-1.5 text-[11px] font-black tracking-wide text-[#2563eb] dark:text-[#60a5fa]">
                <span class="size-1.5 rounded-full bg-[#2563eb]"></span>
                منصة تعليمية عصرية • الأساسي مجاني والمتقدم باشتراك
              </div>
              <h1 class="mt-6 text-[34px] md:text-[48px] font-black leading-[1.05] tracking-[-0.03em] text-[#0f172a] dark:text-white">افتح إمكانياتك مع<br><span class="text-[#2563eb]">التعلم القانوني</span><br><span class="text-[20px] md:text-[24px] font-bold tracking-tight text-[#475569] dark:text-[#94a3b8] mt-1 block">Online Learning</span></h1>
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
                  <div class="text-[11px] text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1 justify-end">${svgIcon(ICON.star, "size-3 fill-[#f59e0b] text-[#f59e0b]", 12)}4.9 • محتوى أساسي مجاني</div>
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
   Static pages
------------------------------------------------------- */

const pages = [
  {
    path: "/",
    title: "ملخصات S1-S6، قاموس قانوني 250 مصطلح ودليل 21 كلية حقوق بالمغرب | ميزان الرقمية",

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

    staticBody: `
      <div class="min-h-screen bg-background text-foreground">${homeHeaderHtml}
        <main class="min-h-screen bg-white dark:bg-[#0f172a] text-foreground" dir="rtl" lang="ar-MA">${homeHeroHtml}

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

  ...articles.map((item) => {
    const path = `/articles/${item.slug}`;

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

  ...news.map((item) => {
    const slug =
      item.slug ||
      generateSlug(item.title) ||
      String(item.id);

    const path = `/news/${slug}`;

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
        image: item.image || item.imageUrl || item.image_url || DEFAULT_ARTICLE_IMAGE,
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

  ...events.map((item) => {
    const path = `/events/${item.slug}`;

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
    const path = `/schools/${item.slug}`;

    return {
      path,
      title: `${item.name} | كليات الحقوق بالمغرب`,
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

      title:
        item.term_fr
          ? `${item.term_ar} (${item.term_fr}) | القاموس القانوني`
          : `${item.term_ar} | القاموس القانوني`,

      description:
        item.definition || "",

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