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
