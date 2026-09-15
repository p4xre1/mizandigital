-- 20260923000000_governance_and_reports.sql
-- نظام الحوكمة والإبلاغ — Governance & Moderation
-- تقارير المحتوى، قائمة المراجعة، إجراءات الإشراف، ودليل المجتمع

BEGIN;

-- تقارير المستخدمين عن محتوى مسيء أو خاطئ
CREATE TABLE IF NOT EXISTS "public"."reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporter_ref" text NULL, -- يمكن أن يكون مجهولاً
  "reporter_clerk_id" text NULL,
  "target_type" text NOT NULL CHECK (target_type IN ('article','news','comment','lexicon_term','quiz_question','school','profile','other')),
  "target_id" text NOT NULL,
  "reason" text NOT NULL CHECK (reason IN ('spam','harassment','misinformation','copyright','illegal','inappropriate','other')),
  "details" text NULL CHECK (char_length(details) <= 2000),
  "status" text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  "moderator_note" text NULL,
  "moderator_id" uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "public"."reports" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "reports_target_idx" ON "public"."reports" USING btree ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "public"."reports" USING btree ("status");
CREATE INDEX IF NOT EXISTS "reports_created_at_idx" ON "public"."reports" USING btree ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "reports_reason_idx" ON "public"."reports" USING btree ("reason");

-- إجراءات الإشراف (سجل)
CREATE TABLE IF NOT EXISTS "public"."moderation_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "moderator_id" uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "action" text NOT NULL CHECK (action IN ('approve','reject','hide','delete','warn','ban','restore')),
  "reason" text NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "public"."moderation_actions" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "moderation_actions_target_idx" ON "public"."moderation_actions" USING btree ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "moderation_actions_created_at_idx" ON "public"."moderation_actions" USING btree ("created_at" DESC);

-- تحديث updated_at للتقارير
CREATE OR REPLACE FUNCTION "public"."set_reports_updated_at"()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at := timezone('utc'::text, now()); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS "set_reports_updated_at" ON "public"."reports";
CREATE TRIGGER "set_reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_reports_updated_at"();

-- إرشادات المجتمع (قابلة للتحرير من لوحة التحكم)
CREATE TABLE IF NOT EXISTS "public"."community_guidelines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "category" text NOT NULL DEFAULT 'general' CHECK (category IN ('general','content','quiz','comments','legal')),
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "public"."community_guidelines" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_guidelines_updated_at"()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at := timezone('utc'::text, now()); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS "set_guidelines_updated_at" ON "public"."community_guidelines";
CREATE TRIGGER "set_guidelines_updated_at" BEFORE UPDATE ON "public"."community_guidelines" FOR EACH ROW EXECUTE FUNCTION "public"."set_guidelines_updated_at"();

-- RLS
ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."moderation_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_guidelines" ENABLE ROW LEVEL SECURITY;

-- Reports: أي شخص يمكنه الإبلاغ، الإدارة ترى وتعدل
DROP POLICY IF EXISTS "reports_insert" ON "public"."reports";
CREATE POLICY "reports_insert" ON "public"."reports" FOR INSERT TO anon, authenticated WITH CHECK (char_length(target_id) BETWEEN 1 AND 500);

DROP POLICY IF EXISTS "reports_admin_read" ON "public"."reports";
CREATE POLICY "reports_admin_read" ON "public"."reports" FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "reports_admin_write" ON "public"."reports";
CREATE POLICY "reports_admin_write" ON "public"."reports" FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reports_admin_delete" ON "public"."reports";
CREATE POLICY "reports_admin_delete" ON "public"."reports" FOR DELETE TO authenticated USING (public.is_admin());

-- Moderation actions: قراءة وكتابة للإدارة فقط
DROP POLICY IF EXISTS "moderation_admin_all" ON "public"."moderation_actions";
CREATE POLICY "moderation_admin_all" ON "public"."moderation_actions" FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Guidelines: قراءة عامة للنشطة، كتابة للإدارة
DROP POLICY IF EXISTS "guidelines_public_read" ON "public"."community_guidelines";
CREATE POLICY "guidelines_public_read" ON "public"."community_guidelines" FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "guidelines_admin_write" ON "public"."community_guidelines";
CREATE POLICY "guidelines_admin_write" ON "public"."community_guidelines" FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- دالة لإنشاء تقرير مع حماية من الفيض (5 تقارير / ساعة لكل مستخدم)
CREATE OR REPLACE FUNCTION "public"."create_report"(
  p_reporter_ref text,
  p_target_type text,
  p_target_id text,
  p_reason text,
  p_details text DEFAULT NULL,
  p_reporter_clerk_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
  v_id uuid;
BEGIN
  IF p_target_type NOT IN ('article','news','comment','lexicon_term','quiz_question','school','profile','other') THEN
    RAISE EXCEPTION 'Invalid target_type';
  END IF;
  IF p_reason NOT IN ('spam','harassment','misinformation','copyright','illegal','inappropriate','other') THEN
    RAISE EXCEPTION 'Invalid reason';
  END IF;

  -- تحديد معدل: 5 تقارير / ساعة لنفس المستخدم
  SELECT COUNT(*) INTO v_count FROM public.reports
  WHERE reporter_ref = p_reporter_ref AND created_at > timezone('utc'::text, now()) - interval '1 hour';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Rate limited: too many reports';
  END IF;

  -- منع التكرار: نفس المستخدم لا يبلغ عن نفس الهدف مرتين خلال 24 ساعة
  SELECT COUNT(*) INTO v_count FROM public.reports
  WHERE reporter_ref = p_reporter_ref AND target_type = p_target_type AND target_id = p_target_id
    AND created_at > timezone('utc'::text, now()) - interval '24 hours';

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Already reported recently';
  END IF;

  INSERT INTO public.reports (reporter_ref, reporter_clerk_id, target_type, target_id, reason, details)
  VALUES (p_reporter_ref, p_reporter_clerk_id, p_target_type, p_target_id, p_reason, LEFT(p_details, 2000))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."create_report"(text, text, text, text, text, text) TO anon, authenticated;

-- بذور إرشادات المجتمع
INSERT INTO "public"."community_guidelines" (slug, title, content, category, sort_order)
VALUES
  ('respect', 'الاحترام المتبادل', 'ميزان الرقمية مجتمع طلابي مهني. يمنع أي خطاب كراهية، تحرش، أو إساءة شخصية. ناقش الفكرة لا الشخص.', 'general', 1),
  ('accuracy', 'الدقة القانونية', 'عند نشر معلومة قانونية، اذكر المصدر (نص قانوني، جريدة رسمية، قرار قضائي). المعلومات غير المسندة قد تحذف.', 'content', 2),
  ('no-spam', 'منع السبام والإشهار', 'يمنع نشر روابط إشهارية، ترويج لخدمات مدفوعة خارج المنصة، أو تكرار نفس المحتوى.', 'content', 3),
  ('quiz-fair', 'نزاهة الاختبارات', 'الاختبارات للتعلم وليس للغش. لا تشارك إجابات الاختبارات بشكل يفسد تجربة الآخرين، ولا تستعمل أدوات آلية للتلاعب بالنقاط.', 'quiz', 4),
  ('comments', 'آداب التعليقات', 'التعليقات يجب أن تكون بناءة ومحترمة. يمنع السب، القذف، أو نشر معلومات شخصية. التعليقات تخضع للمراجعة.', 'comments', 5),
  ('legal-disclaimer', 'إخلاء المسؤولية القانونية', 'محتوى المنصة تعليمي ولا يغني عن استشارة محامٍ أو مراجعة النص الرسمي في الجريدة الرسمية. الإدارة غير مسؤولة عن استعمال المعلومات.', 'legal', 6)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
