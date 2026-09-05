-- 20260904130000_add_lexicon_terms_slug.sql
--
-- NEEDS DATABASE MIGRATION — DO NOT APPLY BLINDLY.
-- This is proposed, not applied automatically. Review before running.
--
-- WHY: src/pages/public/TermPage.tsx currently has no way to look up a
-- single lexicon term by URL slug at the database level, so it downloads
-- the ENTIRE lexicon_terms table (select("*"), including the legal_sources
-- jsonb blob for every term) on every /lexicon/:slug page view just to find
-- one row client-side. Adding a real `slug` column lets the client query
-- `.eq("slug", x).maybeSingle()` instead.
--
-- This migration is written to be safe to run (idempotent, backfills
-- existing rows, doesn't break current links), but you should still run it
-- in a staging project first since it touches every existing lexicon_terms
-- row.

BEGIN;

ALTER TABLE public.lexicon_terms ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slug for existing rows from term_ar using the same slugify logic
-- as the frontend's generateSlug() (Arabic-aware: strips diacritics, spaces
-- to dashes). Doing the exact same transformation in SQL is impractical
-- (needs Arabic normalization), so this backfill uses a conservative
-- ASCII/whitespace-only slugify as a placeholder — it will correctly slug
-- French terms but NOT Arabic ones. Arabic term slugs should be backfilled
-- from the application using lib/utils/generateSlug.ts (same function the
-- frontend already uses to match links), then this migration only adds the
-- column + constraint; it does not attempt to replace that logic in SQL.
UPDATE public.lexicon_terms
SET slug = lower(regexp_replace(trim(coalesce(term_fr, term_ar)), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Ensure uniqueness once backfilled (append id suffix on collision)
UPDATE public.lexicon_terms t
SET slug = t.slug || '-' || substr(t.id::text, 1, 8)
WHERE slug IN (
  SELECT slug FROM public.lexicon_terms GROUP BY slug HAVING count(*) > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS lexicon_terms_slug_key ON public.lexicon_terms (slug);

COMMIT;

-- AFTER RUNNING: re-generate slugs for Arabic terms from the application
-- (using the same generateSlug() used for URL matching) so /lexicon/:slug
-- links keep working exactly as they do today, then the ASCII placeholder
-- slugs above can be overwritten with the correct ones.
