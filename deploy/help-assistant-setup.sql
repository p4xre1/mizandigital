-- HELP ASSISTANT: manual Supabase SQL Editor setup
-- Run the ENTIRE file as the database owner (postgres) in the correct project.
-- Take a backup first; test in staging when available.
-- Combines the two repository migrations in one transaction so settings are
-- never committed with the temporary public-read policy from the CMS migration.
-- Existing questions/settings are preserved. Constraint failures roll back all
-- changes: inspect the error rather than removing the security constraints.
-- Requires the existing site's public.is_admin() and Supabase auth schema.
-- This manual bundle does NOT update supabase_migrations.schema_migrations.
-- Record the two migration filenames in your deployment notes for reconciliation.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Missing public.is_admin(): stop and apply the earlier site migrations first.';
  END IF;
END $$;

-- Source: supabase/migrations/20261008000000_help_assistant_cms.sql
-- مساعد الموقع: محتوى يديره المشرف من /admin/help-assistant.
--  - help_qa        : أسئلة وأجوبة يكتبها المشرف (المنشور منها فقط يظهر للزوار).
--  - help_settings  : صف واحد (id = 1) للتشغيل/الإيقاف، ونصوص الردود، وقوائم الحماية.
-- القراءة للجميع للصفوف المنشورة فقط، والكتابة للمشرفين عبر public.is_admin().

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p
                 WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'is_admin' AND p.prokind = 'f') THEN
    RAISE EXCEPTION 'help assistant CMS prerequisite missing: public.is_admin(). Apply the earlier migrations first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.help_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL CHECK (char_length(question) BETWEEN 4 AND 300),
  answer text NOT NULL CHECK (char_length(answer) BETWEEN 4 AND 1500),
  keywords text[] NOT NULL DEFAULT '{}',
  source_url text CHECK (source_url IS NULL OR (char_length(source_url) BETWEEN 2 AND 200 AND source_url LIKE '/%' AND source_url NOT LIKE '//%')),
  source_title text CHECK (source_title IS NULL OR char_length(source_title) <= 120),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.help_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  blocked_message text CHECK (blocked_message IS NULL OR char_length(blocked_message) <= 400),
  off_topic_message text CHECK (off_topic_message IS NULL OR char_length(off_topic_message) <= 400),
  not_found_message text CHECK (not_found_message IS NULL OR char_length(not_found_message) <= 400),
  disabled_message text CHECK (disabled_message IS NULL OR char_length(disabled_message) <= 400),
  blocked_phrases text[] NOT NULL DEFAULT '{}',
  off_topic_terms text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.help_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.help_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_qa_touch ON public.help_qa;
CREATE TRIGGER help_qa_touch BEFORE UPDATE ON public.help_qa
  FOR EACH ROW EXECUTE FUNCTION public.help_touch_updated_at();

DROP TRIGGER IF EXISTS help_settings_touch ON public.help_settings;
CREATE TRIGGER help_settings_touch BEFORE UPDATE ON public.help_settings
  FOR EACH ROW EXECUTE FUNCTION public.help_touch_updated_at();

ALTER TABLE public.help_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS help_qa_public_read ON public.help_qa;
DROP POLICY IF EXISTS help_qa_admin_all ON public.help_qa;
DROP POLICY IF EXISTS help_settings_public_read ON public.help_settings;
DROP POLICY IF EXISTS help_settings_admin_all ON public.help_settings;

CREATE POLICY help_qa_public_read ON public.help_qa
  FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY help_qa_admin_all ON public.help_qa
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY help_settings_public_read ON public.help_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY help_settings_admin_all ON public.help_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS help_qa_published_idx ON public.help_qa (published, updated_at DESC);


-- Source: supabase/migrations/20261009000000_help_assistant_hardening.sql
-- تشديد أمان مساعد الموقع (يُطبَّق بعد 20261008000000_help_assistant_cms.sql)
--  1) help_settings لا تُقرأ إلا بواسطة المشرفين. قائمة العبارات المحظورة سرّ تشغيلي
--     ولا يجب أن يراها الزوار. الخادم يقرأها بمفتاح service_role.
--  2) قيود على مستوى القاعدة: لا وسوم ولا روابط javascript في النصوص المحفوظة،
--     حتى لو كُتبت الصفوف مباشرة خارج لوحة الإدارة.
--  3) updated_by يُملأ من auth.uid() على الخادم، ولا يُقبل من العميل.
--  4) سجل تدقيق لكل إضافة أو تعديل أو حذف، لا يكتبه إلا المشغّل (trigger).
--  5) صف الإعدادات لا يُحذف أبداً.

DO $$
BEGIN
  IF to_regclass('public.help_settings') IS NULL OR to_regclass('public.help_qa') IS NULL THEN
    RAISE EXCEPTION 'help assistant hardening prerequisite missing: apply 20261008000000_help_assistant_cms.sql first';
  END IF;
END $$;

-- 1) القراءة للمشرفين فقط
DROP POLICY IF EXISTS help_settings_public_read ON public.help_settings;
REVOKE ALL ON public.help_settings FROM anon;

-- 2) دالة الفحص: النص خالٍ من الوسوم وأنماط التنفيذ
CREATE OR REPLACE FUNCTION public.help_text_is_plain(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT value IS NULL OR (
    value !~ '[<>]'
    AND value !~* 'javascript\s*:'
    AND value !~* 'data\s*:\s*text/html'
    AND value !~* '\son[a-z]{3,}\s*='
  );
$$;

CREATE OR REPLACE FUNCTION public.help_terms_are_plain(terms text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT terms IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(terms) AS t WHERE NOT public.help_text_is_plain(t)
  );
$$;

ALTER TABLE public.help_qa DROP CONSTRAINT IF EXISTS help_qa_plain_text;
ALTER TABLE public.help_qa ADD CONSTRAINT help_qa_plain_text CHECK (
  public.help_text_is_plain(question)
  AND public.help_text_is_plain(answer)
  AND public.help_terms_are_plain(keywords)
  AND public.help_text_is_plain(source_title)
);

ALTER TABLE public.help_settings DROP CONSTRAINT IF EXISTS help_settings_plain_text;
ALTER TABLE public.help_settings ADD CONSTRAINT help_settings_plain_text CHECK (
  public.help_text_is_plain(blocked_message)
  AND public.help_text_is_plain(off_topic_message)
  AND public.help_text_is_plain(not_found_message)
  AND public.help_text_is_plain(disabled_message)
  AND public.help_terms_are_plain(blocked_phrases)
  AND public.help_terms_are_plain(off_topic_terms)
  AND cardinality(blocked_phrases) <= 300
  AND cardinality(off_topic_terms) <= 300
);

-- 3) المُنشئ/المعدِّل من الجلسة فقط
CREATE OR REPLACE FUNCTION public.help_stamp_actor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_qa_stamp_actor ON public.help_qa;
CREATE TRIGGER help_qa_stamp_actor BEFORE INSERT OR UPDATE ON public.help_qa
  FOR EACH ROW EXECUTE FUNCTION public.help_stamp_actor();

DROP TRIGGER IF EXISTS help_settings_stamp_actor ON public.help_settings;
CREATE TRIGGER help_settings_stamp_actor BEFORE INSERT OR UPDATE ON public.help_settings
  FOR EACH ROW EXECUTE FUNCTION public.help_stamp_actor();

-- 4) سجل التدقيق
CREATE TABLE IF NOT EXISTS public.help_audit (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  row_id text NOT NULL,
  op text NOT NULL CHECK (op IN ('INSERT', 'UPDATE', 'DELETE')),
  actor uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_row jsonb,
  new_row jsonb
);

ALTER TABLE public.help_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.help_audit FROM anon;
DROP POLICY IF EXISTS help_audit_admin_read ON public.help_audit;
CREATE POLICY help_audit_admin_read ON public.help_audit
  FOR SELECT TO authenticated USING (public.is_admin());
-- لا توجد سياسة كتابة للعملاء: السجل يُكتب فقط من الدالة التالية.

CREATE OR REPLACE FUNCTION public.help_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.help_audit (table_name, row_id, op, actor, old_row, new_row)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS help_qa_audit ON public.help_qa;
CREATE TRIGGER help_qa_audit AFTER INSERT OR UPDATE OR DELETE ON public.help_qa
  FOR EACH ROW EXECUTE FUNCTION public.help_audit_row();

DROP TRIGGER IF EXISTS help_settings_audit ON public.help_settings;
CREATE TRIGGER help_settings_audit AFTER INSERT OR UPDATE OR DELETE ON public.help_settings
  FOR EACH ROW EXECUTE FUNCTION public.help_audit_row();

-- 5) صف الإعدادات لا يُحذف
CREATE OR REPLACE FUNCTION public.help_settings_no_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'help_settings row cannot be deleted';
END;
$$;

DROP TRIGGER IF EXISTS help_settings_protect ON public.help_settings;
CREATE TRIGGER help_settings_protect BEFORE DELETE ON public.help_settings
  FOR EACH ROW EXECUTE FUNCTION public.help_settings_no_delete();


-- The Cloudflare Function only needs SELECT for these configuration reads.
-- Explicit grants also cover projects without Supabase's usual default grants.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.help_settings, public.help_qa TO service_role;

-- Ask PostgREST to discover the tables after the transaction commits.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Expected: one row with id=1. enabled preserves any existing admin choice.
SELECT id, enabled FROM public.help_settings WHERE id = 1;
-- Expected: both true; settings_public_read_policy must be false.
SELECT
  has_table_privilege('service_role', 'public.help_settings', 'SELECT') AS server_can_read_settings,
  has_table_privilege('service_role', 'public.help_qa', 'SELECT') AS server_can_read_qa,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'help_settings'
      AND policyname = 'help_settings_public_read'
  ) AS settings_public_read_policy;
