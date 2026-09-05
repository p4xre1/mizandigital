-- إصلاح عدّاد التحميلات في الأرشيف العام:
--
-- 1) جدول "laws" (النصوص القانونية) لم يكن يملك عمود download_count إطلاقاً،
--    لذا كانت واجهة الأرشيف (ArchivePage) تعرض "0 تحميل" دائماً لهذه العناصر
--    بغض النظر عن عدد التحميلات الفعلية. نضيف العمود ودالة RPC مطابقة تماماً
--    لِـ increment_pdf_downloads المستخدمة أصلاً مع pdf_summaries.
--
-- 2) الملفات المحلية الثابتة (docs.json، المرفقة داخل المستودع) لا تملك أي
--    سجل مرجعي في قاعدة البيانات، لذا لم يكن هناك أي آلية لتتبّع تحميلاتها.
--    نضيف جدولاً مخصصاً "local_pdf_downloads" (مفتاحه slug الملف الفريد) مع
--    دالة RPC لزيادة العدّاد بأمان من الواجهة العامة.

-- 1) عمود عدّاد التحميلات على جدول laws
ALTER TABLE public.laws ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_law_downloads(p_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  new_count integer;
begin
  update public.laws
    set download_count = coalesce(download_count, 0) + 1
    where id = p_id
    returning download_count into new_count;
  return new_count;
end;
$$;

ALTER FUNCTION public.increment_law_downloads(uuid) OWNER TO postgres;

COMMENT ON FUNCTION public.increment_law_downloads(uuid) IS '@supabase-linter-ignore 0028_anon_security_definer_function_executable
   @supabase-linter-ignore 0029_authenticated_security_definer_function_executable';

-- الدالة عامة عمداً (يستدعيها الموقع العام)، لكنها لا تُعدّل سوى صف العدّاد المطلوب
REVOKE EXECUTE ON FUNCTION public.increment_law_downloads(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_law_downloads(uuid) TO anon, authenticated;

-- 2) جدول + دالة عدّاد تحميلات الملفات المحلية الثابتة (docs.json)
CREATE TABLE IF NOT EXISTS public.local_pdf_downloads (
  slug text PRIMARY KEY,
  download_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.local_pdf_downloads OWNER TO postgres;
ALTER TABLE public.local_pdf_downloads ENABLE ROW LEVEL SECURITY;

-- القراءة عامة (تُعرَض الأعداد في صفحة الأرشيف للجميع)؛ لا سياسات INSERT/UPDATE
-- مباشرة من العميل — التعديل الوحيد المسموح به يمر عبر الدالة أدناه فقط.
DROP POLICY IF EXISTS "local_pdf_downloads_public_read" ON public.local_pdf_downloads;
CREATE POLICY "local_pdf_downloads_public_read"
ON public.local_pdf_downloads FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.increment_local_pdf_downloads(p_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  new_count integer;
begin
  insert into public.local_pdf_downloads (slug, download_count, updated_at)
  values (p_slug, 1, now())
  on conflict (slug)
  do update set
    download_count = public.local_pdf_downloads.download_count + 1,
    updated_at = now()
  returning download_count into new_count;
  return new_count;
end;
$$;

ALTER FUNCTION public.increment_local_pdf_downloads(text) OWNER TO postgres;

COMMENT ON FUNCTION public.increment_local_pdf_downloads(text) IS '@supabase-linter-ignore 0028_anon_security_definer_function_executable
   @supabase-linter-ignore 0029_authenticated_security_definer_function_executable';

REVOKE EXECUTE ON FUNCTION public.increment_local_pdf_downloads(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_local_pdf_downloads(text) TO anon, authenticated;
