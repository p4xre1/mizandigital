-- =====================================================================
-- تضييق صلاحيات page_views: سحب ما لا تحتاجه التطبيقات من anon/authenticated
--
-- دليل من القاعدة الحية (تفريغ الصلاحيات الذي أرسله المالك): anon وauthenticated
-- يملكان على public.page_views كل الصلاحيات — ومنها TRUNCATE وUPDATE وDELETE
-- وREFERENCES وTRIGGER — لأن Supabase يمنح ALL تلقائياً لكل جدول جديد في public.
--
-- ما يحتاجه التطبيق فعلاً (مُتحقّق بـ grep على src/):
--   * INSERT فقط: useTrackView و contentTracking يكتبان صفحة الزيارة.
--   * قراءة الصفوف الخام: لا كود عميل يقرؤها؛ لوحة التحكم تقرأ عبر دوال RPC
--     (SECURITY DEFINER) فلا تتأثر بهذا السحب.
--
-- لذا نسحب: TRUNCATE (يتجاوز RLS أصلاً — أخطرها)، UPDATE، DELETE، REFERENCES،
-- TRIGGER. ونُبقي INSERT (التتبّع) وSELECT (سلوك قائم: سياسة authenticated
-- للقراءة الخام — لم نغيّرها هنا).
--
-- لا حذف بيانات ولا تغيير على RLS أو المُشغّلات: صلاحيات فقط، وقابلة للإعادة
-- بأمر GRANT واحد إن احتاجها شيء لاحقاً.
-- =====================================================================
BEGIN;

REVOKE TRUNCATE, REFERENCES, TRIGGER, UPDATE, DELETE
  ON public.page_views FROM anon, authenticated;

-- لا تُسحَب INSERT: زوّار غير المسجّلين يسجّلون زياراتهم بهوية anon.
-- ولا SELECT: سياسة «authenticated can read page views» القائمة تعتمد عليها.

COMMIT;
