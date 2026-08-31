-- Compatibility for older CMS/news clients that still request `news.category`.
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS category text;

UPDATE public.news n
SET category = c.name
FROM public.categories c
WHERE n.category_id = c.id
  AND (n.category IS NULL OR n.category = '');

CREATE OR REPLACE FUNCTION public.sync_news_category_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT c.name INTO NEW.category
    FROM public.categories c
    WHERE c.id = NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_news_category_name ON public.news;
CREATE TRIGGER trg_sync_news_category_name
BEFORE INSERT OR UPDATE OF category_id ON public.news
FOR EACH ROW EXECUTE FUNCTION public.sync_news_category_name();

-- Audit logs are private admin data.
DROP POLICY IF EXISTS "Admins Read Audit Logs" ON public.audit_logs;
CREATE POLICY "Admins Read Audit Logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_admin());

-- Harden public RPC helpers with an explicit search_path.
ALTER FUNCTION public.increment_article_views(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_news_views(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_content_views(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_pdf_downloads(uuid) SET search_path = public, pg_temp;

-- Reporting RPCs can use normal RLS rather than SECURITY DEFINER.
ALTER FUNCTION public.get_top_content(text, timestamptz, integer) SECURITY INVOKER SET search_path = public, pg_temp;
ALTER FUNCTION public.get_total_visits(timestamptz) SECURITY INVOKER SET search_path = public, pg_temp;
ALTER FUNCTION public.get_unique_visitors(timestamptz) SECURITY INVOKER SET search_path = public, pg_temp;
ALTER FUNCTION public.get_visits_by_type(timestamptz) SECURITY INVOKER SET search_path = public, pg_temp;
ALTER FUNCTION public.get_visits_timeseries(timestamptz, integer) SECURITY INVOKER SET search_path = public, pg_temp;

-- Maintenance/trigger helpers must not be callable through PostgREST RPC.
REVOKE EXECUTE ON FUNCTION public.cleanup_old_page_views(interval) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_comment_unapproved() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.cleanup_old_page_views(interval) SET search_path = public, pg_temp;
ALTER FUNCTION public.force_comment_unapproved() SET search_path = public, pg_temp;

-- The counter RPCs are intentionally public because the public site calls them.
-- Their implementations only modify the requested counter row.
REVOKE EXECUTE ON FUNCTION public.increment_article_views(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_content_views(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_news_views(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_pdf_downloads(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_article_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_content_views(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_news_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pdf_downloads(uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_top_content(text, timestamptz, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_total_visits(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_unique_visitors(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_visits_by_type(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_visits_timeseries(timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_content(text, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_visits(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unique_visitors(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visits_by_type(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visits_timeseries(timestamptz, integer) TO authenticated;

-- Remaining security-sensitive helpers.
ALTER FUNCTION public.set_laws_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_trending_topics_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_bot_user_agent(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.page_views_filter_bots() SET search_path = public, pg_temp;
