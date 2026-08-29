-- ============================================================================
-- تتبّع الزيارات والقراءات الحقيقية (Page Views / Reads Analytics)
-- ============================================================================
-- يضيف جدول أحداث خام (event log) لكل زيارة/قراءة حقيقية عبر الموقع:
-- مقالات، أخبار، مصطلحات القاموس، ملفات PDF، الندوات/الفعاليات، وكذلك كل
-- تنقّل عام بين الصفحات (لحساب إجمالي زيارات الموقع). هذا يسمح لاحقاً بحساب
-- الإحصائيات حسب أي نافذة زمنية (آخر 6 ساعات، 24 ساعة، 7 أيام، شهر...).

CREATE TABLE IF NOT EXISTS public.page_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_type text NOT NULL CHECK (content_type = ANY (ARRAY[
    'article'::text, 'news'::text, 'term'::text, 'pdf'::text, 'event'::text, 'page'::text
  ])),
  content_id text NOT NULL,
  path text,
  visitor_id text,
  session_id text,
  referrer text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.page_views IS
  'سجل خام لكل زيارة/قراءة حقيقية على الموقع (مقالات، أخبار، قاموس، PDF، فعاليات، وتنقلات عامة). يُستخدم لحساب الإحصائيات الزمنية في لوحة التحكم.';

CREATE INDEX IF NOT EXISTS idx_page_views_created_at
  ON public.page_views (created_at);

CREATE INDEX IF NOT EXISTS idx_page_views_type_created
  ON public.page_views (content_type, created_at);

CREATE INDEX IF NOT EXISTS idx_page_views_type_content_created
  ON public.page_views (content_type, content_id, created_at);

CREATE INDEX IF NOT EXISTS idx_page_views_visitor
  ON public.page_views (visitor_id);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- أي زائر (حتى غير المسجَّل) يمكنه تسجيل حدث زيارة (إدخال فقط، بدون قراءة)
DROP POLICY IF EXISTS "anyone can log a page view" ON public.page_views;
CREATE POLICY "anyone can log a page view"
  ON public.page_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- فقط المستخدمون المسجَّلون (لوحة التحكم) يمكنهم قراءة السجلات الخام
DROP POLICY IF EXISTS "authenticated can read page views" ON public.page_views;
CREATE POLICY "authenticated can read page views"
  ON public.page_views
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- دوال مساعدة للإحصائيات (تُستخدم من لوحة تحكم الإدارة)
-- ============================================================================

-- إجمالي عدد الزيارات (كل الأنواع) منذ لحظة معيّنة
CREATE OR REPLACE FUNCTION public.get_total_visits(p_since timestamptz)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.page_views WHERE created_at >= p_since;
$$;

-- عدد الزوّار الفريدين (بحسب visitor_id) منذ لحظة معيّنة
CREATE OR REPLACE FUNCTION public.get_unique_visitors(p_since timestamptz)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT visitor_id) FROM public.page_views
  WHERE created_at >= p_since AND visitor_id IS NOT NULL;
$$;

-- إجمالي الزيارات مجمّعة حسب نوع المحتوى منذ لحظة معيّنة
CREATE OR REPLACE FUNCTION public.get_visits_by_type(p_since timestamptz)
RETURNS TABLE(content_type text, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT content_type, count(*) AS views
  FROM public.page_views
  WHERE created_at >= p_since
  GROUP BY content_type
  ORDER BY views DESC;
$$;

-- أكثر المحتويات قراءة/زيارة ضمن نوع معيّن منذ لحظة معيّنة
CREATE OR REPLACE FUNCTION public.get_top_content(
  p_content_type text,
  p_since timestamptz,
  p_limit int DEFAULT 10
)
RETURNS TABLE(content_id text, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT content_id, count(*) AS views
  FROM public.page_views
  WHERE content_type = p_content_type AND created_at >= p_since
  GROUP BY content_id
  ORDER BY views DESC
  LIMIT p_limit;
$$;

-- سلسلة زمنية للزيارات (لرسم بياني) بحسب حجم "دلو" زمني بالدقائق
CREATE OR REPLACE FUNCTION public.get_visits_timeseries(
  p_since timestamptz,
  p_bucket_minutes int DEFAULT 60
)
RETURNS TABLE(bucket timestamptz, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    to_timestamp(
      floor(extract(epoch FROM created_at) / (p_bucket_minutes * 60))
      * (p_bucket_minutes * 60)
    ) AS bucket,
    count(*) AS views
  FROM public.page_views
  WHERE created_at >= p_since
  GROUP BY 1
  ORDER BY 1;
$$;

ALTER FUNCTION public.get_total_visits(timestamptz) OWNER TO postgres;
ALTER FUNCTION public.get_unique_visitors(timestamptz) OWNER TO postgres;
ALTER FUNCTION public.get_visits_by_type(timestamptz) OWNER TO postgres;
ALTER FUNCTION public.get_top_content(text, timestamptz, int) OWNER TO postgres;
ALTER FUNCTION public.get_visits_timeseries(timestamptz, int) OWNER TO postgres;

-- هذه الدوال تُستعمل فقط من لوحة تحكم الإدارة (يجب تسجيل الدخول)
REVOKE ALL ON FUNCTION public.get_total_visits(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.get_unique_visitors(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.get_visits_by_type(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.get_top_content(text, timestamptz, int) FROM anon;
REVOKE ALL ON FUNCTION public.get_visits_timeseries(timestamptz, int) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_total_visits(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unique_visitors(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visits_by_type(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_content(text, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visits_timeseries(timestamptz, int) TO authenticated;

COMMENT ON FUNCTION public.get_total_visits(timestamptz) IS
  '@supabase-linter-ignore 0028_anon_security_definer_function_executable';
COMMENT ON FUNCTION public.get_unique_visitors(timestamptz) IS
  '@supabase-linter-ignore 0028_anon_security_definer_function_executable';
COMMENT ON FUNCTION public.get_visits_by_type(timestamptz) IS
  '@supabase-linter-ignore 0028_anon_security_definer_function_executable';
COMMENT ON FUNCTION public.get_top_content(text, timestamptz, int) IS
  '@supabase-linter-ignore 0028_anon_security_definer_function_executable';
COMMENT ON FUNCTION public.get_visits_timeseries(timestamptz, int) IS
  '@supabase-linter-ignore 0028_anon_security_definer_function_executable';

-- ============================================================================
-- (اختياري) جدول تخزين نتائج فحص الفهرسة في جوجل لكل رابط، حتى لا نستدعي
-- Google Search Console API في كل مرة يفتح فيها الأدمن الصفحة
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.index_status (
  url text PRIMARY KEY,
  content_type text,
  content_id text,
  is_indexed boolean,
  coverage_state text,
  last_crawl_time timestamptz,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.index_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read index status" ON public.index_status;
CREATE POLICY "authenticated can read index status"
  ON public.index_status
  FOR SELECT
  TO authenticated
  USING (true);

-- الكتابة تتم فقط عبر Edge Function بمفتاح service_role (تتجاوز RLS تلقائياً)
