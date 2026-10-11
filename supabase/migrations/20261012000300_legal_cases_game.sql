-- =====================================================================
-- لعبة القضايا القانونية (Legal Cases Game)
--
--  - legal_cases           : ملفات القضايا (الوقائع، الجهة، الصورة، الحالة).
--  - legal_case_questions  : أسئلة كل قضية (أربعة خيارات وإجابة وشرح).
--
-- قراءة الزوار عبر عرضين عامين (legal_cases_public / legal_case_questions_public)
-- بدون عمودَي answer و explanation — نفس منهجية إصلاح تسريب إجابات الاختبارات
-- (20261012000000): يُكشف الجواب فقط عبر دالة legal_case_reveal بعد اختيار
-- صريح من 0 إلى 3.
-- الكتابة للمشرفين عبر public.is_admin().
-- =====================================================================
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p
                 WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'is_admin' AND p.prokind = 'f') THEN
    RAISE EXCEPTION 'legal cases game prerequisite missing: public.is_admin(). Apply the earlier migrations first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- معرّف ثابت ومقروء (case-01 ... case-10) لمزامنة البذرة المحلية
  slug text NOT NULL UNIQUE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 200),
  -- ملخص واحد يظهر في قائمة القضايا
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 20 AND 500),
  -- نص الوقائع الكاملة
  facts text NOT NULL CHECK (char_length(facts) >= 40),
  -- الجهة القضائية أو النوع الإجرائي (محاكمة ابتدائية، قضائية مدنية...)
  court text NOT NULL CHECK (char_length(court) BETWEEN 2 AND 150),
  -- مسار الصورة العامة (public/cases/...)
  image_public_path text CHECK (image_public_path IS NULL OR (char_length(image_public_path) BETWEEN 2 AND 200 AND image_public_path LIKE '/cases/%' AND image_public_path NOT LIKE '/cases/%/%/%')),
  -- وسم المرجع/المراجع (placeholder في البذرة الأولى)
  reviewer_label text NOT NULL DEFAULT '' CHECK (char_length(reviewer_label) <= 120),
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.legal_case_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_slug text NOT NULL REFERENCES public.legal_cases(slug) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 20),
  question text NOT NULL CHECK (char_length(question) BETWEEN 4 AND 500),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer integer NOT NULL CHECK (answer >= 0 AND answer <= 3),
  explanation text NOT NULL CHECK (char_length(explanation) BETWEEN 4 AND 1500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_slug, position)
);

ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_questions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.legal_cases_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_cases_touch ON public.legal_cases;
CREATE TRIGGER legal_cases_touch BEFORE UPDATE ON public.legal_cases
  FOR EACH ROW EXECUTE FUNCTION public.legal_cases_touch_updated_at();

DROP TRIGGER IF EXISTS legal_case_questions_touch ON public.legal_case_questions;
CREATE TRIGGER legal_case_questions_touch BEFORE UPDATE ON public.legal_case_questions
  FOR EACH ROW EXECUTE FUNCTION public.legal_cases_touch_updated_at();

DROP POLICY IF EXISTS legal_cases_admin_all ON public.legal_cases;
DROP POLICY IF EXISTS legal_case_questions_admin_all ON public.legal_case_questions;

CREATE POLICY legal_cases_admin_all ON public.legal_cases
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY legal_case_questions_admin_all ON public.legal_case_questions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- عروض القراءة العامة (بدون إجابات)
-- =====================================================================
CREATE OR REPLACE VIEW public.legal_cases_public
WITH (security_invoker = true)
AS
SELECT id, slug, title, summary, facts, court, image_public_path,
       reviewer_label, published, sort_order, created_at, updated_at
FROM public.legal_cases
WHERE published = true;

CREATE OR REPLACE VIEW public.legal_case_questions_public
WITH (security_invoker = true)
AS
SELECT id, case_slug, position, question, options, created_at, updated_at
FROM public.legal_case_questions;

REVOKE ALL ON public.legal_cases_public FROM PUBLIC;
REVOKE ALL ON public.legal_case_questions_public FROM PUBLIC;
GRANT SELECT ON public.legal_cases_public TO anon, authenticated;
GRANT SELECT ON public.legal_case_questions_public TO anon, authenticated;

-- =====================================================================
-- كشف إجابة سؤال قضية بعد اختيار صريح (من 0 إلى 3)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.legal_case_reveal(
  p_case_slug text,
  p_position integer,
  p_chosen integer
)
RETURNS TABLE (
  revealed  boolean,
  answer    integer,
  explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_answer integer;
  v_expl   text;
BEGIN
  IF p_case_slug IS NULL OR p_case_slug = ''
     OR p_position IS NULL OR p_position < 1 OR p_position > 20
     OR p_chosen IS NULL OR p_chosen < 0 OR p_chosen > 3 THEN
    RETURN QUERY SELECT false, NULL::integer, NULL::text;
    RETURN;
  END IF;

  SELECT q.answer, q.explanation
  INTO v_answer, v_expl
  FROM public.legal_case_questions q
  JOIN public.legal_cases c ON c.slug = q.case_slug
  WHERE q.case_slug = p_case_slug AND q.position = p_position AND c.published = true
  LIMIT 1;

  IF v_answer IS NULL THEN
    RETURN QUERY SELECT false, NULL::integer, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_answer, v_expl;
END;
$$;

REVOKE ALL ON FUNCTION public.legal_case_reveal(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.legal_case_reveal(text, integer, integer) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS legal_cases_published_idx ON public.legal_cases (published, sort_order);
CREATE INDEX IF NOT EXISTS legal_case_questions_case_idx ON public.legal_case_questions (case_slug, position);

COMMIT;
