/**
 * كتالوج المحتوى المنشور — قراءة وقت الطلب من Supabase (لا وقت البناء).
 *
 * لماذا هذا الملف موجود؟
 * -------------------------
 * الموقع ثابت (Vite + prerender على Cloudflare Pages): صفحات
 * /articles/<slug> و /news/<slug> و /pdf/<slug> وخريطة sitemap.xml تُولَّد
 * **وقت البناء** من القاعدة (scripts/lib/cms-content.mjs). أي سجلّ يُنشر من
 * لوحة التحكم بعد آخر بناء:
 *   1) لا سطر له في sitemap.xml، و
 *   2) لا ملف ثابت له، فيردّ الخادم 404 على رابط منشور فعلاً.
 * وحتى مع workflow refresh-content (كل ست ساعات) تبقى نافذة من ساعات يعطي
 * فيها الزاحف «Not found» لمحتوى حقيقي — وهذا أسوأ من التأخير.
 *
 * هذا الكتالوج يغلق النافذة بنسختين تعملان وقت الطلب:
 *   • functions/sitemap.xml.js — تضيف الروابط الجديدة إلى XML فوراً.
 *   • functions/_shared/contentFallback.js — تخدم Slug منشوراً غير مبني
 *     بهيكل التطبيق ووسوم head صحيحة بدل 404.
 *
 * لماذا مفتاح anon المضمَّن؟
 * ---------------------------
 * المفتاح نفسه المضمَّن في واجهة الموقع (يُبنى داخل الحزمة أصلاً). الوصول
 * للقراءة فقط، وسياسات RLS نفسها هي ما يحمي غير المنشور — والاستعلامات هنا
 * تُرشّح المنشور فقط (articles.status=published، news.is_published=true).
 * لا أسرار جديدة ولا كتابة في القاعدة من هذا الملف.
 *
 * ملاحظة تطابق: الاستعلامات هنا نسخة وقت-الطلب من
 * scripts/lib/cms-content.mjs. أي تغيير في أعمدة النشر يجب أن يقع في
 * الملفين معاً، وإلا اختلف ما تنشره الخريطة عمّا يخدمه الموقع.
 */

const DEFAULT_SUPABASE_URL = "https://rfhjmtdblmarhlfftlmg.supabase.co";
// مفتاح anon العام نفسه المضمَّن في قائمة scripts/lib/cms-content.mjs.
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaGptdGRibG1hcmhsZmZ0bG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTE5NzgsImV4cCI6MjA5OTc4Nzk3OH0.uI2_WCQSERz0jgYPuy1-AiWuVtDcJlFKd7hZsaQ1r5Q";

const LIMIT = 500;

/** استعلامات الجداول — MUST match scripts/lib/cms-content.mjs. */
const TABLE_QUERIES = {
  articles: `select=id,title,slug,excerpt,meta_title,meta_description,published_at,updated_at,created_at&status=eq.published&order=published_at.desc.nullslast&limit=${LIMIT}`,
  // news لا يملك عمود updated_at في القاعدة — ذكره يُرجع 400 ويُفرغ النتيجة.
  news: `select=id,title,slug,summary,source,published_at,created_at&is_published=eq.true&order=published_at.desc.nullslast&limit=${LIMIT}`,
  pdf_summaries: `select=id,title,slug,description,semester,professor,file_url,updated_at,created_at&status=eq.published&order=created_at.desc&limit=${LIMIT}`,
  // laws: لا عمود نشر (كل الصفوف عامة)، والفلترة الحقيقية في isArchivableItem
  // (رابط تحميل أو نصّ قانوني كامل) — نفس شرط البناء.
  laws: `select=id,title,slug,law_number,official_gazette_number,publication_date,pdf_url,description,content,created_at,updated_at&order=created_at.desc&limit=${LIMIT}`,
  lexicon_terms: `select=id,term_ar,term_fr,definition,category,slug,updated_at,created_at&order=created_at.desc&limit=${LIMIT}`,
};

/**
 * استعلامات بديلة تُجرَّب عند 400 (عمود غير موجود في القاعدة).
 *
 * lexicon_terms ليس فيها عمود slug في الإنتاج، فيرجع PostgREST خطأ 400
 * «Could not find the 'slug' column» وتفرغ النتيجة كلها — أي أن مصطلحاً
 * جديداً لا يظهر في الخريطة ولا تُخدم صفحته. البديل يطلب نفس الصفوف بدون
 * slug؛ وهذا آمن لأن slug يُحسب وقت الطلب من term_ar في cmsUrls.js و
 * contentFallback.js (termKey → slugify).
 */
const TABLE_FALLBACKS = {
  lexicon_terms: `select=id,term_ar,term_fr,definition,category,updated_at,created_at&order=created_at.desc&limit=${LIMIT}`,
};

/** مدة صلاحية الذاكرة القصيرة داخل الـisolate — طلب واحد لكل دقيقة كافٍ. */
const CACHE_TTL_MS = 60_000;

let memo = { at: 0, value: null, promise: null };

export function cmsCredentials(env = {}) {
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  const key = String(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY);
  return { url, key };
}

async function fetchTable({ url, key }, table, query, { timeoutMs = 8000 } = {}) {
  const endpoint = `${url}/rest/v1/${table}?${query}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(timeoutMs),
    // لا تخزين وسيط: الخريطة الديناميكية يجب أن ترى ما نُشر للتو.
    cache: "no-store",
  });

  if (!response.ok) {
    const error = new Error(`${table}: HTTP ${response.status}`);
    // @ts-expect-error - الحقل للاستخدام الداخلي فقط (تمييز خطأ المخطط).
    error.status = response.status;
    throw error;
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

/**
 * يجلب جدولاً واحداً، مع إعادة محاولة بالاستعلام البديل عند 400 فقط.
 * الخطأ 400 يعني «عمود غير موجود» — أي مخطط أقدم/أحدث مما نطلبه — أما
 * باقي الأخطاء (شبكة، مهلة، 401) فلا تُخفى: تُعاد كما هي ليُكتفى
 * بالنسخة الثابتة.
 */
async function fetchTableWithFallback(credentials, table, query, options) {
  const fallback = TABLE_FALLBACKS[table];
  if (!fallback) return fetchTable(credentials, table, query, options);
  try {
    return await fetchTable(credentials, table, query, options);
  } catch (error) {
    if (/** @type {{status?: number}} */ (error).status !== 400) throw error;
    return fetchTable(credentials, table, fallback, options);
  }
}

/**
 * يجلب كل الجداول المنشورة. الفشل غير قاتل: تُرجع { ok:false } فيُكتفى
 * بالنسخة الثابتة — الفهرسة لا يجوز أن تتعطل بتعطل خدمة خارجية.
 */
export async function loadPublishedCatalog(env, { timeoutMs = 8000, force = false } = {}) {
  if (!force && memo.value && Date.now() - memo.at < CACHE_TTL_MS) return memo.value;
  if (!force && memo.promise) return memo.promise;

  const credentials = cmsCredentials(env);
  const promise = (async () => {
    const names = Object.keys(TABLE_QUERIES);
    const results = await Promise.all(
      names.map(async (name) => {
        try {
          return { name, rows: await fetchTableWithFallback(credentials, name, TABLE_QUERIES[name], { timeoutMs }), ok: true };
        } catch (error) {
          return { name, rows: [], ok: false, error: String(error?.message || error) };
        }
      }),
    );

    const value = {
      ok: results.every((result) => result.ok),
      errors: results.filter((result) => !result.ok).map((result) => result.error),
      articles: results.find((r) => r.name === "articles")?.rows ?? [],
      news: results.find((r) => r.name === "news")?.rows ?? [],
      pdfs: results.find((r) => r.name === "pdf_summaries")?.rows ?? [],
      laws: results.find((r) => r.name === "laws")?.rows ?? [],
      lexicon: results.find((r) => r.name === "lexicon_terms")?.rows ?? [],
      at: new Date().toISOString(),
    };

    memo = { at: Date.now(), value, promise: null };
    return value;
  })();

  memo.promise = promise;
  try {
    return await promise;
  } catch (error) {
    memo = { at: 0, value: null, promise: null };
    return {
      ok: false,
      errors: [String(error?.message || error)],
      articles: [],
      news: [],
      pdfs: [],
      laws: [],
      lexicon: [],
      at: new Date().toISOString(),
    };
  }
}

/** للاختبارات: تصفير الذاكرة بين الحالات. */
export function resetCatalogCache() {
  memo = { at: 0, value: null, promise: null };
}
