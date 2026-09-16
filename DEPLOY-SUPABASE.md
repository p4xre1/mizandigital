# نشر عمل هذه الجلسة — خطوات Supabase و Cloudflare

هذا الملف يشرح ما يجب لصقه في Supabase وما يجب ضبطه في Cloudflare بعد تنزيل
المشروع كـ ZIP. كل الأرقام والترتيبات هنا مُتحقَّق منها فعلياً، لا من الذاكرة.

---

## 0) قبل أي شيء: هل الترحيلات مطبَّقة أصلاً؟

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
```

قارن القائمة بالملفات العشرة في القسم 1. **طبّق فقط ما يظهر كـ Remote:
missing.** الترتيب الزمني مهم لأن أجسام الدوال تُفحص عند CREATE.

---

## 1) SQL — الترتيب الدقيق

عشرة ملفات جديدة أضافتها هذه الجلسة، كلها في `supabase/migrations/`.

افتح **Supabase Dashboard → SQL Editor** والصق ملفاً واحداً في كل مرة،
بالترتيب:

| # | الملف | ملاحظة |
|---|---|---|
| 1 | `20260911010000_add_news_updated_at_trigger.sql` | |
| 2 | `20260911030000_interaction_tracking_and_audience.sql` | |
| 3 | `20260911040000_stripe_billing_and_entitlements.sql` | |
| 4 | `20260915000000_admin_analytics_and_payment_risk.sql` | anti-carding |
| 5 | `20260916000000_mizan_pro_subscriptions.sql` | اشتراك Mizan Pro |
| 6 | `20260917000000_profiles_governance_and_plans.sql` | حوكمة البروفايل |
| 7 | `20260918000000_content_reactions_and_onboarding.sql` | إعجاب/حفظ |
| 8 | `20260919000000_user_role_add_member.sql` | ⚠ انظر التحذير |
| 9 | `20260919010000_user_role_default_member_and_demote.sql` | ⚠ انظر التحذير |
| 10 | `20260920000000_protect_progression_and_quiz_answers.sql` | 🛑 **لا تطبّقه الآن** |
| 11 | `20260924000000_supabase_auth_profiles_and_ranks.sql` | 🔁 **إزالة Clerk** — طبّقه بعد 10 |

### ✅ عملياً: لصقتان فقط تكفيان (مُثبَت بالاختبار)

جرّبت على قاعدة مطابقة لقاعدتك الحالية:

```
PASTE 1 (الملفات 1–8 معاً):  OK ✅
PASTE 2 (الملف 9 وحده):      OK ✅
profiles.role default = 'member'::user_role
plans = free:0, mizan_pro_monthly:4900
content_reactions = content_reactions
```

فالإجراء:

1. **اللصقة الأولى** — الصق محتوى الملفات من 1 إلى 8 (بما فيها
   `20260919000000_user_role_add_member.sql`) دفعة واحدة واضغط Run.
2. **اللصقة الثانية** — الصق `20260919010000_...demote.sql` **وحده**.

### ⚠ لماذا لا يمكن ضمّ 8 و 9 في لصقة واحدة

محرر SQL ينفّذ كل لصقة في معاملة (transaction) واحدة، وPostgreSQL يمنع
استعمال قيمة enum جديدة داخل نفس المعاملة التي أُضيفت فيها. مُثبَت:

```
TOGETHER (one paste): FAILS → unsafe use of new value "member" of enum type user_role
SEPARATELY paste 1:   ok
SEPARATELY paste 2:   ok
```

### 🛑 الملف 10 — لا تطبّقه قبل تعديل الواجهة

هذا الملف يغلق ثغرتين (منح النفس xp/rank، وكشف إجابات الاختبارات)، لكنه
**يكسر الاختبارات وحفظ البروفايل** ما لم تُعدَّل الواجهة أولاً، لأن المحرك
الحالي يصحّح في المتصفح و`syncProfileToCloud` يرسل xp/rank من العميل.

التعديلات الثلاثة المطلوبة (مكتوبة أيضاً في آخر الملف نفسه):

- `src/lib/quiz/repository.ts:158` — القراءة من `quiz_questions` تصير
  `rpc("get_quiz_question_public")`.
- `src/lib/quiz/engine.ts:160` — المقارنة المحلية `chosen === answer` تصير
  نداء `rpc("check_quiz_answer")`.
- `src/lib/quiz/profileService.ts:163-165` — حذف `xp` و `rank` من الـ upsert،
  واستدعاء `award_quiz_result()` من Edge Function.

إن أردت حماية xp/rank **دون** لمس الاختبارات، يمكنك تطبيق القسم 1 فقط من
الملف (المُشغّل + `award_quiz_result`) وتأجيل القسم 3. لكن القسم 1 وحده
سيجعل حفظ البروفايل يفشل حتى تُحذف `xp`/`rank` من `syncProfileToCloud`.

### 🔁 الملف 11 — إزالة Clerk: Supabase Auth + بروفايلات مخصصة + كل الرتب

`20260924000000_supabase_auth_profiles_and_ranks.sql` هو الترحيل الذي ينقل
المنصة إلى مزوّد هوية واحد. طبّقه **بعد** الملف 10 (يعتمد على مشغّلاته
`check_profile_xp_jump` وعلى `public.is_admin()`).

ماذا يفعل:

| البند | التفاصيل |
|---|---|
| `handle_new_user` | ينشئ `profiles` **و** `mizan_profiles` معاً عند كل تسجيل جديد — بروفايل عام مخصص واسم مستخدم فريد ورتبة D |
| `on_auth_user_created` | المشغّل نفسه مثبَّت صراحة على `auth.users` (لم يكن معلناً في أي ترحيل سابق) |
| `rank_capabilities` | سلم الرتب D→SSS في القاعدة: العتبات، المستوى 1..7، والصلاحيات |
| `mizan_rank_for_xp(xp)` | نفس منطق `getRankForXp` في TypeScript |
| `apply_profile_rank` | مشغّل BEFORE INSERT/UPDATE يشتق `rank` من `xp` ويحدّث `highest_rank` و`rank_updated_at` |
| أعمدة البروفايل المخصص | `avatar_url, cover_url, headline, website_url, linkedin_url, theme_color, show_xp, show_badges, show_attempts, show_rank, highest_rank, rank_updated_at` |
| `mizan_profiles_owner_read` | المالك يقرأ بروفايله حتى لو `is_public = false` |
| `onboarding_responses.user_id` | uuid → `auth.users`، و`clerk_user_id` صار nullable/تراثياً |
| `profile_rank_board(limit)` | لوحة الرتب العامة |
| `mizan_rank_matrix()` | مصفوفة الرتب الكاملة للواجهة |

لماذا هذا يُصلح تحفّظ الملف 10: الواجهة ما زالت ترسل `xp` في الـ upsert، لكن
`rank` لم يعد قراراً من العميل — المشغّل يعيد حسابه من `xp` في كل كتابة،
و`check_profile_xp_jump` يمنع أي قفزة أكبر من 3000 XP لغير الإدارة. أي
محاولة لكتابة `rank: 'SSS'` مع `xp: 0` تُصحَّح تلقائياً إلى `D`.

تحقّق بعد التطبيق:

```sql
select rank, level, min_xp, max_xp from public.rank_capabilities order by level;

-- يجب أن يعيد 0: كل حساب له بروفايل عام
select count(*) from public.profiles p
 where not exists (select 1 from public.mizan_profiles mp where mp.owner_id = p.id);

-- الرتبة مطبّقة من الخبرة على كل الصفوف
select count(*) from public.mizan_profiles where rank <> public.mizan_rank_for_xp(xp);
```

> **أعمدة Clerk الباقية:** `mizan_profiles.clerk_user_id` و
> `reactions.clerk_user_id` و`reports.reporter_clerk_id` و
> `comments.clerk_user_id` لم تُحذف — هي أعمدة nullable لصفوف تاريخية، ولا
> يقرأها أو يكتبها أي كود بعد الآن. احذفها في ترحيل لاحق بعد تسوية الصفوف
> القديمة (أو تجاهلها: لا أثر لها على الأمان أو السلوك).

---

## 2) خطوة يدوية بعد الملف 9 — إعادة ترقية المحرّرين الحقيقيين

الملف 9 يصعّد كل صفوف `editor` إلى `member` **عمداً** (fail closed): بما أن
النوع لم يكن فيه أي قيمة لغير المتمتعين بصلاحية، لا يمكن التمييز بين محرّر
رُقّي عمداً وصف حصل على الافتراضي بالخطأ.

صفوف `super_admin` و`admin_god_mode = true` **لم تُمَس**. لترقية محرّر حقيقي:

```sql
UPDATE public.profiles SET role = 'editor' WHERE email = 'editor@example.ma';
```

للتحقق ممن تضرّر:

```sql
SELECT action, new_data, created_at
FROM public.audit_logs
WHERE action = 'role_default_hardening'
ORDER BY created_at DESC LIMIT 5;
```

---

## 3) متغيرات البيئة

### Cloudflare Pages — Build (بادئة VITE_ تُحقن في العميل)

```
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SITE_URL=https://mizan.ma
VITE_SITE_NAME="ميزان الرقمية"
VITE_GA_ID=            # اختياري
VITE_TURNSTILE_SITE_KEY=
```

### Cloudflare Pages — Runtime secrets

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # ⚠ secret، لا تضعه في VITE_
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
TURNSTILE_SECRET_KEY
IP_HASH_SALT
SITE_URL
RATE_LIMIT_KV                 # ربط KV namespace
```

```bash
npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name mizandigital
```

### Supabase Edge Functions

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
npx supabase functions deploy onboarding
```

> بعد إزالة Clerk لم تعد الدالة تحتاج `CLERK_JWT_ISSUER`: تتحقق من
> Supabase access_token عبر `auth.getUser()`، و`verify_jwt = true` في
> `supabase/config.toml`. إن كنت نشرت النسخة القديمة بـ `--no-verify-jwt`
> فأعد النشر بدونها.

### Supabase Auth (مزوّد الهوية الوحيد)

من لوحة التحكم → Authentication:

1. **Providers → Email**: مفعّل. اختر هل تريد تأكيد البريد (Confirm email).
2. **Providers → Google**: Client ID/Secret من Google Cloud Console، مع
   إضافة `https://YOUR-REF.supabase.co/auth/v1/callback` إلى Authorized
   redirect URIs في Google.
3. **URL Configuration**:
   - Site URL = `https://mizan.ma`
   - Redirect URLs = `https://mizan.ma/profile`, `https://mizan.ma/login`,
     `http://localhost:5173/profile`
4. **حسابات الإدارة**: أنشئ الحساب ثم من SQL Editor:
   ```sql
   update public.profiles set admin_god_mode = true where email = 'admin@mizan.ma';
   ```

---

## 4) Stripe

1. أنشئ منتجاً وسعراً بـ **49.00 MAD**. الخطة `mizan_pro_monthly` مبذورة في
   الملف 6 (`20260917000000_profiles_governance_and_plans.sql:101`) بـ 4900
   وحدة صغرى = 49.00 MAD، ومعها خطة `free` بـ 0.
2. ضع `STRIPE_PRICE_ID`.
3. أنشئ Webhook endpoint يشير إلى `https://mizan.ma/api/billing/webhook`
   واستمع إلى: `checkout.session.completed`, `invoice.paid`,
   `invoice.payment_failed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. ضع `STRIPE_WEBHOOK_SECRET` (`whsec_...`).
5. أضف قواعد Radar (من التوثيق الرسمي، لا من الكود):
   - `Request 3D Secure if :card_country: != 'MA'`
   - `Block if :is_3d_secure: and not :is_3d_secure_authenticated:`
   - `Block if not :is_3d_secure: and :risk_level: != 'normal'`

---

## 5) البناء والنشر

```bash
pnpm install          # بلا أي اعتمادية Clerk (أُزيلت كلها)
pnpm typecheck        # يجب أن يمر بلا أخطاء
pnpm test             # 353 اختباراً في 11 ملفاً
pnpm build            # 321 مساراً
npx wrangler pages deploy dist --project-name mizandigital
```

`pnpm audit --prod` يجب أن يعيد: **No known vulnerabilities found**.

---

## 6) التحقق بعد النشر

```sql
-- لا مستخدم جديد يصبح admin
SELECT column_default FROM information_schema.columns
WHERE table_name='profiles' AND column_name='role';
-- المتوقع: 'member'::user_role

-- 'member' موجودة في النوع
SELECT e.enumlabel FROM pg_enum e
JOIN pg_type t ON t.oid=e.enumtypid
JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND t.typname='user_role';

-- جداول التفاعل أُنشئت
SELECT to_regclass('public.content_reactions');

-- خطط الاشتراك مبذورة
SELECT code, name_ar, price_minor_units, is_featured
FROM public.subscription_plans WHERE is_active;
```

وفي المتصفح: `/profile/saved` و `/pricing` و `/admin/pricing` و
`/admin/user-data` يجب أن تفتح.

---

## 7) ما لم يُتحقَّق منه — للإفصاح

- **لا ترحيل طُبّق يوماً على مشروع Supabase الحقيقي.** كل التحقق تم على
  PostgreSQL مضمَّن، بما في ذلك إعادة الثغرتين ثم إغلاقهما.
- مسار المتصفح → PostgREST للتفاعلات لم يُختبر end-to-end ضد قاعدة حقيقية.
- لا نداء Stripe حقيقي تم؛ توقيع الـ webhook مُختبَر وحدوياً فقط.
- `ProUpgradeCard.tsx` غير مرسوم في أي صفحة.
- صفحة لوحة التحكم لمحرك SEO ما زالت غير مبنية.