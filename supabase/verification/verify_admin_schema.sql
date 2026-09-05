-- 20260904120100_verify_admin_schema.sql
--
-- NEEDS LIVE SUPABASE VERIFICATION
-- This file is NOT meant to be run as a migration (it changes nothing).
-- Copy each block into the Supabase SQL Editor and run it BEFORE applying
-- 20260904120000_fix_admin_authorization_and_rls.sql, so you know exactly
-- what the live database looks like first.

-- 1) Does public.profiles have a `role` column today, and what type is it?
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2) Current definition of is_admin() (does it reference `role`, `admin_god_mode`, or both?)
SELECT pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace;

-- 3) All current RLS policies on the tables this migration touches
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('news', 'lexicon_terms', 'laws', 'faculties', 'trending_topics', 'profiles')
ORDER BY tablename, cmd, policyname;

-- 4) Is RLS actually enabled on these tables? (a policy with RLS disabled is decorative)
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('news', 'lexicon_terms', 'laws', 'faculties', 'trending_topics', 'profiles');

-- 5) How many rows currently have admin_god_mode = true vs a non-null role
--    (sanity check before backfilling role = 'admin' for admin_god_mode = true rows)
SELECT
  count(*) FILTER (WHERE admin_god_mode = true) AS admin_god_mode_true_count,
  count(*) AS total_profiles
FROM public.profiles;

-- 6) Relevant indexes on profiles (id is the PK and should already be indexed;
--    this just confirms nothing unexpected is missing)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'profiles';
