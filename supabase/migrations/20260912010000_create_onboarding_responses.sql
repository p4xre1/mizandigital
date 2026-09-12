-- استبيان الترحيب (Onboarding) بعد أول تسجيل دخول عبر Clerk
-- -----------------------------------------------------------------------
-- نخزّن هنا إجابات 3 أسئلة تُعرض مرة واحدة لكل مستخدم بعد أول تسجيل دخول:
--   1) نوع المستخدم (طالب/أستاذ/شخص عادي/حاصل إجازة/ماستر/دكتوراه/ستارت أب/شركة)
--   2) من أين سمع بالموقع
--   3) المواضيع التي تهمه (متعددة الاختيار)
--
-- ملاحظة معمارية مهمة: تسجيل الدخول العام فـ هذا المشروع كيمر عبر Clerk
-- وليس Supabase Auth (شوف src/main.tsx وsrc/layouts/PublicNavigation.tsx)،
-- فـ "clerk_user_id" هو المعرّف (نص من نوع "user_xxxxx"، وليس uuid ديال
-- auth.users). هاذ الجدول ما عندوش أي علاقة بجدول "profiles" الموجود
-- سلفاً (ذاك مرتبط بـ Supabase Auth لحسابات لوحة التحكم/الإدارة).
--
-- الأمان: نفعّل RLS بلا ما نزيد أي policy لـ anon/authenticated — يعني
-- الجدول معروض تقنياً عبر PostgREST لكن بلا أي policy، ما حدا (غير
-- service_role) ما يقدر يقرا أو يكتب فيه مباشرة من المتصفح. القراءة
-- والكتابة كتمران فقط عبر Supabase Edge Function (supabase/functions/
-- onboarding) اللي كتحقق من توقيع Clerk JWT قبل ما تستعمل مفتاح
-- service_role للوصول للجدول.

CREATE TABLE IF NOT EXISTS "public"."onboarding_responses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "clerk_user_id" text NOT NULL UNIQUE,
    "user_type" text NOT NULL,
    "referral_source" text NOT NULL,
    "interests" text[] NOT NULL DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "onboarding_responses_user_type_check" CHECK (
        "user_type" = ANY (ARRAY[
            'student'::text,
            'teacher'::text,
            'normal'::text,
            'license'::text,
            'master'::text,
            'doctorate'::text,
            'startup'::text,
            'company'::text
        ])
    ),
    CONSTRAINT "onboarding_responses_interests_check" CHECK (
        "interests" <@ ARRAY[
            'lexicon'::text,
            'schools'::text,
            'pdfs'::text,
            'articles'::text,
            'news'::text,
            'events'::text
        ]
    )
);

ALTER TABLE "public"."onboarding_responses" OWNER TO "postgres";

ALTER TABLE "public"."onboarding_responses" ENABLE ROW LEVEL SECURITY;

-- بلا أي CREATE POLICY هنا عن قصد: service_role (المستعمل داخل Edge
-- Function فقط) كيتجاوز RLS تلقائياً، وanon/authenticated ما عندهمش أي
-- وصول لين نزيدو policy بشكل صريح فـ المستقبل.

CREATE INDEX IF NOT EXISTS "onboarding_responses_clerk_user_id_idx"
    ON "public"."onboarding_responses" USING btree ("clerk_user_id");

-- تحديث updated_at تلقائياً عند كل تعديل (نفس الاصطلاح المستعمل فـ باقي
-- الجداول فـ هذا المشروع).
CREATE OR REPLACE FUNCTION "public"."set_onboarding_responses_updated_at"()
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

DROP TRIGGER IF EXISTS "set_onboarding_responses_updated_at" ON "public"."onboarding_responses";
CREATE TRIGGER "set_onboarding_responses_updated_at"
    BEFORE UPDATE ON "public"."onboarding_responses"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."set_onboarding_responses_updated_at"();
