/**
 * جلب المحتوى المنشور من نظام الإدارة (Supabase) لوقت البناء.
 *
 * تُستعمل هذه الوحدة من مكانين، ويجب أن يعطيا نفس القائمة بالضبط:
 *   1) scripts/generate-sitemap.mjs — لنشر روابط المحتوى المنشور.
 *   2) scripts/prerender.mjs — لتوليد ملف HTML ثابت لكل رابط منهما.
 *
 * التطابق شرطٌ لا خيار فيه: رابط في خريطة الموقع بلا ملف ثابت يقابله يُقرأ
 * 404 (لا يوجد SPA fallback على Cloudflare Pages)، وهو أسرع طريق إلى
 * «Discovered – currently not indexed» في Search Console. لهذا السبب
 * prerender يكتب dist/sitemap.xml مُصفّاة على الصفحات المولّدة فعلاً.
 *
 * الفشل غير قاتل: بلا شبكة (بناء معزول) أو بلا مفاتيح، تُرجع الوحدة
 * { ok: false } ويكتفي البناء بالبيانات المحلية. الفهرسة لا يجوز أن تتعلق
 * بتوفر خدمة خارجية.
 *
 * ملاحظة: لا زبون Supabase هنا — استدعاء PostgREST مباشرة عبر fetch مع
 * AbortSignal.timeout. السبب أن prerender.mjs يُشغَّل بـ node مباشرة، فلا
 * ينبغي أن يعتمد على حزمة @supabase/supabase-js فقط لقراءة جدول.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://rfhjmtdblmarhlfftlmg.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaGptdGRibG1hcmhsZmZ0bG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTE5NzgsImV4cCI6MjA5OTc4Nzk3OH0.uI2_WCQSERz0jgYPuy1-AiWuVtDcJlFKd7hZsaQ1r5Q";

/** الحد الأقصى لكل جدول — يكفي لموقع بحجم ميزان ويتفادى جذاذات لا تنتهي. */
const LIMIT = 500;

const TABLE_QUERIES = {
  // articles.status = 'published' هو criterion النشر في هذا الجدول.
  articles: `select=id,title,slug,excerpt,content,meta_title,meta_description,published_at,updated_at,created_at,cover_image&status=eq.published&order=published_at.desc.nullslast&limit=${LIMIT}`,
  // news يستعمل عموداً منطقياً للنشر، ولا يملك updated_at إطلاقاً
  // (ذكرُ عمود غير موجود يُرجع خطأ 400 ويُفرغ النتيجة كلها — وكان السكربت
  // السابق يطلبه، فجلب صفر أخبار من CMS طوال الوقت بصمت).
  news: `select=id,title,slug,summary,content,source,image_url,published_at,created_at&is_published=eq.true&order=published_at.desc.nullslast&limit=${LIMIT}`,
  pdf_summaries: `select=id,title,slug,description,semester,professor,file_url,updated_at,created_at&status=eq.published&order=created_at.desc&limit=${LIMIT}`,
  // content: نص القانون (نص صافٍ، فقرات مفصولة بسطر فارغ) — يُعرض في
  // صفحة القانون الثابتة وفي llms-full.txt. official_gazette_number و
  // publication_date يظهران كبيانات وصفية على الصفحة وفي JSON-LD.
  // pdf_url: رابط ملف النص — كان غائباً من هذا الاستعلام، فكانت كل صفحة
  // قانون مولَّدة ثابتة تُبنى بزر تحميل فارغ (رابط "" بدل ملف النص)، بينما
  // تعرضها الواجهة نفسها صحيحة لأنها تقرأ العمود مباشرة من القاعدة.
  laws: `select=id,title,slug,law_number,official_gazette_number,publication_date,pdf_url,description,content,created_at,updated_at&order=created_at.desc&limit=${LIMIT}`,
};

async function fetchTable(name, queryString, { timeoutMs, signal }) {
  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${name}?${queryString}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${name}: HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * سجلّ صالح للنشر؟
 *
 * كان الشرط «slug مكتوب غير فارغ» فقط. وهو شرط يخفي المحتوى لا يحميه:
 * المحرر يكتب العنوان وينسى خانة المعرّف، فيُسقط السجلّ كله من الخريطة ومن
 * الملفات المولَّدة بينما يظهر في الواجهة التي تقرأ القاعدة مباشرة — أي صفحة
 * حقيقية بلا رابط في sitemap.xml. دوال المعرّفات في url-policy تبني المعرّف
 * من slug ← title ← id، فالسجلّ صالح متى وُجد واحد من الثلاثة.
 */
export function hasPublishableIdentity(row) {
  if (!row || typeof row !== "object") return false;
  if (typeof row.slug === "string" && row.slug.trim()) return true;
  if (typeof row.title === "string" && row.title.trim()) return true;
  const id = row.id;
  return id !== undefined && id !== null && String(id).trim() !== "";
}

/**
 * @returns {Promise<{ok: boolean, error?: string, errors: string[], articles: any[], news: any[], pdfs: any[], laws: any[]}>}
 */
export async function fetchPublishedCmsContent({ timeoutMs = 25000 } = {}) {
  const empty = { ok: false, errors: [], articles: [], news: [], pdfs: [], laws: [] };

  if (!SUPABASE_URL.includes("supabase.co")) {
    return { ...empty, error: "VITE_SUPABASE_URL غير مضبوط" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const signal = controller.signal;

    // allSettled لا Promise.all: الأربعة استعلامات مستقلة، وفشل واحد منها
    // (عمود أُعيدت تسميته، جدول لم تُنشأ ترقيته بعد، انقطاع عابر) كان يُسقط
    // الأربعة معاً باستثناء واحد — فتختفي كل مقالات CMS وكل ملفات الأرشيف من
    // خريطة الموقع بسبب جدول واحد. الآن: الجدول الفاشل يفرغ ويُعلن، والبقية
    // تُنشر.
    const settled = await Promise.allSettled([
      fetchTable("articles", TABLE_QUERIES.articles, { timeoutMs, signal }),
      fetchTable("news", TABLE_QUERIES.news, { timeoutMs, signal }),
      fetchTable("pdf_summaries", TABLE_QUERIES.pdf_summaries, { timeoutMs, signal }),
      fetchTable("laws", TABLE_QUERIES.laws, { timeoutMs, signal }),
    ]);

    const errors = [];
    const take = (index, label) => {
      const result = settled[index];
      if (result.status === "fulfilled") return Array.isArray(result.value) ? result.value : [];
      const reason = result.reason;
      const message =
        reason?.name === "AbortError" ? `انتهت المهلة (${timeoutMs}ms)` : reason?.message || String(reason);
      errors.push(`${label}: ${message}`);
      return [];
    };

    const keep = (rows) => rows.filter(hasPublishableIdentity);

    const articles = keep(take(0, "articles"));
    const news = keep(take(1, "news"));
    const pdfs = keep(take(2, "pdf_summaries"));
    const laws = keep(take(3, "laws"));

    return {
      ok: errors.length === 0,
      error: errors.length ? `تعذر جلب بعض جداول CMS — ${errors.join(" | ")}` : undefined,
      errors,
      articles,
      news,
      pdfs,
      laws,
    };
  } catch (error) {
    const message = error?.name === "AbortError" ? `انتهت المهلة (${timeoutMs}ms)` : error?.message;
    return { ...empty, error: `تعذر جلب محتوى CMS — ${message}`, errors: [String(message)] };
  } finally {
    clearTimeout(timer);
  }
}

/** تاريخ ISO مختصر (YYYY-MM-DD) من أي حقل تاريخ متاح، أو "". */
export function dateOf(row, fields = ["updated_at", "published_at", "created_at"]) {
  for (const field of fields) {
    const value = row?.[field];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 10);
  }
  return "";
}
