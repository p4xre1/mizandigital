/**
 * مصطلحات المعجم المبنية محلياً — مجموعة المفاتيح المشتركة بين طبقتَي CMS.
 *
 * لماذا مشتركة؟
 * -------------
 * `src/data/lexicon.json` (323 مصطلحاً) يُبنى معه صفحة ثابتة لكل مصطلح، وقد
 * يحمل الجدول `lexicon_terms` في Supabase المصطلح نفسه (رصدت المراجعة نسختين
 * مكررتين). إن ظهر المصطلح مرّتين — صفحة مبنية وصفحة CMS بمعرف مختلف — فهو
 * محتوى مكرر بإشارتين متناقضتين: الخريطة تستثنيه بينما تُخدم صفحته 200.
 *
 * لذلك يستعمل الطرفان **نفس** المجموعة ونفس الذاكرة:
 *   • functions/sitemap.xml.js — لا يضيف رابط المصطلح المبني محلياً.
 *   • functions/[[path]].js — لا يخدم slug المصطلح المبني محلياً (404 حقيقي).
 *
 * المصدر هو ملف المرجعية المبنية `/reference/lexicon.json` من ASSETS (لا
 * شبكة خارجية)، والمفتاح هو `termKey(term_ar)` نفسه المستعمل في المقارنة.
 */

import { termKey } from "./cmsUrls.js";

/** ذاكرة داخل الـisolate: ملف المرجعية لا يتغير إلا ببناء جديد. */
const LOCAL_TERMS_TTL_MS = 300_000;
let cache = { at: 0, value: null };

/**
 * @param {{ASSETS: {fetch: (req: Request) => Promise<Response>}}} env
 * @param {string} origin
 * @returns {Promise<Set<string>>} مفاتيح المصطلحات المبنية محلياً
 */
export async function loadLocalLexiconTerms(env, origin) {
  if (cache.value && Date.now() - cache.at < LOCAL_TERMS_TTL_MS) return cache.value;

  const keys = new Set();
  try {
    const response = await env.ASSETS.fetch(new Request(`${origin}/reference/lexicon.json`, { method: "GET" }));
    if (response.ok) {
      const data = await response.json();
      for (const item of data?.items ?? []) {
        const key = termKey(item?.term_ar);
        if (key) keys.add(key);
      }
    }
  } catch {
    // بلا ملف المرجعية نُكمل بلا استثناء — الأسوأ ظهور مصطلح مكرر بمعرّف
    // CMS، وهو أفضل من إسقاط كل مصطلحات CMS من الخريطة أو ردّ 404 على
    // مصطلح منشور فعلاً.
  }

  cache = { at: Date.now(), value: keys };
  return keys;
}

/** للاختبارات: تصفير الذاكرة بين الحالات. */
export function resetLocalLexiconCache() {
  cache = { at: 0, value: null };
}
