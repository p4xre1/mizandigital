-- =====================================================================
-- إجابات الاختبارات على الخادم فقط (quiz answers server-only)
--
-- كانت سياسة quiz_questions_public_read تتيح لأي زائر قراءة جدول
-- quiz_questions كاملاً — بما فيه عمود answer (الفهرس الصحيح) و
-- explanation و reference. هذا يغلق الثغرة:
--
--   1) يعاد بناء عرض quiz_questions_public بدون answer/explanation/reference.
--   2) تُسقط سياسة القراءة العامة على الجدول الأساس (تبقى كتابة المشرفين).
--   3) تُضاف دالة quiz_reveal_answer (SECURITY DEFINER) تعيد الإجابة
--      الصحيحة والشرح فقط بعد اختيار صريح من 0 إلى 3.
--
-- لا يمكن لأي عميل قراءة الإجابة قبل الإجابة؛ وحتى بعد المحاولة يتعذر
-- الوصول المباشر إلى عمود answer لأن سياسة قراءة الجدول سقطت.
-- =====================================================================
BEGIN;

-- 1) عرض عام بدون أعمدة حساسة
CREATE OR REPLACE VIEW "public"."quiz_questions_public"
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
FROM public.quiz_questions
WHERE is_published = true;

REVOKE ALL ON "public"."quiz_questions_public" FROM PUBLIC;
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
