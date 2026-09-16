-- 20260919010000_user_role_default_member_and_demote.sql
--
-- ============================================================================
-- الجزء الثاني: نستعمل القيمة 'member' المضافة في 20260919000000
-- ============================================================================
--
-- لماذا ملفان؟ PostgreSQL يمنع استعمال قيمة enum جديدة داخل نفس المعاملة التي
-- أُضيفت فيها ("unsafe use of new value of enum type"). Supabase يشغّل كل ملف
-- ترحيل في معاملة مستقلة، فالتقسيم هو الحل الصحيح لا التفاف.
--
-- ── قرار الفشل الآمن (fail closed) ─────────────────────────────────────────
-- نصعّد صفوف 'editor' الحالية إلى 'member'. السبب: بما أن النوع لم يكن فيه
-- أي قيمة لغير المتمتعين بصلاحية، فلا سبيل للتمييز بين «محرّر رُقّي عمداً»
-- و«صف حصل على الافتراضي editor بالخطأ» — كلاهما يبدو متطابقاً. في ثغرة
-- تصعيد صلاحيات، الإغلاق أولى. من كان محرّراً حقيقياً يُرقّى من جديد بـ:
--
--   UPDATE public.profiles SET role = 'editor' WHERE email = '...';
--
-- ما لا يُمَس: صفوف 'super_admin'، وصفوف admin_god_mode = true (التعليق في
-- 20260904120000 يعتبر god-mode مصدراً مستقلاً للصلاحية).

SET search_path = public, pg_temp;

-- ============================================================================
-- 1) الافتراضي يصير غير متمتع بصلاحية
-- ============================================================================

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'member';

-- ============================================================================
-- 2) تصعيد الصفوف الحالية التي حصلت على editor بالافتراضي
-- ============================================================================

-- نعدّ قبل التغيير لنتمكن من التدقيق في audit_logs.
DO $$
DECLARE
  v_demoted integer;
BEGIN
  WITH demoted AS (
    UPDATE public.profiles
       SET role = 'member',
           updated_at = now()
     WHERE role = 'editor'
       AND COALESCE(admin_god_mode, false) = false
    RETURNING id
  )
  SELECT count(*)::integer INTO v_demoted FROM demoted;

  INSERT INTO public.audit_logs (action, table_name, new_data)
  VALUES (
    'role_default_hardening',
    'profiles',
    jsonb_build_object(
      'demoted_editor_to_member', v_demoted,
      'reason', 'user_role had no unprivileged value; editor was the column default, so every profile was is_admin()'
    )
  );
END $$;

-- ============================================================================
-- 3) handle_new_user_tenant_binding تُدرج بلا تحديد للدور
--    (فكانت تحصل على الافتراضي editor = admin). نصير مصرّحين.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_tenant_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    detected_domain TEXT;
    matching_tenant_id UUID;
BEGIN
    detected_domain := split_part(new.email, '@', 2);

    SELECT id INTO matching_tenant_id
    FROM public.tenants
    WHERE domain_wildcard = detected_domain;

    -- role صار مصرّحاً بـ 'member' بدل الاعتماد على افتراضي العمود.
    IF matching_tenant_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, tenant_id, tier, role)
        VALUES (new.id, matching_tenant_id, 'enterprise', 'member')
        ON CONFLICT (id) DO NOTHING;
    ELSE
        INSERT INTO public.profiles (id, tenant_id, tier, role)
        VALUES (new.id, NULL, 'free', 'member')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user_tenant_binding() OWNER TO postgres;

-- ============================================================================
-- 4) حاجز انحدار: لو حاول أحد إعادة الافتراضي إلى قيمة متمتعة بصلاحية
-- ============================================================================

COMMENT ON COLUMN public.profiles.role IS
  'member = مستخدم عادي (الافتراضي). editor/super_admin صلاحية محتوى/إدارة. '
  'لا تُعد الافتراضي إلى editor: is_admin() تعتمد عليه و29 سياسة RLS مبنية عليها.';
