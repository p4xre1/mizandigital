-- =====================================================================
-- حالات قانونية تدريبية: «من الواقعة إلى الحل»
--
-- النموذج:
--   1) legal_cases: جدول خاص. لا يقرأه الزوار مباشرة أبداً (لا صلاحية anon)،
--      والإدارة وحدها تكتب وتقرأ كامل الصفوف عبر سياسة is_admin().
--   2) legal_cases_public: view بلا الجواب الصحيح ولا الشرح ولا نصوص المواد،
--      لأن نص المادة قد يكشف الجواب قبل التخمين. تُرجع الحالات المنشورة فقط
--      عبر دالة مالكة (legal_cases_public_rows)، والـ view نفسها بصلاحية
--      المستدعي (security_invoker = true) وللقراءة فقط (انظر الشرح عندها).
--   3) legal_case_check: دالة تصحيح. عند الخطأ تُرجع تلميحاً فقط (بلا رقم
--      الجواب). عند الصواب تُرجع الجواب والشرح ونصوص المواد.
--
-- قيد معروف: يستطيع الزائر تجربة الخيارات الأربعة حتى يصل إلى الصواب، وهذا
-- جوهر لعبة التخمين. ما لا يُكشف هو الجواب قبل التخمين الصحيح.
-- =====================================================================
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p
                 WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'is_admin' AND p.prokind = 'f') THEN
    RAISE EXCEPTION 'legal cases prerequisite missing: public.is_admin(). Apply the earlier migrations first.';
  END IF;
  -- تصميم سابق لم يُنشر (legal_cases بأعمدة facts/court + legal_case_questions):
  -- إن وُجد في قاعدة ما فلا نخلطه بهذا التصميم، بل نتوقف برسالة واضحة.
  IF to_regclass('public.legal_case_questions') IS NOT NULL
     OR (to_regclass('public.legal_cases') IS NOT NULL AND NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'legal_cases' AND column_name = 'story')) THEN
    RAISE EXCEPTION 'public.legal_cases exists with the previous unreleased design (legal_case_questions). Drop public.legal_case_questions and public.legal_cases first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 3 AND 120 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 160),
  law_code text NOT NULL CHECK (law_code IN ('constitution-2011', 'mudawana-70-03')),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  story text NOT NULL CHECK (char_length(story) BETWEEN 40 AND 6000),
  question text NOT NULL CHECK (char_length(question) BETWEEN 8 AND 400),
  options jsonb NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) = 4),
  answer_index smallint NOT NULL CHECK (answer_index BETWEEN 0 AND 3),
  hint text NOT NULL CHECK (char_length(hint) BETWEEN 4 AND 400),
  explanation text NOT NULL CHECK (char_length(explanation) BETWEEN 10 AND 2000),
  articles jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(articles) = 'array' AND jsonb_array_length(articles) BETWEEN 1 AND 6),
  image_url text NOT NULL DEFAULT '' CHECK (image_url = '' OR image_url ~ '^(/|https://)[^[:space:]]+$'),
  image_alt text NOT NULL DEFAULT '' CHECK (char_length(image_alt) <= 300),
  published boolean NOT NULL DEFAULT false,
  reviewed_by text NOT NULL DEFAULT '' CHECK (char_length(reviewed_by) <= 160),
  reviewed_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_cases_published_law ON public.legal_cases (published, law_code);

-- قيود لا تُعبَّر في CHECK: خيارات مختلفة وغير فارغة، ومواد بصيغة صحيحة،
-- ولا نشر بلا مراجعة.
CREATE OR REPLACE FUNCTION public.legal_cases_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_opt text;
  v_distinct integer;
  v_art jsonb;
BEGIN
  SELECT count(DISTINCT btrim(o)) INTO v_distinct
  FROM jsonb_array_elements_text(NEW.options) AS o;
  IF v_distinct <> 4 THEN
    RAISE EXCEPTION 'الخيارات الأربعة يجب أن تكون مختلفة وغير فارغة';
  END IF;
  FOR v_opt IN SELECT jsonb_array_elements_text(NEW.options) LOOP
    IF char_length(btrim(v_opt)) NOT BETWEEN 2 AND 300 THEN
      RAISE EXCEPTION 'طول الخيار يجب أن يكون بين 2 و300 حرف';
    END IF;
  END LOOP;

  FOR v_art IN SELECT jsonb_array_elements(NEW.articles) LOOP
    IF jsonb_typeof(v_art) <> 'object'
       OR (v_art->>'law') NOT IN ('constitution-2011', 'mudawana-70-03')
       OR jsonb_typeof(v_art->'article') <> 'number'
       OR (v_art->>'article')::numeric NOT BETWEEN 1 AND 500
       OR jsonb_typeof(v_art->'text') <> 'string'
       OR char_length(v_art->>'text') > 5000 THEN
      RAISE EXCEPTION 'صيغة المادة المرجعية غير صحيحة';
    END IF;
  END LOOP;

  IF NEW.published AND btrim(NEW.reviewed_by) = '' THEN
    RAISE EXCEPTION 'لا يُنشر أي حالة قبل تسجيل اسم المراجع';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_cases_validate ON public.legal_cases;
CREATE TRIGGER legal_cases_validate
BEFORE INSERT OR UPDATE ON public.legal_cases
FOR EACH ROW EXECUTE FUNCTION public.legal_cases_validate();

ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_cases FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_cases TO authenticated;

DROP POLICY IF EXISTS "legal_cases_admin_all" ON public.legal_cases;
CREATE POLICY "legal_cases_admin_all"
ON public.legal_cases
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- القراءة العامة: دالة مالكة (SECURITY DEFINER) تُرجع الحالات المنشورة بأعمدتها الآمنة
-- فقط، وفوقها view بصلاحية المستدعي (security_invoker = true).
-- لماذا لا view بصلاحية المالك مباشرة؟ صلاحيات Supabase الافتراضية تمنح anon و
-- authenticated كل الصلاحيات (ALL) على أي view جديدة، والـ view البسيطة على جدول واحد
-- قابلة للتحديث تلقائياً؛ فكانت UPDATE/DELETE عبرها تمر بصلاحية المالك متجاوزة RLS
-- (تعديل الحالات المنشورة أو حذفها من أي زائر). الـ view فوق دالة غير قابلة للكتابة
-- أصلاً، ونسحب كل الصلاحيات ثم نمنح SELECT وحدها (نفس نمط quiz_questions_public).
CREATE OR REPLACE FUNCTION public.legal_cases_public_rows()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  law_code text,
  difficulty text,
  story text,
  question text,
  options jsonb,
  hint text,
  image_url text,
  image_alt text,
  reviewed_by text,
  reviewed_on date,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id, c.slug, c.title, c.law_code, c.difficulty, c.story, c.question, c.options,
         c.hint, c.image_url, c.image_alt, c.reviewed_by, c.reviewed_on, c.updated_at
  FROM public.legal_cases c
  WHERE c.published = true
$$;

REVOKE ALL ON FUNCTION public.legal_cases_public_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.legal_cases_public_rows() TO anon, authenticated;

-- view عامة: بلا answer_index ولا explanation ولا articles
DROP VIEW IF EXISTS public.legal_cases_public;
CREATE VIEW public.legal_cases_public
WITH (security_invoker = true)
AS
SELECT
  id,
  slug,
  title,
  law_code,
  difficulty,
  story,
  question,
  options,
  hint,
  image_url,
  image_alt,
  reviewed_by,
  reviewed_on,
  updated_at
FROM public.legal_cases_public_rows();

REVOKE ALL ON public.legal_cases_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_cases_public TO anon, authenticated;

-- دالة التصحيح: الجواب والشرح والمواد لا تُكشف إلا بعد الصواب
CREATE OR REPLACE FUNCTION public.legal_case_check(
  p_slug text,
  p_choice integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_case public.legal_cases%ROWTYPE;
BEGIN
  IF p_choice IS NULL OR p_choice < 0 OR p_choice > 3 THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT * INTO v_case
  FROM public.legal_cases c
  WHERE c.slug = p_slug AND c.published = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF p_choice = v_case.answer_index THEN
    RETURN jsonb_build_object(
      'status', 'correct',
      'correct_index', v_case.answer_index,
      'explanation', v_case.explanation,
      'articles', v_case.articles
    );
  END IF;

  RETURN jsonb_build_object('status', 'wrong', 'hint', v_case.hint);
END;
$$;

REVOKE ALL ON FUNCTION public.legal_case_check(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.legal_case_check(text, integer) TO anon, authenticated;

COMMIT;
