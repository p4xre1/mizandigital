-- =====================================================================
-- مصادر الزيارات: تجميع page_views.referrer حسب المضيف
--
-- المشكلة العملية: عمود referrer يُكتب في كل صف (useTrackView)، لكن لا توجد
-- طريقة لعرضه، فيبقى السؤال «من أين يأتي الزوّار؟» بلا جواب في لوحة التحكم.
--
-- ملاحظة دقيقة عن دلالة القيمة: الموقع تطبيق صفحة واحدة (SPA)، و
-- document.referrer لا يتغيّر عند التنقّل الداخلي. فقيمة referrer هنا تعبّر عن
-- **مصدر الدخول للجلسة** لا عن الصفحة السابقة المباشرة. لهذا نزلنا التجميع
-- حسب المضيف لا حسب الرابط الكامل.
--
-- التصنيفات الخاصة:
--   * direct   ← referrer فارغ (كتابة الرابط، تطبيقات بلا مُحيل، إضافات)
--   * internal ← مُحيل من نطاق الموقع نفسه (فتح رابط في تبويب/نافذة جديدة)
-- وما عداهما يُعرض باسم المضيف بلا www.
--
-- نمط الأمان مطابق لدوال الإحصاء الأخرى في 20260828224315: SECURITY DEFINER،
-- search_path مثبّت، بلا EXECUTE لـ anon. (تحصين مقترح لاحقاً: تقييد كل دوال
-- الإحصاء بـ public.is_admin() بدل authenticated عموماً.)
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.get_visits_by_referrer(
  p_since timestamptz,
  p_limit int DEFAULT 12
)
RETURNS TABLE(source text, views bigint, visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH normalized AS (
    SELECT
      pv.visitor_id,
      CASE
        WHEN pv.referrer IS NULL OR btrim(pv.referrer) = '' THEN 'direct'
        WHEN pv.referrer ~* '^https?://(www\.)?mizan\.page(/|$)' THEN 'internal'
        ELSE coalesce(
          nullif(lower(regexp_replace(split_part(split_part(pv.referrer, '://', 2), '/', 1), '^www\.', '')), ''),
          lower(btrim(pv.referrer))
        )
      END AS source
    FROM public.page_views pv
    WHERE pv.created_at >= p_since
  )
  SELECT source, count(*) AS views, count(DISTINCT visitor_id) AS visitors
  FROM normalized
  GROUP BY source
  ORDER BY views DESC, source
  LIMIT greatest(coalesce(p_limit, 12), 1);
$$;

ALTER FUNCTION public.get_visits_by_referrer(timestamptz, int) OWNER TO postgres;

-- لوحة التحكم وحدها (تسجيل دخول).
-- PUBLIC أولاً: PostgreSQL يمنح EXECUTE لـ PUBLIC افتراضياً على كل دالة جديدة،
-- و«REVOKE … FROM anon» وحده لا يزيل ذلك المنح — فيبقى anon قادراً على التنفيذ.
-- (التصميم المحلي حُقّق فعلياً: بلا سطر PUBLIC كان anon ينفّذ الدالة بنجاح.)
REVOKE ALL ON FUNCTION public.get_visits_by_referrer(timestamptz, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_visits_by_referrer(timestamptz, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_visits_by_referrer(timestamptz, int) TO authenticated;

COMMENT ON FUNCTION public.get_visits_by_referrer(timestamptz, int) IS
  '@supabase-linter-ignore 0028_anon_security_definer_function_executable';

COMMIT;
