-- =====================================================================
-- صحة تتبّع الزيارات: هل ما زال page_views يستقبل صفوفاً؟
--
-- السبب: كتابة الزيارة من المتصفح تتجاهل أخطاء الإدراج عمداً (لا نريد خطأً
-- ظاهراً للزائر إن انقطع الاتصال)، فإذا توقّف الإدراج لأي سبب — مشروع Supabase
-- موقوف/مقيّد، مفتاح anon تغيّر، سياسة INSERT سُحذفت، ترويسة CSP منعت الطلب،
-- أو trigger الفلترة صار يرفض كل شيء — فلا يظهر أي خطأ في أي مكان، ببساطة
-- تتوقف الأرقام. هذه الدالة تعطي الحقيقة الواحدة: متى وصل آخر صف.
--
-- تُستخدم في بطاقة «صحة التتبّع» بلوحة التحكم: آخر حدث، عمره بالدقائق، عدد
-- الصفوف والزوّار في 24 ساعة و7 أيام، والتوزيع حسب نوع المحتوى.
--
-- النمط الأمني: SECURITY DEFINER و search_path مثبّت، وبلا PUBLIC/anon.
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.get_tracking_health()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'last_event_at', m.last_event_at,
    'age_minutes', CASE
      WHEN m.last_event_at IS NULL THEN NULL
      ELSE floor(extract(epoch FROM now() - m.last_event_at) / 60)::bigint
    END,
    -- آخر صف بزيارة موقع (content_type = 'page') تحديداً: يكشف انقطاع متتبّع
    -- التنقّل وحده حتى لو بقيت قراءات المحتوى تعمل.
    'last_site_visit_at', (SELECT max(created_at) FROM public.page_views WHERE content_type = 'page'),
    'rows_24h', (SELECT count(*) FROM public.page_views WHERE created_at >= now() - interval '24 hours'),
    'rows_7d', (SELECT count(*) FROM public.page_views WHERE created_at >= now() - interval '7 days'),
    'visitors_24h', (
      SELECT count(DISTINCT visitor_id) FROM public.page_views
      WHERE created_at >= now() - interval '24 hours' AND visitor_id IS NOT NULL
    ),
    'by_type_24h', coalesce((
      SELECT jsonb_agg(jsonb_build_object('content_type', t.content_type, 'rows', t.n) ORDER BY t.n DESC)
      FROM (
        SELECT content_type, count(*) AS n
        FROM public.page_views
        WHERE created_at >= now() - interval '24 hours'
        GROUP BY content_type
      ) t
    ), '[]'::jsonb)
  )
  FROM (SELECT max(created_at) AS last_event_at FROM public.page_views) m;
$$;

ALTER FUNCTION public.get_tracking_health() OWNER TO postgres;

-- PUBLIC أولاً (PostgreSQL يمنح EXECUTE لـ PUBLIC افتراضياً على الدوال الجديدة)
REVOKE ALL ON FUNCTION public.get_tracking_health() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_tracking_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_tracking_health() TO authenticated;

COMMENT ON FUNCTION public.get_tracking_health() IS
  '@supabase-linter-ignore 0028_anon_security_definer_function_executable';

COMMIT;
