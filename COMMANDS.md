# 🛠️ Mizan Digital - Terminal Commands Reference

Quick guide for all development, testing, validation, and build commands for `mizan.page`.

> الملف كان مقطوعاً في منتصفه (ينتهي داخل كتلة أوامر غير مغلقة)، فأُعيد بناؤه
> كاملاً من `package.json` الفعلي. كل أمر هنا موجود في القسم `scripts` — وما لم
> يكن، يظهر معه السكربت المباشر.

---

## 🚀   Development & Local Server

> ⚠️ `pnpm dev` و`pnpm preview:prod` لا يقرآن `public/_headers` في وضع التطوير،
> فلا تُطبَّق سياسة CSP محلياً. ولهذا لا تظهر أعطال CSP (مثل حجب حزمة التطبيق)
> إلا على الإنتاج. للمعاينة بالترويسات الحقيقية: `pnpm build && pnpm preview:prod`
> — ثم افتح وحدة التحكم: أي مخالفة CSP تظهر هناك قبل النشر.

* **Start Development Server:**
  ```bash
  pnpm dev
  ```

* **Preview with production headers (بعد البناء):**
  ```bash
  pnpm build
  pnpm preview:prod
  ```

## ✅  التحقق قبل الدفع (نفس ما يشغّله CI)

```bash
pnpm install --frozen-lockfile
node scripts/validate-archive-links.mjs --strict   # لا رابط تحميل ميت في الأرشيف
pnpm typecheck                                     # tsc --noEmit
pnpm test                                          # vitest
```

## 🧪  أوامر الفحص

| الأمر | ما يفعله |
|---|---|
| `pnpm doctor` | تشخيص شامل: سلامة JSON في `src/data`، الاستيرادات، ثم TypeScript |
| `pnpm audit` | فحص الاستيرادات الداخلية المكسورة في `src/` |
| `pnpm archive:check` | روابط التحميل في الأرشيف (`validate-archive-links`) |
| `pnpm references:check` | خريطة الإحالات القضائية (`validate-reference-map`) |
| `pnpm links:check` | كل رابط داخلي في `dist/` مقابل ملف حقيقي (يحتاج `pnpm build`) |
| `pnpm seo:audit` | بوابة السيو التقنية على مخرجات `dist/` (تفشل عند وجود مشكلة) |
| `pnpm seo:audit:strict` | نفس الفحص + الفشل على أي تحذير أيضاً |
| `pnpm seo:enrich:check` | هل بيانات المعجم تحتاج إثراءً (`--check` بلا كتابة) |
| `pnpm seo:llms` | إعادة توليد `llms.txt` و`llms-full.txt` |
| `pnpm audit:unused` | knip — الحزم والملفات غير المستعملة |

## 🏗️  البناء

```bash
pnpm build      # clean → vite build → prerender → enhance* → nonblocking-css → csp-hashes
pnpm clean      # حذف dist/
pnpm tree       # طبع شجرة المشروع (scripts/print-tree.mjs)
```

`pnpm build` يشغّل أيضاً `prebuild` تلقائياً: تحقق الأرشيف وخريطة الإحالات، ثم
توليد العدّادات ومعجم المسارات والقوانين ولقطات الأرشيف، ثم `sitemap.xml`
و`feed.xml` وملفات `llms`. أي فشل فيها يوقف البناء — بخلاف توليد الخريطة عند
تعذّر الوصول إلى Supabase، الذي يحذف بوابات بلا صفحات مولَّدة ويكتفي بتحذير.

## 🖼️  الأيقونات والخطوط

```bash
pnpm icons:generate   # توليد أيقونات الموقع من public/Logo.svg (يحتاج sharp)
```

## 📄  أدوات مساعدة (غير مربوطة بـ package.json)

| السكربت | الحالة |
|---|---|
| `node scripts/validate-data.mjs` | ✅ يتحقق من بنية كل ملفات `src/data/*.json` |
| `node scripts/enrich-lexicon.mjs --check` | ✅ مطابق لـ `pnpm seo:enrich:check` |
| `node scripts/optimize-ai-seo.mjs` | ⚠️ قديم — لا تشغّله: يعيد كتابة `openapi.json` و`ai-sitemap.xml` بلا مسارات `/reference/*` التي يولّدها `generate-reference.mjs` |
| `node scripts/geo-enhance.mjs` | ⚠️ معطّل عملياً: يحقن محتوى GEO في `dist/index.html` ولا شيء يناديه، فلا يصل المحتوى إلى الإنتاج |
| `node scripts/compare-large-pitch.mjs` | ℹ️ أداة شخصية لمرة واحدة تنتظر `uploads/pitch.txt` |
