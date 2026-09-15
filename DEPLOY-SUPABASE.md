# Deploy Supabase — ترتيب تطبيق الترقية

هذا المشروع يعتمد على Supabase كقاعدة بيانات. الترقية الجديدة تتضمن 4 ملفات يجب تطبيقها بالترتيب.

## الترتيب الصحيح

طبق الملفات في Supabase Dashboard → SQL Editor بالترتيب التالي:

### 1) حماية التقدم والإجابات (عالي الخطورة)
```
supabase/migrations/20260920000000_protect_progression_and_quiz_answers.sql
```
- يلغي سياسة `quiz_attempts_insert` المفتوحة (WITH CHECK true)
- يمنع insert مباشر من anon — يجب استعمال RPC
- دالة `submit_quiz_attempt` تحسب XP على الخادم (تمنع تضخيم النقاط)
- دالة `check_quiz_answer` للتحقق من إجابة واحدة بأمان
- حماية `mizan_profiles` من قفزات XP غير معقولة (>3000)
- view `quiz_questions_public` بدون عمود answer (دفاع إضافي)

**يعتمد على 3 تغييرات في الواجهة (تم تنفيذها):**
- `src/lib/quiz/attemptService.ts` — إرسال عبر RPC
- `src/lib/quiz/secureProgress.ts` — توقيع خفيف + حدود
- `src/components/quiz/QuizRunner.tsx` — إرسال آمن في الخلفية

### 2) نظام المدفوعات
```
supabase/migrations/20260921000000_payments_and_credits.sql
```
- جدول `credit_packages` — حزم الكريدتس
- جدول `payments` — سجل المدفوعات
- جدول `credit_transactions` — دفتر الأستاذ (ledger)
- دالة `complete_payment_and_grant_credits`
- بذور أولية: starter (100), student (350+50), pro (800+150), elite (2000+500)

### 3) نظام التفاعلات
```
supabase/migrations/20260922000000_reactions.sql
```
- جدول `reactions` — تفاعلات المستخدمين
- جدول `reaction_counts` — عدادات مجمعة (trigger)
- دالة `toggle_reaction` و `get_reaction_summary`
- أنواع: like, helpful, bookmark, fire, insightful

### 4) الحوكمة والإبلاغ
```
supabase/migrations/20260923000000_governance_and_reports.sql
```
- جدول `reports` — بلاغات المحتوى
- جدول `moderation_actions` — سجل إجراءات الإشراف
- جدول `community_guidelines` — إرشادات المجتمع
- دالة `create_report` مع تحديد معدل (5/ساعة)
- بذور إرشادات: respect, accuracy, no-spam, quiz-fair, comments, legal-disclaimer

## متغيرات البيئة المطلوبة

في Cloudflare Pages → Settings → Environment variables:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (للدفع فقط، لا تضعه في VITE_)
```

## التحقق

بعد التطبيق:

```sql
-- تحقق من الدوال
SELECT proname FROM pg_proc WHERE proname IN ('submit_quiz_attempt','check_quiz_answer','toggle_reaction','create_report','complete_payment_and_grant_credits');

-- تحقق من الجداول
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('credit_packages','payments','credit_transactions','reactions','reaction_counts','reports','moderation_actions','community_guidelines');

-- تحقق من السياسات
SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename='quiz_attempts';
```

## تراجع (Rollback)

إذا فشل شيء:

```sql
-- إلغاء سياسات جديدة والعودة للمفتوحة (غير موصى به)
DROP POLICY IF EXISTS "quiz_attempts_no_direct_anon_insert" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_insert" ON public.quiz_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
```

لكن الأفضل إصلاح الخطأ وإعادة التطبيق.
