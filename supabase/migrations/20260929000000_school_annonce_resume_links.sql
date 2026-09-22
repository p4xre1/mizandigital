-- supabase/migrations/20260929000000_school_annonce_resume_links.sql
--
-- ─────────────────────────────────────────────────────────────────────────────
-- الوصلة الثلاثية: الكلية (faculties) ↔ الإعلانات (seminars/news)
--                    ↔ السيرة الذاتية (resumes) عبر طلبات التقديم (applications)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- الخلفية: articles وpdf_summaries تربطان أصلاً بـ faculties عبر faculty_id —
-- هذه الهجرة تكمّل نفس النمط على بقية الجهات الثلاث:
--   §1  seminars + news      ←  faculty_id  (كل إعلان مرتبط بكلية إن اقتصرت)
--   §2  mizan_profiles       ←  faculty_id  (الطالب/المحامي ↔ كليته)
--   §3  resumes (جدول جديد)  ←  سيرة ذاتية واحدة لكل بروفايل، مع ملف CV
--   §4  applications (جدول)  ←  «قدّمت سيرتك على هذا الإعلان» (سيرة → إعلان)
--   §5  وعاء تخزين cv-files  ←  ملفات السير الذاتية (PDF/Word)
--
-- ─ قرار: annonce_id نصي (text) وليس uuid
--   الإعلانات مصدرها ثلاث جهات: seminars/news (CMS — uuid) والفعاليات المحلية
--   events.json (معرفات نصية مثل "comparative-competition-law-2026"). عمود
--   نصي واحد يبقي فهرس الطلبات موحّداً دون جداول وسيطة.
--
-- ─ الخصوصية: cv_file_path يبقى مخفياً من الجمهور عبر RLS على resumes
--   (is_public=false ⇒ لا صف يُرَجَّع ⇒ لا رابط ملف يُكشف). مسار الملف
--   <uid>/<uuid>.pdf غير قابل للتخمين حتى لو حُقق الوصول المباشر للوعاء.
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- §1  الإعلانات ↔ الكلية (نفس نمط articles.faculty_id / pdf_summaries.faculty_id)
-- ============================================================================

ALTER TABLE public.seminars
  ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public.faculties(id) ON DELETE SET NULL;

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public.faculties(id) ON DELETE SET NULL;

-- SchoolPage/AnnoncesPage: استعلام ".eq("faculty_id", ...)"
CREATE INDEX IF NOT EXISTS seminars_faculty_id_idx ON public.seminars (faculty_id);
CREATE INDEX IF NOT EXISTS news_faculty_id_idx ON public.news (faculty_id);

COMMENT ON COLUMN public.seminars.faculty_id IS 'الكلية المنظمة/المستهدفة (faculties.id) — تُغذّي قسم "إعلانات الكلية" في SchoolPage وصفحة /annonces.';
COMMENT ON COLUMN public.news.faculty_id IS 'الكلية المرتبطة بالخبر (faculties.id) — نفس الدور على الأخبار/المباريات/إعلانات التوظيف.';

-- ============================================================================
-- §2  البروفايل ↔ كليته (الطالب ينتمي لكلية ⇒ سيرته "تكون من" تلك الكلية)
-- ============================================================================

ALTER TABLE public.mizan_profiles
  ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public.faculties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS mizan_profiles_faculty_id_idx ON public.mizan_profiles (faculty_id);

COMMENT ON COLUMN public.mizan_profiles.faculty_id IS 'كليتي — faculty_id التي ينتمي إليها صاحب البروفايل (faculties.id). تُستخدم في مطابقة الإعلانات مع السير.';

-- ============================================================================
-- §3  resumes — سيرة ذاتية واحدة لكل بروفايل
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.mizan_profiles(id) ON DELETE CASCADE,
  headline text,
  summary text,
  skills text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  cv_file_path text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.resumes IS 'سير ذاتية مرتبطة بـ mizan_profiles (سيرة واحدة لكل بروفايل). education/experience مصفوفات JSON: [{degree|title, school|company, year|period, details?}].';
COMMENT ON COLUMN public.resumes.cv_file_path IS 'المسار داخل وعاء cv-files بصيغة <uid>/<uuid>.pdf|docx — يُعرض فقط إذا كان is_public=true.';
COMMENT ON COLUMN public.resumes.is_public IS 'نشر السيرة في /resume/<username> وفي فلاتر /annonces (المطابقة).';

CREATE INDEX IF NOT EXISTS resumes_is_public_idx ON public.resumes (is_public) WHERE is_public = true;

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- المالك: كل الصلاحيات على سيرته (الاتفاق عبر mizan_profiles.owner_id = auth.uid()،
-- نفس نمط mizan_profiles_owner_write في 20260914000000).
DROP POLICY IF EXISTS "resumes_owner_all" ON public.resumes;
CREATE POLICY "resumes_owner_all"
  ON public.resumes FOR ALL
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.mizan_profiles WHERE owner_id = (SELECT auth.uid())))
  WITH CHECK (profile_id IN (SELECT id FROM public.mizan_profiles WHERE owner_id = (SELECT auth.uid())));

-- الجمهور: قراءة السير المنشورة فقط.
DROP POLICY IF EXISTS "resumes_public_read" ON public.resumes;
CREATE POLICY "resumes_public_read"
  ON public.resumes FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- ============================================================================
-- §4  applications — طلبات التقديم (سيرة → إعلان)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.mizan_profiles(id) ON DELETE CASCADE,
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  annonce_type text NOT NULL CHECK (annonce_type IN ('event'::text, 'seminar'::text, 'news'::text)),
  annonce_id text NOT NULL,
  annonce_title text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status IN ('pending'::text, 'viewed'::text, 'shortlisted'::text, 'rejected'::text)),
  note text,
  applied_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT applications_one_per_annonce UNIQUE (profile_id, annonce_type, annonce_id)
);

COMMENT ON TABLE public.applications IS '«قدّمت سيرتك» — كل صف طلب تقديم سيرة (resumes) على إعلان (event محلي أو seminar/news من CMS).';
COMMENT ON COLUMN public.applications.annonce_id IS 'معرّف الإعلان في مصدره: uuid لـ seminars/news، أو المعرّف النصي للفعاليات المحلية (events.json).';

CREATE INDEX IF NOT EXISTS applications_annonce_idx ON public.applications (annonce_type, annonce_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications (status);
CREATE INDEX IF NOT EXISTS applications_profile_idx ON public.applications (profile_id);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- صاحب الطلب: يُنشئ ويقرأ ويحذف طلباته فقط.
DROP POLICY IF EXISTS "applications_owner_insert" ON public.applications;
CREATE POLICY "applications_owner_insert"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM public.mizan_profiles WHERE owner_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "applications_owner_select" ON public.applications;
CREATE POLICY "applications_owner_select"
  ON public.applications FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.mizan_profiles WHERE owner_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "applications_owner_delete" ON public.applications;
CREATE POLICY "applications_owner_delete"
  ON public.applications FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.mizan_profiles WHERE owner_id = (SELECT auth.uid())));

-- الطاقم: قراءة كل بروفايلات mizan_profiles — ضرورية لعرض أسماء مقدّمي
-- الطلبات في applications (embed عبر profile_id). قراءة فقط؛ الكتابة تبقى
-- للمالك وحده (مبدأ عدم توسيع صلاحيات الكتابة بلا ضرورة).
DROP POLICY IF EXISTS "mizan_profiles_staff_read" ON public.mizan_profiles;
CREATE POLICY "mizan_profiles_staff_read"
  ON public.mizan_profiles FOR SELECT
  TO authenticated
  USING ((SELECT p.admin_god_mode FROM public.profiles p WHERE p.id = (SELECT auth.uid())) IS TRUE);

-- الطاقم: قراءة كل الطلبات + تحديث الحالة (pending/viewed/shortlisted/rejected).
-- نفس نمط «staff read» في interaction_tracking (20260911030000): admin_god_mode
-- وليس get_auth_role() — role فيه قيمة افتراضية 'editor' تمرّر الجميع.
DROP POLICY IF EXISTS "applications_staff_read" ON public.applications;
CREATE POLICY "applications_staff_read"
  ON public.applications FOR SELECT
  TO authenticated
  USING ((SELECT p.admin_god_mode FROM public.profiles p WHERE p.id = (SELECT auth.uid())) IS TRUE);

DROP POLICY IF EXISTS "applications_staff_update" ON public.applications;
CREATE POLICY "applications_staff_update"
  ON public.applications FOR UPDATE
  TO authenticated
  USING ((SELECT p.admin_god_mode FROM public.profiles p WHERE p.id = (SELECT auth.uid())) IS TRUE)
  WITH CHECK ((SELECT p.admin_god_mode FROM public.profiles p WHERE p.id = (SELECT auth.uid())) IS TRUE);

-- ============================================================================
-- §5  وعاء التخزين cv-files
--       5MB + قائمة MIME بيضاء (PDF/Word) — سير ذاتية، لا فيديو.
--       المالك يرفع/يمسح داخل مجلده <uid>/، والوعاء عام لقراءة السير
--       المنشورة (خصوصية السيرة مفروضة على مستوى صف resumes لا الملف).
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cv-files', 'cv-files', true, 5242880, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cv_files_owner_upload" ON storage.objects;
CREATE POLICY "cv_files_owner_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cv-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "cv_files_owner_delete" ON storage.objects;
CREATE POLICY "cv_files_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cv-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "cv_files_public_read" ON storage.objects;
CREATE POLICY "cv_files_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'cv-files');
