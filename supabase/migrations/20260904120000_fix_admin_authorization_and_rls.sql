-- 20260904120000_fix_admin_authorization_and_rls.sql
--
-- FINAL VERIFIED VERSION
--
-- Verified live public.user_role values:
--   super_admin
--   editor
--
-- Admin authorization:
--   super_admin  = admin
--   editor       = admin/editor
--   admin_god_mode = true = admin
--
-- This migration protects admin writes on:
--   news
--   lexicon_terms
--   laws
--   trending_topics
--   faculties
--
-- Public read policies are preserved.

BEGIN;


-- =====================================================================
-- STEP 0 — Ensure profiles.role exists
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN

    ALTER TABLE public.profiles
      ADD COLUMN role public.user_role DEFAULT 'editor';

    -- Preserve existing god-mode administrators.
    UPDATE public.profiles
    SET role = 'super_admin'
    WHERE admin_god_mode = true;

  END IF;
END $$;


-- =====================================================================
-- STEP 1 — Backfill god-mode administrators
-- =====================================================================

UPDATE public.profiles
SET role = 'super_admin'
WHERE admin_god_mode = true
  AND role IS DISTINCT FROM 'super_admin';


-- =====================================================================
-- STEP 2 — Admin authorization function
-- =====================================================================
--
-- Both roles are authorized for admin content operations:
--
--   super_admin
--   editor
--
-- admin_god_mode=true is also treated as administrator access.
--
-- SECURITY DEFINER is used so the function can safely inspect
-- public.profiles from RLS policies.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND (
        admin_god_mode = true
        OR role IN ('super_admin', 'editor')
      )
  );
$$;


REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;


-- =====================================================================
-- STEP 3 — NEWS
-- =====================================================================

-- Remove legacy/duplicate admin policies.
DROP POLICY IF EXISTS "Admin Insert News" ON public.news;
DROP POLICY IF EXISTS "Admin Update News" ON public.news;
DROP POLICY IF EXISTS "Admin Delete News" ON public.news;

-- Remove the new policies if migration is ever reapplied.
DROP POLICY IF EXISTS "news_admin_insert" ON public.news;
DROP POLICY IF EXISTS "news_admin_update" ON public.news;
DROP POLICY IF EXISTS "news_admin_delete" ON public.news;

CREATE POLICY "news_admin_insert"
ON public.news
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "news_admin_update"
ON public.news
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "news_admin_delete"
ON public.news
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Public SELECT policy remains untouched.


-- =====================================================================
-- STEP 4 — LEXICON TERMS
-- =====================================================================

-- Remove legacy/duplicate policies.
DROP POLICY IF EXISTS "Enable insert for authenticated users only"
ON public.lexicon_terms;

DROP POLICY IF EXISTS "Enable update for authenticated users only"
ON public.lexicon_terms;

DROP POLICY IF EXISTS "Enable delete for authenticated users only"
ON public.lexicon_terms;

DROP POLICY IF EXISTS "Admin Insert Lexicon"
ON public.lexicon_terms;

DROP POLICY IF EXISTS "Admin Update Lexicon"
ON public.lexicon_terms;

DROP POLICY IF EXISTS "Admin Delete Lexicon"
ON public.lexicon_terms;

-- Idempotency.
DROP POLICY IF EXISTS "lexicon_terms_admin_insert"
ON public.lexicon_terms;

DROP POLICY IF EXISTS "lexicon_terms_admin_update"
ON public.lexicon_terms;

DROP POLICY IF EXISTS "lexicon_terms_admin_delete"
ON public.lexicon_terms;

CREATE POLICY "lexicon_terms_admin_insert"
ON public.lexicon_terms
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "lexicon_terms_admin_update"
ON public.lexicon_terms
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "lexicon_terms_admin_delete"
ON public.lexicon_terms
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Public SELECT policies remain untouched.


-- =====================================================================
-- STEP 5 — LAWS
-- =====================================================================

DROP POLICY IF EXISTS "laws_admin_insert"
ON public.laws;

DROP POLICY IF EXISTS "laws_admin_update"
ON public.laws;

DROP POLICY IF EXISTS "laws_admin_delete"
ON public.laws;

CREATE POLICY "laws_admin_insert"
ON public.laws
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "laws_admin_update"
ON public.laws
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "laws_admin_delete"
ON public.laws
FOR DELETE
TO authenticated
USING (public.is_admin());

-- laws_public_read remains untouched.


-- =====================================================================
-- STEP 6 — TRENDING TOPICS
-- =====================================================================

DROP POLICY IF EXISTS "trending_topics_admin_insert"
ON public.trending_topics;

DROP POLICY IF EXISTS "trending_topics_admin_update"
ON public.trending_topics;

DROP POLICY IF EXISTS "trending_topics_admin_delete"
ON public.trending_topics;

DROP POLICY IF EXISTS "trending_topics_admin_select"
ON public.trending_topics;

CREATE POLICY "trending_topics_admin_insert"
ON public.trending_topics
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "trending_topics_admin_update"
ON public.trending_topics
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "trending_topics_admin_delete"
ON public.trending_topics
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Preserve existing behavior:
-- authenticated users can read trending topics.
CREATE POLICY "trending_topics_admin_select"
ON public.trending_topics
FOR SELECT
TO authenticated
USING (true);


-- =====================================================================
-- STEP 7 — FACULTIES
-- =====================================================================

-- Remove legacy/duplicate policies.
DROP POLICY IF EXISTS "Enable insert for authenticated users on faculties"
ON public.faculties;

DROP POLICY IF EXISTS "Admin Insert Faculties"
ON public.faculties;

DROP POLICY IF EXISTS "Admin Update Faculties"
ON public.faculties;

DROP POLICY IF EXISTS "Admin Delete Faculties"
ON public.faculties;

-- Idempotency.
DROP POLICY IF EXISTS "faculties_admin_insert"
ON public.faculties;

DROP POLICY IF EXISTS "faculties_admin_update"
ON public.faculties;

DROP POLICY IF EXISTS "faculties_admin_delete"
ON public.faculties;

CREATE POLICY "faculties_admin_insert"
ON public.faculties
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "faculties_admin_update"
ON public.faculties
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "faculties_admin_delete"
ON public.faculties
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Public SELECT policy remains untouched.


COMMIT;