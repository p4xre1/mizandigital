-- =====================================================================
-- تقاعد التصميم السابق لحالات «من الواقعة إلى الحل» (تصميم لم يُنشر قط)
--
-- الترحيل 20261012000300 يرفض المتابعة إن وجد في القاعدة:
--   * public.legal_case_questions، أو
--   * public.legal_cases بلا عمود story (التصميم السابق: facts/court)
-- لأنه لا يخلط تصميمين مختلفين في جدول واحد. هذا الترحيل يزيل التصميم
-- السابق قبل 20261012000300 بالترتيب الآمن التالي:
--
--   1) لا يلمس شيئاً إن لم توجد كائنات قديمة، أو إن كان legal_cases
--      بالتصميم الجديد (عمود story) ⇒ قاعدة نظيفة أو مطبَّقة = لا عملية.
--   2) يؤرشف كل صف من كل جدول قديم في مخطط legacy_archive، ويسجل تعريفات
--      العروض والدوال التي سيحذفها، قبل أي حذف. لا حذف بلا نسخة.
--   3) يحذف كائنات المساحة القديمة في public وحدها (العروض والدوال
--      والجداول التي يبدأ اسمها بـ legal_case)، ثم يسلّم القيادة للترحيل
--      20261012000300 الذي ينشئ التصميم الجديد.
--
-- المخطط legacy_archive غير مكشوف عبر PostgREST ولا يملك فيه anon أو
-- authenticated أي صلاحية، فهو رفّ محفوظات لا واجهة.
--
-- بعد التطبيق، تحقّق ثم احذف الأرشيف إن أردت:
--   SELECT count(*) FROM legacy_archive.legal_cases;
--   SELECT * FROM legacy_archive.retired_objects;
--   DROP SCHEMA legacy_archive CASCADE;   -- بعد التأكد فقط
--
-- ملاحظة: كل المراجع مؤهَّلة (public. / legacy_archive.) عن قصد، فلا
-- يعتمد هذا الترحيل على search_path.
-- =====================================================================
BEGIN;

-- نسخ الصفوف يجب أن يكون كاملاً: لو فُرضت RLS على جدول قديم (FORCE) نُعطّل
-- الفرض على الجدول الذي سنحذفه أصلاً في نفس المعاملة، وبغير ذلك يوقف
-- row_security=off النسخَ بخطأ صريح بدل نسخ جزء من الصفوف بصمت.
SET LOCAL row_security = off;

DO $$
DECLARE
  v_cases_exists boolean := to_regclass('public.legal_cases') IS NOT NULL;
  v_cases_is_new boolean := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'legal_cases' AND column_name = 'story');
  v_questions_exists boolean := to_regclass('public.legal_case_questions') IS NOT NULL;
  v_retire_cases boolean;
  v_missing text;
  v_name text;
  v_oid oid;
  v_kind "char";
  v_args text;
  v_def text;
  v_rows bigint;
  v_objects integer := 0;
BEGIN
  v_retire_cases := v_cases_exists AND NOT v_cases_is_new;

  -- تصميم جديد ناقص الأعمدة (لا قديم ولا جديد): نتوقف برسالة واضحة بدل
  -- إنشاء بقية الكائنات فوق جدول لا يطابق التصميم.
  IF v_cases_is_new THEN
    SELECT string_agg(c.name, ', ' ORDER BY c.name) INTO v_missing
    FROM (VALUES ('slug'), ('law_code'), ('difficulty'), ('question'), ('options'),
                 ('answer_index'), ('hint'), ('explanation'), ('articles'), ('published')) AS c(name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns ic
      WHERE ic.table_schema = 'public' AND ic.table_name = 'legal_cases' AND ic.column_name = c.name);
    IF v_missing IS NOT NULL THEN
      RAISE EXCEPTION 'public.legal_cases has the new design marker (story) but is missing columns: %. Stop and inspect it manually before applying 20261012000300.', v_missing;
    END IF;
  END IF;

  IF NOT v_retire_cases AND NOT v_questions_exists THEN
    RAISE NOTICE 'legal cases: no previous design found, nothing to retire';
    RETURN;
  END IF;

  -- الأرشيف: مخطط مستقل، بلا صلاحيات للزوار ولا للمستخدمين المسجّلين.
  CREATE SCHEMA IF NOT EXISTS legacy_archive;
  REVOKE ALL ON SCHEMA legacy_archive FROM PUBLIC, anon, authenticated;
  CREATE TABLE IF NOT EXISTS legacy_archive.retired_objects (
    object_kind text NOT NULL,
    object_name text NOT NULL,
    definition text,
    retired_at timestamptz NOT NULL DEFAULT now(),
    note text NOT NULL DEFAULT ''
  );
  REVOKE ALL ON ALL TABLES IN SCHEMA legacy_archive FROM PUBLIC, anon, authenticated;

  -- 1) نسخ الجداول القديمة كما هي (بأعمدتها التي لا نعرفها مسبقاً).
  IF v_retire_cases THEN
    FOR v_name IN
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname ^@ 'legal_case'
      ORDER BY c.relname
    LOOP
      IF to_regclass(format('legacy_archive.%I', v_name)) IS NOT NULL THEN
        RAISE EXCEPTION 'legacy_archive.% already exists while public.% still exists. A previous retirement was incomplete — inspect both tables manually; nothing was changed.', v_name, v_name;
      END IF;
      -- جدول قديم فُرضت عليه RLS: نُلغي الفرض (نحن المالك، والجدول يُحذف بعد
      -- أسطر) ليكون الأرشيف نسخة كاملة لا مجموعة الصفوف التي سمحت بها سياسة.
      IF EXISTS (SELECT 1 FROM pg_class c2
                 WHERE c2.oid = to_regclass(format('public.%I', v_name)) AND c2.relforcerowsecurity) THEN
        EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', v_name);
      END IF;
      EXECUTE format('CREATE TABLE legacy_archive.%I AS SELECT * FROM public.%I', v_name, v_name);
      EXECUTE format('REVOKE ALL ON legacy_archive.%I FROM PUBLIC, anon, authenticated', v_name);
      EXECUTE format('COMMENT ON TABLE legacy_archive.%I IS %L', v_name,
                     'نسخة مؤرشفة من public.' || v_name || ' (التصميم السابق لحالات «من الواقعة إلى الحل»، تقاعد في 20261012000250)');
      EXECUTE format('SELECT count(*) FROM public.%I', v_name) INTO v_rows;
      EXECUTE format('INSERT INTO legacy_archive.retired_objects (object_kind, object_name, note) VALUES (%L, %L, %L)',
                     'table', v_name, v_rows || ' صفاً مؤرشفاً');
      v_objects := v_objects + 1;
    END LOOP;

    -- 2) تعريفات العروض القديمة (نحفظ النص ثم نحذف).
    FOR v_name, v_kind IN
      SELECT c.relname, c.relkind FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm') AND c.relname ^@ 'legal_case'
      ORDER BY c.relname
    LOOP
      EXECUTE format('SELECT pg_get_viewdef(%L::regclass, true)', 'public.' || quote_ident(v_name))
        INTO v_def;
      EXECUTE format('INSERT INTO legacy_archive.retired_objects (object_kind, object_name, definition) VALUES (%L, %L, %L)',
                     CASE WHEN v_kind = 'm' THEN 'materialized view' ELSE 'view' END, v_name, v_def);
      EXECUTE format('DROP %s IF EXISTS public.%I CASCADE',
                     CASE WHEN v_kind = 'm' THEN 'MATERIALIZED VIEW' ELSE 'VIEW' END, v_name);
      v_objects := v_objects + 1;
    END LOOP;

    -- 3) تعريفات الدوال القديمة ثم حذفها (كل التوقيعات).
    FOR v_oid, v_name, v_args IN
      SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p') AND p.proname ^@ 'legal_case'
      ORDER BY p.proname
    LOOP
      v_def := pg_get_functiondef(v_oid);
      EXECUTE format('INSERT INTO legacy_archive.retired_objects (object_kind, object_name, definition) VALUES (%L, %L, %L)',
                     'function', v_name || '(' || v_args || ')', v_def);
      EXECUTE format('DROP ROUTINE IF EXISTS public.%I(%s) CASCADE', v_name, v_args);
      v_objects := v_objects + 1;
    END LOOP;

    -- 4) الجداول القديمة (بعد الأرشفة). CASCADE يحذف ما تبقّى من تبعيات.
    FOR v_name IN
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname ^@ 'legal_case'
      ORDER BY c.relname
    LOOP
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_name);
    END LOOP;
  ELSE
    -- legal_cases بالتصميم الجديد وبقيت legal_case_questions وحدها (بقية قديمة
    -- لا يعرفها التصميم الجديد). نؤرشفها ثم نحذفها وحدها.
    IF to_regclass('legacy_archive.legal_case_questions') IS NOT NULL THEN
      RAISE EXCEPTION 'legacy_archive.legal_case_questions already exists while public.legal_case_questions still exists. Inspect both tables manually; nothing was changed.';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class c
               WHERE c.oid = to_regclass('public.legal_case_questions') AND c.relforcerowsecurity) THEN
      EXECUTE 'ALTER TABLE public.legal_case_questions NO FORCE ROW LEVEL SECURITY';
    END IF;
    EXECUTE 'CREATE TABLE legacy_archive.legal_case_questions AS SELECT * FROM public.legal_case_questions';
    EXECUTE 'REVOKE ALL ON legacy_archive.legal_case_questions FROM PUBLIC, anon, authenticated';
    EXECUTE 'SELECT count(*) FROM public.legal_case_questions' INTO v_rows;
    EXECUTE format('INSERT INTO legacy_archive.retired_objects (object_kind, object_name, note) VALUES (%L, %L, %L)',
                   'table', 'legal_case_questions', v_rows || ' صفاً مؤرشفاً');
    EXECUTE 'DROP TABLE IF EXISTS public.legal_case_questions CASCADE';
    v_objects := v_objects + 1;
  END IF;

  RAISE NOTICE 'legal cases: retired previous design, % object(s) archived in legacy_archive', v_objects;
END $$;

COMMIT;
