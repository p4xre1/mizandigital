-- 20260927000000_fix_credit_grant_balance.sql
--
-- إصلاح: الدفعة تُكمَل لكن الرصيد لا يزيد.
--
-- ── المشكلة ─────────────────────────────────────────────────────────────────
-- `complete_payment_and_grant_credits` (الترحيل 20260921000000) تفعل أمرين:
--   1) UPDATE payments SET status = 'completed'
--   2) INSERT INTO credit_transactions (...)   ← سطر دفتر فقط
--
-- ولا تفعل الثالث الذي يحمل الاسم نفسه: لا تحدّث الرصيد. البحث في كل
-- الترحيلات عن مواضع زيادة profiles.bonus_credits يعطي أربعة فقط:
--   • add_bonus_credits()            (دالة خدمة، service_role)
--   • منحة الإحالة +2                 (remote_schema:147)
--   • منحة +5                         (remote_schema:153)
--   • admin_adjust_credits()          (الترحيل 20260926)
-- ولا trigger على credit_transactions يحدّث الرصيد — الموجود عليها فهارس
-- وسياسة SELECT فقط.
--
-- النتيجة: عميل يدفع، تُقبض أمواله، تُسجَّل حركة في الدفتر، ورصيده الذي
-- تُنفَّق منه المزايا لا يتغيّر. الاسم «grant_credits» كان وعداً لا تنفذه
-- الدالة. وهذا يفسّر أيضاً لماذا لم يظهر الخلل في الاختبارات: الدفتر يبدو
-- صحيحاً لمن ينظر إليه وحده.
--
-- ── لماذا لا نصلحها بإعادة حساب الرصيد من الدفتر ───────────────────────────
-- لأن الرصيد يُستهلك في مواضع أخرى (daily_credits وbonus_credits يُنقصان في
-- remote_schema:190 و195) فإعادة الاشتقاق من الدفتر تتطلّب أن يكون الدفتر
-- كاملاً تاريخياً، وهو ليس كذلك: حركات الاستهلاك القديمة لا تكتب كلها فيه.
-- الإصلاح الأدنى الصحيح هو زيادة الرصيد عند الشراء، وهو ما تفعله هذه النسخة.
--
-- ── ملاحظات على التصميم ────────────────────────────────────────────────────
-- • التوقيع والعائد boolean بلا تغيير: الـ webhook الحالي يستدعيها كما هي.
-- • تبقى idempotent باشتراط status = 'pending'، فلا منح مزدوج عند إعادة
--   تسليم Stripe للحدث.
-- • user_ref نصّي وقد يكون فراغاً (دفع ضيف لم يُهيّأ حسابه بعد). لا نوقف
--   الإكمال — المال مقبوض — بل نعلّم الكريدتس في metadata لتُلحَق لاحقاً.
--   إيقاف الإكمال كان سيجعل Stripe تعيد التسليم إلى الأبد على دفعة صحيحة.
-- • mizan_profiles.credits عملة مختلفة (تقدّم RPG، محميّ في 20260920) ولا
--   علاقة له بالرصيد المشترى، لذا لا يُلمس هنا.

CREATE OR REPLACE FUNCTION "public"."complete_payment_and_grant_credits"(
  p_payment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment   record;
  v_grant     integer;
  v_user      uuid;
  v_new_balance integer;
BEGIN
  -- الاشتراط نفسه: لا إعادة منح لدفعة مكتملة.
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or not pending';
  END IF;

  v_grant := v_payment.credits_purchased + COALESCE(v_payment.bonus_credits, 0);
  IF v_grant <= 0 THEN
    RAISE EXCEPTION 'Computed grant must be positive, got %', v_grant;
  END IF;

  -- 1) إكمال الدفعة
  UPDATE public.payments
     SET status = 'completed',
         completed_at = timezone('utc'::text, now())
   WHERE id = p_payment_id;

  -- 2) تحويل user_ref النصّي إلى uuid بأمان.
  --    قد يكون NULL (ضيف) أو معرّف Clerk قديماً بصيغة user_… — وكلاهما لا
  --    يُحوَّل، فالتحويل المباشر كان سيرمي ويُبقي الدفعة معلّقة رغم قبض المال.
  v_user := NULL;
  IF v_payment.user_ref IS NOT NULL
     AND v_payment.user_ref ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  THEN
    v_user := v_payment.user_ref::uuid;
  END IF;

  -- 3) الزيادة الفعلية للرصيد — وهي ما كان ناقصاً.
  v_new_balance := NULL;
  IF v_user IS NOT NULL THEN
    UPDATE public.profiles
       SET bonus_credits = bonus_credits + v_grant,
           updated_at = timezone('utc'::text, now())
     WHERE id = v_user
    RETURNING bonus_credits INTO v_new_balance;

    -- RETURNING يبقى NULL لو لم يوجد صفّ البروفايل (مستخدم حُذف مثلاً).
    IF v_new_balance IS NULL THEN
      v_user := NULL;
    END IF;
  END IF;

  -- 4) إن تعذّرت المصاحبة: المال مقبوض، فلا نُتلفه ولا نمنحه لأحد.
  --    نعلّمه في metadata فتراه لوحة الإدارة في قائمة «كريدتس معلّقة».
  IF v_user IS NULL THEN
    UPDATE public.payments
       SET metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object(
                         'credits_unattached', true,
                         'credits_amount', v_grant,
                         'unattached_at', timezone('utc'::text, now()),
                         'unattached_reason', 'no resolvable profile for user_ref'
                       )
     WHERE id = p_payment_id;
  END IF;

  -- 5) سطر الدفتر — user_ref فيه NOT NULL فنعوّض بقيمة صريحة.
  INSERT INTO public.credit_transactions
    (user_ref, clerk_user_id, type, amount, balance_after, reason, reference_id, metadata)
  VALUES (
    COALESCE(v_payment.user_ref, 'unattached'),
    v_payment.clerk_user_id,
    'purchase',
    v_grant,
    v_new_balance,
    'شراء حزمة ' || COALESCE(v_payment.package_id::text, ''),
    v_payment.id::text,
    jsonb_build_object(
      'package_id', v_payment.package_id,
      'amount_mad', v_payment.amount_mad,
      'granted_to_balance', (v_user IS NOT NULL),
      'stripe_provider_payment_id', v_payment.provider_payment_id
    )
  );

  RETURN true;
END;
$$;

ALTER FUNCTION "public"."complete_payment_and_grant_credits"(uuid) OWNER TO "postgres";

-- الصلاحيات كما كانت: إعادة الإنشاء تُسقط الامتيازات في بعض الإعدادات.
-- نُبقيها مطابقة للترحيل الأصلي حتى لا ينكسر الـ webhook.
REVOKE ALL ON FUNCTION "public"."complete_payment_and_grant_credits"(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."complete_payment_and_grant_credits"(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."complete_payment_and_grant_credits"(uuid) TO service_role;

-- ============================================================================
-- كشف الكريدتس المعلّقة: دفعات مكتملة بلا رصيد مُلحَق.
-- وجود صفوف هنا يعني أن عميلاً دفع ولم يستلم، وتستوجب إجراءً إدارياً.
-- ============================================================================
CREATE OR REPLACE VIEW public.unattached_credit_grants AS
SELECT
  p.id                  AS payment_id,
  p.provider_payment_id,
  p.amount_mad,
  p.credits_purchased + COALESCE(p.bonus_credits, 0) AS credits_owed,
  p.user_ref,
  p.completed_at,
  p.metadata
FROM public.payments p
WHERE p.status = 'completed'
  AND COALESCE((p.metadata ->> 'credits_unattached')::boolean, false) = true;

ALTER VIEW public.unattached_credit_grants OWNER TO postgres;
GRANT SELECT ON public.unattached_credit_grants TO authenticated, service_role;

-- لا سياسة هنا عمداً: الـ view لا RLS خاصاً به، بل تُقيَّم سياسات الجدول
-- الأساسي. وpublic.payments عليها payments_user_read وتشمل is_admin()، فهي
-- كافية. إضافة DROP/CREATE POLICY على view كان سيرمي «is not a table».
