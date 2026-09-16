-- ============================================================================
-- الإعجابات والمحفوظات — للمستخدمين المسجّلين فقط
-- ============================================================================
-- يُغطي: المقالات، الأخبار، كليات الحقوق، المصطلحات، ملخصات PDF، الأرشيف
-- القانوني، والندوات.
--
-- ── لماذا جدول واحد متعدد الأنواع لا جدول لكل نوع ─────────────────────────
-- because سبعة أنواع محتوى × (إعجاب + حفظ) = أربعة عشر جدولا بسياسات ومشغّلات
-- مكررة. الفرق بينها هو نوع المحتوى لا المنطق. CHECK على content_type مع فهرس
-- مركّب يعطي نفس الأداء بأقل سطح للصيانة.
--
-- ── لماذا المسجّلون فقط ────────────────────────────────────────────────────
-- المطلوب صراحة. وتقنياً: بلا هوية لا يمكن منع تكرار الإعجاب، وأي نظام
-- إعجاب للزوار يُتلاعب فيه بطلب واحد مكرّر.
-- ============================================================================

SET statement_timeout = '60s';
SET search_path = public, pg_temp;

-- ============================================================================
-- 1) التفاعل (إعجاب / حفظ)
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE t.typname = 'content_kind' AND n.nspname = 'public') THEN
    CREATE TYPE public.content_kind AS ENUM (
      'article','news','school','term','pdf','law','event');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE t.typname = 'reaction_kind' AND n.nspname = 'public') THEN
    CREATE TYPE public.reaction_kind AS ENUM ('like','save');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.content_reactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- هويتان: Supabase Auth (owner_id) أو Clerk (clerk_user_id). أحدهما مطلوب.
  owner_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  clerk_user_id text CHECK (clerk_user_id IS NULL OR char_length(clerk_user_id) BETWEEN 5 AND 150),

  content_type public.content_kind NOT NULL,
  -- معرّف المحتوى: UUID للمقالات/الأخبار/الكليات/المصطلحات، ونص للـ slug.
  content_id   text NOT NULL CHECK (char_length(btrim(content_id)) BETWEEN 1 AND 120),

  reaction     public.reaction_kind NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT content_reactions_owner_required
    CHECK (owner_id IS NOT NULL OR clerk_user_id IS NOT NULL),
  -- تفاعل واحد من كل نوع لكل مستخدم على كل محتوى. هذا هو ما يمنع العدّ المكرر.
  CONSTRAINT content_reactions_unique
    UNIQUE (owner_id, clerk_user_id, content_type, content_id, reaction)
);

COMMENT ON TABLE public.content_reactions IS
  'إعجاب أو حفظ لمحتوى. المستخدمون المسجّلون فقط — الزوار يرون دعوة لتسجيل الدخول.';

CREATE INDEX IF NOT EXISTS content_reactions_content_idx
  ON public.content_reactions (content_type, content_id, reaction);
CREATE INDEX IF NOT EXISTS content_reactions_owner_idx
  ON public.content_reactions (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reactions_clerk_idx
  ON public.content_reactions (clerk_user_id, created_at DESC);
-- قائمة "محفوظاتي" — الحفظ مرتب زمنياً
CREATE INDEX IF NOT EXISTS content_reactions_saves_idx
  ON public.content_reactions (owner_id, created_at DESC)
  WHERE reaction = 'save';

ALTER TABLE public.content_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reactions OWNER TO postgres;

-- الزائر لا يقرأ ولا يكتب. القراءة العامة للعدّادات تمر عبر دوال، لا عبر
-- سياسة SELECT — وإلا كشفت من أعجب بماذا.
REVOKE ALL ON public.content_reactions FROM anon;

DROP POLICY IF EXISTS "owner reads own reactions" ON public.content_reactions;
CREATE POLICY "owner reads own reactions"
  ON public.content_reactions FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- لا سياسة INSERT/UPDATE/DELETE عامة: كل الكتابة عبر الدوال أدناه.

-- ============================================================================
-- 2) الدوال
-- ============================================================================

/** بوابة التسجيل: لا زوار. */
CREATE OR REPLACE FUNCTION public.require_signed_in()
RETURNS text
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clerk text := coalesce(current_setting('request.jwt.claim.clerk_user_id', true), '');
BEGIN
  IF v_uid IS NOT NULL THEN
    RETURN NULL; -- المسار يُحدَّد في الدالة المستدعية
  END IF;
  IF char_length(btrim(v_clerk)) >= 5 THEN
    RETURN btrim(v_clerk);
  END IF;
  RAISE EXCEPTION 'authentication required';
END;
$$;
ALTER FUNCTION public.require_signed_in() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.require_signed_in() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.require_signed_in() TO authenticated;

/**
 * تبديل إعجاب أو حفظ.
 *
 * ── لماذا upsert/delete في دالة لا من المتصفح ─────────────────────────────
-- because "أضف إن لم يوجد، وإلا احذف" عمليتان. من المتصفح تتسابقان: نقرتان
-- سريعتان قد تُدرجا صفاً واحداً وتحذفانه، أو تُدرجا صفين لو غاب القيد.
-- هنا كل شيء في معاملة واحدة، والقيد الفريد هو شبكة الأمان.
 *
 * @returns الحالة الجديدة (true = مُعجب/محفوظ الآن) والعدد الجديد.
 */
CREATE OR REPLACE FUNCTION public.toggle_content_reaction(
  p_content_type public.content_kind,
  p_content_id   text,
  p_reaction     public.reaction_kind DEFAULT 'like',
  p_clerk_user_id text DEFAULT NULL
)
RETURNS TABLE (active boolean, total bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clerk text;
  v_active boolean;
  v_total bigint;
BEGIN
  v_clerk := btrim(coalesce(p_clerk_user_id,
                            current_setting('request.jwt.claim.clerk_user_id', true), ''));

  -- لا زوار: لا هوية ⇒ لا تفاعل.
  IF v_uid IS NULL AND char_length(v_clerk) < 5 THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_content_id IS NULL OR char_length(btrim(p_content_id)) < 1 THEN
    RAISE EXCEPTION 'content_id required';
  END IF;

  -- يوجد الصف؟ الحذف يحتاج المطابقة على نفس الهوية المستخدمة في الإدراج.
  IF EXISTS (
    SELECT 1 FROM public.content_reactions r
     WHERE r.content_type = p_content_type
       AND r.content_id   = btrim(p_content_id)
       AND r.reaction     = p_reaction
       AND (r.owner_id = v_uid OR (v_uid IS NULL AND r.clerk_user_id = v_clerk))
  ) THEN
    DELETE FROM public.content_reactions
     WHERE content_type = p_content_type
       AND content_id   = btrim(p_content_id)
       AND reaction     = p_reaction
       AND (owner_id = v_uid OR (v_uid IS NULL AND clerk_user_id = v_clerk));
    v_active := false;
  ELSE
    INSERT INTO public.content_reactions (owner_id, clerk_user_id, content_type, content_id, reaction)
    VALUES (v_uid, nullif(v_clerk, ''), p_content_type, btrim(p_content_id), p_reaction);
    v_active := true;
  END IF;

  SELECT count(*) INTO v_total
    FROM public.content_reactions
   WHERE content_type = p_content_type
     AND content_id   = btrim(p_content_id)
     AND reaction     = p_reaction;

  RETURN QUERY SELECT v_active, v_total;
END;
$$;
ALTER FUNCTION public.toggle_content_reaction(public.content_kind,text,public.reaction_kind,text)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.toggle_content_reaction(public.content_kind,text,public.reaction_kind,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_content_reaction(public.content_kind,text,public.reaction_kind,text)
  TO authenticated;

/**
 * عدّادات محتوى واحد + حالة المستخدم الحالي.
 *
 * تُرجع صفاً واحداً دائماً (ولو كانت العدادات صفراً) حتى لا تضطر الواجهة
 * للتعامل مع "لا نتائج" كحالة خاصة.
 */
CREATE OR REPLACE FUNCTION public.get_content_reactions(
  p_content_type  public.content_kind,
  p_content_id    text,
  p_clerk_user_id text DEFAULT NULL
)
RETURNS TABLE (likes bigint, saves bigint, liked boolean, saved boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    count(*) FILTER (WHERE r.reaction = 'like'),
    count(*) FILTER (WHERE r.reaction = 'save'),
    -- coalesce ضروري: bool_or على صفر صفوف يُرجع NULL لا false، وكانت
    -- الواجهة ستستلم null وتُظهر حالة غير معرّفة لكل محتوى بلا تفاعل.
    coalesce(bool_or(r.reaction = 'like'
            AND (r.owner_id = auth.uid()
                 OR (auth.uid() IS NULL AND r.clerk_user_id = btrim(coalesce(p_clerk_user_id,''))))), false),
    coalesce(bool_or(r.reaction = 'save'
            AND (r.owner_id = auth.uid()
                 OR (auth.uid() IS NULL AND r.clerk_user_id = btrim(coalesce(p_clerk_user_id,''))))), false)
  FROM public.content_reactions r
  WHERE r.content_type = p_content_type
    AND r.content_id   = btrim(coalesce(p_content_id,''));
$$;
ALTER FUNCTION public.get_content_reactions(public.content_kind,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_content_reactions(public.content_kind,text,text) FROM PUBLIC;
-- القراءة عامة: العدّادات وحدها، بلا كشف من تفاعل.
GRANT EXECUTE ON FUNCTION public.get_content_reactions(public.content_kind,text,text)
  TO anon, authenticated;

/** محفوظات المستخدم الحالي. */
CREATE OR REPLACE FUNCTION public.get_my_saved_content(
  p_clerk_user_id text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (content_type public.content_kind, content_id text, saved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.content_type, r.content_id, r.created_at
    FROM public.content_reactions r
   WHERE r.reaction = 'save'
     AND (r.owner_id = auth.uid()
          OR (auth.uid() IS NULL AND r.clerk_user_id = btrim(coalesce(p_clerk_user_id,''))))
     AND (auth.uid() IS NOT NULL OR char_length(btrim(coalesce(p_clerk_user_id,''))) >= 5)
   ORDER BY r.created_at DESC
   LIMIT least(greatest(coalesce(p_limit,50),1),200);
$$;
ALTER FUNCTION public.get_my_saved_content(text,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_saved_content(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_saved_content(text,integer) TO authenticated;

-- ============================================================================
-- 3) استبيان الترحيب: سؤال القسم المفضّل + صفة «جمعية»
-- ============================================================================

ALTER TABLE public.onboarding_responses
  ADD COLUMN IF NOT EXISTS favorite_feature text
  CHECK (favorite_feature IS NULL OR favorite_feature = ANY (ARRAY[
    'articles','news','pdfs','quiz','schools','events','terms']));

COMMENT ON COLUMN public.onboarding_responses.favorite_feature IS
  'أفضل قسم في المنصة بنظر المستخدم — اختيار واحد، بخلاف interests المتعددة.';

-- «جمعية» صفة كانت ناقصة من قائمة الصفات.
ALTER TABLE public.onboarding_responses DROP CONSTRAINT IF EXISTS onboarding_responses_user_type_check;
ALTER TABLE public.onboarding_responses
  ADD CONSTRAINT onboarding_responses_user_type_check
  CHECK (user_type = ANY (ARRAY[
    'student','teacher','normal','license','master','doctorate',
    'startup','company','society']));

-- نفس الإضافة على mizan_profiles.role لو استُعملت للصفة.
-- (role هناك محصورة بـ student/lawyer/citizen ولا نوسّعها: authorization لا
-- يجب أن يحمل شخصيات — انظر ملاحظة audience_type في 20260911030000.)

SET search_path = public, pg_temp;
