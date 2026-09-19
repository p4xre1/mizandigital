-- Pro legal tools: no legal material is seeded. Publish reviewed sources in the CMS.
BEGIN;
CREATE OR REPLACE FUNCTION public.has_pro_tools_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_status = 'active'
    AND (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.mizan_profiles m WHERE m.owner_id = auth.uid()
        AND m.is_pro = true AND m.subscription_status IN ('active', 'trialing')
        AND coalesce(m.subscription_ends_at, m.subscription_current_period_end) > now()
    ))
  );
$$;
ALTER FUNCTION public.has_pro_tools_access() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_pro_tools_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_pro_tools_access() TO authenticated;

CREATE TABLE public.pro_tools (
  slug text PRIMARY KEY CHECK (slug IN ('versions','cases','references','workspace','alerts','deadlines')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (char_length(description) <= 1000),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.pro_tools (slug,title,description,enabled) VALUES
 ('versions','قانون عبر الزمن','قارن نسختين موثقتين من نص قانوني.',false),
 ('cases','من الواقعة إلى الحل','تدرب على حالات قانونية وإجابات نموذجية مراجعة.',false),
 ('references','خريطة الإحالات القانونية','ابحث عن الروابط بين النصوص ومصادرها.',false),
 ('workspace','ملف البحث القانوني','احفظ ملاحظاتك ومراجعك وصدّر ملف بحثك.',true),
 ('alerts','راقب النص','تابع مواضيعك واطلع على تحديثاتها المنشورة داخل المنصة.',false),
 ('deadlines','حاسبة الآجال المسطرية','حساب مساعد لقواعد الأيام التقويمية المراجعة فقط، وليس استشارة قانونية.',false);

CREATE OR REPLACE FUNCTION public.can_use_pro_tool(tool text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT public.has_pro_tools_access() AND EXISTS (SELECT 1 FROM public.pro_tools WHERE slug = tool AND enabled);
$$;
ALTER FUNCTION public.can_use_pro_tool(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_use_pro_tool(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_pro_tool(text) TO authenticated;

CREATE TABLE public.pro_tool_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tool_slug text NOT NULL REFERENCES public.pro_tools(slug) CHECK (tool_slug <> 'workspace'),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
 topic text NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 120),
 source_url text NOT NULL DEFAULT '' CHECK (source_url = '' OR source_url ~ '^https://[^[:space:]]+$'),
 source_reference text NOT NULL DEFAULT '' CHECK (char_length(source_reference) <= 1000),
 payload jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 100000),
 published boolean NOT NULL DEFAULT false,
 reviewed_by text NOT NULL DEFAULT '' CHECK (char_length(reviewed_by) <= 160),
 reviewed_on date,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (NOT published OR (source_url <> '' AND source_reference <> '' AND reviewed_by <> '' AND reviewed_on IS NOT NULL))
);
CREATE INDEX ON public.pro_tool_entries(tool_slug, published, topic);

-- Private notes and practice answers are never accessible to other members or CMS editors.
CREATE TABLE public.pro_tool_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 tool_slug text NOT NULL REFERENCES public.pro_tools(slug) CHECK (tool_slug IN ('workspace','cases')),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
 body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 30000),
 citation text NOT NULL DEFAULT '' CHECK (char_length(citation) <= 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pro_tool_notes(owner_id,tool_slug);
CREATE TABLE public.pro_tool_follows (
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 topic text NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 120),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (owner_id,topic)
);
CREATE TABLE public.pro_tools_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 table_name text NOT NULL,
 action text NOT NULL,
 record_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.audit_pro_tools_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 INSERT INTO public.pro_tools_audit(actor_id,table_name,action,record_id)
 VALUES (auth.uid(),TG_TABLE_NAME,TG_OP,coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id',to_jsonb(NEW)->>'slug',to_jsonb(OLD)->>'slug'));
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
ALTER FUNCTION public.audit_pro_tools_change() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.audit_pro_tools_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER pro_tools_audit AFTER INSERT OR UPDATE OR DELETE ON public.pro_tools FOR EACH ROW EXECUTE FUNCTION public.audit_pro_tools_change();
CREATE TRIGGER pro_entries_audit AFTER INSERT OR UPDATE OR DELETE ON public.pro_tool_entries FOR EACH ROW EXECUTE FUNCTION public.audit_pro_tools_change();

CREATE OR REPLACE FUNCTION public.validate_pro_tool_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE required_field text;
BEGIN
 NEW.updated_at := now();
 IF EXISTS (SELECT 1 FROM jsonb_each(NEW.payload) WHERE jsonb_typeof(value) <> 'string') THEN RAISE EXCEPTION 'Payload fields must be strings'; END IF;
 IF NEW.published THEN
   IF NEW.reviewed_on > current_date THEN RAISE EXCEPTION 'Review date cannot be in the future'; END IF;
   FOREACH required_field IN ARRAY CASE NEW.tool_slug
    WHEN 'versions' THEN ARRAY['before','after','before_date','after_date','before_source_url']
    WHEN 'cases' THEN ARRAY['scenario','checklist','model_answer']
    WHEN 'references' THEN ARRAY['from_article','to_article','relationship','target_url']
    WHEN 'alerts' THEN ARRAY['summary','effective_date']
    WHEN 'deadlines' THEN ARRAY['days','assumptions','valid_from','valid_until']
    ELSE ARRAY[]::text[] END
   LOOP
     IF coalesce(btrim(NEW.payload->>required_field),'') = '' THEN RAISE EXCEPTION 'Missing field: %',required_field; END IF;
   END LOOP;
   IF NEW.tool_slug = 'versions' THEN
     IF (NEW.payload->>'before_date')::date >= (NEW.payload->>'after_date')::date THEN RAISE EXCEPTION 'Invalid version dates'; END IF;
     IF NEW.payload->>'before_source_url' !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'Invalid source URL'; END IF;
   END IF;
   IF NEW.tool_slug = 'references' AND NEW.payload->>'target_url' !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'Invalid reference URL'; END IF;
   IF NEW.tool_slug = 'alerts' THEN PERFORM (NEW.payload->>'effective_date')::date; END IF;
   IF NEW.tool_slug = 'deadlines' THEN
     IF NEW.payload->>'days' !~ '^[0-9]{1,4}$' OR (NEW.payload->>'days')::int NOT BETWEEN 1 AND 3650 THEN RAISE EXCEPTION 'Invalid calendar days'; END IF;
     IF (NEW.payload->>'valid_from')::date > (NEW.payload->>'valid_until')::date THEN RAISE EXCEPTION 'Invalid rule validity'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER pro_entry_validation BEFORE INSERT OR UPDATE ON public.pro_tool_entries FOR EACH ROW EXECUTE FUNCTION public.validate_pro_tool_entry();

ALTER TABLE public.pro_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_tool_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_tool_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_tool_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_tools_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pro_tools,public.pro_tool_entries,public.pro_tool_notes,public.pro_tool_follows,public.pro_tools_audit FROM anon,authenticated;
GRANT SELECT ON public.pro_tools TO anon,authenticated;
GRANT UPDATE ON public.pro_tools TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pro_tool_entries,public.pro_tool_notes,public.pro_tool_follows TO authenticated;
GRANT SELECT ON public.pro_tools_audit TO authenticated;
CREATE POLICY tools_catalog ON public.pro_tools FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY tools_admin ON public.pro_tools FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY entries_pro ON public.pro_tool_entries FOR SELECT TO authenticated USING (published AND public.can_use_pro_tool(tool_slug));
CREATE POLICY entries_admin ON public.pro_tool_entries FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY notes_read ON public.pro_tool_notes FOR SELECT TO authenticated USING (owner_id = auth.uid() AND public.can_use_pro_tool(tool_slug));
CREATE POLICY notes_insert ON public.pro_tool_notes FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.can_use_pro_tool(tool_slug));
CREATE POLICY notes_update ON public.pro_tool_notes FOR UPDATE TO authenticated USING (owner_id = auth.uid() AND public.can_use_pro_tool(tool_slug)) WITH CHECK (owner_id = auth.uid() AND public.can_use_pro_tool(tool_slug));
-- Allow deleting one's private data even after Pro expires.
CREATE POLICY notes_delete ON public.pro_tool_notes FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY follows_read ON public.pro_tool_follows FOR SELECT TO authenticated USING (owner_id = auth.uid() AND public.can_use_pro_tool('alerts'));
CREATE POLICY follows_insert ON public.pro_tool_follows FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.can_use_pro_tool('alerts'));
CREATE POLICY follows_delete ON public.pro_tool_follows FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY tools_audit_read ON public.pro_tools_audit FOR SELECT TO authenticated USING (public.is_admin());
COMMIT;
