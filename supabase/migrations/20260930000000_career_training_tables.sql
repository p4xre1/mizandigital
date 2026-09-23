-- supabase/migrations/20260930000000_career_training_tables.sql
--
-- ─────────────────────────────────────────────────────────────────────────────
-- «تدريبي المهني» — جدولا متابعة المسارات المهنية وتقدّم التدريب
-- ─────────────────────────────────────────────────────────────────────────────
-- الخلفية: دليل /careers واختباراته التعليمية لا يحتاجان أي جدول جديد
-- (الأسئلة في JSON + جدول quiz_questions القائم، والمحاولات في quiz_attempts
-- القائم بوسم label = 'career:<slug>' أو 'competition:<id>'). لكن تبويب
-- «تدريبي المهني» في /profile يحتاج حالتين خاصتين بالمستخدم نفسه:
--   §1  career_training_profiles  — المسارات التي أضافها الطالب إلى ملفه
--   §2  career_training_progress  — ملخّص تقدّم مشتقّ (قابل لإعادة البناء من
--       quiz_attempts، ويُحفظ لتسريع عرض اللوحة بلا إعادة حساب كل مرة)
--
-- ─ الخصوصية (قرار تصميمي مُلزم):
--   • كل صف مقيّد بـ RLS على `auth.uid() = user_id` — لا قراءة ولا كتابة لغير
--     صاحب الصف، ولا سياسة لـ anon إطلاقاً (الزائر لا يكتب شيئاً).
--   • لا تُخزَّن هنا أي معلومة عن أهلية أو احتمال قبول أو نجاح، ولا سنّ ولا
--     عنوان ولا رقم هاتف: أعمدة التقدّم أرقام جلسات ونسبة أفضل نتيجة فقط.
--   • هذه الجداول لا تُقرأ من mizan_profiles ولا تُنشر في /u/<username>
--     مطلقاً — التدريب خاصّ بصاحبه حتى لو كان بروفايله عاماً.
--
-- ⚠️ ملاحظة تصحيحية: هذه الهجرة أنشأت العمودين بـ `user_id`، وقد صُحّح
-- الاصطلاح إلى `owner_id` (مع مفتاح أساسي مركّب وقيود أدق) في الهجرة
-- اللاحقة 20260931000000_career_owner_id_and_laws_bridge.sql — التي تنقل
-- البيانات بلا فقدان وتُعيد بناء السياسات باسم موحّد. اقرأ الهجرتين معاً.
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- §1  career_training_profiles — «أضفت هذا المسار إلى تدريبي»
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.career_training_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- معرّف المسار كما في src/data/careers.json (id == slug، بأحرف صغيرة وشرطات)
  career_slug text NOT NULL CHECK (career_slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  is_following boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  last_practiced_at timestamptz,
  CONSTRAINT career_training_profiles_one_per_career UNIQUE (user_id, career_slug)
);

COMMENT ON TABLE public.career_training_profiles IS 'المسارات المهنية التي أضافها المستخدم إلى «تدريبي المهني» — صف واحد لكل (مستخدم، مسار)، مقيّد بـ RLS على auth.uid() = user_id.';
COMMENT ON COLUMN public.career_training_profiles.career_slug IS 'معرّف المسار في src/data/careers.json (نفس القيمة في canonical_url /careers/<slug>). لا مفتاح أجنبي: الدليل ملفات JSON لا جدول.';
COMMENT ON COLUMN public.career_training_profiles.is_following IS 'إزالة المسار من القائمة تُبقي الصف بقيمة false (لا حذف) حتى لا تفقد لوحة التدريب سجلّها.';

CREATE INDEX IF NOT EXISTS career_training_profiles_user_idx
  ON public.career_training_profiles (user_id);

ALTER TABLE public.career_training_profiles ENABLE ROW LEVEL SECURITY;

-- المالك وحده: قراءة وكتابة وتعديل وحذف صفوفه.
DROP POLICY IF EXISTS "career_training_profiles_owner_select" ON public.career_training_profiles;
CREATE POLICY "career_training_profiles_owner_select"
  ON public.career_training_profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "career_training_profiles_owner_insert" ON public.career_training_profiles;
CREATE POLICY "career_training_profiles_owner_insert"
  ON public.career_training_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "career_training_profiles_owner_update" ON public.career_training_profiles;
CREATE POLICY "career_training_profiles_owner_update"
  ON public.career_training_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "career_training_profiles_owner_delete" ON public.career_training_profiles;
CREATE POLICY "career_training_profiles_owner_delete"
  ON public.career_training_profiles FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- §2  career_training_progress — ملخّص تقدّم مشتقّ لكل مسار
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.career_training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_slug text NOT NULL CHECK (career_slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  attempted_count integer NOT NULL DEFAULT 0 CHECK (attempted_count >= 0 AND attempted_count <= 10000),
  completed_count integer NOT NULL DEFAULT 0 CHECK (completed_count >= 0 AND completed_count <= 10000),
  best_score integer CHECK (best_score IS NULL OR (best_score >= 0 AND best_score <= 100)),
  -- معرّفات مصطلحات المعجم التي أخطأ فيها المستخدم (lexicon.json ids) — أسماء
  -- مصطلحات لا أسئلة ولا نصوص إجابات: لا تُخزَّن محتويات المحاولة هنا.
  weak_topics text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT career_training_progress_one_per_career UNIQUE (user_id, career_slug)
);

COMMENT ON TABLE public.career_training_progress IS 'ملخّص تقدّم تعليمي مشتقّ لكل مسار (أرقام فقط) — يُبنى من quiz_attempts ويمكن إعادة حسابه؛ مقيّد بـ RLS على auth.uid() = user_id.';
COMMENT ON COLUMN public.career_training_progress.best_score IS 'أفضل نسبة (0..100) في اختبارات هذا المسار التعليمية. لا تعني أهلية ولا احتمال قبول.';
COMMENT ON COLUMN public.career_training_progress.weak_topics IS 'معرّفات مصطلحات من القاموس القانوني للمراجعة — لا نصوص أسئلة ولا إجابات.';

CREATE INDEX IF NOT EXISTS career_training_progress_user_idx
  ON public.career_training_progress (user_id);

ALTER TABLE public.career_training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "career_training_progress_owner_select" ON public.career_training_progress;
CREATE POLICY "career_training_progress_owner_select"
  ON public.career_training_progress FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "career_training_progress_owner_insert" ON public.career_training_progress;
CREATE POLICY "career_training_progress_owner_insert"
  ON public.career_training_progress FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "career_training_progress_owner_update" ON public.career_training_progress;
CREATE POLICY "career_training_progress_owner_update"
  ON public.career_training_progress FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "career_training_progress_owner_delete" ON public.career_training_progress;
CREATE POLICY "career_training_progress_owner_delete"
  ON public.career_training_progress FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- §3  الصلاحيات (GRANT) — المسجّل فقط؛ ولا شيء لـ anon
-- ============================================================================
-- ملاحظة: سياسات RLS أعلاه هي خط الدفاع الأول، والـ GRANT هنا يمنع حتى وصل
-- الجدول نفسه لغير المسجّل (نفس نمط 20260928000000_pro_legal_tools.sql).

REVOKE ALL ON public.career_training_profiles, public.career_training_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.career_training_profiles, public.career_training_progress
  TO authenticated;
GRANT ALL
  ON public.career_training_profiles, public.career_training_progress
  TO service_role;
