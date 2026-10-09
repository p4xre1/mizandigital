-- 20261011000000_cv_files_private_bucket.sql
--
-- [CV-01] وعاء cv-files كان public = true، وسياسة cv_files_public_read تمنح anon و authenticated
-- قراءة كل الصفوف في storage.objects. النتيجة: أي زائر يستطيع سرد كل السير الذاتية المرفوعة
-- (بأسماء وهواتف وبريد أصحابها) حتى غير المنشورة، عبر واجهة التخزين وبمفتاح anon العام.
--
-- الشرط المقصود في التصميم (انظر 20260929000000، التعليق على resumes.cv_file_path):
--   الملف يُعرض للجمهور فقط إذا كان resumes.is_public = true لصف السيرة نفسه.
--   وصاحب الملف يقرأ ملفه دائماً داخل مجلده <uid>/...
--
-- ما يفعله هذا الترحيل:
--   1) يجعل الوعاء خاصاً (public = false). لا يحذف أي ملف ولا أي صف.
--   2) يحذف سياسة القراءة العامة الشاملة.
--   3) يضيف قراءة للمالك داخل مجلده، وقراءة لملف سيرة منشورة فقط عبر دالة SECURITY DEFINER
--      بمسار بحث مثبَّت.
--
-- ⚠ الأثر على الواجهة: الروابط القديمة من نوع /storage/v1/object/public/cv-files/... تتوقف
-- عن العمل. الواجهة الجديدة تستعمل createSignedUrl (انظر src/lib/resumes/service.ts). يجب نشر
-- الترحيل والواجهة معاً.
--
-- الرجوع: لا يوجد رجوع مكتوب في هذا الملف (قرار المالك). أي خلل يُصلح بترحيل جديد إلى الأمام.
-- إعادة فتح الوعاء للجمهور تحتاج قراراً مكتوباً خارج هذا الملف، لأنها تعيد تسريب السير الذاتية.
-- ============================================================================

-- الدالة تُعرّف خارج كتلة الشرط لتكون متاحة لسياسة الوعاء. مسار البحث مثبّت (DB-03).
-- هي تُرجع بولياً واحداً عن مسار معروف فقط؛ لا تسرد شيئاً.
CREATE OR REPLACE FUNCTION public.cv_object_is_published(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF to_regclass('public.resumes') IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.resumes r
    WHERE r.cv_file_path = p_name AND r.is_public = true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cv_object_is_published(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cv_object_is_published(text) TO anon, authenticated;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage schema غير موجود: تخطّي سياسات cv-files';
    RETURN;
  END IF;

  -- 1) الوعاء خاص
  UPDATE storage.buckets SET public = false WHERE id = 'cv-files';

  -- 2) إزالة القراءة العامة الشاملة
  DROP POLICY IF EXISTS "cv_files_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "cv_files_public_resume_read" ON storage.objects;
  DROP POLICY IF EXISTS "cv_files_owner_read" ON storage.objects;

  -- 3a) المالك يقرأ ملفاته داخل مجلده
  CREATE POLICY "cv_files_owner_read"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'cv-files'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

  -- 3b) ملف سيرة منشورة فقط
  CREATE POLICY "cv_files_public_resume_read"
    ON storage.objects FOR SELECT TO anon, authenticated
    USING (
      bucket_id = 'cv-files'
      AND public.cv_object_is_published(name)
    );
END $$;
