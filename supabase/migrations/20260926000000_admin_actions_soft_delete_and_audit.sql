-- 20260926000000_admin_actions_soft_delete_and_audit.sql
--
-- الطور الثاني: أساس الإدارة والاستجابة للحوادث ودورة حياة البيانات.
--
-- لماذا هذا الملف قبل واجهات لوحة التحكم؟
-- ----------------------------------------
-- كل ما طلبه الطور الثاني يشترك في أساس واحد:
--   • «مراقبة الحذف الناعم» تحتاج عمود حالة + تاريخ طلب + دالة استعادة.
--   • «ضبط الكريدتس يدوياً» و«تمديد Pro» و«إلغاء الجلسات» كلها إجراءات
--     إدارية تحتاج سجلاً تدقيقياً غير قابل للتلاعب.
--   • «تسليم محتوى Pro» يحتاج وعاء تخزين خاصاً وسياسة RLS.
-- بناء الواجهات قبل هذا الأساس يعني واجهات بلا مكان تكتب فيه.
--
-- ويُصلح هذا الملف مخالفتين قائمتين فعلاً:
--   1) functions/api/account/delete.js يحذف صفوف payments وcredit_transactions
--      outright. هذا يُتلف السجل المحاسبي الذي توجب المادة 26 من مدونة التجارة
--      الاحتفاظ به عشر سنوات. الحذف صار ناعماً ثم إخفاءً للهوية لا إتلافاً.
--   2) وعاء `documents` عام القراءة حتى للزائر (documents_public_read إلى anon).
--      هذا صحيح للمكتبة القانونية المجانية، لذا لا نلمسه — بل نضيف وعاءً خاصاً
--      لمحتوى Pro بدل محاولة تقييد وعاء يجب أن يبقى عاماً.
--
-- قرارات تصميمية مقصودة:
--   • account_status نصّي بقيم مقيّدة لا enum: إضافة قيمة إلى enum داخل معاملة
--     واحدة ثم استعمالها تفشل في PostgreSQL («unsafe use of newly created
--     enum value»). النص مع CHECK يتجنّب هذا بلا فقدان للسلامة.
--   • إجراءات الكتابة service_role فقط، تُستدعى من Cloudflare Pages Functions
--     خلف requireAdmin. لذلك actor وIP وUser-Agent تُمرَّر كمعاملات: المتصفح لا
--     يستطيع استدعاء الدالة مباشرةً، فلا يستطيع تزييف من نفّذ الإجراء.
--     وهذا يطابق قرار «الجلسة الهجينة»: المتصفح يقرأ مباشرةً، والعمليات
--     الحساسة تمرّ عبر وسيط.
--   • القراءة (قائمة الحذف المعلق، سجل التدقيق) عبر RLS وis_admin() مباشرةً
--     من المتصفح.

-- ============================================================================
-- 1) الحذف الناعم على public.profiles
-- ============================================================================
-- القانون 09-08 يطلب المحو دون إبطاء غير مبرَّر، والمنتج يريد مهلة 30 يوماً
-- للتراجع. يُحلّ التعارض بأن تكون المهلة «تعليقاً + إخفاء هوية» لا احتفاظاً
-- كاملاً: عند انتهاء المهلة تُفصل الهوية عن السجلات المالية وتُحذف من
-- auth.users، فلا يبقى ما يمكن نسبته إلى الشخص.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active','pending_deletion','suspended'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_reason text NULL
    CHECK (deletion_reason IS NULL OR char_length(deletion_reason) <= 500);

-- قيد اتساق: لا «حذف معلق» بلا تاريخ طلب، والعكس صحيح. يمنع حالة يستحيل
-- معها حساب العدّاد التنازلي في اللوحة.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'profiles'
      AND c.conname = 'profiles_deletion_state_consistent'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_deletion_state_consistent
      CHECK ((account_status = 'pending_deletion') = (deletion_requested_at IS NOT NULL));
  END IF;
END $$;

-- فهرس partial: اللوحة تستعلم عن المعلق فقط، ولا داعي لفهرسة كل الحسابات.
CREATE INDEX IF NOT EXISTS profiles_pending_deletion_idx
  ON public.profiles (deletion_requested_at)
  WHERE account_status = 'pending_deletion';

-- عمود انتهاء Pro: بدونه «التمديد» لا معنى له، ولا يمكن إبطال Pro تلقائياً.
-- يُضاف هنا لا عند الدالة التي تستعمله: أجسام plpgsql لا يُتحقَّق منها عند
-- CREATE FUNCTION، فترتيب كهذا كان سيُخفي خطأً حتى أول تشغيل.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS profiles_pro_expires_idx
  ON public.profiles (pro_expires_at) WHERE is_pro = true;

-- ============================================================================
-- 2) admin_audit_logs — سجل الإجراءات الإدارية
-- ============================================================================
-- موجود بجانب audit_logs لا بديلاً عنه: audit_logs يملؤه trigger تغيّر الصفوف
-- تلقائياً (ما تغيّر)، وهذا يسجّل الإجراءات المقصودة (من قرّر ولماذا). شكل
-- البيانات مختلف والمعنى مختلف.
--
-- السجل غير قابل للتلاعب عن قصد: لا سياسة INSERT ولا UPDATE ولا DELETE على
-- الإطلاق. الكتابة تحدث فقط داخل دوال SECURITY DEFINER. سجل يمكن تعديله ليس
-- دليلاً تقنياً.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL مسموح للإجراءات الآلية فقط (مهمة الإخفاء المجدولة). إسناد إجراء
  -- آلي إلى معرّف أيّ أدمن موجود سيكون تزويراً في دليل يُفترض أنه تقني.
  actor_id       uuid NULL,
  system_generated boolean NOT NULL DEFAULT false,
  action         text NOT NULL CHECK (char_length(action) BETWEEN 3 AND 60),
  target_user_id uuid NULL,
  -- السبب إلزامي وبحدّ أدنى: لا إجراء إدارياً بلا تبرير مكتوب.
  reason         text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 500),
  before_state   jsonb NULL,
  after_state    jsonb NULL,
  ip_address     inet NULL,
  user_agent     text NULL CHECK (user_agent IS NULL OR char_length(user_agent) <= 400),
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  -- إما فاعل بشري معروف، أو وسم صريح بأن الإجراء آلي. لا ثالث.
  CONSTRAINT admin_audit_logs_actor_required
    CHECK (actor_id IS NOT NULL OR system_generated)
);

ALTER TABLE public.admin_audit_logs OWNER TO postgres;

COMMENT ON TABLE public.admin_audit_logs IS
  'إجراءات إدارية مقصودة: من، ماذا، على من، ولماذا. للكتابة عبر دوال SECURITY DEFINER فقط، ولا تعديل ولا حذف.';

CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx
  ON public.admin_audit_logs (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx
  ON public.admin_audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx
  ON public.admin_audit_logs (action, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- لا anon ولا authenticated كتابةً أو تعديلاً.
REVOKE ALL ON public.admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated, service_role;

-- القراءة للأدمن فقط، وأحدثها أولاً في اللوحة.
DROP POLICY IF EXISTS admin_audit_logs_admin_read ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_admin_read
  ON public.admin_audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- 3) دالة التسجيل الداخلية
-- ============================================================================
-- service_role فقط. تُستدعى من داخل دوال الإجراءات، فلا يناديها العميل.

CREATE OR REPLACE FUNCTION public.admin_log_action(
  p_actor_id       uuid,
  p_action         text,
  p_target_user_id uuid,
  p_reason         text,
  p_before         jsonb DEFAULT NULL,
  p_after          jsonb DEFAULT NULL,
  p_ip             text DEFAULT NULL,
  p_user_agent     text DEFAULT NULL,
  p_system         boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- إجراء بشري بلا فاعل مرفوض؛ إجراء آلي بلا وسم مرفوض كذلك.
  IF p_actor_id IS NULL AND NOT p_system THEN
    RAISE EXCEPTION 'actor_id is required unless the action is system_generated';
  END IF;
  IF p_actor_id IS NOT NULL AND p_system THEN
    RAISE EXCEPTION 'a system action must not name a human actor';
  END IF;
  IF char_length(btrim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'a written reason of at least 10 characters is required';
  END IF;

  INSERT INTO public.admin_audit_logs
    (actor_id, system_generated, action, target_user_id, reason,
     before_state, after_state, ip_address, user_agent)
  VALUES
    (p_actor_id, p_system, p_action, p_target_user_id, btrim(p_reason), p_before, p_after,
     NULLIF(p_ip, '')::inet, left(NULLIF(p_user_agent, ''), 400))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.admin_log_action(uuid, text, uuid, text, jsonb, jsonb, text, text, boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_log_action(uuid, text, uuid, text, jsonb, jsonb, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_log_action(uuid, text, uuid, text, jsonb, jsonb, text, text, boolean) TO service_role;

-- ============================================================================
-- 4) الإجراءات الإدارية
-- ============================================================================

-- 4.1) ضبط الكريدتس يدوياً — الاحتياط عند فشل webhook (انقطاع شبكة مثلاً).
--      يكتب في الدفتر العام credit_transactions بنفس نمط بقية الحركات، فلا
--      يصبح للكريدتس مصدران متعارضان للحقيقة.
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
  p_target_user_id uuid,
  p_amount         integer,
  p_reason         text,
  p_actor_id       uuid,
  p_ip             text DEFAULT NULL,
  p_user_agent     text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_after  jsonb;
  v_new_bonus integer;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'amount must be a non-zero integer';
  END IF;
  -- سقف يمنع خطأً مطبعياً (999999) من أن يصبح منحة دائمة.
  IF abs(p_amount) > 100000 THEN
    RAISE EXCEPTION 'adjustment magnitude is capped at 100000 credits';
  END IF;

  SELECT jsonb_build_object('daily_credits', daily_credits, 'bonus_credits', bonus_credits)
    INTO v_before
  FROM public.profiles WHERE id = p_target_user_id;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'target profile not found';
  END IF;

  -- نعدّل bonus_credits لا daily_credits: اليومي يتجدد كل يوم فيضيع التعديل،
  -- أما الممنوح يدوياً فيجب أن يبقى.
  UPDATE public.profiles
     SET bonus_credits = GREATEST(0, bonus_credits + p_amount),
         updated_at = timezone('utc', now())
   WHERE id = p_target_user_id
  RETURNING jsonb_build_object('daily_credits', daily_credits, 'bonus_credits', bonus_credits)
    INTO v_after;

  SELECT bonus_credits INTO v_new_bonus FROM public.profiles WHERE id = p_target_user_id;

  INSERT INTO public.credit_transactions
    (user_ref, clerk_user_id, type, amount, balance_after, reason, reference_id, metadata)
  VALUES
    (p_target_user_id::text, NULL,
     CASE WHEN p_amount > 0 THEN 'admin_grant' ELSE 'admin_revoke' END,
     p_amount, v_new_bonus, btrim(p_reason), NULL,
     jsonb_build_object('actor_id', p_actor_id, 'source', 'admin_override'));

  PERFORM public.admin_log_action(
    p_actor_id, CASE WHEN p_amount > 0 THEN 'credits.grant' ELSE 'credits.revoke' END,
    p_target_user_id, p_reason, v_before, v_after, p_ip, p_user_agent);

  RETURN jsonb_build_object('success', true, 'before', v_before, 'after', v_after);
END;
$$;

ALTER FUNCTION public.admin_adjust_credits(uuid, integer, text, uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(uuid, integer, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, integer, text, uuid, text, text) TO service_role;

-- 4.2) تمديد Pro يدوياً (أو سحبه) — p_days سالبة تعني السحب.
CREATE OR REPLACE FUNCTION public.admin_set_pro(
  p_target_user_id uuid,
  p_days           integer,
  p_reason         text,
  p_actor_id       uuid,
  p_ip             text DEFAULT NULL,
  p_user_agent     text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_after  jsonb;
  v_active boolean;
BEGIN
  IF p_days IS NULL OR p_days = 0 THEN
    RAISE EXCEPTION 'days must be a non-zero integer';
  END IF;
  IF abs(p_days) > 3650 THEN
    RAISE EXCEPTION 'extension is capped at 3650 days';
  END IF;

  SELECT jsonb_build_object('is_pro', is_pro, 'subscription_status', subscription_status::text,
                            'pro_expires_at', to_jsonb(pro_expires_at))
    INTO v_before
  FROM public.profiles WHERE id = p_target_user_id;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'target profile not found';
  END IF;

  v_active := p_days > 0;

  UPDATE public.profiles
     SET is_pro = v_active,
         -- 'active' قيمة enum موجودة فعلاً؛ لا نبتدع قيمة جديدة.
         subscription_status = CASE WHEN v_active THEN 'active'::public.subscription_status
                                    ELSE 'canceled'::public.subscription_status END,
         pro_expires_at = CASE
           WHEN v_active THEN GREATEST(COALESCE(pro_expires_at, timezone('utc', now())), timezone('utc', now()))
                              + make_interval(days => p_days)
           ELSE NULL END,
         updated_at = timezone('utc', now())
   WHERE id = p_target_user_id
  RETURNING jsonb_build_object('is_pro', is_pro, 'subscription_status', subscription_status::text,
                               'pro_expires_at', to_jsonb(pro_expires_at))
    INTO v_after;

  PERFORM public.admin_log_action(
    p_actor_id, CASE WHEN v_active THEN 'pro.extend' ELSE 'pro.revoke' END,
    p_target_user_id, p_reason, v_before, v_after, p_ip, p_user_agent);

  RETURN jsonb_build_object('success', true, 'before', v_before, 'after', v_after);
END;
$$;

ALTER FUNCTION public.admin_set_pro(uuid, integer, text, uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_set_pro(uuid, integer, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_pro(uuid, integer, text, uuid, text, text) TO service_role;

-- 4.3) استعادة حساب في مهلة الحذف — الزر الذي يعكس الحذف الخطأ.
CREATE OR REPLACE FUNCTION public.admin_restore_account(
  p_target_user_id uuid,
  p_reason         text,
  p_actor_id       uuid,
  p_ip             text DEFAULT NULL,
  p_user_agent     text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
BEGIN
  SELECT jsonb_build_object('account_status', account_status,
                            'deletion_requested_at', to_jsonb(deletion_requested_at),
                            'deletion_reason', to_jsonb(deletion_reason))
    INTO v_before
  FROM public.profiles WHERE id = p_target_user_id;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'target profile not found';
  END IF;
  IF (v_before->>'account_status') <> 'pending_deletion' THEN
    -- ليس خطأً تقنياً بل حالة لا تحتاج إجراءً: نرفض بصراحة بدل «نجاح» كاذب.
    RAISE EXCEPTION 'account is not pending deletion';
  END IF;

  UPDATE public.profiles
     SET account_status = 'active',
         deletion_requested_at = NULL,
         deletion_reason = NULL,
         updated_at = timezone('utc', now())
   WHERE id = p_target_user_id;

  PERFORM public.admin_log_action(
    p_actor_id, 'account.restore', p_target_user_id, p_reason, v_before,
    jsonb_build_object('account_status', 'active'), p_ip, p_user_agent);

  RETURN jsonb_build_object('success', true, 'before', v_before);
END;
$$;

ALTER FUNCTION public.admin_restore_account(uuid, text, uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_restore_account(uuid, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restore_account(uuid, text, uuid, text, text) TO service_role;

-- 4.4) تسجيل إلغاء الجلسات في السجل.
--      الإلغاء الفعلي ليس SQL: يتم عبر Supabase Auth Admin API
--      (DELETE /auth/v1/admin/users/{id}/sessions) من Pages Function، لأن
--      refresh_token مخزّن في GoTrue لا في جداولنا. هذه الدالة تكمّل الإجراء
--      بالسجل بعد نجاح النداء، فلا يبقى إجراء بلا أثر.
CREATE OR REPLACE FUNCTION public.admin_log_session_revocation(
  p_target_user_id uuid,
  p_reason         text,
  p_actor_id       uuid,
  p_revoked_count  integer DEFAULT NULL,
  p_ip             text DEFAULT NULL,
  p_user_agent     text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.admin_log_action(
    p_actor_id, 'session.revoke_all', p_target_user_id, p_reason,
    NULL, jsonb_build_object('revoked_sessions', p_revoked_count), p_ip, p_user_agent);
END;
$$;

ALTER FUNCTION public.admin_log_session_revocation(uuid, text, uuid, integer, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_log_session_revocation(uuid, text, uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_log_session_revocation(uuid, text, uuid, integer, text, text) TO service_role;

-- ============================================================================
-- 5) طلب الحذف من المستخدم نفسه
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT account_status INTO v_status FROM public.profiles WHERE id = v_uid;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF v_status = 'pending_deletion' THEN
    -- طلب مكرر: ليس خطأً، لكن لا نعيد ضبط التاريخ وإلا امتدت المهلة إلى الأبد.
    RETURN jsonb_build_object('success', true, 'already_requested', true,
                              'account_status', 'pending_deletion');
  END IF;

  UPDATE public.profiles
     SET account_status = 'pending_deletion',
         deletion_requested_at = timezone('utc', now()),
         deletion_reason = left(NULLIF(btrim(COALESCE(p_reason, '')), ''), 500),
         updated_at = timezone('utc', now())
   WHERE id = v_uid;

  RETURN jsonb_build_object('success', true, 'account_status', 'pending_deletion',
                            'grace_period_days', 30);
END;
$$;

ALTER FUNCTION public.request_account_deletion(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.request_account_deletion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;

-- ============================================================================
-- 6) عرض اللوحة: الحسابات المعلقة مع العدّاد التنازلي
-- ============================================================================
CREATE OR REPLACE VIEW public.pending_deletions AS
SELECT
  p.id                                        AS user_id,
  p.email,
  p.full_name,
  p.deletion_requested_at,
  p.deletion_reason,
  (p.deletion_requested_at + interval '30 days')                 AS deletion_due_at,
  GREATEST(0, EXTRACT(EPOCH FROM ((p.deletion_requested_at + interval '30 days')
             - timezone('utc', now())))::bigint)                 AS seconds_remaining,
  GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((p.deletion_requested_at + interval '30 days')
             - timezone('utc', now())) / 86400.0))::integer)     AS days_remaining
FROM public.profiles p
WHERE p.account_status = 'pending_deletion';

ALTER VIEW public.pending_deletions OWNER TO postgres;
GRANT SELECT ON public.pending_deletions TO authenticated, service_role;

-- ============================================================================
-- 7) الإخفاء النهائي — المادة 26 من مدونة التجارة
-- ============================================================================
-- يفصل الهوية عن السجلات المالية. يُحتفظ بـ: المبلغ، التاريخ، معرّف Stripe،
-- الحالة (عشر سنوات). يُلغى: كل ما ينسب السجل إلى شخص.
--
-- ── لماذا ثلاث دوال لا واحدة ───────────────────────────────────────────────
-- حذف مستخدم auth لا يمكن بـ SQL: حسابات المصادقة يملكها GoTrue، والطريق المدعوم هو
-- Auth Admin API. وprofiles.id → auth.users ON DELETE CASCADE، فحذف المستخدم
-- هناك يزيل profiles وmizan_profiles وlegal_consents تلقائياً.
--
-- أما payments.user_ref وcredit_transactions.user_ref فنصّية بلا FK ⇒ تنجو من
-- الشلال. وهذا يفرض الترتيب: لو أخفينا الهوية قبل حذف الحساب لبقيت نافذة يملك
-- فيها مستخدم حيّ سجلات مالية منسوبة إلى «مجهول». لذا:
--   1) list_expired_deletions  → من انتهت مهلته (قراءة فقط)
--   2) Pages Function          → Auth Admin API DELETE لكل معرّف
--   3) anonymize_orphaned_billing → تنظيف ما نجا من الشلال
-- والخطوة 3 اختيارية التكرار (idempotent) وشفائية: تلتقط أي صفوف فاتت في
-- تشغيل سابق، فلا يعتمد الامتثال على نجاح تشغيل واحد.

-- 7.1) من انتهت مهلته؟
CREATE OR REPLACE FUNCTION public.list_expired_deletions(p_retention_days integer DEFAULT 30)
RETURNS TABLE (user_id uuid, email text, deletion_requested_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz;
BEGIN
  IF p_retention_days < 0 OR p_retention_days > 365 THEN
    RAISE EXCEPTION 'retention_days must be between 0 and 365';
  END IF;
  v_cutoff := timezone('utc', now()) - make_interval(days => p_retention_days);

  RETURN QUERY
    SELECT p.id, p.email, p.deletion_requested_at
    FROM public.profiles p
    WHERE p.account_status = 'pending_deletion'
      AND p.deletion_requested_at IS NOT NULL
      AND p.deletion_requested_at <= v_cutoff
    ORDER BY p.deletion_requested_at;
END;
$$;

ALTER FUNCTION public.list_expired_deletions(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.list_expired_deletions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_expired_deletions(integer) TO service_role;

-- 7.2) تنظيف السجلات المالية اليتيمة
CREATE OR REPLACE FUNCTION public.anonymize_orphaned_billing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payments integer;
  v_ledger   integer;
BEGIN
  -- payments.user_ref قابل للفراغ ⇒ نُصفّره.
  -- القيد ~ uuid يستثني معرّفات Clerk القديمة (user_xxx) عمداً: تلك قد تعود
  -- لحسابات ما زالت حيّة تحت معرّف آخر، وإخفاؤها تخميناً إتلاف لا امتثال.
  UPDATE public.payments
     SET user_ref = NULL,
         clerk_user_id = NULL,
         metadata = (metadata - 'email' - 'user_email' - 'ip' - 'ipCountry')
                  || jsonb_build_object('anonymized_at', timezone('utc', now()),
                                        'anonymized_reason', 'account_purge_law_09_08')
   WHERE user_ref IS NOT NULL
     AND user_ref ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     AND NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id::text = payments.user_ref);
  GET DIAGNOSTICS v_payments = ROW_COUNT;

  -- credit_transactions.user_ref NOT NULL ⇒ قيمة بديلة ثابتة غير دالّة.
  -- استثناء 'anonymized' يجعل الدالة قابلة للتكرار بلا إعادة كتابة.
  UPDATE public.credit_transactions
     SET user_ref = 'anonymized',
         clerk_user_id = NULL,
         metadata = (metadata - 'email' - 'user_email' - 'ip')
                  || jsonb_build_object('anonymized_at', timezone('utc', now()))
   WHERE user_ref <> 'anonymized'
     AND user_ref ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     AND NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id::text = credit_transactions.user_ref);
  GET DIAGNOSTICS v_ledger = ROW_COUNT;

  IF v_payments > 0 OR v_ledger > 0 THEN
    -- إجراء آلي: system_generated بلا فاعل بشري (انظر قيد الجدول).
    PERFORM public.admin_log_action(
      NULL, 'billing.anonymize_orphans', NULL,
      'إخفاء هوية السجلات المالية اليتيمة بعد انتهاء مهلة الحذف — احتفاظ بالمبالغ والتواريخ ومعرّفات Stripe وفق المادة 26 من مدونة التجارة',
      NULL,
      jsonb_build_object('payments_rows', v_payments, 'ledger_rows', v_ledger),
      NULL, NULL, true);
  END IF;

  RETURN jsonb_build_object('payments_anonymized', v_payments,
                            'ledger_anonymized', v_ledger);
END;
$$;

ALTER FUNCTION public.anonymize_orphaned_billing() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.anonymize_orphaned_billing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymize_orphaned_billing() TO service_role;

-- 7.3) كشف ما فات: سجلات مالية ما زالت منسوبة ولا صاحب لها.
--      اللوحة تعرضها؛ وجود صفوف هنا يعني أن خطوة الإخفاء لم تكتمل.
CREATE OR REPLACE VIEW public.orphaned_billing AS
SELECT 'payments'::text AS source_table,
       user_ref,
       count(*)         AS rows_still_linked,
       sum(amount_mad)  AS total_mad,
       min(created_at)  AS oldest
FROM public.payments
WHERE user_ref IS NOT NULL
  AND user_ref ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id::text = payments.user_ref)
GROUP BY user_ref;

ALTER VIEW public.orphaned_billing OWNER TO postgres;
GRANT SELECT ON public.orphaned_billing TO authenticated, service_role;

-- ============================================================================
-- 8) وعاء Pro الخاص — تسليم المحتوى الحصري
-- ============================================================================
-- `documents` يبقى عاماً: فيه المكتبة القانونية المجانية التي تقرأها
-- LawsPage وLibraryPage عبر getPublicUrl. تقييده كان سيكسر صفحات عامة.
-- محتوى Pro يذهب إلى وعاء خاص بمسار <user_id>/<file> فيتحقق الشرطان معاً:
-- مطابقة auth.uid() وis_pro.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pro-documents', 'pro-documents', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- القراءة: المالك الحصري لملفاته داخل مجلده، وPro فعّال.
DROP POLICY IF EXISTS pro_documents_owner_read ON storage.objects;
CREATE POLICY pro_documents_owner_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pro-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.is_pro = true
        AND p.account_status = 'active'
    )
  );

-- الكتابة والختم: للخادم وحده (المفتاح service_role). لا سياسة ⇒ رفض شامل.
-- لو سمحنا للعميل بالرفع لصار بوسعه استبدال ملفه الممهور بملف بلا ختم.
DROP POLICY IF EXISTS pro_documents_admin_manage ON storage.objects;
CREATE POLICY pro_documents_admin_manage
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pro-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'pro-documents' AND public.is_admin());

-- ============================================================================
-- 9) إزالة لغم is_admin_or_dev()
-- ============================================================================
-- جسمها يقارن role بـ 'Admin' و'Developer'، وقيم user_role الفعلية هي
-- ('super_admin','member','editor'). مقارنة enum بقيمة غير موجودة ترمي
-- «invalid input value for enum user_role» وقت التنفيذ. وهي ممنوحة لـ
-- authenticated. لا يستدعيها أي كود، فبقاؤها فخّ لمن يستعملها لاحقاً:
-- إن وُضعت في سياسة RLS كسرت تقييم السياسة كلها.

DROP FUNCTION IF EXISTS public.is_admin_or_dev();

-- ============================================================================
-- 10) ملاحظة تنفيذية: جدولة الإخفاء
-- ============================================================================
-- هذه الدوال لا تُنفّذ نفسها. تحتاج مُشغّلاً:
--   Cloudflare Cron Trigger → POST /api/admin/purge بترويسة CRON_SECRET
--     1) rpc('list_expired_deletions', { p_retention_days: 30 })
--     2) لكل معرّف: DELETE {SUPABASE_URL}/auth/v1/admin/users/{id}
--        (المفتاح service_role) — الشلال يزيل profiles وmizan_profiles
--        وlegal_consents وonboarding_responses.
--     3) rpc('anonymize_orphaned_billing')
-- يومياً كافٍ؛ المهلة 30 يوماً فلا حاجة لدقة أعلى. وخطوة 3 شفائية، فتكرارها
-- آمن ولا يعتمد الامتثال على نجاح تشغيل بعينه.
