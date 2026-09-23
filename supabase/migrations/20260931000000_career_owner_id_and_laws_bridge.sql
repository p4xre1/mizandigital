-- supabase/migrations/20260931000000_career_owner_id_and_laws_bridge.sql
--
-- ─────────────────────────────────────────────────────────────────────────────
-- تصحيح معماري لجداول «تدريبي المهني» + جسر المسارات ↔ أرشيف القوانين
-- ─────────────────────────────────────────────────────────────────────────────
-- §0  توحيد اصطلاح الملكية: owner_id بدل user_id (الاصطلاح الحديث في
--     20260924+ : owner_id uuid not null default auth.uid())
-- §1  career_training_profiles → owner_id + مفتاح أساسي (owner_id, career_slug)
-- §2  career_training_progress  → owner_id + weak_topics jsonb + قيود النطاق
-- §3  سياسات RLS موحّدة باسم واحد لكل جدول (FOR ALL, owner_id = auth.uid())
-- §4  career_laws — جسر اختياري بين مسار مهني ونص قانوني من public.laws
--
-- ─ قرارات مثبتة هنا (وليست اختيارات تحريرية):
--   • لا يُنشأ جدول `careers`: محتوى المسارات تحريري في src/data/careers.json،
--     والجسر إلى القوانين هو العلاقة الوحيدة التي تحتاج قاعدة بيانات.
--   • career_laws يحمل `career_slug text` (لا FK): المسار ليس صفاً في جدول.
--   • law_id uuid يشير إلى public.laws(id) — النصوص القانونية فقط هي التي
--     تُعرَّف بمعرّفات صفوف (uuid) في هذا المخطط.
--   • لا يحمل أي جدول هنا مدرستاً/كلية: `public.schools.id` من نوع text، وأي
--     علاقة لاحقة بالكليات تُكتب `school_id text references public.schools(id)`.
--     (لا يوجد جدول محفوظات مدارس في هذه النسخة: الترشيح يُحسب محلياً.)
--   • لا سنّ ولا عنوان ولا GPS ولا احتمال قبول ولا استنتاج أهلية في أي عمود.
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- §1  career_training_profiles — نقل الملكية إلى owner_id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'career_training_profiles'
      AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'career_training_profiles'
      AND column_name = 'owner_id'
  ) THEN
    -- إعادة التسمية تحفظ البيانات والأصفار كما هي (لا حذف ولا إعادة إنشاء).
    ALTER TABLE public.career_training_profiles RENAME COLUMN user_id TO owner_id;
  END IF;
END $$;

-- القيمة الافتراضية من الجلسة: الكتابة من العميل لا تحتاج تمرير المعرّف يدوياً
-- (ولا تستطيع انتحال معرّف غيره بذلك).
ALTER TABLE public.career_training_profiles
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- المفتاح الأساسي: (owner_id, career_slug) بدل عمود id لا معنى له في هذا الجدول.
DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT conname INTO pk_name
  FROM pg_constraint
  WHERE conrelid = 'public.career_training_profiles'::regclass
    AND contype = 'p';

  IF pk_name IS NOT NULL AND pk_name <> 'career_training_profiles_pkey_v2' THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'career_training_profiles' AND column_name = 'id'
    ) THEN
      -- الصفوف المكرّرة بحسب (owner_id, career_slug) مستحيلة قبل هذا التغيير
      -- بسبب قيد UNIQUE السابق؛ ومع ذلك نحذف النسخ الأدنى إن وُجدت.
      DELETE FROM public.career_training_profiles d
      USING public.career_training_profiles k
      WHERE d.ctid < k.ctid
        AND d.owner_id = k.owner_id
        AND d.career_slug = k.career_slug;
    END IF;

    ALTER TABLE public.career_training_profiles DROP CONSTRAINT IF EXISTS career_training_profiles_one_per_career;
    ALTER TABLE public.career_training_profiles DROP CONSTRAINT IF EXISTS career_training_profiles_pkey;
    ALTER TABLE public.career_training_profiles ADD CONSTRAINT career_training_profiles_pkey_v2 PRIMARY KEY (owner_id, career_slug);
  END IF;
END $$;

-- العمود البديل لم يعد ضرورياً؛ يُسقط بعد أن صار المفتاح الأساسي مركّباً.
ALTER TABLE public.career_training_profiles DROP COLUMN IF EXISTS id;

-- قيد طول المعرّف النصي للمسار (نفس معرّفات /careers/<slug>).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.career_training_profiles'::regclass
      AND conname = 'career_training_profiles_slug_len'
  ) THEN
    ALTER TABLE public.career_training_profiles
      ADD CONSTRAINT career_training_profiles_slug_len
      CHECK (char_length(btrim(career_slug)) >= 2);
  END IF;
END $$;

COMMENT ON COLUMN public.career_training_profiles.owner_id IS 'صاحب الصف — auth.uid() بقيمة افتراضية، ولا وجود لصف بلا مالك.';
COMMENT ON COLUMN public.career_training_profiles.career_slug IS 'معرّف المسار في src/data/careers.json (id == slug). لا مفتاح أجنبي: الدليل ملفات تحريرية.';

-- ============================================================================
-- §2  career_training_progress — نقل الملكية + ضبط القيود
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'career_training_progress'
      AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'career_training_progress'
      AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.career_training_progress RENAME COLUMN user_id TO owner_id;
  END IF;
END $$;

ALTER TABLE public.career_training_progress
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- weak_topics: من مصفوفة نصية إلى jsonb (نفس الشكل الذي يكتبه العميل ويقرؤه
-- بلا تحويل)، والبيانات القائمة تُحوَّل في مكانها.
DO $$
DECLARE
  current_type text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'career_training_progress'
    AND column_name = 'weak_topics';

  IF current_type = 'ARRAY' THEN
    -- القيمة الافتراضية القديمة ('{}'::text[]) لا تُحوَّل تلقائياً إلى jsonb،
    -- فتُسقَط قبل تغيير النوع ثم تُعاد بالشكل الجديد.
    ALTER TABLE public.career_training_progress ALTER COLUMN weak_topics DROP DEFAULT;
    ALTER TABLE public.career_training_progress
      ALTER COLUMN weak_topics TYPE jsonb USING to_jsonb(weak_topics);
    ALTER TABLE public.career_training_progress
      ALTER COLUMN weak_topics SET DEFAULT '[]'::jsonb;
  ELSE
    ALTER TABLE public.career_training_progress
      ALTER COLUMN weak_topics SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.career_training_progress'::regclass
      AND conname = 'career_training_progress_weak_topics_array'
  ) THEN
    ALTER TABLE public.career_training_progress
      ADD CONSTRAINT career_training_progress_weak_topics_array
      CHECK (jsonb_typeof(weak_topics) = 'array');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.career_training_progress'::regclass
      AND conname = 'career_training_progress_slug_len'
  ) THEN
    ALTER TABLE public.career_training_progress
      ADD CONSTRAINT career_training_progress_slug_len
      CHECK (char_length(btrim(career_slug)) >= 2);
  END IF;
END $$;

DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT conname INTO pk_name
  FROM pg_constraint
  WHERE conrelid = 'public.career_training_progress'::regclass
    AND contype = 'p';

  IF pk_name IS NOT NULL AND pk_name <> 'career_training_progress_pkey_v2' THEN
    DELETE FROM public.career_training_progress d
    USING public.career_training_progress k
    WHERE d.ctid < k.ctid
      AND d.owner_id = k.owner_id
      AND d.career_slug = k.career_slug;

    ALTER TABLE public.career_training_progress DROP CONSTRAINT IF EXISTS career_training_progress_one_per_career;
    ALTER TABLE public.career_training_progress DROP CONSTRAINT IF EXISTS career_training_progress_pkey;
    ALTER TABLE public.career_training_progress ADD CONSTRAINT career_training_progress_pkey_v2 PRIMARY KEY (owner_id, career_slug);
  END IF;
END $$;

ALTER TABLE public.career_training_progress DROP COLUMN IF EXISTS id;

COMMENT ON COLUMN public.career_training_progress.weak_topics IS 'مصفوفة JSON بمعرّفات مصطلحات القاموس التي تحتاج مراجعة — أسماء مصطلحات لا نصوص أسئلة.';

-- ============================================================================
-- §3  سياسات RLS موحّدة (اسم واحد لكل جدول، FOR ALL، owner_id = auth.uid())
-- ============================================================================

ALTER TABLE public.career_training_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_training_progress ENABLE ROW LEVEL SECURITY;

-- تنظيف سياسات الاسم القديم إن وُجدت (كانت أربع سياسات منفصلة بـ user_id).
DROP POLICY IF EXISTS "career_training_profiles_owner_select" ON public.career_training_profiles;
DROP POLICY IF EXISTS "career_training_profiles_owner_insert" ON public.career_training_profiles;
DROP POLICY IF EXISTS "career_training_profiles_owner_update" ON public.career_training_profiles;
DROP POLICY IF EXISTS "career_training_profiles_owner_delete" ON public.career_training_profiles;
DROP POLICY IF EXISTS "career_training_progress_owner_select" ON public.career_training_progress;
DROP POLICY IF EXISTS "career_training_progress_owner_insert" ON public.career_training_progress;
DROP POLICY IF EXISTS "career_training_progress_owner_update" ON public.career_training_progress;
DROP POLICY IF EXISTS "career_training_progress_owner_delete" ON public.career_training_progress;

DROP POLICY IF EXISTS "users_manage_own_career_training_profiles" ON public.career_training_profiles;
CREATE POLICY "users_manage_own_career_training_profiles"
  ON public.career_training_profiles
  FOR ALL
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_manage_own_career_training_progress" ON public.career_training_progress;
CREATE POLICY "users_manage_own_career_training_progress"
  ON public.career_training_progress
  FOR ALL
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- لا سياسة لـ anon إطلاقاً: الزائر لا يقرأ ولا يكتب أي صف.
REVOKE ALL ON public.career_training_profiles, public.career_training_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.career_training_profiles, public.career_training_progress
  TO authenticated;
GRANT ALL
  ON public.career_training_profiles, public.career_training_progress
  TO service_role;

-- ============================================================================
-- §4  career_laws — جسر المسار المهني ↔ النص القانوني في أرشيف public.laws
-- ============================================================================
-- المحتوى التحريري للمسارات يبقى في src/data/careers.json، وهذا الجدول اختياري:
-- يُملأ عندما يوجد النص فعلاً في الأرشيف (public.laws)، فلا رابط مُفترض ولا
-- نص مُخترع. غياب الصف = «بانتظار الإضافة إلى أرشيف ميزان» في الواجهة.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.career_laws (
  career_slug text NOT NULL,
  law_id uuid NOT NULL REFERENCES public.laws(id) ON DELETE RESTRICT,
  relationship_type text NOT NULL DEFAULT 'governing_framework'
    CHECK (
      relationship_type IN (
        'governing_framework',
        'access_conditions',
        'training',
        'professional_ethics',
        'public_employment',
        'annual_notice_reference'
      )
    ),
  note_ar text NOT NULL DEFAULT '',
  source_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (career_slug, law_id),
  CONSTRAINT career_laws_slug_len CHECK (char_length(btrim(career_slug)) >= 2)
);

COMMENT ON TABLE public.career_laws IS 'جسر اختياري: أي نص قانوني من أرشيف public.laws ينظم أي مسار مهني (career_slug من src/data/careers.json).';
COMMENT ON COLUMN public.career_laws.career_slug IS 'معرّف المسار التحريري (لا FK: المسارات ملفات في src/data/careers.json وليست صفوفاً في قاعدة البيانات).';
COMMENT ON COLUMN public.career_laws.source_verified_at IS 'تاريخ التحقق من أن النص المنشور في الأرشيف هو النص النافذ — يبقى null حتى يوثّق يدوياً.';

-- فهرس على law_id: المفتاح المركّب يخدم الاستعلام بالمسار، وفهرس ثانٍ مطلوب
-- للاستعلام بالاتجاه المعاكس (أي مسار ينظمه هذا النص).
CREATE INDEX IF NOT EXISTS career_laws_law_id_idx ON public.career_laws (law_id);

ALTER TABLE public.career_laws ENABLE ROW LEVEL SECURITY;

-- قراءة عامة: هذه بيانات مرجعية منشورة، والزائر يجب أن يرى نفس ما يرى المسجّل.
DROP POLICY IF EXISTS "career_laws_public_read" ON public.career_laws;
CREATE POLICY "career_laws_public_read"
  ON public.career_laws FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.career_laws FROM anon, authenticated;
GRANT SELECT ON public.career_laws TO anon, authenticated;
GRANT ALL ON public.career_laws TO service_role;
