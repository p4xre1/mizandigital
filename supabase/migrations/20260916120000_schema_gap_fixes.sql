-- ============================================================================
-- 20260916120000_schema_gap_fixes.sql
--
-- Fixes the gaps found by the audit in supabase/AUDIT-schema-gaps.md.
-- Idempotent: safe to re-run. Nothing here is destructive.
--
--   §1  missing tables        : integrations, law_trends
--   §3.1 column drift         : seminars.image_url
--   §4  RLS                   : articles admin write policies
--   §5  updated_at triggers   : articles, pdf_summaries, lexicon_terms,
--                               transactions, payments
--   §6  storage               : "documents" bucket + policies
--   §10 indexes               : hot read paths
--
-- NOT included on purpose (needs a product decision, not SQL):
--   §2  dead functions referencing tenants / user_bookmarks / documents_library
--   §7  the six stubbed migrations (content is unknown — restore from prod)
--   §9  interaction_events writer + /api/analytics/track endpoint
--   §11 duplicate reactions / identity / payment systems
-- ============================================================================

-- ============================================================================
-- §3.1  seminars.image_url — the admin form already sends it
-- ============================================================================
ALTER TABLE public.seminars ADD COLUMN IF NOT EXISTS image_url text;

-- ============================================================================
-- §1  integrations — Gmail (and future) token store
--       Used by src/lib/integrations/gmailService.ts (select/upsert/delete by
--       `provider`). Tokens are credentials: RLS on, zero client policies,
--       service_role only — same pattern as stripe_webhook_events.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL UNIQUE
                CHECK (char_length(provider) BETWEEN 2 AND 40),
  -- ciphertext only; never store a plaintext token
  encrypted_token text,
  token_type    text,
  scope         text,
  expires_at    timestamptz,
  email         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at    timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations OWNER TO postgres;
COMMENT ON TABLE public.integrations IS
  'OAuth tokens for third-party integrations. Service-role only: no client policy exists, so anon/authenticated are denied by RLS.';

CREATE INDEX IF NOT EXISTS integrations_provider_idx ON public.integrations (provider);

-- ============================================================================
-- §1  law_trends — cached trend feed for src/lib/integrations/lawTrendsService.ts
--       (select("*").order("interest" desc).limit(20))
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.law_trends (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term         text NOT NULL,
  interest     integer NOT NULL DEFAULT 0,
  source       text,
  source_url   text,
  region       text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
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
-- §4  articles — admin write policies.
--       The CMS writes through PostgREST with the anon/authenticated client
--       (ArticleEditorPage.tsx insert/update, ArticlesPage.tsx delete), but
--       articles only ever had "Public and Admin Read Articles" FOR SELECT.
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

CREATE OR REPLACE FUNCTION public.set_payments_updated_at()
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

-- payments: pending -> completed must move updated_at
DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_payments_updated_at();

DROP TRIGGER IF EXISTS set_integrations_updated_at ON public.integrations;
CREATE TRIGGER set_integrations_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_integrations_updated_at();

-- ============================================================================
-- §6  the "documents" storage bucket
--       Used by LibraryPage.tsx (library/<file>) and LawsPage.tsx (laws/<file>).
--       Private bucket: reads go through getPublicUrl on an already-uploaded
--       object, so keep it public-read only if that is what production does.
--       Flip `public` to false and issue signed URLs if these are meant to be
--       gated by the download flow.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800, -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- admins upload/delete; everyone reads
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
-- §10  indexes for the queries the app actually runs
-- ============================================================================
-- ArticlesPage.tsx: .eq("status","published").order("published_at" desc)
CREATE INDEX IF NOT EXISTS articles_status_published_at_idx
  ON public.articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_category_id_idx ON public.articles (category_id);
CREATE INDEX IF NOT EXISTS articles_faculty_id_idx  ON public.articles (faculty_id);
CREATE INDEX IF NOT EXISTS articles_is_featured_idx ON public.articles (is_featured)
  WHERE is_featured = true;

-- NewsPage: .eq("is_published", true).order("published_at" desc)
CREATE INDEX IF NOT EXISTS news_published_at_idx
  ON public.news (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS news_category_id_idx ON public.news (category_id);

-- contentTracking.ts: .order("views_count" desc).limit(20)
CREATE INDEX IF NOT EXISTS content_stats_views_idx ON public.content_stats (views_count DESC);

-- governance/service.ts: .eq("is_active", true).order("sort_order")
CREATE INDEX IF NOT EXISTS community_guidelines_active_sort_idx
  ON public.community_guidelines (is_active, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS community_guidelines_slug_key
  ON public.community_guidelines (slug);

-- SeminarsPage.tsx: .order("event_date" desc)
CREATE INDEX IF NOT EXISTS seminars_event_date_idx ON public.seminars (event_date DESC);

-- admin audit log listing
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

-- gsc-index-status edge function
CREATE INDEX IF NOT EXISTS index_status_type_idx    ON public.index_status (content_type);
CREATE INDEX IF NOT EXISTS index_status_checked_idx ON public.index_status (checked_at DESC);

-- small lookup tables filtered by is_active + sort_order
CREATE INDEX IF NOT EXISTS interest_options_active_sort_idx
  ON public.interest_options (is_active, sort_order);
CREATE INDEX IF NOT EXISTS subscription_plans_active_idx
  ON public.subscription_plans (is_active, sort_order);
CREATE INDEX IF NOT EXISTS credit_packages_active_sort_idx
  ON public.credit_packages (is_active, sort_order);
