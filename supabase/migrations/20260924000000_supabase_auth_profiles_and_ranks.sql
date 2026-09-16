-- 20260924000000_supabase_auth_profiles_and_ranks.sql
--
-- ============================================================================
-- إزالة Clerk نهائياً: Supabase Auth becomes the ONLY identity provider,
-- every account gets a custom profile, and the full rank ladder (D → SSS)
-- is applied to those profiles by the database itself.
-- ============================================================================
--
-- What this migration does
-- ------------------------
--   1) handle_new_user() now provisions BOTH public.profiles (admin/CMS side)
--      and public.mizan_profiles (the public, shareable profile) in one shot,
--      so a Supabase sign-up immediately owns a rank-D profile with a unique
--      username. The trigger on auth.users is (re)created explicitly because
--      no migration in this repo ever declared it.
--   2) mizan_profiles gains the "custom profile" columns: avatar, cover,
--      headline, links, theme accent, and per-section visibility switches.
--   3) The rank ladder moves into the database (public.rank_capabilities +
--      public.mizan_rank_for_xp) and a BEFORE INSERT/UPDATE trigger derives
--      mizan_profiles.rank from xp on every write. Rank can no longer drift
--      from XP, and the client can never claim a rank it did not earn.
--   4) RLS: the owner can always read their own profile (even when private);
--      the public still only sees is_public rows.
--   5) onboarding_responses stops depending on a Clerk id: it gains
--      user_id uuid → auth.users and clerk_user_id becomes legacy/nullable.
--   6) Read models for "all ranks on all profiles": public.profile_rank_board
--      (leaderboard) and public.mizan_rank_matrix() (rank ladder + perks).
--
-- Backwards compatibility
-- -----------------------
--   mizan_profiles.clerk_user_id, reactions.clerk_user_id,
--   reports.reporter_clerk_id and comments.clerk_user_id are KEPT as nullable
--   legacy columns: production rows written before this change must not be
--   destroyed. Nothing in the application reads or writes them any more, and
--   new rows always carry owner_id / auth.uid(). They can be dropped in a
--   later migration once the legacy rows have been reconciled.
--
-- Idempotent: every statement is guarded (IF NOT EXISTS / OR REPLACE / DROP
-- IF EXISTS) so re-running the file is safe.

SET statement_timeout = '120s';
SET search_path = public, pg_temp;

BEGIN;

-- ============================================================================
-- 1) سلم الرتب في قاعدة البيانات (single source of truth for D → SSS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rank_capabilities (
  rank             text PRIMARY KEY,
  level            integer NOT NULL UNIQUE CHECK (level BETWEEN 1 AND 7),
  label_ar         text NOT NULL,
  description_ar   text NOT NULL,
  min_xp           integer NOT NULL CHECK (min_xp >= 0),
  -- NULL max_xp = الرتبة الأخيرة (بلا سقف)
  max_xp           integer CHECK (max_xp IS NULL OR max_xp > min_xp),
  glyph            text NOT NULL DEFAULT 'D',
  -- الصلاحيات الممنوحة لهذه الرتبة
  can_comment              boolean NOT NULL DEFAULT true,
  can_react                boolean NOT NULL DEFAULT true,
  can_save_content         boolean NOT NULL DEFAULT true,
  can_suggest_content      boolean NOT NULL DEFAULT false,
  can_help_peers           boolean NOT NULL DEFAULT false,
  can_publish_article      boolean NOT NULL DEFAULT false,
  recommendation_cert      boolean NOT NULL DEFAULT false,
  advisor_panel            boolean NOT NULL DEFAULT false,
  hall_of_fame             boolean NOT NULL DEFAULT false,
  -- حدود مضادة للسبام تتوسع مع الرتبة
  max_daily_reports        integer NOT NULL DEFAULT 3 CHECK (max_daily_reports >= 0),
  max_daily_comments       integer NOT NULL DEFAULT 10 CHECK (max_daily_comments >= 0),
  perks_ar                 text[] NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at       timestamptz NOT NULL DEFAULT timezone('utc', now()),
  -- العتبات يجب أن تكون متصلة: سقف الرتبة = أرضية التالية
  CONSTRAINT rank_capabilities_rank_check
    CHECK (rank IN ('D','C','B','A','S','SS','SSS'))
);

ALTER TABLE public.rank_capabilities OWNER TO postgres;
ALTER TABLE public.rank_capabilities ENABLE ROW LEVEL SECURITY;

-- نفس العتبات المستعملة في src/lib/quiz/ranks.ts حرفياً.
INSERT INTO public.rank_capabilities AS rc (
  rank, level, label_ar, description_ar, min_xp, max_xp, glyph,
  can_suggest_content, can_help_peers, can_publish_article,
  recommendation_cert, advisor_panel, hall_of_fame,
  max_daily_reports, max_daily_comments, perks_ar
) VALUES
  ('D', 1, 'مبتدئ',
   'أول خطوة في الطريق: تتعرف على النصوص وتجمع نقاط خبرتك الأولى.',
   0, 120, 'D',
   false, false, false, false, false, false,
   3, 10,
   ARRAY['بروفايل عام ورابط mizan.page/u/اسمك','حفظ المحتوى والتفاعل','اختبارات غير محدودة']),

  ('C', 2, 'متعلم',
   'بدأت تتمكن من المصطلحات والمبادئ العامة للقانون المغربي.',
   120, 300, 'C',
   true, false, false, false, false, false,
   4, 15,
   ARRAY['اقتراح مصطلحات ومصادر للقاموس','شارة الرتبة C في البروفايل']),

  ('B', 3, 'متمكن',
   'تجيب عن أسئلة الفصول المتوسطة بثبات وتفهم الروابط بين المواد.',
   300, 650, 'B',
   true, false, false, false, false, false,
   5, 20,
   ARRAY['ظهور اسمك في لوحة المتصدرين','رفع حد التعليقات اليومي']),

  ('A', 4, 'متقدم',
   'مستوى يؤهلك لمساعدة زملائك في المراجعة ونشر أولى مقالاتك.',
   650, 1200, 'A',
   true, true, true, false, false, false,
   6, 30,
   ARRAY['نشر مقالاتك في منصة ميزان','مساعدة الزملاء في المراجعة']),

  ('S', 5, 'خبير',
   'رتبة تفتح باب شهادة التوصية المعتمدة (Mizan Recommendation).',
   1200, 2200, 'S',
   true, true, true, true, false, false,
   8, 40,
   ARRAY['شهادة توصية معتمدة من ميزان','شارة خبير موثقة في البروفايل العام']),

  ('SS', 6, 'نخبة',
   'تستحق الثقة: إجاباتك مرجع للآخرين في لوحة الاستشارات.',
   2200, 4000, 'SS',
   true, true, true, true, true, false,
   10, 60,
   ARRAY['عضوية لوحة الاستشارات','أولوية في مراجعة اقتراحاتك']),

  ('SSS', 7, 'النخبة العليا',
   'أعلى رتبة في ميزان: اسمك مقترن بالتميز القانوني المستمر.',
   4000, NULL, 'SSS',
   true, true, true, true, true, true,
   15, 100,
   ARRAY['قاعة المشاهير (Hall of Fame)','أعلى رتبة في المنصة بلا سقف خبرة'])
ON CONFLICT (rank) DO UPDATE SET
  level               = EXCLUDED.level,
  label_ar            = EXCLUDED.label_ar,
  description_ar      = EXCLUDED.description_ar,
  min_xp              = EXCLUDED.min_xp,
  max_xp              = EXCLUDED.max_xp,
  glyph               = EXCLUDED.glyph,
  can_suggest_content = EXCLUDED.can_suggest_content,
  can_help_peers      = EXCLUDED.can_help_peers,
  can_publish_article = EXCLUDED.can_publish_article,
  recommendation_cert = EXCLUDED.recommendation_cert,
  advisor_panel       = EXCLUDED.advisor_panel,
  hall_of_fame        = EXCLUDED.hall_of_fame,
  max_daily_reports   = EXCLUDED.max_daily_reports,
  max_daily_comments  = EXCLUDED.max_daily_comments,
  perks_ar            = EXCLUDED.perks_ar,
  updated_at          = timezone('utc', now());

COMMENT ON TABLE public.rank_capabilities IS
  'سلم الرتب D→SSS مع عتبات الخبرة والصلاحيات. مرآة لـ src/lib/quiz/ranks.ts — أي تعديل في أحدهما يجب أن ينعكس في الآخر.';

-- سلم الرتب معلومة عامة (لا PII): قراءة مفتوحة، كتابة للإدارة فقط.
DROP POLICY IF EXISTS "rank_capabilities_public_read" ON public.rank_capabilities;
CREATE POLICY "rank_capabilities_public_read"
  ON public.rank_capabilities FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "rank_capabilities_admin_write" ON public.rank_capabilities;
CREATE POLICY "rank_capabilities_admin_write"
  ON public.rank_capabilities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- mizan_rank_for_xp(xp) — نفس منطق getRankForXp في TypeScript
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mizan_rank_for_xp(p_xp integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT rc.rank
       FROM public.rank_capabilities rc
      WHERE coalesce(p_xp, 0) >= rc.min_xp
      ORDER BY rc.min_xp DESC
      LIMIT 1),
    'D'
  );
$$;

CREATE OR REPLACE FUNCTION public.mizan_rank_level(p_rank text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce((SELECT rc.level FROM public.rank_capabilities rc WHERE rc.rank = p_rank), 1);
$$;

-- رتبة المستخدم الحالي (من بروفايله) — تُستعمل في سياسات RLS المبنية على الرتبة.
CREATE OR REPLACE FUNCTION public.current_user_rank()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT mp.rank FROM public.mizan_profiles mp WHERE mp.owner_id = (SELECT auth.uid()) LIMIT 1),
    'D'
  );
$$;

-- هل يملك المستخدم الحالي رتبة >= المطلوبة؟ (بوابة النشر والاقتراح)
CREATE OR REPLACE FUNCTION public.has_rank_at_least(p_rank text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.mizan_rank_level(public.current_user_rank())
         >= public.mizan_rank_level(p_rank);
$$;

REVOKE ALL ON FUNCTION public.mizan_rank_for_xp(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mizan_rank_for_xp(integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.mizan_rank_level(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mizan_rank_level(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_user_rank() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_rank() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_rank_at_least(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_rank_at_least(text) TO authenticated, service_role;

-- ============================================================================
-- 2) أعمدة البروفايل المخصص (custom profile) على mizan_profiles
-- ============================================================================

ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS avatar_url text
  CHECK (avatar_url IS NULL OR char_length(btrim(avatar_url)) BETWEEN 1 AND 2048);
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS cover_url text
  CHECK (cover_url IS NULL OR char_length(btrim(cover_url)) BETWEEN 1 AND 2048);
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS headline text
  CHECK (headline IS NULL OR char_length(btrim(headline)) <= 120);
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS website_url text
  CHECK (website_url IS NULL OR char_length(btrim(website_url)) BETWEEN 1 AND 2048);
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS linkedin_url text
  CHECK (linkedin_url IS NULL OR char_length(btrim(linkedin_url)) BETWEEN 1 AND 2048);
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS theme_color text
  CHECK (theme_color IS NULL OR theme_color ~ '^#[0-9a-fA-F]{6}$');

-- مفاتيح إظهار/إخفاء أقسام البروفايل العام (التخصيص الحقيقي للخصوصية)
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS show_xp boolean NOT NULL DEFAULT true;
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS show_badges boolean NOT NULL DEFAULT true;
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS show_attempts boolean NOT NULL DEFAULT false;
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS show_rank boolean NOT NULL DEFAULT true;

-- تتبع الرتبة: متى تغيّرت وأعلى رتبة بلغها المستخدم (لا تنزل أبداً)
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS highest_rank text
  CHECK (highest_rank IS NULL OR highest_rank IN ('D','C','B','A','S','SS','SSS'));
ALTER TABLE public.mizan_profiles ADD COLUMN IF NOT EXISTS rank_updated_at timestamptz;

COMMENT ON COLUMN public.mizan_profiles.highest_rank IS
  'أعلى رتبة بلغها البروفايل. لا تُخفّض أبداً — تُستعمل في الشارات ولوحة الشرف.';
COMMENT ON COLUMN public.mizan_profiles.clerk_user_id IS
  'LEGACY — Clerk أُزيل. العمود باقٍ لصفوف تاريخية فقط، ولا يكتب عليه أي كود حديث.';

-- ============================================================================
-- 3) مشغّل تطبيق الرتبة: rank مشتق من xp في كل كتابة
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_profile_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rank text;
BEGIN
  -- XP/Kredits لا يمكن أن تكون سالبة
  NEW.xp      := greatest(coalesce(NEW.xp, 0), 0);
  NEW.credits := greatest(coalesce(NEW.credits, 0), 0);

  -- الرتبة تُحسب من الخبرة، لا مما يرسله العميل
  v_rank   := public.mizan_rank_for_xp(NEW.xp);
  NEW.rank := v_rank;

  -- أعلى رتبة محفوظة (monotonic) — إلا إذا خفّضت الإدارة xp عمداً
  IF public.is_admin() THEN
    NEW.highest_rank := v_rank;
  ELSE
    NEW.highest_rank := CASE
      WHEN public.mizan_rank_level(NEW.highest_rank) >= public.mizan_rank_level(v_rank)
        THEN coalesce(NEW.highest_rank, v_rank)
      ELSE v_rank
    END;
  END IF;

  -- تاريخ تغيّر الرتبة (OLD غير متاحة في INSERT، لذا نفصل الحالتين صراحة)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.rank IS DISTINCT FROM NEW.rank THEN
      NEW.rank_updated_at := timezone('utc', now());
    ELSE
      NEW.rank_updated_at := coalesce(OLD.rank_updated_at, timezone('utc', now()));
    END IF;
  ELSE
    NEW.rank_updated_at := timezone('utc', now());
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.apply_profile_rank() OWNER TO postgres;

DROP TRIGGER IF EXISTS "apply_profile_rank_trigger" ON public.mizan_profiles;
CREATE TRIGGER "apply_profile_rank_trigger"
  BEFORE INSERT OR UPDATE ON public.mizan_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_profile_rank();

-- مواءمة الصفوف الموجودة: كل بروفايل يأخذ رتبته الصحيحة من خبرته الآن.
UPDATE public.mizan_profiles
   SET rank          = public.mizan_rank_for_xp(xp),
       highest_rank  = public.mizan_rank_for_xp(xp),
       rank_updated_at = coalesce(rank_updated_at, timezone('utc', now()))
 WHERE rank IS DISTINCT FROM public.mizan_rank_for_xp(xp)
    OR highest_rank IS NULL;

-- ============================================================================
-- 4) إنشاء البروفايل تلقائياً عند تسجيل حساب Supabase
-- ============================================================================

-- اسم مستخدم فريد مشتق من البريد/البيانات الوصفية: mizan.page/u/<username>
CREATE OR REPLACE FUNCTION public.generate_profile_username(p_seed text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
BEGIN
  v_base := lower(regexp_replace(coalesce(btrim(p_seed), ''), '[^a-zA-Z0-9_]', '', 'g'));
  v_base := left(v_base, 20);
  IF char_length(v_base) < 3 THEN
    v_base := 'mizan_' || v_base;
  END IF;
  v_base := left(regexp_replace(v_base, '^[^a-z0-9]+', ''), 20);
  IF char_length(v_base) < 3 THEN
    v_base := 'mizan_user';
  END IF;

  v_candidate := v_base;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.mizan_profiles mp WHERE lower(mp.username) = v_candidate) THEN
      RETURN v_candidate;
    END IF;
    v_suffix := v_suffix + 1;
    v_candidate := left(v_base, 30 - char_length(v_suffix::text) - 1) || '_' || v_suffix::text;
    IF v_suffix > 500 THEN
      -- ملاذ أخير: جزء من uuid (فريد عملياً)
      RETURN left(v_base, 20) || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION public.generate_profile_username(text) OWNER TO postgres;

-- handle_new_user: profiles + mizan_profiles في نفس المعاملة
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  extracted_name text;
  v_username text;
  v_avatar text;
  v_email text;
BEGIN
  -- التسجيل قد يتم عبر هاتف أو مزوّد اجتماعي بلا بريد ظاهر: profiles.email
  -- NOT NULL، فلنبني بديلاً آمناً حتى لا يفشل إنشاء الحساب كله.
  v_email := coalesce(
    nullif(btrim(NEW.email), ''),
    NEW.id::text || '@users.noreply.mizan.page'
  );

  extracted_name := coalesce(
    nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(split_part(v_email, '@', 1)), ''),
    'مستخدم ميزان'
  );

  v_avatar := nullif(btrim(NEW.raw_user_meta_data->>'avatar_url'), '');

  -- 1) صف profiles (جانب لوحة التحكم / الصلاحيات) — دور member بلا صلاحية
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
  VALUES (NEW.id, v_email, extracted_name, 'member'::public.user_role, coalesce(v_avatar, ''))
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    updated_at = timezone('utc', now());

  -- 2) البروفايل العام القابل للمشاركة، يبدأ برتبة D و 0 XP
  IF NOT EXISTS (SELECT 1 FROM public.mizan_profiles mp WHERE mp.owner_id = NEW.id) THEN
    v_username := public.generate_profile_username(
      coalesce(NEW.raw_user_meta_data->>'username', split_part(v_email, '@', 1))
    );

    INSERT INTO public.mizan_profiles (
      owner_id, username, display_name, role,
      xp, credits, rank, badges, streak_days,
      placement_completed, is_public, avatar_url, highest_rank
    ) VALUES (
      NEW.id, v_username, extracted_name, 'student',
      0, 0, public.mizan_rank_for_xp(0), '{}', 0,
      false, true, v_avatar, public.mizan_rank_for_xp(0)
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_profile_username(text) TO service_role;

-- المشغّل on_auth_user_created يُنفَّذ بواسطة supabase_auth_admin (وليس
-- service_role) عند كل تسجيل جديد، وبما أننا سحبنا صلاحية PUBLIC أعلاه فبدون
-- هذا المنح يفشل إنشاء الحساب بـ "permission denied for function".
-- DO block لأن الدور غير موجود في بيئات الاختبار المحلية.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.handle_new_user() TO %I', 'supabase_auth_admin');
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.generate_profile_username(text) TO %I', 'supabase_auth_admin');
  END IF;
END $$;

-- المشغّل نفسه: لم يُعلن في أي ترحيل سابق، فنثبّته هنا بشكل صريح.
DROP TRIGGER IF EXISTS "on_auth_user_created" ON auth.users;
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- مطابقة الصفوف اليتيمة: بروفايلات Supabase بلا mizan_profiles (حسابات أُنشئت
-- قبل هذا الترحيل، مثل حسابات الإدارة) تحصل على بروفايل عام الآن.
-- حلقة لا INSERT..SELECT واحدة: generate_profile_username تفحص الجدول،
-- فإدراج صف بصف يضمن ألا يتكرر الاسم المولّد بين صفين في نفس الدفعة.
DO $$
DECLARE
  r record;
  v_username text;
BEGIN
  FOR r IN
    SELECT p.id, p.email, p.full_name, p.bonus_credits
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.mizan_profiles mp WHERE mp.owner_id = p.id)
  LOOP
    v_username := public.generate_profile_username(
      coalesce(nullif(btrim(r.full_name), ''), split_part(r.email, '@', 1))
    );

    INSERT INTO public.mizan_profiles (
      owner_id, username, display_name, role, xp, credits, rank, highest_rank, is_public
    ) VALUES (
      r.id,
      v_username,
      coalesce(nullif(btrim(r.full_name), ''), split_part(r.email, '@', 1), 'مستخدم ميزان'),
      'student',
      0,
      greatest(coalesce(r.bonus_credits, 0), 0),
      public.mizan_rank_for_xp(0),
      public.mizan_rank_for_xp(0),
      false
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- 5) RLS: المالك يقرأ بروفايله دائماً (حتى لو كان خاصاً)
-- ============================================================================

DROP POLICY IF EXISTS "mizan_profiles_owner_read" ON public.mizan_profiles;
CREATE POLICY "mizan_profiles_owner_read"
  ON public.mizan_profiles FOR SELECT
  TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.is_admin());

-- mizan_profiles_public_read موجودة (is_public = true) ولا تتغير.
-- سياسات owner_insert / owner_update / owner_delete من 20260920000000 تبقى كما هي:
-- check_profile_xp_jump يمنع القفزات غير المعقولة، وapply_profile_rank يفرض
-- الرتبة الصحيحة المشتقة من xp.

-- ============================================================================
-- 6) onboarding_responses بلا Clerk
-- ============================================================================

ALTER TABLE public.onboarding_responses ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.onboarding_responses ALTER COLUMN clerk_user_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'onboarding_responses'
      AND c.conname = 'onboarding_responses_identity_check'
  ) THEN
    ALTER TABLE public.onboarding_responses
      ADD CONSTRAINT onboarding_responses_identity_check
      CHECK (user_id IS NOT NULL OR clerk_user_id IS NOT NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_responses_user_id_key
  ON public.onboarding_responses (user_id);

COMMENT ON COLUMN public.onboarding_responses.clerk_user_id IS
  'LEGACY — Clerk أُزيل. استعمل user_id (auth.users) لكل صف جديد.';

-- ============================================================================
-- 7) نماذج القراءة: لوحة الرتب + مصفوفة الرتب
-- ============================================================================

-- لوحة المتصدرين بالرتب (بروفايلات عامة فقط، بلا PII)
CREATE OR REPLACE FUNCTION public.profile_rank_board(p_limit integer DEFAULT 20)
RETURNS TABLE (
  username    text,
  display_name text,
  avatar_url  text,
  role        text,
  rank        text,
  rank_label  text,
  level       integer,
  xp          integer,
  badges      text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    mp.username,
    mp.display_name,
    mp.avatar_url,
    mp.role,
    mp.rank,
    rc.label_ar,
    rc.level,
    mp.xp,
    mp.badges
  FROM public.mizan_profiles mp
  LEFT JOIN public.rank_capabilities rc ON rc.rank = mp.rank
  WHERE mp.is_public = true
    AND mp.show_rank = true
  ORDER BY mp.xp DESC, mp.updated_at DESC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

ALTER FUNCTION public.profile_rank_board(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.profile_rank_board(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_rank_board(integer) TO anon, authenticated, service_role;

-- مصفوفة الرتب الكاملة (تُستهلكها صفحة البروفايل لتعرض السلم والصلاحيات)
CREATE OR REPLACE FUNCTION public.mizan_rank_matrix()
RETURNS SETOF public.rank_capabilities
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM public.rank_capabilities ORDER BY level ASC;
$$;

ALTER FUNCTION public.mizan_rank_matrix() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.mizan_rank_matrix() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mizan_rank_matrix() TO anon, authenticated, service_role;

-- ============================================================================
-- 8) updated_at لجدول الرتب
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_rank_capabilities_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "set_rank_capabilities_updated_at" ON public.rank_capabilities;
CREATE TRIGGER "set_rank_capabilities_updated_at"
  BEFORE UPDATE ON public.rank_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_rank_capabilities_updated_at();

COMMIT;

-- ============================================================================
-- ملاحظات النشر
-- ============================================================================
-- 1) فعّل Supabase Auth → Providers: Email + (اختيارياً) Google، وضبط
--    Site URL = https://www.mizan.page و Redirect URLs لتشمل معاينة النشر.
-- 2) VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY هما المتغيران الوحيدان
--    المطلوبان في الواجهة (شوف .env.example). VITE_CLERK_* حُذفا.
-- 3) بعد النشر، تحقّق:
--      select rank, level, min_xp, max_xp from public.rank_capabilities order by level;
--      select count(*) from public.profiles p
--        where not exists (select 1 from public.mizan_profiles mp where mp.owner_id = p.id);
--    الاستعلام الثاني يجب أن يرجع 0.
