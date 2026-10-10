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
