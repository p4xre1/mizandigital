# سياسة الروابط القانونية — `SEO-URL-POLICY.md`

> ملف تشغيلي، ليس توثيقاً مؤجلاً. كل سطر هنا مُنفَّذ في الكود ومُغطَّى باختبار
> في `tests/seo-canonical.test.ts`، وأي كسر له يُسقط `pnpm seo:audit`.

---

## 1. القاعدة

النطاق القانوني الوحيد هو **`https://www.mizan.page`** (بـ `www`، وبـ HTTPS)،
وكل رابط على الموقع **بلا شرطة مائلة في نهايته** — بلا استثناء، حتى الجذر:

| | الشكل الصحيح | الشكل المرفوض |
|---|---|---|
| الجذر | `https://www.mizan.page` | `https://www.mizan.page/` |
| كلية | `https://www.mizan.page/schools/fsjes-ait-melloul` | `…/fsjes-ait-melloul/` |
| مصطلح | `https://www.mizan.page/lexicon/التقادم` | `…/التقادم/` |
| خبر | `https://www.mizan.page/news/<slug>` | `…/<slug>/` |
| قسم | `https://www.mizan.page/schools` | `…/schools/` |

ونتيجة القاعدة: **لا يوجد إطلاقاً** مساران يُنتجان الصفحة نفسها. `/x` هو
الرابط، و`/x/` يُعاد توجيهه 301 إليه، ولا يظهر أيٌّ منهما في `sitemap.xml`
بشرطة نهاية، ولا يحمل `<link rel="canonical">` ولا `og:url` ولا `JSON-LD.url`
سوى الصيغة الأولى.

### ما لا تفعله

- **لا تضبط `trailingSlash`** في أي إعداد بناء، ولا تكتب قاعدة في `_redirects`
  تضيف شرطة أو تُبقي نسختين. القاعدة الوحيدة المكتوبة في مكان واحد هي
  `functions/[[path]].js:77` (شرطة زائدة → 301 إلى بلا شرطة). أضفتَ قاعدة
  ثانية؟ سيكون أحدهما خاطئاً.
- لا تكتب `https://www.mizan.page/...` نصاً يدوياً في مكوّن. استخدم
  `canonicalFor("/path")` أو الدالة الخاصة بالنوع.
- لا تُرسل نسخة `*.html` في `sitemap.xml`، ولا تضع معاملات (`?utm=`) داخل
  `canonical`.

---

## 2. أين تُنفَّذ القاعدة

| الطبقة | الملف | ما يفعله |
|---|---|---|
| المصدر الوحيد | `shared/seo/url-policy.js` | `SITE_ORIGIN`، `normalizePath`، `canonicalUrl`، دوال `canonical*` لكل نوع، مولّدات المعرّفات `slugify`/`lexiconSlug`/`contentSlug`/`docSlug`، `isIndexablePath` |
| واجهة React | `src/lib/canonical.ts` | غلاف مُنمَّط (types) يعيد تصدير السياسة + `canonicalFor(path)` و`BASE_URL`. **لا يُنفِّذ شيئاً هنا** — إعادة التنفيذ تعني انحرافاً |
| وسوم الرأس | `src/components/seo/SEOHead.tsx` | `canonical = canonicalUrl(prop أو pathname)`؛ `og:url`، `hreflang="ar"`، `hreflang="x-default"` كلها تساوي `canonical`؛ و breadcrumbs و schemas المحقونة تُمرَّر على `canonicalUrl` |
| الروابط الداخلية | `src/lib/utils/generateSlug.ts` + الصفحات | المسار من `itemPath.<type>(slug)`؛ لا شرطة نهاية في أي `to=`/`href=`/`router.push` |
| الملفات الثابتة | `scripts/prerender.mjs` | `absoluteUrl = canonicalUrl`، وتبديل عنيف لأنماط `<title>`/`description`/`canonical`/`og:url` (يرمي خطأً إن نقص نمط، فلا صامت بلا وسم)، و**`dist/sitemap.xml` مُصفّاة على الصفحات المولَّدة فعلاً** مع رفض قاطع لأي `<loc>` بشرطة |
| خريطة الموقع | `scripts/generate-sitemap.mjs` | روابط مُطلقة بلا شرطة، محتوى منشور فقط (`articles.status="published"`، `news.is_published`) |
| تغذية و llms | `scripts/generate-feed.mjs` + `generate-llms.mjs` + `generate-llms-enhanced.mjs` | `llms.txt` له كاتب واحد (المُولّد المختصر، وهو ما يشغّله `prebuild`)، والمُولّد المعزَّز يكتب `llms-full.txt` وحده انطلاقاً من نفس القائمة. `pnpm seo:llms` يحدّث الزوج معاً — لا ملف بمرجعين |
| التحويل | `functions/[[path]].js` | `301` من `/x/` إلى `/x` مع حفظ المعاملات (والجذر مستثنى). و`public/_redirects` لا يحمل إلا قواعد مسارات صالحة لـ Pages (بادئات اللغات + معرّف تاريخي) — الروابط المطلقة و`301!` غير مدعومين في Pages فتُسقَط القاعدة بصمت |
| حالة 404 والهيكل التطبيقية | `scripts/prerender.mjs` → `dist/404.html`، هيكل لكل مسار تطبيقي (`dist/login.html` … `dist/app.html`)؛ `functions/[[path]].js` يسلّم `app.html` عند غياب أصل في مسار عميل | انظر §4 ب |
| البوابات | `shared/seo/technical-checks.js` | `checkSitemap`، `checkCanonicalPolicy`، `checkSitemapCoverage`، `checkUrlStructure`؛ `noindex` على مسار غير مفهرس ليس خللاً في `head` ولا canonical مطلوب في `canonical` |

### نصوص الميتا: عنوان ووصف متميّزان لكل صفحة

تقرير سيادي خارجي قال «Non-canonical على كل الموقع تقريباً» رغم أن
`<link rel="canonical">` كان صحيحاً في كل ملف. السبب لم يكن الوسم بل **النص**:
الرؤوس كانت تُبنى في أربع نسخ—`SEOHead` بسقف 65 وعلامة «| الميزان الرقمية»،
و`usePageTitle` افتراضيها «منصة ميزان | المكتبة القانونية المغربية»،
و`scripts/prerender.mjs` بنسخته، و`scripts/lib/meta-description.mjs`
«نسخة طبق الأصل» من `src/lib/seo/description.ts` بحدّ أدنى 120 بدل 140. أي
صفحة بلا ملف ثابت (بحث، دخول، ملف شخصي، أسعار، لوحة تحكم) كانت ترث رأس
الرئيسية حرفياً، فتُقرأ كنسختها.

الحلّ: **طبقة نصّ واحدة** `shared/seo/meta-copy.js`، يستوردها الجميع.

| القاعدة | القيمة | أين تُطبَّق |
|---|---|---|
| `<title>` | هدف 60، سقف 65 | `fitTitle` — تُسقط العلامة أولاً، ثم تحذف الذيل بعد النقطتين أو أداة الربط، وتبتر على حدّ كلمة كآخر حلّ فقط |
| `description` | 140–160 (الحد الفاصل 120–165) | `buildMetaDescription` — يُلحَق السياق ثم `DESC_TAIL`، ولا يُبتر نصّ الصفحة نفسه لالحاق حشو |
| اسم كلية طويل | ≤60 | `abbreviateFaculty`: «كلية العلوم القانونية والاقتصادية والاجتماعية بطنجة» ← «كلية الحقوق بطنجة | دليل الطالب» (31 حرفاً)؛ الاسم الكامل يبقى في H1 و`EducationalOrganization.name` |
| مصطلح مكرر في البيانات | عنوان متميّز لكل صفحة | «الرهن الحيازي» له سجلّان: المقابل الفرنسية تُدخل في العنوان `(Nantissement)` و`(Gage)` بدل صفحتين بعنوان واحد |
| صفحات المنفعة | لا فهرسة | `UTILITY_ROUTES` نصّ خاص لكل مسار + `noindex, follow`؛ و`SEOHead` يشتق `noindex` من `isIndexablePath(pathname)` فلا تُنساه صفحة |
| البوابة | صفر تكرار | `checkMetadataUniqueness` في `pnpm seo:audit` (قسم `metaCopy`) يقيس الوحدة على **كل** `dist/*.html` لا على عيّنة |

القياس بعد الجولة: **342 ملفاً، 342 عنواناً متميّزاً، 342 وصفاً متميّزاً، صفر
تكرار**؛ العناوين بين 22 و65 حرفاً والأوصاف بين 135 و160.

> **للمراجع القادم من Next.js**: لا `app/**/page.tsx` ولا `generateMetadata` هنا —
> المكافئ هو `SEOHead` (العميل) + `scripts/prerender.mjs` (الملف الثابت)، وكلاهما
> يقرأ من نفس الطبقتين: `shared/seo/url-policy.js` للروابط و`shared/seo/meta-copy.js`
> للنصوص. إضافة `generateMetadata` تعني نسخة خامسة تنحرف، لا إصلاحاً.

### لماذا `shared/`؟

لأن `vite` (TS) و`node scripts/*` (ESM خالص) يقرآن نفس الملف. أول نسخة من هذا
العمل كان فيها `lib/canonical.ts` للواجهة ونسخة أخرى داخل `prerender.mjs`؛
انفصلتا في 7 عناوين عربية مختلفة التطبيع، فخرجت روابط `/pdf/*` مكسورة في
الخريطة. الملف الواحد ألغى الفئة كلها من الأعطال.

---

## 3. JSON-LD والرابط القانوني

الحقول التي تشير إلى صفحة يجب أن تساوي **نفس** نص `rel="canonical"`:

- `DefinedTerm.url` + `DefinedTermSet.url` لصفحات المعجم (`src/lib/seo/schema.ts`
  → `generateDefinedTermSchema`).
- `EducationalOrganization.url` = رابط الصفحة على ميزان؛ **والموقع الرسمي
  للكلية يذهب إلى `sameAs`** لا إلى `url` (كان `url` يشير إلى موقع الجامعة،
  فتُقرأ العقدة كأنها تتكلم عن غيرها وتنقطع سلسلة `mainEntity`).
- `NewsArticle.url` + `datePublished` + `dateModified` + `author` + `publisher`
  للأخبار. التوقيع الفردي يُنشَر `Person`، وعند غياب كاتب حقيقي تبقى العقدة
  كيان التحرير (`Organization`) بدل Person وهمي.
- `Organization` و `WebSite` + `SearchAction` بنطاق موحّد:
  `https://www.mizan.page/search?q={search_term_string}`.
- `BreadcrumbList` على صفحات الكلية والمصطلح والخبر والمقال والفعالية.

`SEOHead` يمرّر كل عقدة محقونة على `canonicalUrl`، فلا يُكتب نطاق يدوي داخل
مخطط.

---

## 4. قائمة التحقق قبل النشر

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm seo:audit
```

و`pnpm seo:audit` يمر على **كل** ملف في `dist/`:

1. `<link rel="canonical">` واحد، مطلق، على `https://www.mizan.page`، بلا شرطة
   نهاية، **مطابق حرفياً** لمسار الصفحة، و`og:url` يساويه → بوابة `canonical`.
2. كل `<loc>` في الخريطة بلا شرطة، بلا `.html`، بلا معاملات، على النطاق
   الموحّد، بلا تكرار ولا زوج `/x` و`/x/` → بوابة `sitemap`.
3. تغطية ثنائية: لا `<loc>` بلا ملف HTML مولَّد، ولا صفحة فهرسَة خارج
   الخريطة → بوابة `sitemapCoverage`.
4. لا مسار في الخريطة يخالف سياسة الشرطة → بوابة `urlStructure`.
5. كل صفحة لها رابط داخلي واحد على الأقل → بوابة `orphanPages`.

الحالة المرجعية بعد هذا العمل: `95/100`، والبوابات الأربع أعلاه خضراء على 330
صفحة. المتبقي الأصفر اختياري: طول `<title>` لصفحات قليلة (أسماء كليات
وأخبار كاملة الطول — تُختصر في العرض لا في البيانات) وتحذير CSP
`'unsafe-inline'`.

### ب. حالة 404: لا «نجاح» وهمي ولا canonical مستعار

قبل هذا العمل كان أي رابط غير معروف يُسلَّم منه `dist/index.html` بحالة **200**:
جملة واحدة على كل رابط منسيّ، `index, follow`، و`rel="canonical"` يشير إلى
الرئيسية — أي أن كل صفحة ميتة كانت تعلن نفسها نسخة من الصفحة الأولى. القاعدة:

- `scripts/prerender.mjs` يكتب **`dist/404.html`**: `<h1>الصفحة غير موجودة</h1>`،
  `noindex, follow`، canonical على `https://www.mizan.page/404`، وروابط إلى
  الأقسام الستة. القالب كامل (سكربتات و`#root`) فـ React يركَّب على أي حال.
- `404` أُضيف إلى `NON_INDEXABLE_SEGMENTS`: لا يدخل الخريطة، ولا يُطلب منه أن
  يكون «صفحة يتيمة»، ولا يُحسب في التغطية.
- المسارات التطبيقية الحقيقية (تسجيل دخول، ملف شخصي، لوحة تحكم، بحث، حفظ،
  مدفوعات، أدوات Pro) لها **ملفات هيكل** خاصة بها بحالة 200 مع `noindex`
  وcanonical على نفسها، فلا ترث رابط الرئيسية.
- المسارات الديناميكية بلا ملف (`/u/<username>`، `/download/<id>`،
  `/admin/<...>`، `/pro-tools/<slug>`) تُسلَّم من `dist/app.html` عبر دالة
  Pages: **200 + `noindex, follow`** (ترويسة `X-Robots-Tag`)، بلا canonical ولا
  hreflang. الشرط: يُسلَّم الهيكل فقط حين لا يوجد أصل لهذا المسار *و* المسار
  يبدأ بقائمة مسارات العميل المعروفة — ما عدا ذلك يبقى 404.
- `/pro-tools` مُنع في السياسة: كان «مفهرساً» بلا ملف وبلاentry في الخريطة،
  وهي الوصفة الكاملة لحالة *Discovered – currently not indexed*. لا رابط داخلي
  في البوابات يشير إليه، فلا خسارة وصلات من المنع.

الحلقة مقفلة: `404.html` وحده كان يجعل كل تحميل مباشر لـ`/login` أو
`/admin/users` صفحة 404، فملف الحالة والهيكل يُسلَّمان معاً أو لا يُسلَّمان.

```bash
curl -I http://127.0.0.1:8799/definitely-not-a-page   # 404 (لا 200)
curl -s  http://127.0.0.1:8799/definitely-not-a-page | grep -o 'noindex[^"]*'
curl -s  http://127.0.0.1:8799/u/quelquun | grep -o 'noindex[^"]*'   # 200 + noindex
curl -s  http://127.0.0.1:8799/login | grep -o 'rel="canonical"[^>]*'  # canonical على نفسه
```

### تحقّق يدوي على الإنتاج

```bash
curl -sI  https://www.mizan.page/schools/fsjes-ait-melloul/ | head -2   # 301
curl -sIL https://www.mizan.page/lexicon/التقادم/ | grep -i "^HTTP"       # 301 → 200
curl -s   https://www.mizan.page/schools | grep -o 'rel="canonical"[^>]*'
curl -s https://www.mizan.page/sitemap.xml | grep -oE '<loc>[^<]+</loc>' | grep -c '/</loc>'   # 0
```

محلياً: خادم ملفات ثابتة **لا** يشغّل Pages Functions، فـ `/x/` ستبدو 404 لا
301. التحقّق الصحيح:

```bash
pnpm build && npx wrangler pages dev dist --port 8799 --compatibility-date=2026-08-01
curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n" http://127.0.0.1:8799/schools/fsjes-tangier/
# 301 → http://127.0.0.1:8799/schools/fsjes-tangier   (و 200 على النسخة بلا شرطة)
curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n" http://127.0.0.1:8799/en/news
# 301 → …/news   (قاعدة _redirects صيغة Pages)
```

`--compatibility-date` ضروري إن كان إصدار workerd أقدم من تاريخ اليوم: بلا
تاريخ صريح يرفض الخادم المحلي الإقلاع (`requires compatibility date … newest
date supported by this server binary`) وتظهر كل الصفحات كأنها 000/404 — خطأ
بيئة لا خطأ موقع.

آخر تشغيل مُوثَّق (dist من هذا العمل): `/schools/fsjes-tangier/` → 301 بلا
شرطة ✓، `/lexicon/<مصطلح>/` → 301 ✓، `/news/<عنوان>/` → 301 ✓، `/` → 200 بلا
حلقة ✓، و`rel="canonical"` في الخبر = `https://www.mizan.page/news/…` بلا شرطة ✓.

---

## 5. خطوات تبقى على المطوّر (خارج المستودع)

1. **Search Console → Sitemaps**: أعد إرسال `https://www.mizan.page/sitemap.xml`
   (نسخة اليوم: 330 رابطاً كلها بلا شرطة). لا تحذف القديمة؛ الإعادة تكفي.
2. **URL Inspection** على أربع عينات، واطلب الفهرسة:
   `/`، `/schools/fsjes-ait-melloul`، `/lexicon/التقادم`، `/news/<أي خبر>`.
   المطلوب: «Canonical user selection» = الرابط المُرسَل، بلا شرطة.
3. بعد 48 ساعة راجع تقرير **Coverage** عن «Duplicate, Google chose different
   canonical» — إن ظهر عنصر جديد فأرسل رابطه مع الـ HTML المُولَّد.
4. **Cloudflare → Rules**: قاعدة Redirect Rules توَحِّد النطاق والبروتوكول
   (`http://…` و `https://mizan.page/*` → `https://www.mizan.page/:splat`,
   301) وتفعّل Always Use HTTPS. هذه الوحدة لا يمكن وضعها في `_redirects`
   (Pages لا يقبل روابط مطلقة في عمود «من»)، وكانت قواعد الملف القديم مكتوبة
   بصيغة Netlify فأُلغيت كلها عند البناء. ولا تضف قاعدة «Add trailing slash» —
   تصطدم بالتحويل في `functions/[[path]].js` وتفتح حلقة.
   بعد الدمج راجع سجل بناء Pages: لا يجب أن يظهر فيه `invalid redirect rules`
   (كان يظهر 12 سطراً ملغى قبل إصلاح صيغة الملف).
5. CMS (جدولا `articles` و`news`): النشر للفهرسة مشروط بـ
   `articles.status = "published"` و`news.is_published = true`. أي سطر خارج
   هذين فلا يصل إلى `sitemap.xml` ولا إلى `feed.xml`. إذا كانت أعمدة الحالة
  مختلفة في مشروع آخر، عدِّل المرشّح في `scripts/lib/cms-content.mjs`.
6. المحتوى (مُرجَّأ، خارج هذا العمل): 9 عناوين أطول من 65 حرفاً، وأوصاف
   قصيرة في بعض صفحات الأخبار، وتوحيد صيغة العلامة («الميزان الرقمية» في الواجهة مقابل
   «ميزان الرقمية» في بعض عناوين prerender).

---

## 6. متى يُعدَّل هذا الملف؟

عند إضافة نوع محتوى جديد (دليل، محكمة، مادة) تُضاف دالة `canonical<Type>`
في `shared/seo/url-policy.js` + اسم المسار في `itemPath` + اختبار في
`tests/seo-canonical.test.ts` + سطر في الجدول أعلاه. **لا** تُنشَر القاعدة في
مكوّن أو سكربت؛ من يفعل ذلك يُنشئ نسخة ثانية تنحرف بعد شهر.
