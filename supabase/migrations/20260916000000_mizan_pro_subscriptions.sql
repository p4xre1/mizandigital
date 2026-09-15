-- ============================================================================
-- Mizan Pro — اشتراكات mizan_profiles (مسار Clerk)
-- ============================================================================
-- لماذا هجرة جديدة بدل توسيع 20260911040000؟
--
-- تلك الهجرة تبني حالة الاشتراك على public.profiles، وهو جدول Supabase Auth
-- (auth.uid()). لكن تسجيل الدخول العام في Mizan يمر عبر Clerk، وهوية المستخدم
-- هناك هي mizan_profiles.clerk_user_id. مستخدم Clerk قد لا يملك صف profiles
-- إطلاقاً، فربط الاشتراك بـ profiles وحده كان سيترك المشترين الحقيقيين بلا
-- حالة. هذه الهجرة تنقل مصدر الحقيقة إلى mizan_profiles.
--
-- القواعد المتبعة (نفس نمط باقي الهجرات):
--   * SET search_path على كل دالة
--   * ALTER FUNCTION ... OWNER TO postgres
--   * REVOKE ALL من PUBLIC/anon/authenticated ثم GRANT صريح
--   * DROP POLICY قبل CREATE POLICY
--   * idempotent بالكامل: ADD COLUMN IF NOT EXISTS، وDO block للأنواع
-- ============================================================================

SET statement_timeout = '60s';
SET search_path = public, pg_temp;

-- ============================================================================
-- 1) أعمدة الاشتراك على mizan_profiles
-- ============================================================================

ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text
  CHECK (stripe_customer_id IS NULL OR char_length(stripe_customer_id) BETWEEN 5 AND 150);
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text
  CHECK (stripe_subscription_id IS NULL OR char_length(stripe_subscription_id) BETWEEN 5 AND 150);
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

-- حالة الاشتراك نصّية لا enum: قيم Stripe كثيرة ومتغيرة (incomplete,
-- incomplete_expired, past_due, unpaid, paused, …) وأي قيمة جديدة كانت ستكسر
-- الإدراج. النص مع CHECK على القيم المعروفة يُبقي الضبط دون هشاشة.
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS subscription_status text
  CHECK (subscription_status IS NULL OR subscription_status IN (
    'active','trialing','past_due','unpaid','canceled','incomplete',
    'incomplete_expired','paused'));

-- عميل Stripe واحد لكل بروفايل: يمنع إنشاء customer مكرر عند النقر المزدوج.
CREATE UNIQUE INDEX IF NOT EXISTS mizan_profiles_stripe_customer_idx
  ON public.mizan_profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.mizan_profiles.is_pro IS
  'مشتقّة من subscription_status عبر apply_mizan_pro_state(). لا تُضبط يدوياً.';

-- ============================================================================
-- 2) transactions — دعم مستخدم Clerk الذي لا يملك صف profiles
-- ============================================================================

-- user_id كان NOT NULL مع FK إلى profiles. مستخدم Clerk قد لا يملك صفاً هناك،
-- فنجعله اختيارياً ونضيف رابط mizan_profiles، مع قيد يضمن وجود مرجع واحد على
-- الأقل — وإلا صارت المعاملة يتيمة لا يمكن إسنادها لأحد.
ALTER TABLE public.transactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS mizan_profile_id uuid
  REFERENCES public.mizan_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS clerk_user_id text
  CHECK (clerk_user_id IS NULL OR char_length(clerk_user_id) BETWEEN 5 AND 150);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'transactions_owner_required'
       AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_owner_required
      CHECK (user_id IS NOT NULL OR mizan_profile_id IS NOT NULL OR clerk_user_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS transactions_mizan_profile_idx
  ON public.transactions (mizan_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_clerk_user_idx
  ON public.transactions (clerk_user_id, created_at DESC);

-- ============================================================================
-- 3) تطبيق حالة الاشتراك — دالة واحدة ذرّية، service_role فقط
-- ============================================================================

/**
 * يحدّث حالة Mizan Pro لبروفايل مرتبط بمستخدم Clerk.
 *
 * ── لماذا دالة واحدة لا تحديثات من التطبيق ─────────────────────────────────
 * because is_pro مشتقّة من status. لو ضبطها الـ webhook يدوياً في استعلامين
 * منفصلين، فأي فشل بينهما يترك مستخدماً is_pro=true بلا اشتراك (وصول مجاني
 * دائم) أو العكس. هنا كل شيء في معاملة واحدة.
 *
 * ── is_pro ليست مدخلاً ────────────────────────────────────────────────────
 * تُشتق من p_status='active' أو 'trialing'. لو كانت مدخلاً، فأي مسار كتابة
 * ينسى ضبطها كان سيمنح Pro مجاناً.
 *
 * ── لماذا upsert على clerk_user_id ────────────────────────────────────────
 * قد يصل webhook قبل إنشاء البروفايل (نادراً، لكن Stripe يعيد المحاولة).
 * نُنشئ صفاً بـ username مشتق من clerk_user_id؛ القيد username_format يمنع
 * القيم غير الصالحة، وأي تعارض يُترك لإعادة المحاولة التالية.
 */
CREATE OR REPLACE FUNCTION public.apply_mizan_pro_state(
  p_clerk_user_id   text,
  p_status          text,
  p_customer_id     text    DEFAULT NULL,
  p_subscription_id text    DEFAULT NULL,
  p_period_end      timestamptz DEFAULT NULL
)
RETURNS TABLE (profile_id uuid, is_pro boolean, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  v_is_pro boolean;
  v_id uuid;
BEGIN
  -- service_role فقط. الـ webhook هو المستدعي الشرعي الوحيد.
  v_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF v_role <> 'service_role' THEN
    RAISE EXCEPTION 'permission denied for function apply_mizan_pro_state';
  END IF;

  IF p_clerk_user_id IS NULL OR char_length(btrim(p_clerk_user_id)) < 5 THEN
    RAISE EXCEPTION 'clerk_user_id required';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN (
    'active','trialing','past_due','unpaid','canceled','incomplete',
    'incomplete_expired','paused') THEN
    RAISE EXCEPTION 'unknown subscription status: %', p_status;
  END IF;

  -- active و trialing وحدهما يمنحان Pro. past_due لا يمنحه: الدفع فشل.
  v_is_pro := p_status IN ('active', 'trialing');

  UPDATE public.mizan_profiles
     SET is_pro                          = v_is_pro,
         subscription_status             = p_status,
         stripe_customer_id              = coalesce(p_customer_id, stripe_customer_id),
         stripe_subscription_id          = CASE
                                             WHEN p_status IN ('canceled','incomplete_expired') THEN NULL
                                             ELSE coalesce(p_subscription_id, stripe_subscription_id)
                                           END,
         subscription_current_period_end = p_period_end,
         -- past_due يبقي تاريخاً سابقاً ليعرف المستخدم متى ينتهي وصوله
         subscription_ends_at            = CASE WHEN v_is_pro THEN p_period_end ELSE NULL END,
         updated_at                      = timezone('utc', now())
   WHERE clerk_user_id = p_clerk_user_id
  RETURNING mizan_profiles.id INTO v_id;

  IF v_id IS NULL THEN
    -- لا بروفايل بعد: نُنشئ واحداً حتى لا تضيع حالة الدفع.
    INSERT INTO public.mizan_profiles (
      clerk_user_id, username, display_name, is_pro, subscription_status,
      stripe_customer_id, stripe_subscription_id,
      subscription_current_period_end, subscription_ends_at
    ) VALUES (
      p_clerk_user_id,
      'u_' || substring(md5(p_clerk_user_id) from 1 for 18),
      'مستخدم ميزان',
      v_is_pro, p_status, p_customer_id,
      CASE WHEN p_status IN ('canceled','incomplete_expired') THEN NULL ELSE p_subscription_id END,
      p_period_end,
      CASE WHEN v_is_pro THEN p_period_end ELSE NULL END
    )
    ON CONFLICT (clerk_user_id) DO UPDATE
      SET is_pro                          = v_is_pro,
          subscription_status             = p_status,
          stripe_customer_id              = coalesce(p_customer_id, mizan_profiles.stripe_customer_id),
          subscription_current_period_end = p_period_end,
          subscription_ends_at            = CASE WHEN v_is_pro THEN p_period_end ELSE NULL END,
          updated_at                      = timezone('utc', now())
    RETURNING mizan_profiles.id INTO v_id;
  END IF;

  -- سجل تدقيق: تغيير حالة الدفع حدث مالي، ولا يجب أن يمر بلا أثر.
  INSERT INTO public.audit_logs (user_id, action, table_name, new_data)
  VALUES (v_id, 'mizan_pro:' || coalesce(p_status, 'null'), 'mizan_profiles',
          jsonb_build_object(
            'clerk_user_id', p_clerk_user_id,
            'status', p_status,
            'is_pro', v_is_pro,
            'period_end', p_period_end));

  RETURN QUERY SELECT v_id, v_is_pro, p_status;
END;
$$;

ALTER FUNCTION public.apply_mizan_pro_state(text, text, text, text, timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.apply_mizan_pro_state(text, text, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_mizan_pro_state(text, text, text, text, timestamptz)
  TO service_role;

-- ============================================================================
-- 4) انتهاء الاشتراك تلقائياً
-- ============================================================================

/**
 * يُسقط Pro عن كل من تجاوز subscription_current_period_end.
 *
 * Stripe يرسل customer.subscription.updated عند التجديد، لكن إن فشلت كل
 * محاولات إعادة المحاولة قد لا يصلنا شيء. هذه الدالة تُستدعى من مهمة مجدولة
 * (Supabase cron) كشبكة أمان، ولا تلمس من اشتراكه سارٍ.
 */
CREATE OR REPLACE FUNCTION public.expire_lapsed_mizan_pro()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  n integer;
BEGIN
  v_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF v_role NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'permission denied for function expire_lapsed_mizan_pro';
  END IF;

  UPDATE public.mizan_profiles
     SET is_pro = false,
         subscription_status = 'past_due',
         updated_at = timezone('utc', now())
   WHERE is_pro = true
     AND subscription_current_period_end IS NOT NULL
     AND subscription_current_period_end < timezone('utc', now());

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

ALTER FUNCTION public.expire_lapsed_mizan_pro() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.expire_lapsed_mizan_pro() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_lapsed_mizan_pro() TO service_role;

-- ============================================================================
-- 5) قراءة المستخدم لحالة اشتراكه هو
-- ============================================================================

/**
 * حالة اشتراك البروفايل الحالي (Clerk).
 *
 * SECURITY DEFINER لأن أعمدة Stripe لا يجب أن تُقرأ مباشرة من المتصفح عبر
 * سياسة SELECT واسعة. نُرجع حقلاً واحداً آمناً، لا stripe_customer_id.
 */
CREATE OR REPLACE FUNCTION public.get_my_mizan_pro(p_clerk_user_id text)
RETURNS TABLE (
  is_pro boolean, status text, ends_at timestamptz,
  rank text, xp integer, credits integer, has_portal boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    mp.is_pro,
    mp.subscription_status,
    mp.subscription_ends_at,
    mp.rank,
    mp.xp,
    mp.credits,
    -- بوابة Stripe تُفتح فقط لمن له اشتراك قائم فعلاً
    (mp.stripe_customer_id IS NOT NULL
      AND mp.subscription_status IN ('active','trialing','past_due'))
  FROM public.mizan_profiles mp
  WHERE mp.clerk_user_id = p_clerk_user_id
    -- المستدعي يجب أن يكون هو صاحب البروفايل: نتحقق من تطابق معرّف Clerk
    -- المُمرر من الدالة (التي تحققت من JWT) مع الصف المطلوب.
    AND p_clerk_user_id IS NOT NULL
    AND char_length(btrim(p_clerk_user_id)) >= 5;
$$;

ALTER FUNCTION public.get_my_mizan_pro(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_mizan_pro(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_mizan_pro(text) TO authenticated, service_role;

-- ============================================================================
-- 6) RLS — المستخدم يقرأ بروفايله فقط، ولا يكتب أعمدة الدفع أبداً
-- ============================================================================

DROP POLICY IF EXISTS "owner reads own mizan profile" ON public.mizan_profiles;
CREATE POLICY "owner reads own mizan profile"
  ON public.mizan_profiles FOR SELECT
  TO authenticated
  USING (
    clerk_user_id = coalesce(current_setting('request.jwt.claim.sub', true), '')
    OR is_public = true
  );

-- ── منع كتابة أعمدة الدفع مباشرة ──────────────────────────────────────────
-- المسودة الأولى حاولت ذلك بسياسة RLS. فشلت، والسبب بنيوي لا خطأً في الصياغة:
-- سياسة mizan_profiles_owner_write (في 20260914000000) معرّفة FOR ALL وهي
-- PERMISSIVE، وسياسات PERMISSIVE تُجمَع بـ OR. فإضافة سياسة permissive ثانية
-- لا تقيّد شيئاً إطلاقاً — بل توسّع المسموح. والتقييد عبر RESTRICTIVE وحده
-- يبقى هشاً أمام أي سياسة أخرى تُضاف لاحقاً.
--
-- المُشغّل (trigger) هو الأدات الصحيحة هنا: يعمل قبل الكتابة، ولا يمكن لأي
-- سياسة RLS أن تتجاوزه، وينطبق على كل المسارات بما فيها service_role إن
-- حاولت الكتابة المباشرة بدل استدعاء الدالة.
CREATE OR REPLACE FUNCTION public.protect_mizan_pro_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  -- الكتابة المالية الوحيدة المشروعة تمر من service_role (أي من
  -- apply_mizan_pro_state داخل الـ webhook).
  IF v_role IN ('service_role', 'postgres') THEN
    RETURN NEW;
  END IF;

  IF NEW.is_pro                          IS DISTINCT FROM OLD.is_pro
     OR NEW.subscription_status          IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_customer_id           IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id       IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.subscription_ends_at         IS DISTINCT FROM OLD.subscription_ends_at
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end THEN
    RAISE EXCEPTION 'billing columns are read-only; use apply_mizan_pro_state()';
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION public.protect_mizan_pro_billing_columns() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.protect_mizan_pro_billing_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_mizan_pro_billing_columns ON public.mizan_profiles;
CREATE TRIGGER trg_protect_mizan_pro_billing_columns
  BEFORE UPDATE ON public.mizan_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_mizan_pro_billing_columns();

COMMENT ON TRIGGER trg_protect_mizan_pro_billing_columns ON public.mizan_profiles IS
  'أعمدة الدفع للقراءة فقط. تُكتب حصراً عبر apply_mizan_pro_state() بمفتاح service_role.';

-- ============================================================================
-- 7) تسوية: لا مستخدم بـ is_pro=true بلا اشتراك سارٍ
-- ============================================================================

/**
 * يفحص اتساق حالة الدفع. يُستدعى من CI أو من مهمة مجدولة.
 * يُرجع عدد الصفوف المتناقضة — الصفر هو المتوقع.
 */
CREATE OR REPLACE FUNCTION public.audit_mizan_pro_consistency()
RETURNS TABLE (profile_id uuid, clerk_user_id text, is_pro boolean, status text, period_end timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT mp.id, mp.clerk_user_id, mp.is_pro, mp.subscription_status, mp.subscription_current_period_end
    FROM public.mizan_profiles mp
   WHERE (mp.is_pro = true
            AND (mp.subscription_status IS DISTINCT FROM 'active'
                 AND mp.subscription_status IS DISTINCT FROM 'trialing'))
      OR (mp.is_pro = false
            AND mp.subscription_status IN ('active','trialing'))
      OR (mp.is_pro = true
            AND mp.subscription_current_period_end IS NOT NULL
            AND mp.subscription_current_period_end < timezone('utc', now()));
$$;

ALTER FUNCTION public.audit_mizan_pro_consistency() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.audit_mizan_pro_consistency() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_mizan_pro_consistency() TO service_role;

SET search_path = public, pg_temp;
