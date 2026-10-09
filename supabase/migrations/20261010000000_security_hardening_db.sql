-- 20261010000000_security_hardening_db.sql
--
-- تشديد أمني لقاعدة البيانات. لا يحذف بيانات ولا جداول ولا سياسات مفيدة،
-- ولا يغيّر أي منطق في الواجهة. كل تغيير يُعكس بالخطوات المذكورة في الأسفل.
-- يُطبَّق بعد 20261009000000_help_assistant_hardening.sql.
--
-- ── ما الذي كان مكشوفاً قبل هذا الترحيل (تحقّق ساكن من الترحيلات، لا من القاعدة الحية)
--   [DB-01] عروض pending_deletions و orphaned_billing و unattached_credit_grants
--           تملكها postgres بلا security_invoker، فتتجاوز RLS، وتملك GRANT SELECT
--           للدور authenticated. أي حساب مسجّل يقرأ بريد وأسماء كل من طلب حذف حسابه،
--           وصفوف مدفوعات مستخدمين آخرين. لا تستعملها الواجهة (بحث عن الاستعمال: لا شيء).
--   [DB-02] سياسة reactions_user_delete بشرط USING (true): أي عميل مجهول يحذف أي تفاعل.
--           الواجهة لا تحذف من جدول reactions أبداً؛ الحذف الوحيد هو لوحة المشرف،
--           وتغطيه reactions_admin_all.
--   [DB-03] دوال SECURITY DEFINER بلا search_path مثبَّت: خطر انتحال كائنات
--           عبر مسار البحث. تم التحقق بعد 20260831180000: لا تملك anon صلاحية استدعائها،
--           لكن الضبط الصحيح هو تثبيت المسار.
--   [DB-04] للدور anon صلاحية ALL على profiles و audit_logs (من الترحيل الأساسي ولم
--           تُسحب). RLS يمنع الصفوف حالياً، لكن الامتياز الزائد يُفشل الدفاع في العمق.
--
-- ── الاستعمال المرجعي لتأكيد عدم كسر شيء:
--   لا يوجد في src/ ولا functions/ ولا shared/ استعلام إلى هذه العروض، ولا حذف
--   مباشر من reactions بصلاحية العميل. انظر docs/security-testing.md.

-- ============================================================================
-- DB-01: العروض تحترم RLS ولا يقرؤها إلا الخدمة
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('public.pending_deletions') IS NOT NULL THEN
    ALTER VIEW public.pending_deletions SET (security_invoker = true);
    REVOKE ALL ON public.pending_deletions FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON public.pending_deletions TO service_role;
  END IF;

  IF to_regclass('public.orphaned_billing') IS NOT NULL THEN
    ALTER VIEW public.orphaned_billing SET (security_invoker = true);
    REVOKE ALL ON public.orphaned_billing FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON public.orphaned_billing TO service_role;
  END IF;

  IF to_regclass('public.unattached_credit_grants') IS NOT NULL THEN
    ALTER VIEW public.unattached_credit_grants SET (security_invoker = true);
    REVOKE ALL ON public.unattached_credit_grants FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON public.unattached_credit_grants TO service_role;
  END IF;
END $$;

-- ============================================================================
-- DB-02: لا حذف عاماً من reactions. يبقى حذف المشرف عبر reactions_admin_all.
-- ============================================================================
DROP POLICY IF EXISTS "reactions_user_delete" ON public.reactions;

-- ============================================================================
-- DB-03: تثبيت search_path للدوال ذات الامتياز
-- ============================================================================
DO $$
BEGIN
  IF to_regprocedure('public.force_comment_unapproved()') IS NOT NULL THEN
    ALTER FUNCTION public.force_comment_unapproved() SET search_path = public, pg_temp;
  END IF;
  IF to_regprocedure('public.increment_article_views(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.increment_article_views(uuid) SET search_path = public, pg_temp;
  END IF;
  IF to_regprocedure('public.increment_content_views(text,text)') IS NOT NULL THEN
    ALTER FUNCTION public.increment_content_views(text, text) SET search_path = public, pg_temp;
  END IF;
  IF to_regprocedure('public.increment_news_views(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.increment_news_views(uuid) SET search_path = public, pg_temp;
  END IF;
  IF to_regprocedure('public.increment_pdf_downloads(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.increment_pdf_downloads(uuid) SET search_path = public, pg_temp;
  END IF;
END $$;

-- ============================================================================
-- DB-04: إزالة الامتياز الزائد عن anon. RLS يبقى الحارس الفعلي للقراءة والكتابة.
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    REVOKE ALL ON public.profiles FROM anon;
  END IF;
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    REVOKE ALL ON public.audit_logs FROM anon;
  END IF;
END $$;

-- ============================================================================
-- الرجوع (Rollback) — يدوياً، فقط بعد قرار مكتوب:
--   ALTER VIEW public.pending_deletions SET (security_invoker = false);
--   GRANT SELECT ON public.pending_deletions TO authenticated;           -- ⚠ يعيد التسريب
--   (كرّر للعرضين الآخرين)
--   CREATE POLICY "reactions_user_delete" ON public.reactions FOR DELETE USING (true);  -- ⚠ يعيد الثغرة
--   ALTER FUNCTION public.increment_article_views(uuid) RESET search_path;
--   GRANT ALL ON public.profiles TO anon;                                 -- ⚠ لا يُنصح
-- ============================================================================
