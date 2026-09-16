-- 20260919000000_user_role_add_member.sql
--
-- ============================================================================
-- إصلاح ثغرة تصعيد صلاحيات: لا توجد قيمة «مستخدم عادي» في user_role
-- ============================================================================
--
-- المشكلة (مثبَتة باختبار على PostgreSQL حقيقي، لا بالقراءة فقط):
--
--   1) public.user_role معرفة بـ قيمة واحدة من اثنتين فقط:
--        CREATE TYPE user_role AS ENUM ('super_admin','editor')
--      لا توجد قيمة لغير المتمتعين بصلاحية. فأي صف في profiles هو بالضرورة
--      إمّا super_admin أو editor.
--
--   2) profiles.role DEFAULT 'editor'  (20260904120000:41)
--
--   3) is_admin() ترجع true عندما role IN ('super_admin','editor')
--      (20260904120000:77-93)
--
--   ⇒ أي صف يُنشأ في profiles بلا تحديد صريح للدور يصبح editor، وبالتالي
--     admin. و29 سياسة RLS في 20260904120000 و20260914000000 و20260831180000
--     تسمح بالكتابة/الحذف اعتماداً على is_admin() — وتشمل news و
--     lexicon_terms و laws و trending_topics و faculties و quiz_questions
--     وقراءة audit_logs وكل quiz_attempts.
--
--   4) إضافة مثبتة بالاختبار: handle_new_user() تُدرج
--        'member'::public.user_role
--      وهذه القيمة غير موجودة في النوع، فيفشل الإدراج بـ
--        invalid input value for enum user_role: "member"
--      أي أن مسار التسجيل عبر Supabase Auth كان يرمي خطأً في المُشغّل.
--
-- هذا الملف يضيف القيمة الناقصة فقط. لا يمكن استعمال القيمة الجديدة في نفس
-- المعاملة التي أُضيفت فيها (قيد PostgreSQL: "unsafe use of new value of
-- enum type")، لذلك التغييرات التي تستعملها في الملف التالي 20260919010000.
--
-- ملاحظة أمانة: لا نستطيع من المستودع تحديد أي المُشغّلات مثبَّت فعلاً على
-- auth.users (لا يوجد CREATE TRIGGER عليها هنا)، ولا عدد صفوف profiles في
-- المشروع الحقيقي. الإصلاح يصحّ بغضّ النظر عن ذلك: يسدّ المسار من جذره.

SET search_path = public, pg_temp;

DO $$ BEGIN
  -- IF NOT EXISTS يجعل الترحيل قابلاً لإعادة التنفيذ.
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_role'
      AND e.enumlabel = 'member'
  ) THEN
    -- BEFORE 'editor' لإبقاء الترتيب المنطقي: member < editor < super_admin
    ALTER TYPE public.user_role ADD VALUE 'member' BEFORE 'editor';
  END IF;
END $$;
