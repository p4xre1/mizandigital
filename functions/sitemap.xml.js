/**
 * /sitemap.xml الديناميكي — النسخة المبنية + ما نُشر في CMS بعد البناء.
 *
 * المشكلة التي يحلّها
 * --------------------
 * خريطة الموقع في هذا المشروع ثابتة: تُولَّد وقت البناء من Supabase
 * (scripts/generate-sitemap.mjs) وتُصفّى في prerender على الصفحات المولَّدة
 * فعلاً. لذلك أي مقال/نصّ/مصطلح يُنشر من لوحة التحكم يبقى **غائباً عن
 * الخريطة** إلى أن يُعاد البناء — وقد ظلّ آخر بناء متأخراً عن القاعدة
 * بأسابيع (موثّق في .github/workflows/refresh-content.yml).
 *
 * هذا المسار يقرأ النسخة المبنية (المصدر الأول، فهي تضمن أن كل رابط مبني
 * له ملف فعلاً) ثم يضيف إليها — في الذاكرة، بلا كتابة ملف — الروابط
 * المنشورة في CMS وغير الموجودة فيها، بنفس دوال المعرّفات المستعملة في
 * البناء (shared/seo/url-policy.js). النتيجة: الرابط يظهر في XML بعد دقائق
 * من النشر، ويبقى الظهور نهائياً (صفحة ثابتة + سطر مبني) بعد أول بناء تالٍ.
 *
 * الضمانات:
 *   • لا رابط مكرر: المقارنة بالـ<loc> الحرفي قبل الإضافة.
 *   • لا رابط وهمي: نفس شرط البناء (hasPublishableIdentity/isArchivableItem)
 *     ونفس مستثنى المعجم المحلي؛ والرابط يخدمه contentFallback عند الزيارة.
 *   • لا انهيار عند تعطل القاعدة: تبقى النسخة المبنية كما هي (200) وتُقصَّر
 *     مدة التخزين المؤقت.
 *
 * ملاحظة Cloudflare: مسار Functions يسبق الأصل الثابت، لكننا لا نستبدله:
 * نقرأ /sitemap.xml من ASSETS ثم نعيده موسّعاً. تعطيل هذه الوظيفة (حذف
 * الملف) يعيد السلوك السابق حرفياً بلا أي تغيير آخر.
 */

import { loadPublishedCatalog } from "./_shared/cmsCatalog.js";
import { buildCmsEntries, mergeSitemapXml, termKey } from "./_shared/cmsUrls.js";

const BASE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

/** مصطلحات المعجم المبنية محلياً — للاستثناء من النسخة الديناميكية. */
let localTermsCache = { at: 0, value: null };
const LOCAL_TERMS_TTL_MS = 300_000;

async function loadLocalLexiconTerms(env, origin) {
  if (localTermsCache.value && Date.now() - localTermsCache.at < LOCAL_TERMS_TTL_MS) {
    return localTermsCache.value;
  }

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
    // CMS، وهو أفضل من إسقاط كل مصطلحات CMS من الخريطة.
  }

  localTermsCache = { at: Date.now(), value: keys };
  return keys;
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(new Request(`${url.origin}/sitemap.xml`, { method: "GET" }));
  if (!asset.ok) {
    return new Response("Sitemap unavailable", {
      status: 503,
      headers: { ...BASE_HEADERS, "Cache-Control": "no-store" },
    });
  }

  const baseXml = await asset.text();
  const catalog = await loadPublishedCatalog(env);
  const localLexiconTerms = await loadLocalLexiconTerms(env, url.origin);
  const { xml, added } = mergeSitemapXml(baseXml, buildCmsEntries(catalog, { localLexiconTerms }));

  const headers = {
    ...BASE_HEADERS,
    // النسخة الموسّعة تُخزَّن قصيراً فقط: الهدف أن يرى الزاحف المنشورَ الجديد
    // سريعاً، مع ذاكرة داخلية دقيقة واحدة تحمي القاعدة من كل زيارة.
    "Cache-Control": added.length
      ? "public, max-age=300, s-maxage=300, stale-while-revalidate=3600"
      : "public, max-age=900, s-maxage=900",
    "X-Mizan-Cms-Urls": String(added.length),
  };

  return new Response(method === "HEAD" ? null : xml, { status: 200, headers });
}
