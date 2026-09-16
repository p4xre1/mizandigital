-- ============================================================================
-- 20260916120000_schema_gap_fixes.sql
--
-- Fixes the gaps found by supabase/AUDIT-schema-gaps.md.
-- Idempotent: safe to re-run. Nothing here drops data.
--
--   §1  missing tables      : integrations, law_trends
--   §3.1 column drift       : seminars.image_url
--   §4  RLS                 : articles admin write policies
--   §5  updated_at triggers : articles, pdf_summaries, lexicon_terms, transactions
--   §6  storage             : "documents" bucket + policies
--   §10 indexes             : only the ones a real query in src/ justifies
--
-- Every statement below was checked against the migration that creates the
-- object it touches. Four earlier drafts of this file were wrong and are fixed:
--   * payments has NO updated_at column, so it gets no trigger
--   * community_guidelines.slug is already UNIQUE, so no new unique index
--   * the bucket allows .doc/.docx because PdfDropzone accepts them
--   * indexes with no query behind them were removed
--
-- NOT included on purpose (needs a product decision, not SQL):
--   §2  dead functions referencing tenants / user_bookmarks / documents_library
--   §7  the six stubbed migrations (content unknown — restore from prod)
--   §9  interaction_events writer + /api/analytics/track endpoint
--   §11 duplicate reactions / identity / payment systems
-- ============================================================================

-- ============================================================================
-- §3.1  seminars.image_url
--       SeminarsPage.tsx:170 already sends it; the column does not exist, so
--       every save fails with PGRST204.
-- ============================================================================
ALTER TABLE public.seminars ADD COLUMN IF NOT EXISTS image_url text;

-- ============================================================================
-- §1  integrations — Gmail (and future) token store
--       gmailService.ts:202/253/278 select/upsert/delete by `provider`.
--       Tokens are credentials: RLS on, zero client policies, service_role only
--       — the same pattern already used for stripe_webhook_events.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL UNIQUE
                  CHECK (char_length(provider) BETWEEN 2 AND 40),
  -- ciphertext only; never store a plaintext token
  encrypted_token text,
  token_type      text,
  scope           text,
  expires_at      timestamptz,
  email           text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at      timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations OWNER TO postgres;
COMMENT ON TABLE public.integrations IS
  'OAuth tokens for third-party integrations. Service-role only: no client policy exists, so anon/authenticated are denied by RLS.';

-- ============================================================================
-- §1  law_trends — cached trend feed
--       lawTrendsService.ts:165  select("*").order("interest" desc).limit(20)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.law_trends (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term       text NOT NULL,
  interest   integer NOT NULL DEFAULT 0,
  source     text,
  source_url text,
  region     text,
  metadata   jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT law_trends_term_source_key UNIQUE (term, source)
);
ALTER TABLE public.law_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_trends OWNER TO postgres;

DROP POLICY IF EXISTS "law trends are public" ON public.law_trends;
CREATE POLICY "law trends are public"
  ON public.law_trends FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "law trends admin write" ON public.law_trends;
CREATE POLICY "law trends admin write"
  ON public.law_trends FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS law_trends_interest_idx ON public.law_trends (interest DESC);

-- ============================================================================
-- §4  articles — admin write policies
--       articles only ever had "Public and Admin Read Articles" FOR SELECT, but
--       ArticleEditorPage.tsx:211/217 and ArticlesPage.tsx:84 write through
--       PostgREST with the anon/authenticated client.
--       Mirrors the news_admin_* policies from 20260904120000.
-- ============================================================================
DROP POLICY IF EXISTS "articles_admin_insert" ON public.articles;
CREATE POLICY "articles_admin_insert"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "articles_admin_update" ON public.articles;
CREATE POLICY "articles_admin_update"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "articles_admin_delete" ON public.articles;
CREATE POLICY "articles_admin_delete"
  ON public.articles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- §5  updated_at triggers
--       Only for tables that actually HAVE an updated_at column:
--       articles, pdf_summaries, lexicon_terms, transactions, integrations.
--       payments has none (verified against 20260921000000) — no trigger.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_articles_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at := timezone('utc'::text, now()); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.set_pdf_summaries_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at := timezone('utc'::text, now()); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.set_lexicon_terms_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at := timezone('utc'::text, now()); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.set_transactions_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at := timezone('utc'::text, now()); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.set_integrations_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at := timezone('utc'::text, now()); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS set_articles_updated_at ON public.articles;
CREATE TRIGGER set_articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_articles_updated_at();

DROP TRIGGER IF EXISTS set_pdf_summaries_updated_at ON public.pdf_summaries;
CREATE TRIGGER set_pdf_summaries_updated_at BEFORE UPDATE ON public.pdf_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_pdf_summaries_updated_at();

DROP TRIGGER IF EXISTS set_lexicon_terms_updated_at ON public.lexicon_terms;
CREATE TRIGGER set_lexicon_terms_updated_at BEFORE UPDATE ON public.lexicon_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_lexicon_terms_updated_at();

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_transactions_updated_at();

DROP TRIGGER IF EXISTS set_integrations_updated_at ON public.integrations;
CREATE TRIGGER set_integrations_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_integrations_updated_at();

-- ============================================================================
-- §6  the "documents" storage bucket
--       LibraryPage.tsx:58/68/210 and LawsPage.tsx:49/57 upload here and call
--       getPublicUrl(), so the bucket must be public.
--       allowed_mime_types is left NULL on purpose: PdfDropzone accepts
--       "application/pdf,.doc,.docx" (PdfDropzone.tsx:65), and restricting it
--       here would silently break Word uploads.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', true, 52428800) -- 50 MB
ON CONFLICT (id) DO NOTHING;

-- admins upload/rename/delete; everyone reads
DROP POLICY IF EXISTS "documents_admin_upload" ON storage.objects;
CREATE POLICY "documents_admin_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_admin());

DROP POLICY IF EXISTS "documents_admin_update" ON storage.objects;
CREATE POLICY "documents_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'documents' AND public.is_admin());

DROP POLICY IF EXISTS "documents_admin_delete" ON storage.objects;
CREATE POLICY "documents_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());

DROP POLICY IF EXISTS "documents_public_read" ON storage.objects;
CREATE POLICY "documents_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'documents');

-- ============================================================================
-- §10  Indexes — one per query that actually exists in src/
-- ============================================================================
-- ArticlesPage.tsx:68-69   .eq("status","published").order("published_at" desc)
CREATE INDEX IF NOT EXISTS articles_status_published_at_idx
  ON public.articles (status, published_at DESC);

-- NewsPage.tsx:51-52       .eq("is_published", true).order("published_at" desc)
CREATE INDEX IF NOT EXISTS news_published_at_idx
  ON public.news (is_published, published_at DESC);

-- contentTracking.ts:86    .order("views_count" desc).limit(20)
CREATE INDEX IF NOT EXISTS content_stats_views_idx
  ON public.content_stats (views_count DESC);

-- governance/service.ts:87 .eq("is_active", true).order("sort_order")
CREATE INDEX IF NOT EXISTS community_guidelines_active_sort_idx
  ON public.community_guidelines (is_active, sort_order);

-- SeminarsPage.tsx:95      .order("event_date" desc)
CREATE INDEX IF NOT EXISTS seminars_event_date_idx
  ON public.seminars (event_date DESC);

-- AnalyticsPage.tsx:324    .order("checked_at" desc).limit(30)
CREATE INDEX IF NOT EXISTS index_status_checked_idx
  ON public.index_status (checked_at DESC);

-- payments/service.ts:45-46 .eq("is_active", true).order("sort_order")
CREATE INDEX IF NOT EXISTS credit_packages_active_sort_idx
  ON public.credit_packages (is_active, sort_order);

-- ============================================================================
-- Post-flight check: run this after the script and eyeball the counts.
-- ============================================================================
-- SELECT
--   (SELECT count(*) FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='seminars' AND column_name='image_url') AS seminars_image_url,
--   (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='articles')  AS articles_policies,
--   (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
--     WHERE NOT t.tgisinternal AND c.relname IN
--       ('articles','pdf_summaries','lexicon_terms','transactions','integrations'))        AS updated_at_triggers,
--   (SELECT count(*) FROM storage.buckets WHERE id='documents')                            AS documents_bucket,
--   (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN
--     ('articles_status_published_at_idx','news_published_at_idx','content_stats_views_idx',
--      'community_guidelines_active_sort_idx','seminars_event_date_idx',
--      'index_status_checked_idx','credit_packages_active_sort_idx','law_trends_interest_idx')) AS new_indexes;
-- Expected: 1, 4, 5, 1, 8
