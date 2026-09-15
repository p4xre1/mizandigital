-- supabase/migrations/20260911040000_stripe_billing_and_entitlements.sql
--
-- ─────────────────────────────────────────────────────────────────────────────
-- Mizan Pro: اشتراك Stripe + سجل المدفوعات + حماية حالة الاستحقاق
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ── أهم قرار في هذا الملف: مَن يكتب is_pro؟ ─────────────────────────────────
-- السياسة الموجودة "Profiles update policy" تسمح لأي مستخدم مسجَّل بتحديث صفّه
-- الخاص (USING (id = auth.uid())). فلو أضفنا is_pro دون حماية، صار بوسع أي
-- مستخدم أن يرسل:
--     PATCH /rest/v1/profiles?id=eq.<uid>   {"is_pro": true}
-- ويحصل على Pro مجاناً دون دفع سنتيم، متجاوزاً Stripe بالكامل.
--
-- لذلك هذا الملف يُوسّع prevent_profile_column_tampering الموجودة لتشمل كل
-- أعمدة الفوترة. المسار الوحيد للكتابة هو service_role (webhook).
--
-- ملاحظة: ads_exempt كان موجوداً بلا حماية أصلاً (ثغرة قائمة قبل هذا الملف) —
-- أُضيفت للحماية هنا أيضاً.
--
-- ── الحقيقة المصدرية ────────────────────────────────────────────────────────
-- Stripe هو مصدر الحقيقة. جدول transactions مرآة محلية للتقارير فقط، ولا
-- يجوز لأي منطق في التطبيق أن يعتبره مصدراً للاستحقاق.

-- ============================================================================
-- 1) حالة الاشتراك
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                  WHERE t.typname='subscription_status' AND n.nspname='public') THEN
    -- مطابقة لحالات Stripe حرفياً حتى لا نضطر لترجمة يدوية قابلة للخطأ
    CREATE TYPE public.subscription_status AS ENUM (
      'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'canceled', 'unpaid', 'paused'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                  WHERE t.typname='payment_status' AND n.nspname='public') THEN
    CREATE TYPE public.payment_status AS ENUM (
      'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
    );
  END IF;
END $$;

-- ============================================================================
-- 2) أعمدة الاشتراك على profiles
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text
  CHECK (stripe_customer_id IS NULL OR char_length(stripe_customer_id) BETWEEN 5 AND 100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text
  CHECK (stripe_subscription_id IS NULL OR char_length(stripe_subscription_id) BETWEEN 5 AND 100);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status public.subscription_status
  NOT NULL DEFAULT 'incomplete';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

-- المعرّف الخارجي للاشتراك المستقبلي. nullable عمداً: المستودع اليوم يعمل على
-- Supabase Auth (profiles.id = auth.uid()) ولا يوجد Clerk في الكود إطلاقاً.
-- العمود موجود حتى لا نحتاج هجرة ثانية إن انتقل المشروع فعلاً إلى Clerk،
-- لكن كل المنطق الحالي يعمل على profiles.id.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clerk_user_id text
  CHECK (clerk_user_id IS NULL OR char_length(clerk_user_id) BETWEEN 5 AND 100);

-- UNIQUE جزئي: NULL مسموح تكراره (المستخدمون بلا اشتراك) لكن القيمة
-- الواحدة لا تتكرر — يمنع ربط نفس عميل Stripe بحسابين.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
  ON public.profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_key
  ON public.profiles (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_clerk_user_id_key
  ON public.profiles (clerk_user_id) WHERE clerk_user_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.is_pro IS
  'مشتق من حالة الاشتراك. يكتبه webhook فقط عبر service_role — لا يُسمح لأي مستخدم بتعديله.';
COMMENT ON COLUMN public.profiles.clerk_user_id IS
  'معرّف Clerk للمستقبل. غير مستعمل حالياً: المصادقة الفعلية Supabase Auth (profiles.id).';

-- ============================================================================
-- 3) حماية أعمدة الفوترة من التعديل الذاتي
-- ============================================================================
-- إعادة تعريف الدالة الموجودة (لا تُنشأ trigger جديدة — الـ trigger الحالي
-- tr_prevent_profile_tampering يبقى كما هو ويستدعي نفس الاسم).
CREATE OR REPLACE FUNCTION public.prevent_profile_column_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- الأعمدة الحساسة: الصلاحيات، الرصيد، التجميد، وكل حالة الفوترة.
  IF (NEW.admin_god_mode          IS DISTINCT FROM OLD.admin_god_mode)          OR
     (NEW.bonus_credits           IS DISTINCT FROM OLD.bonus_credits)           OR
     (NEW.daily_credits           IS DISTINCT FROM OLD.daily_credits)           OR
     (NEW.is_frozen               IS DISTINCT FROM OLD.is_frozen)               OR
     (NEW.ban_reason              IS DISTINCT FROM OLD.ban_reason)              OR
     (NEW.banned_at               IS DISTINCT FROM OLD.banned_at)               OR
     (NEW.banned_by               IS DISTINCT FROM OLD.banned_by)               OR
     -- ── أعمدة الفوترة الجديدة ─────────────────────────────────────────────
     (NEW.is_pro                  IS DISTINCT FROM OLD.is_pro)                  OR
     (NEW.stripe_customer_id      IS DISTINCT FROM OLD.stripe_customer_id)      OR
     (NEW.stripe_subscription_id  IS DISTINCT FROM OLD.stripe_subscription_id)  OR
     (NEW.subscription_status     IS DISTINCT FROM OLD.subscription_status)     OR
     (NEW.subscription_ends_at    IS DISTINCT FROM OLD.subscription_ends_at)    OR
     (NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end) OR
     -- ads_exempt كان مكشوفاً قبل هذه الهجرة
     (NEW.ads_exempt              IS DISTINCT FROM OLD.ads_exempt)
  THEN
    -- service_role (webhook) فقط. anon و authenticated ممنوعان.
    IF (auth.role() = 'authenticated' OR auth.role() = 'anon') THEN
      RAISE EXCEPTION 'Unauthorized column modification on profiles'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.prevent_profile_column_tampering() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.prevent_profile_column_tampering() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 4) سجل المدفوعات
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Stripe Checkout Session (المطلوب في المواصفة)
  stripe_session_id      text CHECK (stripe_session_id IS NULL OR char_length(stripe_session_id) BETWEEN 5 AND 150),
  -- روابط إضافية تجعل الجدول قابلاً للتسوية مع لوحة Stripe
  stripe_invoice_id      text CHECK (stripe_invoice_id IS NULL OR char_length(stripe_invoice_id) BETWEEN 5 AND 150),
  stripe_payment_intent_id text CHECK (stripe_payment_intent_id IS NULL OR char_length(stripe_payment_intent_id) BETWEEN 5 AND 150),
  stripe_subscription_id text CHECK (stripe_subscription_id IS NULL OR char_length(stripe_subscription_id) BETWEEN 5 AND 150),

  -- المبلغ بأصغر وحدة (MAD عملة عشرية بخانتين ← 49.00 MAD = 4900).
  -- integer بدل numeric: Stripe نفسه يرسل أصغر وحدة، والتحويل المبكّر للعملة
  -- العشرية يفتح باب أخطاء التقريب في التسوية المالية.
  amount                 integer NOT NULL CHECK (amount >= 0),
  currency               text NOT NULL DEFAULT 'mad'
                           CHECK (char_length(currency) = 3 AND currency = lower(currency)),

  status                 public.payment_status NOT NULL DEFAULT 'pending',
  plan                   text NOT NULL DEFAULT 'mizan_pro_monthly'
                           CHECK (char_length(plan) BETWEEN 3 AND 60),
  billing_reason         text CHECK (billing_reason IS NULL OR char_length(billing_reason) BETWEEN 3 AND 60),

  -- الحدث الخام من Stripe. لا يُبنى أي منطق عليه؛ للتدقيق والتسوية فقط.
  raw                    jsonb,
  created_at             timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at             timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.transactions IS
  'مرآة محلية لأحداث دفع Stripe. Stripe هو مصدر الحقيقة؛ هذا الجدول للتقارير والتسوية فقط.';

-- جلسة Checkout واحدة يجب أن تُنتج دفعة واحدة — حاجز ضد إعادة التسليم
CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_session_id_key
  ON public.transactions (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_user_created_idx
  ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_status_idx
  ON public.transactions (status, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- المالك يقرأ مدفوعاته فقط. لا INSERT/UPDATE للعميل إطلاقاً: السجل يُكتب من
-- webhook بـ service_role (يتجاوز RLS).
DROP POLICY IF EXISTS "owner reads own transactions" ON public.transactions;
CREATE POLICY "owner reads own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- بوابة الطاقم: admin_god_mode وليس get_auth_role().
--
-- النسخة الأولى من هذه السياسة كانت:
--     USING (public.get_auth_role() IN ('super_admin','editor'))
-- وهذا خطأ حقيقي: قيمة role الافتراضية في profiles هي 'editor'، فكل مستخدم
-- مسجَّل كان يمرّ من الشرط ويقرأ السجل المالي لكل المستخدمين الآخرين.
-- admin_god_mode افتراضيه false، وهو نفس ما يفحصه requireAdmin() في
-- functions/_shared/auth.js — فالبوابة متسقة مع بقية لوحة التحكم.
DROP POLICY IF EXISTS "staff reads all transactions" ON public.transactions;
CREATE POLICY "staff reads all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    (SELECT p.admin_god_mode FROM public.profiles p WHERE p.id = auth.uid()) IS TRUE
  );

-- ============================================================================
-- 5) Idempotency لأحداث الـ webhook
-- ============================================================================
-- Stripe يعيد تسليم نفس الحدث عدة مرات (at-least-once delivery). بدون هذا الجدول
-- قد تُسجَّل نفس الدفعة مرتين أو يُعاد تفعيل اشتراك ملغى.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id     text PRIMARY KEY CHECK (char_length(event_id) BETWEEN 5 AND 150),
  event_type   text NOT NULL CHECK (char_length(event_type) BETWEEN 3 AND 120),
  processed_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.stripe_webhook_events IS
  'معرفات أحداث Stripe المعالَجة. INSERT ... ON CONFLICT DO NOTHING هو قفل التكرار.';

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- لا سياسات إطلاقاً = لا وصول للعميل (RLS مفعّل بلا سياسة ⇒ رفض شامل).
REVOKE ALL ON public.stripe_webhook_events FROM anon, authenticated;

-- ============================================================================
-- 6) تطبيق حالة الاشتراك (تُنادى من webhook فقط)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.apply_subscription_state(
  p_user_id       uuid,
  p_customer_id   text,
  p_subscription_id text,
  p_status        public.subscription_status,
  p_period_end    timestamptz DEFAULT NULL,
  p_ends_at       timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
begin
  UPDATE public.profiles
     SET stripe_customer_id            = coalesce(p_customer_id, stripe_customer_id),
         stripe_subscription_id        = p_subscription_id,
         subscription_status           = p_status,
         subscription_current_period_end = p_period_end,
         subscription_ends_at          = p_ends_at,
         -- is_pro مشتق، لا يُمرَّر كمدخل: حالة واحدة فقط تُعطي Pro
         is_pro                        = (p_status = 'active'),
         -- مشترك Pro بلا إعلانات تلقائياً (ads_exempt موجود أصلاً في المخطط)
         ads_exempt                    = (p_status = 'active')
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_subscription_state: profile % not found', p_user_id
      USING ERRCODE = 'P0002';
  END IF;
end;
$$;

ALTER FUNCTION public.apply_subscription_state(uuid, text, text, public.subscription_status, timestamptz, timestamptz)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.apply_subscription_state(uuid, text, text, public.subscription_status, timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
-- service_role فقط (Webhook). لا نمنحها حتى لـ authenticated.

COMMENT ON FUNCTION public.apply_subscription_state IS
  'نقطة الكتابة الوحيدة لحالة الاشتراك. تُنادى من webhook بـ service_role.';

-- ============================================================================
-- 7) قراءة الاستحقاقات (آمنة للعميل)
-- ============================================================================
-- دالة واحدة تُرجع ما يحقّ للمستخدم، بدل أن تقرأ الواجهة is_pro مباشرة وتبني
-- عليه شروطاً متفرقة قابلة للتناقض.
CREATE OR REPLACE FUNCTION public.get_my_entitlements()
RETURNS TABLE (
  is_pro                boolean,
  subscription_status   public.subscription_status,
  ends_at               timestamptz,
  ads_exempt            boolean,
  daily_credits         integer,
  bonus_credits         integer
)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    -- اشتراك "active" لكنه منتهي المدة لا يمنح Pro. الفحص المزدوج يمنع
    -- بقاء الاستحقاق إذا تأخّر webhook الإلغاء.
    (p.is_pro AND (p.subscription_ends_at IS NULL OR p.subscription_ends_at > timezone('utc', now()))) AS is_pro,
    p.subscription_status,
    p.subscription_ends_at,
    p.ads_exempt,
    p.daily_credits,
    p.bonus_credits
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

ALTER FUNCTION public.get_my_entitlements() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_entitlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_entitlements() TO authenticated;

COMMENT ON FUNCTION public.get_my_entitlements() IS
  'استحقاقات المستخدم الحالي. is_pro هنا مفحوصة ضد انتهاء المدة، فلا تعتمد على العمود وحده.';
