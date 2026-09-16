-- ============================================================================
-- البروفايلات العامة، حزم الاشتراك، وحوكمة طول التعليقات
-- ============================================================================
-- يبني على mizan_profiles (20260914000000) واشتراكات Mizan Pro (20260916000000).
--
-- مبادئ:
--   * الأعمدة الموجودة تُستعمل ولا تُعاد (bio/interests/city/is_public موجودة
--     أصلاً) — تُضاف فقط ما ينقص.
--   * كل ما يقرأه مسؤول يمر عبر دالة SECURITY DEFINER ببوابة admin_god_mode،
--     لا عبر سياسات RLS واسعة على جداول تحوي PII.
--   * قيود التعليقات تُفرض بمشغّل في القاعدة: أي فحص في الواجهة قابل للتجاوز
--     بالكامل، وواجهة التعليق الحالية تُرسل الطلب لدالة Pages لا للمتصفح.
-- ============================================================================

SET statement_timeout = '60s';
SET search_path = public, pg_temp;

-- ============================================================================
-- 1) البروفايل: المهنة، وقائمة الاهتمامات القانونية
-- ============================================================================

ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS occupation text
  CHECK (occupation IS NULL OR char_length(btrim(occupation)) BETWEEN 2 AND 120);
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS share_location boolean
  NOT NULL DEFAULT false;
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS bio_public boolean
  NOT NULL DEFAULT true;

COMMENT ON COLUMN public.mizan_profiles.share_location IS
  'المدينة موجودة أصلاً في city. هذا العلم هو إذن المستخدم بنشرها. بلا إذن، city تبقى خاصة.';

-- قائمة الاهتمامات المرجعية. تُخزَّن كجدول لا كـ enum لأن المستخدم يريد
-- إضافة/حذف خيارات من لوحة التحكم دون هجرة.
CREATE TABLE IF NOT EXISTS public.interest_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE
              CHECK (code ~ '^[a-z0-9_]{2,40}$'),
  label_ar    text NOT NULL CHECK (char_length(btrim(label_ar)) BETWEEN 2 AND 80),
  sort_order  integer NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.interest_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_options OWNER TO postgres;

-- نفس خيارات استبيان الترحيب الموجود (supabase/functions/onboarding) حتى لا
-- تظهر قائمتان مختلفتان للمستخدم.
INSERT INTO public.interest_options (code, label_ar, sort_order) VALUES
  ('lexicon',  'المعجم القانوني',        10),
  ('schools',  'كليات الحقوق',           20),
  ('pdfs',     'الملخصات والمراجع',      30),
  ('articles', 'المقالات والدراسات',     40),
  ('news',     'الأخبار القانونية',      50),
  ('events',   'الندوات واللقاءات',      60),
  ('concours', 'المباريات المهنية',      70),
  ('juris',    'الاجتهاد القضائي',       80)
ON CONFLICT (code) DO NOTHING;

DROP POLICY IF EXISTS "interest options are public" ON public.interest_options;
CREATE POLICY "interest options are public"
  ON public.interest_options FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- ============================================================================
-- 2) حزم الاشتراك — قابلة للإدارة من لوحة التحكم
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_]{2,40}$'),
  name_ar            text NOT NULL CHECK (char_length(btrim(name_ar)) BETWEEN 2 AND 80),
  tagline_ar         text CHECK (tagline_ar IS NULL OR char_length(btrim(tagline_ar)) <= 200),
  -- بأصغر وحدة: MAD عشرية بخانتين، فـ 49.00 = 4900.
  price_minor_units  integer NOT NULL CHECK (price_minor_units >= 0),
  currency           text NOT NULL DEFAULT 'mad'
                     CHECK (char_length(currency) = 3 AND currency = lower(currency)),
  billing_interval   text NOT NULL DEFAULT 'month'
                     CHECK (billing_interval IN ('month','year')),
  -- معرّف Stripe Price. nullable لأن الطبقة المجانية لا Price لها.
  stripe_price_id    text CHECK (stripe_price_id IS NULL OR char_length(stripe_price_id) BETWEEN 5 AND 150),
  benefits_ar        jsonb NOT NULL DEFAULT '[]'::jsonb
                     CHECK (jsonb_typeof(benefits_ar) = 'array'),
  is_active          boolean NOT NULL DEFAULT true,
  is_featured        boolean NOT NULL DEFAULT false,
  sort_order         integer NOT NULL DEFAULT 100,
  created_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at         timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans OWNER TO postgres;

-- الحزمة الافتراضية. price 4900 = 49.00 MAD كما في المواصفة.
INSERT INTO public.subscription_plans
  (code, name_ar, tagline_ar, price_minor_units, currency, billing_interval,
   benefits_ar, is_active, is_featured, sort_order)
VALUES
  ('free', 'مجاني', 'صفر إعلانات، تحكمه الرتبة والرصيد', 0, 'mad', 'month',
   '["صفر إعلانات","القاموس القانوني والملخصات","اختبارات حسب الرتبة والرصيد"]'::jsonb,
   true, false, 10),
  ('mizan_pro_monthly', 'Mizan Pro', 'الوصول الكامل وأولوية الدعم', 4900, 'mad', 'month',
   '["شجرة القانون الكاملة","اختبارات المباريات بلا حدود","دعم واتساب بأولوية"]'::jsonb,
   true, true, 20)
ON CONFLICT (code) DO NOTHING;

DROP POLICY IF EXISTS "active plans are public" ON public.subscription_plans;
CREATE POLICY "active plans are public"
  ON public.subscription_plans FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- updated_at تلقائي
CREATE OR REPLACE FUNCTION public.set_subscription_plans_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.set_subscription_plans_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_subscription_plans_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_subscription_plans_updated_at();

-- ============================================================================
-- 3) دوال الإدارة
-- ============================================================================

/** بوابة المسؤول: admin_god_mode، لا profiles.role (افتراضيه 'editor' فيمر الجميع). */
CREATE OR REPLACE FUNCTION public.is_god_admin_requester()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND admin_god_mode = true
  );
$$;
ALTER FUNCTION public.is_god_admin_requester() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_god_admin_requester() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_god_admin_requester() TO authenticated;

/** قائمة الحزم (كلها، لا النشطة فقط) — للمحرر. */
CREATE OR REPLACE FUNCTION public.admin_list_plans()
RETURNS SETOF public.subscription_plans
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.subscription_plans
   WHERE public.is_god_admin_requester()
   ORDER BY sort_order, created_at;
$$;
ALTER FUNCTION public.admin_list_plans() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_list_plans() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_plans() TO authenticated;

/**
 * إنشاء أو تعديل حزمة.
 *
 * ── لماذا لا نسمح بحذف فعلي ────────────────────────────────────────────────
 * because transactions و mizan_profiles يشيران إلى الحزمة بالاسم. حذف صف لديه
 * مشتركون حاليون كان سيكسر التسوية المالية. الإلغاء = is_active=false، وهذا
 * ما تفعله admin_deactivate_plan.
 */
CREATE OR REPLACE FUNCTION public.admin_upsert_plan(
  p_id                uuid    DEFAULT NULL,
  p_code              text    DEFAULT NULL,
  p_name_ar           text    DEFAULT NULL,
  p_tagline_ar        text    DEFAULT NULL,
  p_price_minor_units integer DEFAULT NULL,
  p_currency          text    DEFAULT 'mad',
  p_billing_interval  text    DEFAULT 'month',
  p_stripe_price_id   text    DEFAULT NULL,
  p_benefits_ar       jsonb   DEFAULT NULL,
  p_is_active         boolean DEFAULT NULL,
  p_is_featured       boolean DEFAULT NULL,
  p_sort_order        integer DEFAULT NULL
)
-- أسماء OUT مُبادئة بـ plan_: أسماء الأعمدة المجردة (id, name_ar, …) تصبح
-- معاملات OUT وتُظلّل الأعمدة في جسم الدالة، وفي طرف SET الأيسر لا يجوز
-- التأهيل فـ Postgres يرفضها كـ ambiguous.
RETURNS TABLE (plan_id uuid, plan_code text, plan_name text, plan_price integer, plan_active boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_god_admin_requester() THEN
    RAISE EXCEPTION 'permission denied for function admin_upsert_plan';
  END IF;

  IF p_id IS NULL THEN
    IF p_code IS NULL OR p_name_ar IS NULL OR p_price_minor_units IS NULL THEN
      RAISE EXCEPTION 'code, name_ar and price_minor_units are required to create a plan';
    END IF;
    INSERT INTO public.subscription_plans (
      code, name_ar, tagline_ar, price_minor_units, currency, billing_interval,
      stripe_price_id, benefits_ar, is_active, is_featured, sort_order)
    VALUES (
      btrim(p_code), btrim(p_name_ar), p_tagline_ar, p_price_minor_units,
      coalesce(p_currency,'mad'), coalesce(p_billing_interval,'month'),
      p_stripe_price_id,
      CASE WHEN jsonb_typeof(coalesce(p_benefits_ar,'[]'::jsonb)) = 'array'
           THEN coalesce(p_benefits_ar,'[]'::jsonb) ELSE '[]'::jsonb END,
      coalesce(p_is_active,true), coalesce(p_is_featured,false), coalesce(p_sort_order,100))
    RETURNING subscription_plans.id INTO v_id;
  ELSE
    UPDATE public.subscription_plans
       SET name_ar           = coalesce(btrim(p_name_ar), name_ar),
           tagline_ar        = coalesce(p_tagline_ar, tagline_ar),
           price_minor_units = coalesce(p_price_minor_units, price_minor_units),
           currency          = coalesce(p_currency, currency),
           billing_interval  = coalesce(p_billing_interval, billing_interval),
           stripe_price_id   = coalesce(p_stripe_price_id, stripe_price_id),
           benefits_ar       = CASE
                                 WHEN p_benefits_ar IS NULL THEN benefits_ar
                                 WHEN jsonb_typeof(p_benefits_ar) = 'array' THEN p_benefits_ar
                                 ELSE benefits_ar
                               END,
           is_active         = coalesce(p_is_active, is_active),
           is_featured       = coalesce(p_is_featured, is_featured),
           sort_order        = coalesce(p_sort_order, sort_order)
     -- مؤهَّل صراحةً: id هو أيضاً معامل OUT في RETURNS TABLE، فـ WHERE id = …
     -- غامض ويرفضه Postgres.
     WHERE subscription_plans.id = p_id
    RETURNING subscription_plans.id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'plan % not found', p_id;
    END IF;
  END IF;

  RETURN QUERY
    SELECT s.id, s.code, s.name_ar, s.price_minor_units, s.is_active
      FROM public.subscription_plans s WHERE s.id = v_id;
END;
$$;
ALTER FUNCTION public.admin_upsert_plan(uuid,text,text,text,integer,text,text,text,jsonb,boolean,boolean,integer)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_upsert_plan(uuid,text,text,text,integer,text,text,text,jsonb,boolean,boolean,integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_plan(uuid,text,text,text,integer,text,text,text,jsonb,boolean,boolean,integer)
  TO authenticated;

/** إلغاء حزمة (لا حذف): تبقى للتسوية وتختفي من الواجهة. */
CREATE OR REPLACE FUNCTION public.admin_deactivate_plan(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_god_admin_requester() THEN
    RAISE EXCEPTION 'permission denied for function admin_deactivate_plan';
  END IF;
  UPDATE public.subscription_plans SET is_active = false, is_featured = false WHERE id = p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;
ALTER FUNCTION public.admin_deactivate_plan(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_deactivate_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_plan(uuid) TO authenticated;

-- ============================================================================
-- 4) لوحة التحكم: كل بيانات المستخدمين، وإضافة مستخدم
-- ============================================================================

/**
 * كل بيانات البروفايلات — لعرض «تحقق مما أضافه الناس».
 *
 * SECURITY DEFINER لأن هذه PII كاملة. البوابة admin_god_mode؛ بدونها كان أي
 * مستخدم مسجّل يستطيع قراءة بريد وسيرة كل المستخدمين.
 */
CREATE OR REPLACE FUNCTION public.admin_list_profile_data(
  p_query   text    DEFAULT NULL,
  p_limit   integer DEFAULT 50,
  p_offset  integer DEFAULT 0
)
RETURNS TABLE (
  id uuid, clerk_user_id text, username text, display_name text,
  occupation text, role text, semester text, years_of_experience integer,
  city text, share_location boolean, bio text, bio_public boolean,
  interests text[], is_public boolean,
  rank text, xp integer, credits integer, badges text[], streak_days integer,
  is_pro boolean, subscription_status text, placement_completed boolean,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id, m.clerk_user_id, m.username, m.display_name,
    m.occupation, m.role, m.semester, m.years_of_experience,
    m.city, m.share_location, m.bio, m.bio_public,
    m.interests, m.is_public,
    m.rank, m.xp, m.credits, m.badges, m.streak_days,
    m.is_pro, m.subscription_status, m.placement_completed,
    m.created_at, m.updated_at
  FROM public.mizan_profiles m
  WHERE public.is_god_admin_requester()
    AND (p_query IS NULL OR btrim(p_query) = ''
         OR m.username     ILIKE '%' || btrim(p_query) || '%'
         OR m.display_name ILIKE '%' || btrim(p_query) || '%'
         OR m.city         ILIKE '%' || btrim(p_query) || '%'
         OR m.occupation   ILIKE '%' || btrim(p_query) || '%')
  ORDER BY m.updated_at DESC
  LIMIT least(greatest(coalesce(p_limit,50),1),200)
  OFFSET greatest(coalesce(p_offset,0),0);
$$;
ALTER FUNCTION public.admin_list_profile_data(text,integer,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_list_profile_data(text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profile_data(text,integer,integer) TO authenticated;

/** إنشاء مستخدم من لوحة التحكم (دعم فني، أو ترحيل يدوي). */
CREATE OR REPLACE FUNCTION public.admin_create_profile(
  p_username     text,
  p_display_name text,
  p_occupation   text    DEFAULT NULL,
  p_role         text    DEFAULT 'student',
  p_semester     text    DEFAULT NULL,
  p_city         text    DEFAULT NULL,
  p_bio          text    DEFAULT NULL,
  p_interests    text[]  DEFAULT NULL,
  p_is_public    boolean DEFAULT true,
  p_credits      integer DEFAULT 0,
  p_xp           integer DEFAULT 0
)
RETURNS TABLE (id uuid, username text, rank text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_god_admin_requester() THEN
    RAISE EXCEPTION 'permission denied for function admin_create_profile';
  END IF;

  IF p_username IS NULL OR p_username !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'username must match ^[a-z0-9_]{3,30}$';
  END IF;
  IF p_role NOT IN ('student','lawyer','citizen') THEN
    RAISE EXCEPTION 'role must be student, lawyer or citizen';
  END IF;

  -- mizan_profiles_owner_check يفرض owner_id أو clerk_user_id. مستخدم أُنشئ
  -- من لوحة التحكم لا يملك أياً منهما، فنعطيه clerk_user_id تركيبياً واضح
  -- المصدر. يبقى فريداً لأن username فريد.
  INSERT INTO public.mizan_profiles (
    clerk_user_id, username, display_name, occupation, role, semester, city, bio,
    interests, is_public, credits, xp, rank)
  VALUES (
    'admin_' || btrim(p_username),
    btrim(p_username), btrim(p_display_name), p_occupation, p_role, p_semester,
    p_city, p_bio, coalesce(p_interests,'{}'),
    coalesce(p_is_public,true), greatest(coalesce(p_credits,0),0),
    greatest(coalesce(p_xp,0),0),
    public.get_user_rank(greatest(coalesce(p_xp,0),0))::text)
  RETURNING mizan_profiles.id INTO v_id;

  RETURN QUERY
    SELECT m.id, m.username, m.rank FROM public.mizan_profiles m WHERE m.id = v_id;
END;
$$;
ALTER FUNCTION public.admin_create_profile(text,text,text,text,text,text,text,text[],boolean,integer,integer)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_create_profile(text,text,text,text,text,text,text,text[],boolean,integer,integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_profile(text,text,text,text,text,text,text,text[],boolean,integer,integer)
  TO authenticated;

-- ============================================================================
-- 5) البروفايل العام
-- ============================================================================

/**
 * البروفايل العام لاسم مستخدم.
 *
 * يحترم الأعلام الثلاثة: is_public (البروفايل كله)، share_location (المدينة)،
 * bio_public (السيرة). القراءة المباشرة للجدول كانت ستُسرّب المدينة والسيرة
 * حتى لو أخفاهما المستخدم.
 */
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS TABLE (
  username text, display_name text, occupation text, role text, semester text,
  city text, bio text, interests text[], rank text, xp integer,
  badges text[], streak_days integer, is_pro boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.username, m.display_name, m.occupation, m.role, m.semester,
    CASE WHEN m.share_location THEN m.city ELSE NULL END,
    CASE WHEN m.bio_public     THEN m.bio  ELSE NULL END,
    m.interests, m.rank, m.xp,
    m.badges, m.streak_days, m.is_pro, m.created_at
  FROM public.mizan_profiles m
  WHERE lower(m.username) = lower(btrim(coalesce(p_username,'')))
    AND m.is_public = true;
$$;
ALTER FUNCTION public.get_public_profile(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

-- ============================================================================
-- 6) حذف الحساب
-- ============================================================================

/**
 * حذف الحساب.
 *
 * ── لماذا دالة لا DELETE من المتصفح ────────────────────────────────────────
 * because الحذف يمسّ عدة جداول (البروفايل، onboarding_responses، quiz_attempts
 * المرتبطة). تركه للمتصفح يعني سياسات DELETE واسعة على جداول مالية.
 *
 * ── ماذا يُحذف وماذا يبقى ─────────────────────────────────────────────────
 * يُحذف البروفايل وما يتبعه. تبقى transactions و audit_logs: سجل مالي وقانوني
 * لا يجوز إتلافه بطلب مستخدم، وهي مفصولة عن البروفايل بـ clerk_user_id نصّي
 * لا بـ FK، فحذف البروفايل لا يمحوها.
 */
CREATE OR REPLACE FUNCTION public.delete_my_account(p_clerk_user_id text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  n integer;
BEGIN
  v_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF v_role <> 'service_role' THEN
    RAISE EXCEPTION 'permission denied for function delete_my_account';
  END IF;
  IF p_clerk_user_id IS NULL OR char_length(btrim(p_clerk_user_id)) < 5 THEN
    RAISE EXCEPTION 'clerk_user_id required';
  END IF;

  DELETE FROM public.mizan_profiles WHERE clerk_user_id = p_clerk_user_id;
  GET DIAGNOSTICS n = ROW_COUNT;

  -- أثر في السجل: الحذف حدث لا رجعة فيه ويجب أن يُرى.
  INSERT INTO public.audit_logs (action, table_name, new_data)
  VALUES ('account_deleted', 'mizan_profiles',
          jsonb_build_object('clerk_user_id', p_clerk_user_id));

  RETURN n > 0;
END;
$$;
ALTER FUNCTION public.delete_my_account(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_my_account(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO service_role;

-- ============================================================================
-- 7) حوكمة طول التعليقات: الرتبة للعضو، وحدّ صارم للزائر
-- ============================================================================

-- ── تعليقات: ربط بالمستخدم، ورفع سقف الطول الثابت ─────────────────────────
-- جدول comments الأصلي بلا user_id إطلاقاً — التعليق كان يُنسب إلى author_name
-- نصّي فقط. بلا ربط لا يمكن معرفة رتبة الكاتب، فحدّ الطول حسب الرتبة مستحيل.
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS clerk_user_id text
  CHECK (clerk_user_id IS NULL OR char_length(clerk_user_id) BETWEEN 5 AND 150);

-- القيد الأصلي comments_body_length يحدد 2000 حرف. حدّ رتبة S هو 4000، فكان
-- القيد سيرفض التعليق قبل أن يعمل المشغّل. نوسّعه إلى 4000 ونترك التفصيل
-- الدقيق للمشغّل (الذي يعرف الرتبة) — القيد يبقى شبكة أمان ضد الأجسام الضخمة.
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_body_length;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'comments_body_length_v2'
       AND conrelid = 'public.comments'::regclass
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_body_length_v2
      CHECK (char_length(body) BETWEEN 1 AND 4000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS comments_user_idx ON public.comments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_clerk_user_idx ON public.comments (clerk_user_id, created_at DESC);

/** حدود الطول. تُرجع (أدنى، أقصى). */
CREATE OR REPLACE FUNCTION public.comment_length_limits(
  p_rank     text,
  p_is_guest boolean
)
RETURNS TABLE (min_len integer, max_len integer)
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    CASE
      WHEN p_is_guest THEN 20
      ELSE 10
    END,
    CASE
      -- الزائر: حدّ صارم قصير. لا حساب ولا سمعة، فأغلب الطول الطويل سبام.
      WHEN p_is_guest THEN 300
      -- الأعضاء: الطول الكامل يتطلب رتبة S فأعلى.
      WHEN p_rank IN ('S','SS','SSS') THEN 4000
      WHEN p_rank IN ('A')            THEN 2000
      WHEN p_rank IN ('B','C')        THEN 1000
      ELSE 600
    END;
$$;
ALTER FUNCTION public.comment_length_limits(text,boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.comment_length_limits(text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comment_length_limits(text,boolean) TO anon, authenticated, service_role;

/**
 * يُطبق حدّ الطول قبل الإدراج.
 *
 * ── لماذا مشغّل لا فحص في functions/api/comments.js ───────────────────────
 * because نقطة النهاية تعرف IP الزائر لكنها لا تعرف رتبته، والرتبة في
 * mizan_profiles. ولو فرضنا الحد في JS فقط، فأي طلب مباشر إلى PostgREST
 * (بمفتاح anon) يتجاوزه. المشغّل هو الطبقة التي لا يمكن تجاوزها.
 */
CREATE OR REPLACE FUNCTION public.enforce_comment_length()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_guest boolean;
  v_rank text;
  v_len integer;
  v_limits record;
BEGIN
  v_is_guest := NEW.user_id IS NULL;

  IF NOT v_is_guest THEN
    SELECT m.rank INTO v_rank
      FROM public.profiles p
      JOIN public.mizan_profiles m ON m.owner_id = p.id
     WHERE p.id = NEW.user_id
     LIMIT 1;
  END IF;
  v_rank := coalesce(v_rank, 'D');

  SELECT * INTO v_limits FROM public.comment_length_limits(v_rank, v_is_guest);

  v_len := char_length(btrim(coalesce(NEW.body, '')));
  IF v_len < v_limits.min_len THEN
    RAISE EXCEPTION 'comment too short: minimum % characters', v_limits.min_len;
  END IF;
  IF v_len > v_limits.max_len THEN
    RAISE EXCEPTION 'comment too long: rank % allows at most % characters',
      v_rank, v_limits.max_len;
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION public.enforce_comment_length() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enforce_comment_length() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enforce_comment_length ON public.comments;
CREATE TRIGGER trg_enforce_comment_length
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_length();

/** ما يسمح به هذا المستخدم — تُعرض في الواجهة قبل الكتابة لا بعدها. */
CREATE OR REPLACE FUNCTION public.get_my_comment_limits(p_clerk_user_id text DEFAULT NULL)
RETURNS TABLE (is_guest boolean, rank text, min_len integer, max_len integer)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (p_clerk_user_id IS NULL) AS is_guest,
    coalesce(m.rank, 'D')     AS rank,
    l.min_len, l.max_len
  FROM (SELECT 1) AS _
  LEFT JOIN public.mizan_profiles m
    ON m.clerk_user_id = p_clerk_user_id
  CROSS JOIN LATERAL public.comment_length_limits(coalesce(m.rank,'D'), p_clerk_user_id IS NULL) l;
$$;
ALTER FUNCTION public.get_my_comment_limits(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_comment_limits(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_comment_limits(text) TO anon, authenticated;

SET search_path = public, pg_temp;
