-- =====================================================================
-- إجابات الاختبارات على الخادم فقط (quiz answers server-only)
--
-- كانت سياسة quiz_questions_public_read تتيح لأي زائر قراءة جدول
-- quiz_questions كاملاً — بما فيه عمود answer (الفهرس الصحيح) و
-- explanation و reference. هذا يغلق الثغرة:
--
--   1) يعاد بناء عرض quiz_questions_public بدون answer/explanation/reference.
--      يبقى العرض security_invoker (docs/security-architecture.md) ويقرأ صفوفه
--      من دالة SECURITY DEFINER تعيد الأعمدة الآمنة للأسئلة المنشورة فقط.
--   2) تُسقط سياسة القراءة العامة على الجدول الأساس (تبقى كتابة المشرفين).
--   3) تُضاف دالة quiz_reveal_answer (SECURITY DEFINER) تعيد الإجابة
--      الصحيحة والشرح فقط بعد اختيار صريح من 0 إلى 3.
--
-- لا يمكن لأي عميل قراءة الإجابة قبل الإجابة؛ وحتى بعد المحاولة يتعذر
-- الوصول المباشر إلى عمود answer لأن سياسة قراءة الجدول سقطت.
-- =====================================================================
BEGIN;

-- 1) عرض عام بدون أعمدة حساسة

-- أ) إسقاط ثم إنشاء، لا «CREATE OR REPLACE»: نسخة 20260920000000 من العرض
--    تحمل عمودَي explanation و reference، و PostgreSQL لا يسمح بحذف أعمدة من
--    عرض قائم بـ OR REPLACE (cannot drop columns from view، SQLSTATE 42P16).
--    لا يعتمد أي كائن في الترحيلات على العرض؛ و DROP بلا CASCADE يوقف الترحيل
--    بخطأ صريح إن وُجد اعتماد غير متوقع في القاعدة بدل حذفه بصمت.
DROP VIEW IF EXISTS "public"."quiz_questions_public";

-- ب) مصدر صفوف العرض. بعد إسقاط سياسة القراءة العامة (الخطوة 2) لا يرى anon
--    ولا authenticated أي صف من الجدول الأساس، والعرض security_invoker يطبّق
--    RLS بهوية القارئ، فكان سيعيد صفر صفوف للزوار. هذه الدالة هي المنفذ المميّز
--    الوحيد: الأسئلة المنشورة فقط والأعمدة الآمنة فقط (نفس نمط دالة الكشف أدناه).
CREATE OR REPLACE FUNCTION "public"."quiz_questions_public_rows"()
RETURNS TABLE (
  slug         text,
  tier         text,
  semester     text,
  module       text,
  body         text,
  track        text,
  difficulty   text,
  question     text,
  options      jsonb,
  is_published boolean,
  created_at   timestamptz,
  updated_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT q.slug, q.tier, q.semester, q.module, q.body, q.track, q.difficulty,
         q.question, q.options, q.is_published, q.created_at, q.updated_at
  FROM public.quiz_questions q
  WHERE q.is_published = true
$$;

REVOKE ALL ON FUNCTION "public"."quiz_questions_public_rows"() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."quiz_questions_public_rows"() TO anon, authenticated;

-- ج) العرض: security_invoker، وغير قابل للكتابة لأن مصدره دالة لا جدول.
CREATE VIEW "public"."quiz_questions_public"
WITH (security_invoker = true)
AS
SELECT
  slug,
  tier,
  semester,
  module,
  body,
  track,
  difficulty,
  question,
  options,
  is_published,
  created_at,
  updated_at
FROM public.quiz_questions_public_rows();

-- إعادة الإنشاء تعيد صلاحيات Supabase الافتراضية (ALL لـ anon و authenticated):
-- نسحبها كلها ونمنح القراءة فقط.
REVOKE ALL ON "public"."quiz_questions_public" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON "public"."quiz_questions_public" TO anon, authenticated;

-- 2) إسقاط سياسة القراءة العامة على الجدول الأساس
DROP POLICY IF EXISTS "quiz_questions_public_read" ON "public"."quiz_questions";

-- 3) كشف الإجابة بعد اختيار صريح
CREATE OR REPLACE FUNCTION "public"."quiz_reveal_answer"(
  p_slug text,
  p_chosen integer
)
RETURNS TABLE (
  revealed  boolean,
  answer    integer,
  explanation text,
  reference   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_answer integer;
  v_expl   text;
  v_ref    text;
BEGIN
  -- لا كشف بلا اختيار صريح من 0 إلى 3
  IF p_slug IS NULL OR p_slug = '' OR p_chosen IS NULL OR p_chosen < 0 OR p_chosen > 3 THEN
    RETURN QUERY SELECT false, NULL::integer, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT q.answer, q.explanation, q.reference
  INTO v_answer, v_expl, v_ref
  FROM public.quiz_questions q
  WHERE q.slug = p_slug AND q.is_published = true
  LIMIT 1;

  IF v_answer IS NULL THEN
    RETURN QUERY SELECT false, NULL::integer, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_answer, v_expl, v_ref;
END;
$$;

REVOKE ALL ON FUNCTION "public"."quiz_reveal_answer"(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."quiz_reveal_answer"(text, integer) TO anon, authenticated;

COMMIT;

-- =====================================================================
-- الرجوع (Rollback) — يدوياً، فقط بعد قرار مكتوب:
--   DROP VIEW IF EXISTS public.quiz_questions_public;
--   DROP FUNCTION IF EXISTS public.quiz_questions_public_rows();
--   DROP FUNCTION IF EXISTS public.quiz_reveal_answer(text, integer);
--   CREATE POLICY "quiz_questions_public_read" ON public.quiz_questions
--     FOR SELECT USING (is_published = true);              -- ⚠ يعيد تسريب الإجابات
--   ثم أعد إنشاء العرض كما في 20260920000000 (القسم 3).
-- =====================================================================
