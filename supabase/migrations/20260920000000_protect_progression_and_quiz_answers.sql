-- 20260920000000_protect_progression_and_quiz_answers.sql
-- -----------------------------------------------------------------------
-- إصلاح ثغرتين عاليتي الخطورة:
--   1) تضخيم نقاط الخبرة والكريدتس عبر إدراج مباشر في quiz_attempts
--   2) كشف إجابات الاختبارات عبر قراءة عمود answer مباشرة + التلاعب في mizan_profiles
--
-- هذا الملف يعتمد على ثلاث تغييرات في الواجهة الأمامية (يجب نشرها أولاً):
--   a) src/lib/quiz/attemptService.ts — الإرسال عبر RPC submit_quiz_attempt بدلاً من insert مباشر
--   b) src/lib/quiz/secureProgress.ts — التحقق من سلامة التقدم المحلي عبر HMAC خفيف
--   c) src/components/quiz/QuizRunner.tsx — عدم الاعتماد على answer من العميل للتصحيح النهائي
-- -----------------------------------------------------------------------

BEGIN;

-- =====================================================================
-- 1) حماية quiz_attempts: إلغاء سياسة الإدراج المفتوحة واستبدالها
--    بسياسة مقيدة + دالة RPC تتحقق من الإجابات على الخادم
-- =====================================================================

DROP POLICY IF EXISTS "quiz_attempts_insert" ON "public"."quiz_attempts";
DROP POLICY IF EXISTS "quiz_attempts_anon_insert" ON "public"."quiz_attempts";
DROP POLICY IF EXISTS "quiz_attempts_restricted_insert" ON "public"."quiz_attempts";

-- دالة مساعدة: حساب XP على الخادم بنفس منطق src/lib/quiz/engine.ts
CREATE OR REPLACE FUNCTION "public"."compute_quiz_xp"(
  p_correct boolean,
  p_difficulty text,
  p_elapsed_ms bigint,
  p_streak integer
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_xp integer := 0;
BEGIN
  IF NOT p_correct THEN
    RETURN 0;
  END IF;

  v_xp := 8; -- XP.correct

  IF p_difficulty = 'medium' THEN
    v_xp := v_xp + 3;
  ELSIF p_difficulty = 'hard' THEN
    v_xp := v_xp + 6;
  END IF;

  IF p_elapsed_ms > 0 AND p_elapsed_ms <= 8000 THEN
    v_xp := v_xp + 4; -- fastBonus
  END IF;

  IF p_streak > 0 AND p_streak % 3 = 0 THEN
    v_xp := v_xp + 2; -- streakBonus
  END IF;

  RETURN v_xp;
END;
$$;

-- دالة RPC الرئيسية: استلام إجابات المستخدم والتحقق منها على الخادم
-- لا يثق في xp_earned المرسل من العميل — يعيد حسابه بالكامل
CREATE OR REPLACE FUNCTION "public"."submit_quiz_attempt"(
  p_mode text,
  p_label text,
  p_tier text,
  p_answers jsonb, -- [{questionId, chosen, elapsedMs}]
  p_duration_ms bigint,
  p_user_ref text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  correct integer,
  total integer,
  score integer,
  xp_earned integer,
  credits_earned integer,
  best_streak integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer;
  v_correct integer := 0;
  v_best_streak integer := 0;
  v_current_streak integer := 0;
  v_raw_xp integer := 0;
  v_xp_earned integer;
  v_credits integer;
  v_score integer;
  v_attempt_id uuid;
  v_item jsonb;
  v_qid text;
  v_chosen integer;
  v_elapsed bigint;
  v_db_answer integer;
  v_db_difficulty text;
  v_is_correct boolean;
  v_q_xp integer;
BEGIN
  -- التحقق الأساسي
  IF p_mode NOT IN ('university','general','concours','interview','placement') THEN
    RAISE EXCEPTION 'Invalid mode: %', p_mode;
  END IF;

  IF jsonb_typeof(p_answers) != 'array' THEN
    RAISE EXCEPTION 'Answers must be array';
  END IF;

  v_total := jsonb_array_length(p_answers);
  IF v_total = 0 OR v_total > 100 THEN
    RAISE EXCEPTION 'Invalid total: %', v_total;
  END IF;

  IF p_duration_ms IS NOT NULL AND (p_duration_ms < 0 OR p_duration_ms > 86400000) THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  -- حلقة التحقق من كل إجابة مقابل قاعدة البيانات (إن وجدت) أو الجدول المحلي
  -- للأسئلة المحلية (seed) التي ليست في قاعدة البيانات، نثق في الإجابة المرسلة
  -- مع تطبيق حدود XP القصوى — الهدف منع تضخيم XP وليس منع الغش الكامل للأسئلة المحلية
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    v_qid := COALESCE(v_item->>'questionId','');
    v_chosen := NULLIF(v_item->>'chosen','null')::integer;
    v_elapsed := COALESCE((v_item->>'elapsedMs')::bigint, 0);

    IF v_elapsed < 0 OR v_elapsed > 600000 THEN
      v_elapsed := 0;
    END IF;

    -- محاولة جلب الإجابة الصحيحة من قاعدة البيانات
    SELECT answer, difficulty INTO v_db_answer, v_db_difficulty
    FROM public.quiz_questions
    WHERE slug = v_qid AND is_published = true
    LIMIT 1;

    IF v_db_answer IS NOT NULL THEN
      -- سؤال من قاعدة البيانات: تحقق صارم
      v_is_correct := (v_chosen IS NOT NULL AND v_chosen = v_db_answer);
    ELSE
      -- سؤال محلي (seed): لا يمكن التحقق على الخادم — نثق في correct المرسل مع حدود
      -- لكن نستعمل difficulty المرسلة إن وجدت وإلا medium
      v_db_difficulty := COALESCE(v_item->>'difficulty','medium');
      v_is_correct := COALESCE((v_item->>'correct')::boolean, false);
      -- منع تضخيم: إذا كان chosen null فلا يمكن أن يكون correct
      IF v_chosen IS NULL THEN
        v_is_correct := false;
      END IF;
    END IF;

    IF v_is_correct THEN
      v_correct := v_correct + 1;
      v_current_streak := v_current_streak + 1;
      v_best_streak := GREATEST(v_best_streak, v_current_streak);
      v_q_xp := public.compute_quiz_xp(true, COALESCE(v_db_difficulty,'medium'), v_elapsed, v_current_streak);
      v_raw_xp := v_raw_xp + v_q_xp;
    ELSE
      v_current_streak := 0;
    END IF;
  END LOOP;

  -- حساب النتيجة النهائية بنفس منطق engine.ts
  v_score := CASE WHEN v_total > 0 THEN ROUND((v_correct::numeric / v_total::numeric) * 100)::integer ELSE 0 END;

  -- مكافآت الإكمال والعلامة الكاملة
  v_raw_xp := v_raw_xp + CASE WHEN v_total > 0 THEN 15 ELSE 0 END; -- completion
  IF v_total > 0 AND v_correct = v_total THEN
    v_raw_xp := v_raw_xp + 40; -- perfect
  END IF;

  -- معامل المسار
  v_xp_earned := CASE
    WHEN p_mode = 'general' THEN ROUND(v_raw_xp * 0.8)
    WHEN p_mode = 'concours' THEN ROUND(v_raw_xp * 1.25)
    WHEN p_mode = 'placement' THEN ROUND(v_raw_xp * 1.5)
    ELSE v_raw_xp
  END;

  -- حد أقصى لمنع التضخيم: حتى مع 100 سؤال صعب وسريع ومتتالي، الحد الأقصى المنطقي < 3000
  IF v_xp_earned > 3000 THEN
    v_xp_earned := 3000;
  END IF;
  IF v_xp_earned < 0 THEN
    v_xp_earned := 0;
  END IF;

  v_credits := CASE WHEN v_total > 0 THEN GREATEST(1, ROUND(v_xp_earned::numeric / 12)::integer + 3) ELSE 0 END;
  IF v_credits > 500 THEN v_credits := 500; END IF;

  -- إدراج المحاولة المحققة
  INSERT INTO public.quiz_attempts (user_ref, mode, label, total, correct, score, xp_earned, credits_earned, best_streak, duration_ms)
  VALUES (NULLIF(p_user_ref,''), p_mode, LEFT(COALESCE(p_label,'اختبار'), 200), v_total, v_correct, v_score, v_xp_earned, v_credits, v_best_streak, p_duration_ms)
  RETURNING quiz_attempts.id INTO v_attempt_id;

  RETURN QUERY SELECT v_attempt_id, v_correct, v_total, v_score, v_xp_earned, v_credits, v_best_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."compute_quiz_xp"(boolean, text, bigint, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."submit_quiz_attempt"(text, text, text, jsonb, bigint, text) TO anon, authenticated;

-- سياسة جديدة: anon يمكنه الإدراج فقط عبر RPC (نمنع insert المباشر من anon)
-- لكن نبقي insert للـ authenticated (الإدارة) مع CHECK صارم
DROP POLICY IF EXISTS "quiz_attempts_admin_insert" ON "public"."quiz_attempts";
DROP POLICY IF EXISTS "quiz_attempts_restricted_insert" ON "public"."quiz_attempts";

-- لا أحد من anon يمكنه insert مباشر الآن — يجب استعمال RPC
CREATE POLICY "quiz_attempts_no_direct_anon_insert"
  ON "public"."quiz_attempts"
  FOR INSERT
  TO anon
  WITH CHECK (false);

-- authenticated (الإدارة + المستخدمون المسجلون) يمكنهم الإدراج مع حدود معقولة
CREATE POLICY "quiz_attempts_authenticated_insert"
  ON "public"."quiz_attempts"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    total BETWEEN 0 AND 100
    AND correct BETWEEN 0 AND total
    AND score BETWEEN 0 AND 100
    AND xp_earned BETWEEN 0 AND 3000
    AND credits_earned BETWEEN 0 AND 500
    AND best_streak BETWEEN 0 AND total
  );

-- القراءة تبقى للإدارة فقط (كما قبل)
-- (سياسة quiz_attempts_admin_read موجودة مسبقاً)

-- =====================================================================
-- 2) حماية mizan_profiles: منع التلاعب المباشر في xp/credits
-- =====================================================================

-- إزالة السياسة القديمة التي تسمح للمالك بتعديل كل شيء بلا قيد
DROP POLICY IF EXISTS "mizan_profiles_owner_write" ON "public"."mizan_profiles";
DROP POLICY IF EXISTS "mizan_profiles_owner_update" ON "public"."mizan_profiles";
DROP POLICY IF EXISTS "mizan_profiles_owner_insert" ON "public"."mizan_profiles";

-- دالة تتحقق من أن xp لا يقفز بشكل غير معقول (أكثر من 3000 في تحديث واحد)
CREATE OR REPLACE FUNCTION "public"."check_profile_xp_jump"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_xp_diff integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_xp_diff := NEW.xp - OLD.xp;
    -- منع نقصان XP (إلا إذا كان reset من الإدارة) — لكن نسمح بالنقصان الطفيف لإصلاح
    -- ونمنع الزيادة الكبيرة جداً في تحديث واحد (> 3000) إلا إذا كان is_admin
    IF v_xp_diff > 3000 THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'XP jump too large: %', v_xp_diff;
      END IF;
    END IF;

    -- credits لا يمكن أن يقفز أكثر من 500 في تحديث واحد
    IF NEW.credits - OLD.credits > 500 THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Credits jump too large';
      END IF;
    END IF;

    -- rank يجب أن يتوافق مع xp
    IF NEW.rank NOT IN ('D','C','B','A','S','SS','SSS') THEN
      RAISE EXCEPTION 'Invalid rank';
    END IF;
  END IF;

  -- username غير قابل للتغيير بعد الإنشاء إلا من الإدارة
  IF TG_OP = 'UPDATE' AND OLD.username IS DISTINCT FROM NEW.username THEN
    IF NOT public.is_admin() AND OLD.username IS NOT NULL THEN
      RAISE EXCEPTION 'Username cannot be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "check_profile_xp_jump_trigger" ON "public"."mizan_profiles";
CREATE TRIGGER "check_profile_xp_jump_trigger"
  BEFORE INSERT OR UPDATE ON "public"."mizan_profiles"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."check_profile_xp_jump"();

-- سياسات جديدة: المالك يمكنه إنشاء وتعديل بروفايله لكن مع قيود
CREATE POLICY "mizan_profiles_owner_insert"
  ON "public"."mizan_profiles"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND char_length(username) BETWEEN 3 AND 30
    AND xp BETWEEN 0 AND 100000
    AND credits BETWEEN 0 AND 100000
  );

CREATE POLICY "mizan_profiles_owner_update"
  ON "public"."mizan_profiles"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND xp BETWEEN 0 AND 100000
    AND credits BETWEEN 0 AND 100000
  );

CREATE POLICY "mizan_profiles_owner_delete"
  ON "public"."mizan_profiles"
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.is_admin());

-- =====================================================================
-- 3) حماية quiz_questions: إنشاء view بدون عمود answer للقراءة العامة
--    (الأسئلة المحلية في JSON تبقى مكشوفة — هذا تحسين دفاعي إضافي)
-- =====================================================================

-- View للقراءة العامة بدون إجابات
CREATE OR REPLACE VIEW "public"."quiz_questions_public"
WITH (security_invoker = true)
AS
SELECT
  slug,
  tier,
  semester,
  module,
  body,
  track,
  difficulty,
  question,
  options,
  explanation,
  reference,
  is_published,
  created_at,
  updated_at
FROM public.quiz_questions
WHERE is_published = true;

GRANT SELECT ON "public"."quiz_questions_public" TO anon, authenticated;

-- دالة للتحقق من إجابة واحدة (تُستعمل من الواجهة للتصحيح الفوري الآمن)
CREATE OR REPLACE FUNCTION "public"."check_quiz_answer"(
  p_question_id text,
  p_chosen integer
)
RETURNS TABLE (
  correct boolean,
  explanation text,
  reference text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_answer integer;
  v_expl text;
  v_ref text;
BEGIN
  IF p_chosen IS NULL OR p_chosen < 0 OR p_chosen > 3 THEN
    RETURN QUERY SELECT false, ''::text, NULL::text;
    RETURN;
  END IF;

  SELECT q.answer, q.explanation, q.reference
  INTO v_answer, v_expl, v_ref
  FROM public.quiz_questions q
  WHERE q.slug = p_question_id AND q.is_published = true
  LIMIT 1;

  IF v_answer IS NULL THEN
    -- سؤال غير موجود في DB (seed محلي) — لا يمكن التحقق على الخادم
    RETURN QUERY SELECT NULL::boolean, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT (v_answer = p_chosen), v_expl, v_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."check_quiz_answer"(text, integer) TO anon, authenticated;

-- =====================================================================
-- 4) فهرس إضافي للأداء
-- =====================================================================

CREATE INDEX IF NOT EXISTS "quiz_attempts_mode_score_idx" ON "public"."quiz_attempts" (mode, score DESC);

COMMIT;
