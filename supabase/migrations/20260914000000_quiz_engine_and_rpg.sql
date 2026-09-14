-- 20260914000000_quiz_engine_and_rpg.sql
-- -----------------------------------------------------------------------
-- محور الاختبارات (The 4-Tier Quiz System) + نظام الرتب والألعاب (RPG)
--
-- ثلاثة جداول جديدة:
--   1) quiz_questions  — بنك الأسئلة الموصول بلوحة التحكم (CMS)
--   2) quiz_attempts   — سجل محاولات المستخدمين (للمزامنة ولوحة المتصدرين)
--   3) mizan_profiles  — البروفايل العام القابل للمشاركة (mizan.page/u/:username)
--
-- ملاحظة معمارية (مهمة): بنك الأسئلة المحلي فـ src/data/quiz-questions.json
-- يبقى هو المصدر الأساسي للتشغيل — الموقع يعمل كاملاً حتى لو كان هذا الجدول
-- فارغاً أو غير متاح. الأسئلة المضافة من لوحة التحكم (/admin/quizzes) تُحفظ
-- هنا وتُدمج مع البنك المحلي وقت العرض (شوف src/lib/quiz/repository.ts).
--
-- الأمان: نفعّل RLS على الجداول الثلاثة. القراءة العمومية مسموحة فقط
-- للمحتوى المنشور (is_published / is_public)، والكتابة محصورة في الإدارة
-- عبر الدالة public.is_admin() الموجودة سلفاً
-- (ترقية 20260904120000_fix_admin_authorization_and_rls.sql).
-- -----------------------------------------------------------------------

BEGIN;

/* =====================================================================
   1) بنك الأسئلة — quiz_questions
   ===================================================================== */

CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- معرّف نصّي ثابت ومقروء (مثال: uni-s1-intro-01). يسمح بمزامنة بنك
    -- الأسئلة المحلي مع قاعدة البيانات بلا تكرار، ويمنع تعارض المعرّفات
    -- عند تصدير/استيراد الأسئلة بين البيئات.
    "slug" text NOT NULL UNIQUE,
    "tier" text NOT NULL,
    "semester" text NULL,
    "module" text NULL,
    "body" text NULL,
    "track" text NULL,
    "difficulty" text NOT NULL DEFAULT 'medium',
    "question" text NOT NULL,
    -- مصفوفة نصية من أربعة خيارات بالضبط (يُتحقق منها أيضاً في الواجهة)
    "options" jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- فهرس الخيار الصحيح داخل options (من 0 إلى 3)
    "answer" integer NOT NULL DEFAULT 0,
    "explanation" text NOT NULL,
    "reference" text NULL,
    "is_published" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "quiz_questions_tier_check" CHECK (
        "tier" = ANY (ARRAY['university'::text, 'general'::text, 'concours'::text, 'interview'::text])
    ),
    CONSTRAINT "quiz_questions_semester_check" CHECK (
        "semester" IS NULL OR "semester" = ANY (ARRAY['S1'::text, 'S2'::text, 'S3'::text, 'S4'::text, 'S5'::text, 'S6'::text])
    ),
    CONSTRAINT "quiz_questions_difficulty_check" CHECK (
        "difficulty" = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])
    ),
    CONSTRAINT "quiz_questions_answer_range_check" CHECK ("answer" >= 0 AND "answer" <= 3),
    CONSTRAINT "quiz_questions_body_check" CHECK (
        "body" IS NULL OR "body" = ANY (ARRAY['police'::text, 'auxiliary'::text, 'customs'::text, 'judiciary'::text, 'civil_service'::text, 'general'::text])
    ),
    CONSTRAINT "quiz_questions_track_check" CHECK (
        "track" IS NULL OR "track" = ANY (ARRAY['internship'::text, 'job'::text, 'ethics'::text, 'softskills'::text])
    )
);

ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "quiz_questions_tier_idx" ON "public"."quiz_questions" USING btree ("tier");
CREATE INDEX IF NOT EXISTS "quiz_questions_semester_idx" ON "public"."quiz_questions" USING btree ("semester");
CREATE INDEX IF NOT EXISTS "quiz_questions_published_idx" ON "public"."quiz_questions" USING btree ("is_published");

-- تحديث updated_at تلقائياً (نفس اصطلاح باقي الجداول في هذا المشروع)
CREATE OR REPLACE FUNCTION "public"."set_quiz_questions_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "set_quiz_questions_updated_at" ON "public"."quiz_questions";
CREATE TRIGGER "set_quiz_questions_updated_at"
    BEFORE UPDATE ON "public"."quiz_questions"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."set_quiz_questions_updated_at"();

/* =====================================================================
   2) سجل المحاولات — quiz_attempts
   ===================================================================== */

CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- معرّف Clerk للمستخدم (نص "user_xxx") حين يكون مسجلاً عبر Clerk،
    -- أو معرّف Supabase حين يكون موصولاً بلوحة التحكم. الحقل اختياري
    -- لأن الاختبارات تعمل أصلاً للمستخدم غير المسجل (تخزين محلي).
    "user_ref" text NULL,
    "mode" text NOT NULL,
    "label" text NULL,
    "total" integer NOT NULL DEFAULT 0,
    "correct" integer NOT NULL DEFAULT 0,
    "score" integer NOT NULL DEFAULT 0,
    "xp_earned" integer NOT NULL DEFAULT 0,
    "credits_earned" integer NOT NULL DEFAULT 0,
    "best_streak" integer NOT NULL DEFAULT 0,
    "duration_ms" bigint NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "quiz_attempts_mode_check" CHECK (
        "mode" = ANY (ARRAY['university'::text, 'general'::text, 'concours'::text, 'interview'::text, 'placement'::text])
    ),
    CONSTRAINT "quiz_attempts_score_range_check" CHECK ("score" >= 0 AND "score" <= 100)
);

ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "quiz_attempts_user_ref_idx" ON "public"."quiz_attempts" USING btree ("user_ref");
CREATE INDEX IF NOT EXISTS "quiz_attempts_created_at_idx" ON "public"."quiz_attempts" USING btree ("created_at" DESC);

/* =====================================================================
   3) البروفايل العام ونظام الرتب — mizan_profiles
   ===================================================================== */

CREATE TABLE IF NOT EXISTS "public"."mizan_profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- صاحب البروفايل: إما حساب Supabase (لوحة التحكم/الإدارة) أو مستخدم Clerk.
    "owner_id" uuid NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "clerk_user_id" text NULL UNIQUE,
    -- اسم المستخدم في الرابط العام: mizan.page/u/:username
    "username" text NOT NULL UNIQUE,
    "display_name" text NOT NULL,
    "role" text NOT NULL DEFAULT 'student',
    "semester" text NULL,
    "years_of_experience" integer NULL,
    "interests" text[] NOT NULL DEFAULT '{}',
    "city" text NULL,
    "bio" text NULL,
    -- نظام الألعاب (RPG)
    "xp" integer NOT NULL DEFAULT 0,
    "credits" integer NOT NULL DEFAULT 0,
    "rank" text NOT NULL DEFAULT 'D',
    "badges" text[] NOT NULL DEFAULT '{}',
    "streak_days" integer NOT NULL DEFAULT 0,
    "placement_completed" boolean NOT NULL DEFAULT false,
    "is_public" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "mizan_profiles_role_check" CHECK (
        "role" = ANY (ARRAY['student'::text, 'lawyer'::text, 'citizen'::text])
    ),
    CONSTRAINT "mizan_profiles_semester_check" CHECK (
        "semester" IS NULL OR "semester" = ANY (ARRAY['S1'::text, 'S2'::text, 'S3'::text, 'S4'::text, 'S5'::text, 'S6'::text])
    ),
    CONSTRAINT "mizan_profiles_rank_check" CHECK (
        "rank" = ANY (ARRAY['D'::text, 'C'::text, 'B'::text, 'A'::text, 'S'::text, 'SS'::text, 'SSS'::text])
    ),
    CONSTRAINT "mizan_profiles_username_format_check" CHECK (
        "username" ~ '^[a-z0-9_]{3,30}$'
    ),
    CONSTRAINT "mizan_profiles_owner_check" CHECK (
        "owner_id" IS NOT NULL OR "clerk_user_id" IS NOT NULL
    )
);

ALTER TABLE "public"."mizan_profiles" OWNER TO "postgres";

CREATE UNIQUE INDEX IF NOT EXISTS "mizan_profiles_username_lower_idx"
    ON "public"."mizan_profiles" USING btree (lower("username"));

CREATE OR REPLACE FUNCTION "public"."set_mizan_profiles_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "set_mizan_profiles_updated_at" ON "public"."mizan_profiles";
CREATE TRIGGER "set_mizan_profiles_updated_at"
    BEFORE UPDATE ON "public"."mizan_profiles"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."set_mizan_profiles_updated_at"();

/* =====================================================================
   4) سياسات الأمان (RLS)
   ===================================================================== */

ALTER TABLE "public"."quiz_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."mizan_profiles" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- quiz_questions: قراءة عمومية للأسئلة المنشورة، وكتابة حصرية للإدارة.
-- الاستثناء (anon select) مقيّد بـ is_published: الأسئلة غير المنشورة
-- (مسودات قيد المراجعة) لا تظهر للزوار ولا تُحسب في بنك الأسئلة.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "quiz_questions_public_read" ON "public"."quiz_questions";
CREATE POLICY "quiz_questions_public_read"
    ON "public"."quiz_questions"
    FOR SELECT
    USING ("is_published" = true);

DROP POLICY IF EXISTS "quiz_questions_admin_write" ON "public"."quiz_questions";
CREATE POLICY "quiz_questions_admin_write"
    ON "public"."quiz_questions"
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- quiz_attempts: الإدراج مفتوح (المحاولات لا تحتوي معطيات شخصية)، والقراءة
-- محصورة في الإدارة — هكذا نبني لوحة المتصدرين لاحقاً بلا سياسة معقدة.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "quiz_attempts_insert" ON "public"."quiz_attempts";
CREATE POLICY "quiz_attempts_insert"
    ON "public"."quiz_attempts"
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_attempts_admin_read" ON "public"."quiz_attempts";
CREATE POLICY "quiz_attempts_admin_read"
    ON "public"."quiz_attempts"
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ---------------------------------------------------------------------
-- mizan_profiles: البروفايلات العمومية مقروءة للجميع (هذا هو الغرض منها:
-- رابط عام يشاركه صاحبه)، وصاحب الحساب يعدّل صفه فقط.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "mizan_profiles_public_read" ON "public"."mizan_profiles";
CREATE POLICY "mizan_profiles_public_read"
    ON "public"."mizan_profiles"
    FOR SELECT
    USING ("is_public" = true);

DROP POLICY IF EXISTS "mizan_profiles_owner_write" ON "public"."mizan_profiles";
CREATE POLICY "mizan_profiles_owner_write"
    ON "public"."mizan_profiles"
    FOR ALL
    TO authenticated
    USING ("owner_id" = (SELECT auth.uid()))
    WITH CHECK ("owner_id" = (SELECT auth.uid()));

/* =====================================================================
   5) دالة مساعدة: أفضل النتائج (لوحة المتصدرين المستقبلية)
   ===================================================================== */

-- تُرجع أعلى المحاولات مرتبةً حسب النسبة ثم الخبرة. SECURITY DEFINER مع
-- search_path فارغ (اصطلاح هذا المشروع لتفادي هجمات search_path).
CREATE OR REPLACE FUNCTION "public"."quiz_leaderboard"(p_limit integer DEFAULT 20)
RETURNS TABLE (
    "user_ref" text,
    "label" text,
    "score" integer,
    "xp_earned" integer,
    "created_at" timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT a.user_ref, a.label, a.score, a.xp_earned, a.created_at
    FROM public.quiz_attempts a
    ORDER BY a.score DESC, a.xp_earned DESC, a.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION "public"."quiz_leaderboard"(integer) TO anon, authenticated;

COMMIT;
