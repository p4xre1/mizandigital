-- ============================================================================
-- legal_consents — إثبات الموافقة على سياسة الخصوصية والشروط
-- ============================================================================
-- لماذا: خانة الاختيار في /login?mode=signup وحدها لا تكفي. المادة 7(1) من
-- GDPR تتطلب أن يتمكّن المسؤول من *إثبات* أن الشخص وافق — أي سجلاً بمن وافق،
-- متى، على أي نسخة من السياسة، وبأي طريقة (بريد أم Google).
--
-- الجدول مرتبط بـ auth.users، فيُحذف معه عند حذف الحساب (ON DELETE CASCADE)
-- ويُدرج في DELETED_TABLES بوظيفة الحذف — لا نحتفظ ببيانات تعريفية بعد طلب
-- الحذف، لأن الغاية من السجل تنتهي بزوال الحساب وبياناته.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_consents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document       text NOT NULL DEFAULT 'privacy',
  policy_version text NOT NULL,
  method         text NOT NULL DEFAULT 'email',
  agreed_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT legal_consents_document_check
    CHECK (document IN ('privacy', 'terms', 'cookies')),
  CONSTRAINT legal_consents_method_check
    CHECK (method IN ('email', 'google')),
  CONSTRAINT legal_consents_version_not_blank
    CHECK (char_length(btrim(policy_version)) > 0)
);

-- موافقة واحدة لكل (مستخدم، مستند، نسخة). إعادة الطلب عند تغيّر النسخة فقط،
-- وهذا ما يجعل UPSERT آمناً ولا يولّد صفوف مكررة.
CREATE UNIQUE INDEX IF NOT EXISTS legal_consents_user_document_version_key
  ON public.legal_consents (user_id, document, policy_version);

CREATE INDEX IF NOT EXISTS legal_consents_user_id_idx
  ON public.legal_consents (user_id);

COMMENT ON TABLE public.legal_consents IS
  'سجل إثبات الموافقة على السياسات القانونية — من وافق، متى، على أي نسخة، وبأي طريقة.';
COMMENT ON COLUMN public.legal_consents.policy_version IS
  'قيمة LEGAL_LAST_UPDATED في src/content/legal/policies.js لحظة الموافقة.';

-- ============================================================================
-- RLS: المالك يقرأ ويكتب موافقته فقط، والمشرف يقرأ للتحقيق.
-- لا UPDATE ولا DELETE من الواجهة: السجل دليل قانوني، فلا يعدّله صاحبه.
-- ============================================================================

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_consents_owner_insert" ON public.legal_consents;
CREATE POLICY "legal_consents_owner_insert"
  ON public.legal_consents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "legal_consents_owner_select" ON public.legal_consents;
CREATE POLICY "legal_consents_owner_select"
  ON public.legal_consents FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- ============================================================================
-- record_legal_consent — UPSERT لا يفشل على التعارض
-- ============================================================================
-- يُستدعى من الواجهة بعد نجاح المصادقة (مسار البريد ومسار Google معاً).
-- SECURITY DEFINER لأن الإدراج يجب أن ينجح حتى لو لم تكن سياسة INSERT مرئية
-- في جلسة المتصفح، ولأننا نثبّت user_id من auth.uid() لا من المُدخل.

CREATE OR REPLACE FUNCTION public.record_legal_consent(
  p_document       text DEFAULT 'privacy',
  p_policy_version text DEFAULT NULL,
  p_method         text DEFAULT 'email',
  p_user_agent     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_version text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'record_legal_consent: requires an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  v_version := btrim(coalesce(p_policy_version, ''));
  IF char_length(v_version) = 0 THEN
    RAISE EXCEPTION 'record_legal_consent: policy_version is required'
      USING ERRCODE = '22023';
  END IF;

  IF coalesce(p_document, 'privacy') NOT IN ('privacy', 'terms', 'cookies') THEN
    RAISE EXCEPTION 'record_legal_consent: unknown document %', p_document
      USING ERRCODE = '22023';
  END IF;

  IF coalesce(p_method, 'email') NOT IN ('email', 'google') THEN
    RAISE EXCEPTION 'record_legal_consent: unknown method %', p_method
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.legal_consents (
    user_id, document, policy_version, method, user_agent
  ) VALUES (
    v_uid, p_document, v_version, p_method, nullif(btrim(coalesce(p_user_agent, '')), '')
  )
  ON CONFLICT (user_id, document, policy_version) DO UPDATE
    SET user_agent = EXCLUDED.user_agent
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.record_legal_consent(text, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_legal_consent(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_legal_consent(text, text, text, text) TO authenticated, service_role;

-- ============================================================================
-- المطابقة: كل حساب يجب أن يملك موافقة مسجّلة.
-- الحسابات السابقة لهذا الترحيل لا تملك واحدة — فلا نلفّق موافقة بأثر رجعي؛
-- سنطلبها منهم عند أول دخول تالٍ (الواجهة تفعل ذلك تلقائياً).
-- استعلام الفحص بعد النشر:
--   select count(*) from auth.users u
--     where not exists (select 1 from public.legal_consents lc where lc.user_id = u.id);
-- ============================================================================

COMMIT;
