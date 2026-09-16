-- ============================================================================
-- supabase/verification/preflight_schema_gaps.sql
--
-- READ-ONLY. Run this in the SQL Editor BEFORE applying
-- supabase/migrations/20260916120000_schema_gap_fixes.sql
--
-- Why: the schema dump the audit was based on is columns-only for `public`.
-- It cannot show policies, triggers, functions, indexes or buckets. These
-- queries close that gap so you are not applying fixes blind.
-- ============================================================================

-- 1) public.is_admin() MUST exist — every new policy calls it.
--    CREATE POLICY validates the expression at creation time, so if this
--    returns 0 rows the fix migration will fail on its first policy.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
WHERE p.proname = 'is_admin' AND p.pronamespace = 'public'::regnamespace;

-- 1b) ...and `authenticated` must be able to execute it
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'is_admin';

-- 2) seminars.image_url should NOT exist yet (expect 0 rows)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'seminars' AND column_name = 'image_url';

-- 3) current policies on articles (expect exactly 1: "Public and Admin Read Articles")
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'articles'
ORDER BY cmd, policyname;

-- 4) tables that have an updated_at column but no BEFORE UPDATE trigger.
--    Expect: articles, pdf_summaries, lexicon_terms, transactions.
--    NOTE: `payments` has no updated_at column at all, so it will not appear.
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = c.oid AND a.attname = 'updated_at' AND NOT a.attisdropped
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = c.oid AND NOT t.tgisinternal AND (t.tgtype & 2) = 2
  )
ORDER BY 1;

-- 5) does the "documents" bucket already exist?
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'documents';

-- 5b) existing storage policies for that bucket (names may collide)
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND qual ILIKE '%documents%';

-- 6) integrations / law_trends should NOT exist yet (expect 0 rows)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('integrations', 'law_trends');

-- 7) which of the new indexes already exist under another name?
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('articles','news','content_stats','community_guidelines',
                    'seminars','index_status','credit_packages')
ORDER BY tablename, indexname;

-- 8) is the on_auth_user_created trigger live? (the audit could not tell —
--    the dump covers `public` only). If handle_new_user_tenant_binding is
--    attached, sign-ups are currently broken because public.tenants is missing.
SELECT tgname, tgrelid::regclass AS on_table, tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;

-- 9) do the four tables referenced by dead functions really not exist?
SELECT t.tbl, (to_regclass('public.' || t.tbl) IS NOT NULL) AS exists_in_db
FROM (VALUES ('tenants'), ('user_bookmarks'), ('documents_library'), ('article_revisions')) AS t(tbl);
