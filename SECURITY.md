# SECURITY.md — دليل الحماية ومكافحة السبام والحقن

هذا الملف يوثّق طبقات الحماية المضافة ضد:
- **السبام** (تعليقات آلية، إشهار، فيض طلبات)
- **الحقن** (XSS، SQL injection، path traversal)
- **الرفع الضار** (ملفات HTML/SVG قابلة للتنفيذ على نطاق الوسائط)
- **إساءة استعمال نقاط النهاية** (فيض، رمز إداري مسروق)

---

## 1) المبدأ المعماري: لا ثقة في المتصفح أبداً

أي فحص في كود React هو **تحسين تجربة مستخدم فقط**، لأنه قابل للتجاوز بالكامل
بطلب `curl` واحد. لذلك كل قاعدة أمنية موجودة في **مكانين على الأقل**:

| الطبقة | الملف | يمكن تجاوزها؟ |
|---|---|---|
| 1. واجهة المستخدم | `src/components/articles/CommentSection.tsx` | ✅ نعم (رسائل فورية فقط) |
| 2. نقطة نهاية الخادم | `functions/api/comments.js` | ⚠️ جزئياً (تحتاج IP حقيقياً) |
| 3. سياسات RLS | `supabase/migrations/20260911…sql` | ❌ لا |
| 4. مُشغّل القاعدة | `supabase/migrations/20260911…sql` | ❌ لا |
| 5. قيود CHECK | `supabase/migrations/20260911…sql` | ❌ لا |

**مصدر واحد للحقيقة** لمنطق التنقية: `functions/_shared/payloadGuard.js`
يُستعمل من الخادم **ومن المتصفح** (عبر `src/lib/security/payloadGuard.ts`)،
فلا ينحرف الفحصان عن بعضهما مع الوقت.

---

## 2) ماذا كان مكسوراً قبل هذه الطبقات

| المشكلة | الدليل | الأثر |
|---|---|---|
| سياسة إدخال مفتوحة | `CREATE POLICY "public can insert comments" … WITH CHECK (true)` | أي سكربت يُدرج تعليقات بلا حدود عبر مفتاح anon |
| بلا تحديد معدل | لا KV ولا عدّاد في أي `functions/**` | فيض غير محدود |
| `VITE_TURNSTILE_SITE_KEY` مُعلن وغير مستعمل | `grep -rni turnstile src/` = 0 نتيجة | إعداد ميت يوحي بوجود حماية غير موجودة |
| `author_name` بلا قيد طول | `comments_body_length` موجود، ولا مقابل له للاسم | نص غير محدود في قاعدة البيانات |
| `sanitize.ts` كود ميت | `grep -rn "sanitizeText" src/` = 0 نتيجة | لا تنقية فعلية |
| نوع ملف R2 غير مفحوص | `String(body.contentType \|\| "application/octet-stream")` | رفع `text/html`/`.svg` → XSS مخزّن على `media.mizan.page` |
| حذف R2 غير مقيّد | `String(body.fileKey).replace(/^\/+/, "")` | حذف أي كائن في الدلو |

---

## 3) الطبقات المضافة

### 3.1 نقطة نهاية التعليقات `POST /api/comments`

`functions/api/comments.js` — الترتيب مقصود (الأرخص أولاً):

1. **تحديد المعدل حسب IP**: 3 تعليقات / 10 دقائق.
2. **حدّ حجم الجسم**: 8 كيلوبايت (يُرفض قبل التحليل، لا بعده).
3. **مصيدة البوتات**: حقل مخفي `website` يجب أن يبقى فارغاً.
4. **زمن التعبئة**: أقل من 3 ثوانٍ بين عرض النموذج والإرسال = بوت.
5. **Turnstile** (اختياري): يُفعَّل تلقائياً عند ضبط `TURNSTILE_SECRET_KEY`.
6. **التنقية + كشف الحقن/السبام** (`inspectUserText`).
7. **التحقق من وجود المحتوى**: الـ `slug` يجب أن يكون موجوداً فعلاً في `articles`/`news`.
8. **الإدراج عبر REST** بمفتاح anon → يخضع لـ RLS وللمُشغّل.

**قرارات تصميمية مهمة:**

- **نجاح صامت على السبام**: الخادم يجيب `{ ok: true }` حتى لو أسقط المُشغّل
  التعليق. لا نُخبر المهاجم أي قاعدة كشفته، فلا يستطيع تعديل هجومه. الأسباب
  تُسجَّل في `console.warn` (Cloudflare → Functions → Logs) فقط.
- **`Prefer: return=minimal`**: سياسة القراءة تُظهر التعليقات المعتمدة فقط،
  و`trg_force_comment_unapproved` يفرض `is_approved = false`، فاستعمال
  `RETURNING` سيفشل بخطأ RLS. هذا سلوك مقصود ومُختبَر.
- **لا تخزين IP خام**: يُخزَّن `SHA-256(IP + IP_HASH_SALT)` في `client_ip_hash`.
- **لا رجوع احتياطي للإدراج المباشر عند انقطاع الشبكة** في الإنتاج. الرجوع
  الوحيد محكوم بـ `import.meta.env.DEV` (بيئة التطوير حيث لا تعمل Pages
  Functions مع `vite dev`)، فلا يمكن تفعيله في البناء المنشور.

### 3.2 مشغّل القاعدة `comments_anti_abuse_guard` (الطبقة التي لا تُتجاوز)

مُشغّل `BEFORE INSERT` يُسقط بصمت (`RETURN NULL`):

| القاعدة | الحد |
|---|---|
| زائر آلي (`is_bot_user_agent`) | أي UA بوت أو فارغ |
| فيض من نفس IP | 5 / 10 دقائق |
| فيض من نفس الاسم | 3 / 10 دقائق |
| تكرار حرفي (نفس الاسم+النص+المحتوى) | 1 / 24 ساعة |
| حقن أو كلمات سبام | يُرفض |
| روابط كثيرة | أكثر من 3 |

المسؤول المسجَّل (`auth.role() = 'authenticated'`) **يتجاوز** الفلتر — مسار
لوحة التحكم لا يُعامَل كزائر مجهول.

### 3.3 سياسات RLS الجديدة

```sql
DROP POLICY IF EXISTS "public can insert comments" ON public.comments;

CREATE POLICY "anon can insert moderated comments" ON public.comments
  FOR INSERT TO anon WITH CHECK (
    source_type IN ('articles','news')
    AND char_length(btrim(author_name)) BETWEEN 1 AND 100
    AND char_length(body) BETWEEN 1 AND 2000
    AND NOT public.comments_is_suspicious(author_name)
    AND NOT public.comments_is_suspicious(body)
  );
```

> ⚠️ **`GRANT EXECUTE` إلزامي**: سياسة RLS تُقيَّم بصلاحيات المستخدم الحالي،
> فالدالة `comments_is_suspicious` **يجب** أن تكون ممنوحة لـ `anon`. سحبها
> يُفشل كل إدخال برسالة `permission denied for function`. هذا خطأ وقع فعلاً
> أثناء التطوير والتُقط بالاختبار مقابل PostgreSQL حقيقي.

### 3.4 حماية رفع R2

`functions/api/r2/presign.js`:
- **قائمة بيضاء** لأنواع MIME والامتدادات (ليست قائمة سوداء).
- فحصان معاً: اسم يبدو صورة بنوع `text/html` يُرفض، والعكس كذلك.
- **`text/html` و `image/svg+xml` مرفوضان**: ملفات R2 تُقدَّم للجمهور عبر
  `media.mizan.page`، فأي HTML/SVG يصبح صفحة قابلة للتنفيذ على نطاق فرعي
  موثوق. لإعادة تفعيل SVG: أضفه إلى `ALLOWED_CONTENT_TYPES` و`.svg` إلى
  `ALLOWED_EXTENSIONS` مع ضبط `Content-Disposition: attachment`.
- تحديد معدل 120 / 10 دقائق لكل مدير (يحدّ ضرر الرمز المسروق).

`functions/api/r2/delete.js`:
- `validateObjectKey` يمنع `..` ويحصر الحذف داخل `images|documents|pdf|misc`
  ويرفض حذف مجلد كامل.
- تحديد معدل 200 / 10 دقائق.

---

## 4) الإعدادات المطلوبة في Cloudflare (كلها اختيارية)

| المتغير / الربط | الغرض | بدونه |
|---|---|---|
| `RATE_LIMIT_KV` | تحديد معدل عالمي دقيق | يعمل من ذاكرة العامل (per-isolate) = تخفيف فقط |
| `TURNSTILE_SECRET_KEY` | تحقق captcha في الخادم | يُتخطى تلقائياً (`skipped`) |
| `VITE_TURNSTILE_SITE_KEY` | إظهار الودجت | لا ودجت |
| `IP_HASH_SALT` | جعل البصمة غير قابلة للعكس | بصمة بلا ملح |

**فشل آمن مقصود**: الخصائص الاختيارية تتدهور بـ *fail-open* (غياب إعداد لا
يُسقط الموقع)، بينما فحص المحتوى *fail-closed* (لا يُقبل محتوى ضار بسبب غياب
إعداد اختياري).

### ربط KV

```bash
wrangler kv namespace create RATE_LIMIT
```
ثم في إعدادات Pages → Bindings:
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<id>"
```

---

## 5) ما تم التحقق منه فعلياً

### 5.1 اختبارات vitest — `tests/security.test.ts`

```bash
pnpm test     # 78 passed
pnpm typecheck
pnpm build    # 314 routes prerendered
```

تغطي: كشف الحقن (18 هجوماً)، رفض الإيجابيات الكاذبة على نصوص قانونية عربية،
كشف السبام، التنقية (أصفار عريضة، تجاوز اتجاه، حروف تحكم)، تحديد المعدل
(KV + ذاكرة + عطل KV)، مصيدة البوتات، حدّ الحجم، بصمة IP، Turnstile، أنواع
ملفات R2، مفاتيح الحذف.

### 5.2 اختبار الهجرة مقابل PostgreSQL حقيقي

vitest لا يستطيع اختبار RLS والمُشغّلات. تم التحقق بتشغيل الهجرة على
**PostgreSQL 18.4** حقيقي (UTF8، مطابق لـ Supabase) مع 35 فحصاً:

| الفحص | النتيجة |
|---|---|
| تطبيق الهجرة بلا خطأ | ✅ |
| إسقاط السياسة المفتوحة + إنشاء سياستين حسب الدور | ✅ |
| تطبيع الأسماء القديمة (>100 حرف) بدل حذف التعليقات | ✅ |
| تعليق عربي سليم يُقبل | ✅ |
| XSS / `onerror=` / SQLi / `UNION SELECT` تُسقط بصمت | ✅ |
| 9 أنماط معتمدة على حدود الكلمة | ✅ |
| نص يحتوي `data:` و `--` **لا** يُرفض (إيجابية كاذبة) | ✅ |
| 4 روابط / بوت / UA فارغ / تكرار حرفي تُسقط | ✅ |
| فيض الاسم = 3 بالضبط، فيض IP = 5 بالضبط | ✅ |
| `author_name` > 100 مرفوض عبر RLS **و** عبر CHECK | ✅ |
| `anon` ممنوع من `source_type` غير معروف (42501) | ✅ |
| `authenticated` يتجاوز فلتر الإساءة | ✅ |
| تنظيف البصمات بعد 90 يوماً | ✅ |

> ⚠️ **`\b` ليس حدّ كلمة في PostgreSQL** بل backspace. حدود الكلمة هي `\m`
> و `\M`. استعمال `\b` يجعل النمط **غير مطابق أبداً وبصمت** — وهو خطأ وقع
> فعلاً (كان `UNION SELECT` يمر) والتُقط بالاختبار. يوجد اختبار في
> `tests/security.test.ts` يمنع عودة هذا الخطأ.

### 5.3 ما لم يُتحقق منه هنا

- **Turnstile الحقيقي**: الاختبار يحاكي `fetch` نحو `siteverify`. لم يُختبر
  ضد Cloudflare فعلياً (يحتاج مفتاحاً سرياً حقيقياً).
- **R2/SigV4**: فحص أنواع الملفات مُختبَر، لكن الرفع الفعلي نحو R2 لم يُختبر
  (يحتاج بيانات اعتماد). التوقيع نفسه لم يتغير.
- **تحديد المعدل عبر KV الفعلي**: مُختبَر بـ KV محاكى؛ لم يُختبر ضد KV حقيقي.

---

## 6) حدود معروفة (بصدق)

1. **تحديد المعدل بلا KV ليس ضماناً**: Cloudflare Workers توزّع الطلبات على
   عدة `isolates`، فالعدّاد في الذاكرة محلي لكل isolate. الطبقة الموثوقة هي
   المُشغّل في القاعدة (يعدّ الصفوف الفعلية).
2. **`Content-Type` غير موقّع في روابط R2**: `presignR2PutUrl` يوقّع `host`
   فقط، فمن يملك رابط الرفع الموقّع يستطيع نظرياً رفع نوع محتوى مختلف.
   القائمة البيضاء تسدّ المسار الواقعي، لكن الإغلاق الكامل يتطلب إضافة
   `content-type` إلى `SignedHeaders` في `functions/_shared/r2sign.js` — لم
   يُنفَّذ لأنه يغيّر آلية التوقيع ولا يمكن التحقق منه هنا دون دلو R2 حقيقي.
3. **`script-src 'unsafe-inline'` في CSP (احتياط قديم فقط)**: نُقل سكربت GA
   المضمّن إلى الحزمة (`src/lib/analytics/gtag.ts`)، وعُزّزت السياسة في
   `public/_headers` إلى `'strict-dynamic'` + hashes (hash الحزمة يُملأ وقت
   البناء عبر `scripts/csp-hashes.mjs`). في متصفحات CSP3 تُتجاهل
   `'unsafe-inline'` و`'self'` وقائمة المضيفين بمجرد وجود hash، فلا يعمل إلا
   السكربتات المُجزّأة وما يحقنه سكربت موثوق (trust chain) — وهذا النمط
   «غير القابل للتجاوز» حسب معياري Lighthouse (csp-xss) وتوثيق Google
   الرسمية. بقاؤهما في السياسة احتياط للمتصفحات الأقدم فقط (موصى به رسمياً)،
   فلا يعد ثغرة قابلة للاستغلال. أُضيف أيضاً `require-trusted-types-for
   'script'` (توثيق trusted-types-xss).
4. **فلاتر السبام قائمة على الأنماط**: مهاجم مصمم يتجاوزها. الحماية الفعلية
   ضد الفيض هي تحديد المعدل + `is_approved = false` + مراجعة يدوية في لوحة
   التحكم.

---

## 7) الملفات

**جديدة**
- `functions/_shared/payloadGuard.js` — منطق التنقية والكشف (مصدر واحد)
- `functions/_shared/guard.js` — حماية الطلبات (IP، معدل، حجم، Turnstile، honeypot)
- `functions/api/comments.js` — نقطة نهاية التعليقات المحمية
- `src/lib/security/payloadGuard.ts` — واجهة TypeScript نحو المنطق المشترك
- `supabase/migrations/20260911000000_comments_anti_spam_and_input_hardening.sql`
- `tests/security.test.ts` — 76 اختباراً
- `SECURITY.md`

**معدّلة**
- `src/components/articles/CommentSection.tsx` — إرسال عبر `/api/comments` + honeypot + زمن
- `functions/api/r2/presign.js` — قائمة بيضاء للأنواع + تحديد معدل
- `functions/api/r2/delete.js` — تقييد المفاتيح + تحديد معدل
- `.env.example` — متغيرات الحماية
- `tests/static-site.test.ts` — تصحيح توقّع قديم (`lang="ar"` → `ar-MA`)

> ملاحظة: `src/lib/utils/sanitize.ts` تُرك كما هو (ما زال غير مستعمل). المنطق
> الجديد في `functions/_shared/payloadGuard.js` لأنه يجب أن يعمل في Workers
> وفي المتصفح معاً من نفس المصدر.