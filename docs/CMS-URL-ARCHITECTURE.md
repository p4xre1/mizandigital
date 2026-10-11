# توليد الروابط من الـCMS — معمارية ثلاث طبقات

**TL;DR.** خريطة الموقع وصفحات المحتوى كانت تُولَّد **وقت البناء فقط**، فما يُنشر
في لوحة التحكم يبقى غائباً عن `sitemap.xml` وعن الموقع (404) إلى أن يُعاد البناء.
هذا الملف يوثّق الطبقات الثلاث التي أُضيفت لسدّ النافذة: طبقتان تعملان **فوراً
بلا إعداد** (خريطة ديناميكية + بديل وقت-الطلب)، وطبقة **تُثبّت** النتيجة بإعادة
بناء كاملة عبر Webhook عند كل نشر.

---

## 1. المشكلة كما كانت

| # | العَرَض | السبب |
|---|---|---|
| 1 | مقال/نصّ منشور في Supabase لا يظهر في `sitemap.xml` | الخريطة تُولَّد في `prebuild` من `scripts/lib/cms-content.mjs` وقت البناء فقط |
| 2 | رابط `/articles/<slug>` الجديد يعود **404** | `prerender.mjs` يكتب ملف HTML ثابتاً لكل سجلّ موجود وقت البناء؛ ما بعده لا ملف له |
| 3 | النافذة تصل إلى ساعات | `refresh-content.yml` يعيد البناء كل 6 ساعات (أو يدوياً)؛ وقبل إضافة الطبقتين كان الانتظار إجبارياً |

القاعدة الحاكمة في المشروع: **لا رابط في `sitemap.xml` بلا صفحة تخدمه** (وإلا
يُقرأ الخطأ «Soft 404» في Search Console). لذلك كان الحلّ الوحيد سابقاً هو
إعادة البناء. اليوم صار لكل رابط منشور صفحة تخدمه فعلاً من اللحظة الأولى.

## 2. المعمارية بعد التغيير

```
Supabase (articles / news / pdf_summaries / laws / lexicon_terms)
        │
        ├── وقت البناء (كما كان) ─────────────────────────────► صفحة ثابتة + سطر في sitemap
        │   scripts/lib/cms-content.mjs → prerender.mjs / generate-sitemap.mjs
        │
        ├── وقت الطلب: functions/_shared/cmsCatalog.js ─┬─► functions/sitemap.xml.js
        │   (ذاكرة داخلية 60 ثانية)                    │   (يضيف الروابط الجديدة إلى XML فوراً)
        │                                               │
        │                                               └─► functions/[[path]].js
        │                                                   (يخدم الـslug المنشور غير المبني
        │                                                    200 + وسوم head صحيحة بدل 404)
        │
        └── عند النشر: Supabase Database Webhook ──► functions/api/revalidate.js
                                                        └─► Cloudflare Deploy Hook
                                                            (إعادة بناء كاملة → صفحة ثابتة دائمة)
```

### الطبقة 1 — خريطة ديناميكية: `functions/sitemap.xml.js`

- تقرأ النسخة المبنية من `/sitemap.xml` عبر `env.ASSETS` (المصدر الأول: كل
  رابط فيها له ملف فعلاً)، ثم تضيف إليها روابط CMS غير الموجودة فيها.
- الروابط تُبنى بنفس دوال المعرّفات المستعملة في البناء والواجهة
  (`shared/seo/url-policy.js`): `slug ← عنوان ← id`، والأرشيف بنفس شرط
  `isArchivableItem` (رابط تحميل أو نصّ)، ومصطلح المعجم المكرر محلياً يُستثنى.
- لا `<loc>` مكرر (مقارنة حرفية)، ولا XML مكسور (هروب كامل للأحرف)، وعند
  تعطل القاعدة تُعاد النسخة المبنية كما هي بلا خطأ.

### الطبقة 2 — بديل وقت-الطلب: `functions/[[path]].js` + `functions/_shared/contentFallback.js`

- يعمل فقط على مسارات المحتوى ذات المقطع الواحد: `/articles/<slug>`،
  `/news/<slug>`، `/pdf/<slug>`، `/lexicon/<slug>`، وفقط عند **404** من الأصول.
- يتحقق من القاعدة: إن لم يكن السجلّ موجوداً فعلاً يبقى **404 حقيقياً** (لا
  Soft 404 ولا فهرسة لصفحة وهمية).
- إن وُجد: يخدم هيكل التطبيق 200 بعد حقن وسوم الرأس — `title` (بـ`brandTitle`)،
  `description` (بـ`buildMetaDescription`)، `canonical`، `og:*`، وJSON-LD
  (`WebPage` + `Article`/`DefinedTerm`) — و`robots: index, follow` بدل
  `noindex` الخاص بالهيكل. والواجهة تجلب المحتوى بنفسها بعد التحميل.
- بعد أول بناء تالٍ يصبح للرابط ملف ثابت، فلا يُستدعى هذا المسار أصلاً.

### الطبقة 3 — إعادة البناء عند النشر: `functions/api/revalidate.js`

يجعل النشر في لوحة التحكم يصل إلى ملف ثابت خلال دقائق بدل انتظار الدورة
الست ساعية. الإعداد مرة واحدة:

1. **Cloudflare Pages → Settings → Environment variables:**
   - `REVALIDATE_SECRET` = نصّ عشوائي طويل.
   - `CF_DEPLOY_HOOK_URL` = رابط Deploy Hook (Settings → Builds & deployments →
     Deploy hooks → Add).
2. **Supabase → Database → Webhooks → Create** لكل جدول من
   `articles`, `news`, `pdf_summaries`, `laws`, `lexicon_terms`:
   - Events: `Insert`, `Update` — Method: `POST`
   - URL: `https://www.mizan.page/api/revalidate?secret=<REVALIDATE_SECRET>`
   - (أو ترويسة `Authorization: Bearer <REVALIDATE_SECRET>`)
3. **اختبار بلا إطلاق بناء:** `GET /api/revalidate?dry=1&secret=<...>` →
   يخبرك هل الإعداد مكتمل.
4. بلا `REVALIDATE_SECRET` تُرجع النقطة `503` ولا تنفّذ شيئاً (لا سرّ افتراضي
   في الكود)، وتحديد المعدل يمنع تكرار البناء (6 نداءات / 5 دقائق لكل IP).

> بديل/احتياط: `.github/workflows/refresh-content.yml` يبقى يعمل كل 6 ساعات
> ويولّد الخريطة بـ`--require-cms`، وإن ضُبط سرّ `CLOUDFLARE_DEPLOY_HOOK_URL`
> في GitHub يطلق إعادة بناء كاملة. الطبقات لا تتعارض: الديناميكية تسدّ
> النافذة، وإعادة البناء تُثبّت النتيجة في ملفات ثابتة.

## 3. ما لم يتغيّر (عن قصد)

- `shared/seo/url-policy.js` يبقى **المصدر الوحيد** للروابط في الواجهة
  والبناء والحافة — لا نسخة سابعة لخوارزمية الـslug.
- الخريطة المبنية تبقى كما هي في `dist/sitemap.xml`؛ الوظيفة لا تكتب أي ملف.
- حذف `functions/sitemap.xml.js` أو `functions/_shared/cmsCatalog.js` يعيد
  السلوك السابق حرفياً بلا أي تغيير آخر.
- لا أسرار جديدة: مفتاح anon المستعمل وقت الطلب هو نفسه المضمَّن في حزمة
  الواجهة، والقراءة العامة تحكمها سياسات RLS نفسها.

## 4. الاختبارات

`tests/cms-runtime-urls.test.ts` — 15 اختباراً على الوحدات الخالصة:

- بناء روابط CMS بنفس دوال البناء (بما فيها سجلّ بلا slug وبلا عنوان وبلا id).
- استثناء ملف أرشيف بلا رابط تحميل وبلا نصّ، واستثناء مصطلح المعجم المحلي.
- الدمج: لا `<loc>` مكرر، هروب `&`، ملف بلا `</urlset>` لا يُلمس، ملف بلا
  إضافات يعود حرفياً.
- مطابقة المسارات (مقطع واحد فقط)، ومطابقة السجلّات (بما فيها ملحق `-<id>`)،
  وحقن الرأس: `noindex → index` + `canonical` + JSON-LD + عدم تكرار الوسوم.

`tests/cms-catalog-fallback.test.ts` — 4 اختبارات على اختلاف مخطط القاعدة:

- `lexicon_terms` **ليس فيها عمود `slug` في الإنتاج**، فيرجع PostgREST خطأ
  `400` («Could not find the 'public.lexicon_terms.slug' column») وتفرغ نتيجة
  الجدول كله — أي أن المصطلح الجديد لا يظهر في الخريطة ولا تُخدم صفحته.
- `cmsCatalog.js` يعيد الطلب مرة واحدة بالاستعلام البديل (بدون `slug`)،
  والـslug يُحسب وقت الطلب من `term_ar` في `cmsUrls.js` (`cmsLexiconSlug`)
  و`contentFallback.js` (`termKey`) — لا حاجة إلى ترحيل (migration) ولا إلى
  عمود جديد في القاعدة.
- الإعادة محصورة في `400` فقط: أي خطأ آخر (مهلة، شبكة، `504`، `401`) لا
  يُخفى ولا يُعاد، بل يُسجَّل في `errors` ويُكتفى بالنسخة الثابتة.
- فشل الاستعلامين معاً ⇒ `{ ok:false, lexicon: [] }`: الخريطة ترجع
  byte-identical للخريطة المبنية ولا تكسر الفهرسة.
