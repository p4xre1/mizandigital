-- Make all published legal tools and their content free; remove subscription checks.
-- Private notes still require authentication and remain scoped to their owner.
BEGIN;

CREATE OR REPLACE FUNCTION public.has_pro_tools_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT true;
$$;
ALTER FUNCTION public.has_pro_tools_access() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_pro_tools_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_pro_tools_access() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_use_pro_tool(tool text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pro_tools t WHERE t.slug = tool AND t.enabled = true
  );
$$;
ALTER FUNCTION public.can_use_pro_tool(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_use_pro_tool(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_use_pro_tool(text) TO anon, authenticated;

GRANT SELECT ON public.pro_tools, public.pro_tool_entries TO anon, authenticated;

DROP POLICY IF EXISTS entries_pro ON public.pro_tool_entries;
DROP POLICY IF EXISTS entries_free ON public.pro_tool_entries;
CREATE POLICY entries_free ON public.pro_tool_entries
  FOR SELECT TO anon, authenticated
  USING (published AND public.can_use_pro_tool(tool_slug));

-- Notes and topic follows remain private to signed-in users, but no longer require Pro.
DROP POLICY IF EXISTS notes_read ON public.pro_tool_notes;
DROP POLICY IF EXISTS notes_insert ON public.pro_tool_notes;
DROP POLICY IF EXISTS notes_update ON public.pro_tool_notes;
DROP POLICY IF EXISTS notes_delete ON public.pro_tool_notes;
CREATE POLICY notes_read ON public.pro_tool_notes
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND public.can_use_pro_tool(tool_slug));
CREATE POLICY notes_insert ON public.pro_tool_notes
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.can_use_pro_tool(tool_slug));
CREATE POLICY notes_update ON public.pro_tool_notes
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.can_use_pro_tool(tool_slug))
  WITH CHECK (owner_id = auth.uid() AND public.can_use_pro_tool(tool_slug));
CREATE POLICY notes_delete ON public.pro_tool_notes
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS follows_read ON public.pro_tool_follows;
DROP POLICY IF EXISTS follows_insert ON public.pro_tool_follows;
DROP POLICY IF EXISTS follows_delete ON public.pro_tool_follows;
CREATE POLICY follows_read ON public.pro_tool_follows
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND public.can_use_pro_tool('alerts'));
CREATE POLICY follows_insert ON public.pro_tool_follows
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.can_use_pro_tool('alerts'));
CREATE POLICY follows_delete ON public.pro_tool_follows
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

COMMIT;
