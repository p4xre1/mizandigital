/**
 * سياسة الروابط القانونية (Canonical URL policy) — مصدر واحد للحقيقة.
 * الوثيقة التشغيلية وقائمة التحقق: SEO-URL-POLICY.md في جذر المستودع.
 *
 * لماذا هذا الملف في shared/ وليس في src/؟
 * ----------------------------------------
 * الروابط تُبنى في أربعة أماكن مختلفة يجب أن تتطابق حرفياً:
 *   1) الواجهة (React) — روابط <Link> و canonical/og:url في وسوم الرأس.
 *   2) scripts/prerender.mjs — ملفات HTML الثابتة التي يقرأها الزاحف فعلاً.
 *   3) scripts/generate-sitemap.mjs (+ feed + llms) — ما يُقدَّم لمحركات البحث.
 *   4) scripts/enhance-*-prerender.mjs — صفحات الأدلة المولّدة بعد البناء.
 *
 * حين كانت كل جهة تملك نسختها الخاصة من «توليد الـ slug» و«تنسيق الرابط»،
 * خرجت ثلاث فئات من الأعطال:
 *   - خريطة الموقع تنشر /lexicon/الرهن-الحيازي-gage بينما الصفحة المولّدة هي
 *     /lexicon/الرهن-الحيازي-gage-civil → رابط 404 داخل sitemap.
 *   - أخبار news.json بلا عمود slug: الروابط في الواجهة تذهب إلى /news/<id>
 *     بينما الملف الثابت موجود في /news/<slug-من-العنوان> → صفحة مولّدة
 *     لا يصلها زائر، ورابط داخلي مكسور.
 *   - canonical الجذر كان https://www.mizan.page/ بشرطة مائلة، وصفحة واحدة
 *     تُقرأ كرابطَين مختلفين.
 *
 * القاعدة العامة
 * --------------
 *   لا شرطة مائلة في نهاية أي رابط. الجذر = https://www.mizan.page (بلا /).
 *
 * كل دوال بناء الروابط هنا تمرّ بـ canonicalUrl()، فالقاعدة مضمونة في نقطة
 * واحدة. الترويسة (headers) والمعاملات (query) وحزام الرابط (hash) تُستبعد:
 * النسخة القابلة للفهرسة من الصفحة هي المسار النظيف بلا معاملات، لأن
 * /schools/x?utm_source=… يجب ألا يُقرأ كصفحة مستقلة.
 *
 * ملاحظة Deploy: هذه الوحدة للموقع الثابت (Vite + prerender + Cloudflare
 * Pages). توحيد الشرطة المائلة على الحافة يقوم به functions/[[path]].js
 * (301 من /path/ إلى /path). إن انتقل المشروع إلى Next.js لاحقاً، فاضبط
 * trailingSlash: false في next.config واستعمل نفس هذه الدوال في
 * generateMetadata — السياسة تبقى نفسها.
 */

/** النطاق القانوني الموحّد. بلا شرطة مائلة في النهاية. */
export const SITE_ORIGIN = "https://www.mizan.page";

/** المسارات التي تُخدم دائماً بلا شرطة مائلة (لا تُفهرس نسخة الشرطة). */
const NON_INDEXABLE_SEGMENTS = new Set([
  "admin",
  "login",
  "signup",
  "signin",
  "forgot-password",
  "profile",
  "saved",
  "payments",
  "search",
  // صفحة الأسعار خلف المنصة: تُقرأ لكن لا تُفهرس (طلب صريح في جولة الميتا)،
  // فتُستثنى من الخريطة ومن كل قائمة «صفحات قابلة للفهرسة» معاً.
  "pricing",
  "download",
  // إرشادات المجتمع صفحة داخلية يولّدها العميل بلا ملف ثابت ولا وصلات
  // تشير إليها؛ تركها «مفهرسَة» يعني 404 لكل تحميل مباشر. تُسلَّم كهيكل
  // noindex إلى أن تُكتب نسختها الثابتة في جولة المحتوى.
  "guidelines",
  // dist/app.html هيكل تسلّمه دالة Pages للمسارات الديناميكية (/u/x، /admin/x…)؛
  // لا وجود لمسار /app في Router أصلاً. إخراجه من السياسة يمنع أن يُفهم
  // «صفحة قابلة للفهرسة بلا canonical» في فحوص head والتغطية.
  "app",
  // صفحة عدم الوجود تُخدم من dist/404.html (توافق Pages لروابط 404 الحقيقية)
  // فمسارها موجود كملف بلا معنى فهرسَة؛ وضعها هنا يمنع أن تظهر في أي قائمة
  // «صفحات مولَّدة» أو في الخريطة.
  "404",
]);

/**
 * يزيل كل الشرطات المائلة الزائدة في نهاية المسار ويوحّد التكرار في وسطه.
 * يقبل مساراً أو رابطاً كاملاً أو مساراً مع معاملات — ويُرجع المسار فقط.
 */
export function normalizePath(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "/";

  let path = raw;

  // رابط مطلق؟ نحتفظ بالمسار فقط (نطاقنا القانوني واحد، والمسار هو المهم هنا).
  const schemeMatch = /^https?:\/\/[^/]+/i.exec(path);
  if (schemeMatch) path = path.slice(schemeMatch[0].length);

  // إسقاط المعاملات والحزام
  path = path.replace(/[?#].*$/, "");

  if (!path.startsWith("/")) path = `/${path}`;

  // دمج الشرطات المائلة المتكررة، ثم إزالة شرطة النهاية
  path = path.replace(/\/{2,}/g, "/").replace(/\/+$/, "");

  return path === "" ? "/" : path;
}

/**
 * يحوّل أي رابط (نسبي أو مطلق، بشرطة أو بدونها) إلى الرابط القانوني المطلق.
 *
 *   canonicalUrl("/")                  → https://www.mizan.page
 *   canonicalUrl("/schools/x/")         → https://www.mizan.page/schools/x
 *   canonicalUrl("https://mizan.page/schools/x/") → نفس النتيجة (نطاق موحّد)
 */
export function canonicalUrl(input, { origin = SITE_ORIGIN } = {}) {
  const path = normalizePath(input);
  const base = String(origin).replace(/\/+$/, "");
  return path === "/" ? base : `${base}${path}`;
}

/** رابط داخلي نظيف (يُستعمل في to= و href=): بلا شرطة نهاية، والجذر "/". */
export function internalPath(input) {
  return normalizePath(input);
}

/** هل هذا الرابط مطابق للسياسة (بلا شرطة نهاية، ما عدا الجذر المسموح)؟ */
export function followsSlashPolicy(value) {
  const path = normalizePath(value);
  if (path === "/") return !/\/$/.test(String(value ?? "").replace(/[?#].*$/, ""));
  return !/\/$/.test(String(value ?? "").replace(/[?#].*$/, ""));
}

/**
 * مسار قابل للفهرسة؟ تُستثنى صفحات الحساب والإدارة والبحث الداخلي
 * حتى لا تتسرب إلى خريطة الموقع أو إلى وسوم canonical.
 */
export function isIndexablePath(input) {
  const path = normalizePath(input);
  if (path === "/") return true;
  const first = path.split("/")[1] || "";
  if (!first) return false;
  if (NON_INDEXABLE_SEGMENTS.has(first)) return false;
  if (path.startsWith("/u/")) return false; // بروفايلات عامة يولّدها المستخدمون
  if (path.startsWith("/resume/")) return false; // سير ذاتية يولّدها المستخدمون (نفس /u/)
  // أدوات Pro خلف تسجيل الدخول: البوابة وتفاصيلها معاً. كانت البوابة تُترك
  // «قابلة للفهرسة» في السياسة بينما لا ملف ثابت لها ولا entry في sitemap —
  // نصف حالة تُنتج «Discovered – currently not indexed» في Search Console.
  if (path === "/pro-tools" || path.startsWith("/pro-tools/")) return false;
  return true;
}

/* ─────────────────────────────────────────────────────────────────────────
   بناء الروابط القانونية لكل نوع محتوى
   الأسماء مطابقة لما تتوقعه الواجهة ولما تستعمله السكربتات.
   ───────────────────────────────────────────────────────────────────────── */

export const canonicalHome = (origin) => canonicalUrl("/", { origin });
export const canonicalSchool = (slug, origin) => canonicalUrl(`/schools/${slug}`, { origin });
export const canonicalSchools = (origin) => canonicalUrl("/schools", { origin });
export const canonicalLexicon = (slug, origin) => canonicalUrl(`/lexicon/${slug}`, { origin });
export const canonicalLexiconHub = (origin) => canonicalUrl("/lexicon", { origin });
export const canonicalNews = (slug, origin) => canonicalUrl(`/news/${slug}`, { origin });
export const canonicalNewsHub = (origin) => canonicalUrl("/news", { origin });
export const canonicalArticle = (slug, origin) => canonicalUrl(`/articles/${slug}`, { origin });
export const canonicalArticlesHub = (origin) => canonicalUrl("/articles", { origin });
export const canonicalEvent = (slug, origin) => canonicalUrl(`/events/${slug}`, { origin });
export const canonicalEventsHub = (origin) => canonicalUrl("/events", { origin });
export const canonicalAnnonces = (origin) => canonicalUrl("/annonces", { origin });
export const canonicalResume = (username, origin) => canonicalUrl(`/resume/${username}`, { origin });
export const canonicalPdf = (slug, origin) => canonicalUrl(`/pdf/${slug}`, { origin });
export const canonicalArchive = (origin) => canonicalUrl("/archive", { origin });
export const canonicalPage = (slug, origin) => canonicalUrl(`/${slug}`, { origin });

/** بادئات المحتوى التي لها صفحة تفصيلية بمعرّف. */
const ITEM_PREFIXES = new Set([
  "/schools",
  "/lexicon",
  "/news",
  "/articles",
  "/events",
  "/pdf",
]);

/**
 * هل هذا مسار عنصر محتوى صالح — أي «/قسم/معرّف» لا «/قسم» وحده؟
 *
 * لماذا نهتم؟ لأن سجلّاً في نظام الإدارة بلا `slug` ولا عنوان كان يعطي
 * `/articles/`، فيُطبَّع إلى `/articles` — أي مسار البوابة نفسها. النتيجة:
 * صفحة المقالات تُكتب مرتين في dist، أو يفشل البناء على تكرار المسار.
 * الفحص هنا يجعل المعرّف الفارغ يُتجاهَل بصوتٍ عالٍ بدل أن يسرق رابط قسم.
 */
export function isItemPath(path) {
  const segments = normalizePath(path).split("/").filter(Boolean);
  if (segments.length < 2) return false;
  return ITEM_PREFIXES.has(`/${segments[0]}`);
}

/** مسار الرابط القانوني لنوع محتوى — يُستعمل حين تُحتاج النسبة لا الرابط الكامل. */
export const itemPath = {
  school: (slug) => internalPath(`/schools/${slug}`),
  lexicon: (slug) => internalPath(`/lexicon/${slug}`),
  news: (slug) => internalPath(`/news/${slug}`),
  article: (slug) => internalPath(`/articles/${slug}`),
  event: (slug) => internalPath(`/events/${slug}`),
  pdf: (slug) => internalPath(`/pdf/${slug}`),
};

/* ─────────────────────────────────────────────────────────────────────────
   توليد المعرّفات الصديقة (slugs) — نسخة موحّدة
   ───────────────────────────────────────────────────────────────────────── */

/**
 * ترميز عربي/لاتيني آمن للمسارات. هذه النسخة مطابقة لسلوك
 * src/lib/utils/generateSlug.ts على كل بيانات المشروع، وتضيف عليه:
 *   - التطبيع NFKC (يحوّل الأحرف المفكّكة إلى صورتها المركّبة).
 *   - إزالة التشكيل (U+064B..U+065F، U+0670) والتطويل (U+0640).
 *   - معالجة الشرطة المائلة والشرطة المائلة العكسية داخل العنوان.
 * أي تغيير هنا يجب أن يُقاس على البيانات قبل النشر (انظر
 * tests/seo-canonical.test.ts → «_slug موحّد بين الواجهة والسكربتات»).
 */
export function slugify(text = "") {
  return String(text)
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    // التشكيل والتطويل: U+064B..U+065F ثم U+0670 (السكون الصغيرة/الألف الخنجرية)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\s/\\_]+/g, "-")
    // إبقاء الحروف اللاتينية والأرقام والشرطة والمدى العربي الكامل
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * معرّف مصطلح المعجم: الأول بالعربية يفوز، والتكرار يُفصل بإلحاق المعرّف.
 * تُستعمل نفس الدالة في الواجهة وفي prerender وفي sitemap — لا انحراف.
 */
export function lexiconSlug(item, taken) {
  const base = slugify(item?.term_ar) || String(item?.id ?? "");
  let slug = base;
  if (taken && taken.has(slug)) slug = `${base}-${item.id}`;
  if (taken) taken.add(slug);
  return slug;
}

/** خريطة id → slug لكل مصطلحات المعجم، بترتيب المصفوفة نفسه. */
export function lexiconSlugMap(items = []) {
  const taken = new Set();
  const map = new Map();
  for (const item of items) map.set(item.id, lexiconSlug(item, taken));
  return map;
}

/** معرّف مورد عنوانه في حقل title/ name (مقالات، أخبار، فعاليات، كليات، ملفات). */
export function contentSlug(item, { fallbackKey = "id" } = {}) {
  if (!item) return "";
  const explicit = item.slug;
  // المعرّف المكتوب يدوياً يُؤخذ كما هو (لا يُعاد ترميزه): هو هوية الصفحة
  // عند الواجهة والقاعدة بيانات، وأي إعادة كتابة فيه تكسر الروابط القائمة.
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim().replace(/\/+$/, "");
  const title = item.title || item.name || item.name_ar || item.term_ar || "";
  return slugify(title) || String(item[fallbackKey] ?? "");
}

/** أخبار news.json: لا يوجد عمود slug في البيانات المحلية، فيُبنى من العنوان. */
export const newsSlug = (item) => contentSlug(item);
export const articleSlug = (item) => contentSlug(item);
export const eventSlug = (item) => contentSlug(item);
export const schoolSlug = (item) => contentSlug(item);

/** ملف PDF محلي: نفس منطق المحتوى مع فصل التكرار بالمعرّف. */
export function docSlug(item, taken) {
  const base = contentSlug(item);
  let slug = base;
  if (taken && taken.has(slug)) slug = `${base}-${slugify(String(item.id)) || item.id}`;
  if (taken) taken.add(slug);
  return slug;
}

/* ─────────────────────────────────────────────────────────────────────────
   روابط مطلقة جاهزة لكل نوع محتوى (تستعمل slug أعلاه)
   ───────────────────────────────────────────────────────────────────────── */

export const canonicalNewsItem = (item, origin) => canonicalNews(newsSlug(item), origin);
export const canonicalArticleItem = (item, origin) => canonicalArticle(articleSlug(item), origin);
export const canonicalEventItem = (item, origin) => canonicalEvent(eventSlug(item), origin);
export const canonicalSchoolItem = (item, origin) => canonicalSchool(schoolSlug(item), origin);

/**
 * يبني قائمة URL فريدة: يزيل النسخ المكررة بعد التطبيع، فيمتنع أن تظهر
 * /schools/x و /schools/x/ معاً في خريطة الموقع.
 */
export function dedupeCanonicalUrls(values, { origin = SITE_ORIGIN } = {}) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (value == null || value === "") continue;
    const url = canonicalUrl(value, { origin });
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** المسار من رابط كامل (يُستعمل لمطابقة sitemap بملفات dist). */
export function pathOfUrl(value) {
  return normalizePath(value);
}
