-- 20260922000000_reactions.sql
-- نظام التفاعلات (Reactions) — إعجابات، مفيد، حفظ، إلخ
-- يدعم المقالات، الأخبار، المصطلحات القانونية، المدارس، والأسئلة

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."reactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_ref" text NOT NULL, -- Clerk user_xxx أو anon hash أو IP hash
  "clerk_user_id" text NULL,
  "target_type" text NOT NULL CHECK (target_type IN ('article','news','lexicon_term','school','quiz_question','comment','law')),
  "target_id" text NOT NULL,
  "reaction_type" text NOT NULL CHECK (reaction_type IN ('like','dislike','helpful','bookmark','fire','insightful')),
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT "reactions_user_target_unique" UNIQUE ("user_ref", "target_type", "target_id", "reaction_type")
);

ALTER TABLE "public"."reactions" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "reactions_target_idx" ON "public"."reactions" USING btree ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "reactions_user_ref_idx" ON "public"."reactions" USING btree ("user_ref");
CREATE INDEX IF NOT EXISTS "reactions_type_idx" ON "public"."reactions" USING btree ("reaction_type");
CREATE INDEX IF NOT EXISTS "reactions_created_at_idx" ON "public"."reactions" USING btree ("created_at" DESC);

-- جدول لتجميع الإحصاءات بسرعة (materialized-ish via trigger)
CREATE TABLE IF NOT EXISTS "public"."reaction_counts" (
  "target_type" text NOT NULL,
  "target_id" text NOT NULL,
  "reaction_type" text NOT NULL,
  "count" integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY ("target_type", "target_id", "reaction_type")
);

ALTER TABLE "public"."reaction_counts" OWNER TO "postgres";

-- دالة لتحديث العدادات تلقائياً
CREATE OR REPLACE FUNCTION "public"."update_reaction_counts"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.reaction_counts (target_type, target_id, reaction_type, count)
    VALUES (NEW.target_type, NEW.target_id, NEW.reaction_type, 1)
    ON CONFLICT (target_type, target_id, reaction_type)
    DO UPDATE SET count = reaction_counts.count + 1, updated_at = timezone('utc'::text, now());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reaction_counts
    SET count = GREATEST(count - 1, 0), updated_at = timezone('utc'::text, now())
    WHERE target_type = OLD.target_type AND target_id = OLD.target_id AND reaction_type = OLD.reaction_type;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "reactions_count_trigger" ON "public"."reactions";
CREATE TRIGGER "reactions_count_trigger"
  AFTER INSERT OR DELETE ON "public"."reactions"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_reaction_counts"();

-- RLS
ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reaction_counts" ENABLE ROW LEVEL SECURITY;

-- القراءة عامة
DROP POLICY IF EXISTS "reactions_public_read" ON "public"."reactions";
CREATE POLICY "reactions_public_read" ON "public"."reactions" FOR SELECT USING (true);

DROP POLICY IF EXISTS "reaction_counts_public_read" ON "public"."reaction_counts";
CREATE POLICY "reaction_counts_public_read" ON "public"."reaction_counts" FOR SELECT USING (true);

-- الكتابة: أي شخص يمكنه التفاعل (مع تحديد معدل عبر الواجهة)، لكن الحذف لصاحب التفاعل أو الإدارة
DROP POLICY IF EXISTS "reactions_insert" ON "public"."reactions";
CREATE POLICY "reactions_insert" ON "public"."reactions" FOR INSERT TO anon, authenticated WITH CHECK (char_length(target_id) BETWEEN 1 AND 200 AND char_length(user_ref) BETWEEN 1 AND 200);

DROP POLICY IF EXISTS "reactions_user_delete" ON "public"."reactions";
CREATE POLICY "reactions_user_delete" ON "public"."reactions" FOR DELETE USING (true); -- يسمح بالـ toggle من الواجهة، مع حماية إضافية عبر طبقة الخدمة

DROP POLICY IF EXISTS "reactions_admin_all" ON "public"."reactions";
CREATE POLICY "reactions_admin_all" ON "public"."reactions" FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- لا كتابة مباشرة في reaction_counts — فقط عبر trigger
DROP POLICY IF EXISTS "reaction_counts_no_direct_write" ON "public"."reaction_counts";
CREATE POLICY "reaction_counts_no_direct_write" ON "public"."reaction_counts" FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "reaction_counts_no_direct_update" ON "public"."reaction_counts";
CREATE POLICY "reaction_counts_no_direct_update" ON "public"."reaction_counts" FOR UPDATE USING (false);
DROP POLICY IF EXISTS "reaction_counts_admin" ON "public"."reaction_counts";
CREATE POLICY "reaction_counts_admin" ON "public"."reaction_counts" FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- دالة لإرجاع تفاعلات هدف معين مجمعة
CREATE OR REPLACE FUNCTION "public"."get_reaction_summary"(p_target_type text, p_target_id text)
RETURNS TABLE (reaction_type text, count integer)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT rc.reaction_type, rc.count
  FROM public.reaction_counts rc
  WHERE rc.target_type = p_target_type AND rc.target_id = p_target_id AND rc.count > 0
  ORDER BY rc.count DESC;
$$;

GRANT EXECUTE ON FUNCTION "public"."get_reaction_summary"(text, text) TO anon, authenticated;

-- دالة toggle (إضافة أو حذف)
CREATE OR REPLACE FUNCTION "public"."toggle_reaction"(
  p_user_ref text,
  p_target_type text,
  p_target_id text,
  p_reaction_type text,
  p_clerk_user_id text DEFAULT NULL
)
RETURNS TABLE (action text, count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_exists uuid;
  v_count integer;
BEGIN
  IF p_target_type NOT IN ('article','news','lexicon_term','school','quiz_question','comment','law') THEN
    RAISE EXCEPTION 'Invalid target_type';
  END IF;
  IF p_reaction_type NOT IN ('like','dislike','helpful','bookmark','fire','insightful') THEN
    RAISE EXCEPTION 'Invalid reaction_type';
  END IF;

  SELECT id INTO v_exists FROM public.reactions
  WHERE user_ref = p_user_ref AND target_type = p_target_type AND target_id = p_target_id AND reaction_type = p_reaction_type
  LIMIT 1;

  IF v_exists IS NOT NULL THEN
    DELETE FROM public.reactions WHERE id = v_exists;
    SELECT COALESCE(count,0) INTO v_count FROM public.reaction_counts WHERE target_type = p_target_type AND target_id = p_target_id AND reaction_type = p_reaction_type;
    RETURN QUERY SELECT 'removed'::text, COALESCE(v_count,0);
  ELSE
    INSERT INTO public.reactions (user_ref, clerk_user_id, target_type, target_id, reaction_type)
    VALUES (p_user_ref, p_clerk_user_id, p_target_type, p_target_id, p_reaction_type);
    SELECT COALESCE(count,0) INTO v_count FROM public.reaction_counts WHERE target_type = p_target_type AND target_id = p_target_id AND reaction_type = p_reaction_type;
    RETURN QUERY SELECT 'added'::text, COALESCE(v_count,0);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."toggle_reaction"(text, text, text, text, text) TO anon, authenticated;

COMMIT;
