-- supabase/migrations/20260911030000_interaction_tracking_and_audience.sql
--
-- ─────────────────────────────────────────────────────────────────────────────
-- تتبّع التفاعل (scroll / dead clicks / heatmap) + جمهور المستخدمين
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ─ قرار معماري مهم: audience_type ≠ role
--   public.profiles.role من نوع user_role = ('super_admin','editor') وتقرأه
--   get_auth_role() داخل سياسات RLS لترخيص الطاقم. إضافة student/lawyer/
--   citizen إلى ذلك الـ enum كانت ستخلط بين "من هو المصرَّح له" و"ما صفة
--   الزائر"، وتُعرّض سياسات الترخيص لخطر غير محسوب.
--   لذلك الجمهور في عمود مستقل (audience_type) والـ role يبقى كما هو.
--
-- ─ الخصوصية: لا IP خام، visitor_id مجزّأ من طرف العميل، واحتفاظ 30 يوماً فقط
--   لأحداث التفاعل (حجمها كبير وقيمتها التحليلية قصيرة الأمد) — نفس فلسفة
--   cleanup في page_views و comments_provenance الموجودتين في المستودع.
--
-- ─ الإحداثيات كنِسَب مئوية لا بكسلات: خريطة حرارية مبنية على بكسلات مطلقة
--   تصبح بلا معنى بين شاشة هاتف وشاشة مكتب. x_pct/y_pct من 0 إلى 100.
--
-- ─ idempotent بالكامل (CREATE ... IF NOT EXISTS، DO block للأنواع،
--   DROP POLICY قبل CREATE POLICY).

-- ============================================================================
-- 1) الأنواع
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                  WHERE t.typname='interaction_type' AND n.nspname='public') THEN
    CREATE TYPE public.interaction_type AS ENUM (
      'scroll',       -- أقصى عمق تمرير بلغه الزائر
      'click',        -- نقرة على عنصر قابل للنقر
      'dead_click',   -- نقرة على عنصر لا يستجيب (مؤشر إحباط/التباس)
      'heatmap',      -- موضع مؤشّر مُعيَّن لأخذ عينة
      'copy',         -- نسخ نص (إشارة اهتمام بالمحتوى القانوني)
      'dwell'         -- مدة بقاء على الصفحة
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                  WHERE t.typname='audience_type' AND n.nspname='public') THEN
    CREATE TYPE public.audience_type AS ENUM ('student', 'lawyer', 'citizen', 'other');
  END IF;
END $$;

-- ============================================================================
-- 2) أحداث التفاعل
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interaction_events (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  event_type     public.interaction_type NOT NULL,

  -- المسار بلا استعلام (query) حتى تتجمّع نفس الصفحة معاً
  path           text NOT NULL CHECK (char_length(path) BETWEEN 1 AND 500),

  -- مُحدِّد العنصر (CSS selector مبسّط) — للنقرات والنقرات الميتة
  selector       text CHECK (selector IS NULL OR char_length(selector) BETWEEN 1 AND 300),

  -- نِسَب مئوية من أبعاد عنصر/الصفحة (0-100) — مستقلة عن الدقة
  x_pct          numeric(5,2) CHECK (x_pct IS NULL OR (x_pct >= 0 AND x_pct <= 100)),
  y_pct          numeric(5,2) CHECK (y_pct IS NULL OR (y_pct >= 0 AND y_pct <= 100)),

  -- عمق التمرير الأقصى (0-100) — لأحداث scroll و dwell
  scroll_depth   numeric(5,2) CHECK (scroll_depth IS NULL OR (scroll_depth >= 0 AND scroll_depth <= 100)),

  -- مدة البقاء بالمللي ثانية — لأحداث dwell
  dwell_ms       integer CHECK (dwell_ms IS NULL OR (dwell_ms >= 0 AND dwell_ms <= 86400000)),

  visitor_id     text CHECK (visitor_id IS NULL OR char_length(visitor_id) BETWEEN 8 AND 128),
  session_id     text CHECK (session_id IS NULL OR char_length(session_id) BETWEEN 8 AND 128),

  -- نوع المحتوى المستهدف إن أمكن ربطه (لربط التفاعل بالتحليلات الموجودة)
  content_type   text CHECK (content_type IS NULL OR content_type = ANY (ARRAY['article','news','term','pdf','event','page'])),
  content_id     text CHECK (content_id IS NULL OR char_length(content_id) <= 200),

  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.interaction_events IS
  'أحداث تفاعل مجهولة الهوية: عمق التمرير، النقرات الميتة، نقاط الخريطة الحرارية. احتفاظ 30 يوماً.';

-- فهارس مطابقة لأنماط الاستعلام الفعلية (حسب المسار والوقت، وحسب النوع)
CREATE INDEX IF NOT EXISTS interaction_events_path_created_idx
  ON public.interaction_events (path, created_at DESC);
CREATE INDEX IF NOT EXISTS interaction_events_type_created_idx
  ON public.interaction_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS interaction_events_created_idx
  ON public.interaction_events (created_at DESC);
-- فهرس جزئي: النقرات الميتة هي ما يُستعلم عنه عادةً وبكثافة أقل
CREATE INDEX IF NOT EXISTS interaction_events_dead_click_idx
  ON public.interaction_events (selector, created_at DESC)
  WHERE event_type = 'dead_click';

-- منع البوتات — إعادة استعمال الدالة الموجودة (تعتمد على NEW.user_agent)
DROP TRIGGER IF EXISTS trg_interaction_events_filter_bots ON public.interaction_events;
CREATE TRIGGER trg_interaction_events_filter_bots
  BEFORE INSERT ON public.interaction_events
  FOR EACH ROW
  EXECUTE FUNCTION public.page_views_filter_bots();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.interaction_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert interaction events" ON public.interaction_events;
CREATE POLICY "public insert interaction events"
  ON public.interaction_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- لا SELECT للزائر: بيانات التفاعل ليست له، وقراءتها تكشف سلوك الآخرين
-- بوابة الطاقم: admin_god_mode وليس get_auth_role().
-- get_auth_role() يُرجح 'editor' وهي القيمة الافتراضية لعمود role، فكل مستخدم
-- مسجَّل كان يمرّ من الشرط. admin_god_mode افتراضيه false وهو ما يفحصه
-- requireAdmin() فعلاً. (نفس التصحيح في هجرة الفوترة 20260911040000.)
DROP POLICY IF EXISTS "staff read interaction events" ON public.interaction_events;
CREATE POLICY "staff read interaction events"
  ON public.interaction_events FOR SELECT
  TO authenticated
  USING (
    (SELECT p.admin_god_mode FROM public.profiles p WHERE p.id = auth.uid()) IS TRUE
  );

-- ── الاحتفاظ: 30 يوماً ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_interaction_events(p_older_than interval DEFAULT '30 days')
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
declare
  deleted_count integer;
begin
  DELETE FROM public.interaction_events
   WHERE created_at < timezone('utc', now()) - p_older_than;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  return deleted_count;
end;
$$;

ALTER FUNCTION public.cleanup_interaction_events(interval) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cleanup_interaction_events(interval) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.cleanup_interaction_events(interval) IS
  'يحذف أحداث التفاعل الأقدم من 30 يوماً. تُنادى من مجدول (pg_cron) أو يدوياً.';

-- ============================================================================
-- 3) أعمدة الجمهور على profiles
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city          text
  CHECK (city IS NULL OR char_length(btrim(city)) BETWEEN 2 AND 80);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS audience_type public.audience_type;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests     text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester      text
  CHECK (semester IS NULL OR semester = ANY (ARRAY['S1','S2','S3','S4','S5','S6']));

COMMENT ON COLUMN public.profiles.city IS 'مدينة المستخدم. تُخزَّن نصاً حراً مع تقييد الطول؛ القائمة المرجعية في الواجهة.';
COMMENT ON COLUMN public.profiles.audience_type IS
  'صفة الزائر (طالب/محامٍ/مواطن). منفصل عن role عمداً: role للترخيص، وهذا للتحليل.';
COMMENT ON COLUMN public.profiles.interests IS 'مصفوفة اهتمامات حرة (مثلاً: قانون الأسرة، العقود، المسطرة الجنائية).';

-- تحليل المصفوفات يحتاج GIN
CREATE INDEX IF NOT EXISTS profiles_interests_gin ON public.profiles USING GIN (interests);
CREATE INDEX IF NOT EXISTS profiles_audience_idx ON public.profiles (audience_type);
CREATE INDEX IF NOT EXISTS profiles_city_idx     ON public.profiles (city);

-- ============================================================================
-- 4) دوال التجميع
-- ============================================================================

-- ── التوزيع الجغرافي × الصفة ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_regional_audience(p_limit integer DEFAULT 30)
RETURNS TABLE (
  city        text,
  audience    public.audience_type,
  users       bigint,
  share       numeric
)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  WITH base AS (
    SELECT btrim(p.city) AS city, p.audience_type
      FROM public.profiles p
     WHERE p.city IS NOT NULL AND btrim(p.city) <> ''
  )
  SELECT
    b.city,
    b.audience_type,
    count(*)                                              AS users,
    round(100.0 * count(*) / nullif(sum(count(*)) OVER (), 0), 1) AS share
  FROM base b
  GROUP BY b.city, b.audience_type
  ORDER BY users DESC
  LIMIT least(greatest(coalesce(p_limit, 30), 1), 500);
$$;

ALTER FUNCTION public.get_regional_audience(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_regional_audience(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_regional_audience(integer) TO authenticated;

-- ── تفكيك الجمهور ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_audience_breakdown()
RETURNS TABLE (
  audience        public.audience_type,
  users           bigint,
  share           numeric,
  active_30d      bigint,
  avg_interests   numeric
)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  WITH base AS (
    SELECT
      coalesce(p.audience_type, 'other')      AS audience,
      p.id,
      p.interests,
      p.updated_at
    FROM public.profiles p
  )
  SELECT
    b.audience,
    count(*)                                                        AS users,
    round(100.0 * count(*) / nullif(sum(count(*)) OVER (), 0), 1)   AS share,
    count(*) FILTER (WHERE b.updated_at >= timezone('utc', now()) - interval '30 days') AS active_30d,
    round(avg(coalesce(array_length(b.interests, 1), 0)), 2)        AS avg_interests
  FROM base b
  GROUP BY b.audience
  ORDER BY users DESC;
$$;

ALTER FUNCTION public.get_audience_breakdown() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_audience_breakdown() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audience_breakdown() TO authenticated;

-- ── ارتباط الاهتمامات بالصفة ─────────────────────────────────────────────────
-- unnest ضروري: الاهتمامات مصفوفة، والتحليل يحتاج صفاً لكل اهتمام.
CREATE OR REPLACE FUNCTION public.get_interest_correlation(p_limit integer DEFAULT 25)
RETURNS TABLE (
  interest        text,
  audience        public.audience_type,
  users           bigint,
  within_audience numeric
)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  WITH exploded AS (
    SELECT btrim(lower(i.interest)) AS interest,
           coalesce(p.audience_type, 'other') AS audience
      FROM public.profiles p
      CROSS JOIN LATERAL unnest(p.interests) AS i(interest)
     WHERE btrim(i.interest) <> ''
  ),
  totals AS (
    SELECT coalesce(audience_type, 'other') AS audience, count(*) AS n
      FROM public.profiles GROUP BY 1
  )
  SELECT
    e.interest,
    e.audience,
    count(*)                                                        AS users,
    round(100.0 * count(*) / nullif(t.n, 0), 1)                     AS within_audience
  FROM exploded e
  JOIN totals t ON t.audience = e.audience
  GROUP BY e.interest, e.audience, t.n
  HAVING count(*) >= 2          -- تجاهل الاهتمامات النادرة (n=1) من التحليل
  ORDER BY users DESC
  LIMIT least(greatest(coalesce(p_limit, 25), 1), 200);
$$;

ALTER FUNCTION public.get_interest_correlation(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_interest_correlation(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_interest_correlation(integer) TO authenticated;

-- ── توزيع عمق التمرير ────────────────────────────────────────────────────────
-- يُجمَّع في شرائح 10% بدل إرجاع صفوف خام: الحجم على موقع بحركة حقيقية
-- يجعل الصفوف الخام غير قابلة للنقل إلى الواجهة.
CREATE OR REPLACE FUNCTION public.get_scroll_depth_distribution(
  p_path  text DEFAULT NULL,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE (bucket text, sessions bigint, share numeric)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  WITH base AS (
    SELECT
      width_bucket(e.scroll_depth, 0, 100.0001, 10) AS b,
      e.session_id
    FROM public.interaction_events e
    WHERE e.event_type IN ('scroll','dwell')
      AND e.scroll_depth IS NOT NULL
      AND (p_path IS NULL OR e.path = p_path)
      AND (p_since IS NULL OR e.created_at >= p_since)
  ),
  -- أقصى عمق لكل جلسة، لا متوسط القراءات المتعددة
  per_session AS (
    SELECT session_id, max(b) AS b FROM base GROUP BY session_id
  )
  SELECT
    ((s.b - 1) * 10) || '-' || (s.b * 10) || '%'                    AS bucket,
    count(*)                                                        AS sessions,
    round(100.0 * count(*) / nullif(sum(count(*)) OVER (), 0), 1)   AS share
  FROM per_session s
  GROUP BY s.b
  ORDER BY s.b;
$$;

ALTER FUNCTION public.get_scroll_depth_distribution(text, timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_scroll_depth_distribution(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scroll_depth_distribution(text, timestamptz) TO authenticated;

-- ── بؤر النقرات الميتة ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dead_click_hotspots(
  p_since timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (path text, selector text, dead_clicks bigint, visitors bigint)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    e.path,
    e.selector,
    count(*)                        AS dead_clicks,
    count(DISTINCT e.visitor_id)    AS visitors
  FROM public.interaction_events e
  WHERE e.event_type = 'dead_click'
    AND e.selector IS NOT NULL
    AND (p_since IS NULL OR e.created_at >= p_since)
  GROUP BY e.path, e.selector
  ORDER BY dead_clicks DESC
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

ALTER FUNCTION public.get_dead_click_hotspots(timestamptz, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_dead_click_hotspots(timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dead_click_hotspots(timestamptz, integer) TO authenticated;

-- ── نقاط الخريطة الحرارية (مجمّعة على شبكة 5%) ──────────────────────────────
-- تجميع على شبكة بدل إرجاع كل نقطة: آلاف النقاط الخام تُبطئ الواجهة ولا تضيف
-- دقة بصرية على خريطة حرارية مرسومة على شبكة أصلاً.
CREATE OR REPLACE FUNCTION public.get_heatmap_grid(
  p_path  text,
  p_since timestamptz DEFAULT NULL,
  p_cell  integer DEFAULT 5
)
RETURNS TABLE (x_cell integer, y_cell integer, hits bigint, intensity numeric)
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  WITH cell AS (
    SELECT
      least(floor(e.x_pct / greatest(p_cell, 1))::integer, 100 / greatest(p_cell, 1) - 1) AS x_cell,
      least(floor(e.y_pct / greatest(p_cell, 1))::integer, 100 / greatest(p_cell, 1) - 1) AS y_cell
    FROM public.interaction_events e
    WHERE e.event_type IN ('heatmap','click')
      AND e.path = p_path
      AND e.x_pct IS NOT NULL AND e.y_pct IS NOT NULL
      AND (p_since IS NULL OR e.created_at >= p_since)
  )
  SELECT
    c.x_cell,
    c.y_cell,
    count(*)                                                       AS hits,
    round(100.0 * count(*) / nullif(max(count(*)) OVER (), 0), 1)  AS intensity
  FROM cell c
  GROUP BY c.x_cell, c.y_cell
  ORDER BY hits DESC;
$$;

ALTER FUNCTION public.get_heatmap_grid(text, timestamptz, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_heatmap_grid(text, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_heatmap_grid(text, timestamptz, integer) TO authenticated;
