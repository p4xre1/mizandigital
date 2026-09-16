-- supabase/migrations/20260911010000_add_news_updated_at_trigger.sql
--
-- ─────────────────────────────────────────────────────────────────────────────
-- news.updated_at لا يتحدث أبداً عند التعديل
-- ─────────────────────────────────────────────────────────────────────────────
-- المشكلة:
--   جدول public.news يملك عمود updated_at، لكن لا شيء يحدّثه:
--     • لا يوجد trigger — الموجودون فقط على profiles و laws و trending_topics
--     • وواجهة الإدارة لا ترسله: الحمولة في
--       src/pages/admin/NewsManagementPage.tsx:173-185 لا تتضمن updated_at
--
-- الأثر:
--   scripts/generate-sitemap.mjs:137 يبني lastmod هكذا:
--     (item.updated_at || item.published_at || item.created_at)
--   فبتجمّد updated_at عند لحظة الإنشاء، يبقى lastmod في خريطة الموقع ثابتاً
--   مهما عُدِّل الخبر، ولا تصل إشارة التغيير إلى محركات البحث إطلاقاً.
--   وينسحب الأمر على generate-feed.mjs وعلى مقياس الحداثة في نتيجة ميزان.
--
-- لماذا trigger بدل إصلاح الحمولة في الواجهة؟
--   لأن هناك مسار تحديث جزئي يتجاوز الحمولة كلياً:
--   NewsManagementPage.tsx:218 → .update({ is_published: nextStatus })
--   أي تعديل من جهة الخادم أو من أي عميل آخر سيُصلَح تلقائياً بالـ trigger.
--
-- ملاحظة: public.articles لا يحتاج هذا الإصلاح — ArticleEditorPage.tsx:200
-- يرسل updated_at صراحةً، ولا يوجد له مسار تحديث جزئي.
--
-- الملف idempotent بالكامل (CREATE OR REPLACE + DROP ... IF EXISTS) فيمكن
-- إعادة تشغيله بأمان من محرّر SQL في Supabase.

-- ----------------------------------------------------------------------------
-- 1) دالة التحديث — بنفس نمط set_laws_updated_at الموجودة في المستودع
-- ----------------------------------------------------------------------------
-- search_path مثبَّت صراحةً: الدوال التي تُستدعى من triggers يجب ألا تعتمد على
-- search_path الخاص بالجلسة (نفس قاعدة 20260831175929 في هذا المستودع).
CREATE OR REPLACE FUNCTION public.set_news_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION public.set_news_updated_at() OWNER TO postgres;

-- لا يُناديها أحد مباشرة — الـ trigger وحده. فلا داعي لمنحها لأحد.
REVOKE ALL ON FUNCTION public.set_news_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_news_updated_at() FROM anon, authenticated;

COMMENT ON FUNCTION public.set_news_updated_at() IS
  'يحدّث news.updated_at تلقائياً عند أي UPDATE حتى يبقى lastmod في خريطة الموقع صحيحاً.';

-- ----------------------------------------------------------------------------
-- 2) تصحيح الصفوف القائمة — قبل تركيب الـ trigger
-- ----------------------------------------------------------------------------
-- الترتيب هنا مقصود وليس تجميلياً: الـ trigger من نوع BEFORE UPDATE ويكتب
-- new.updated_at = now()، فهو يتجاوز أي قيمة يُسندها الـ UPDATE نفسه. لو
-- رُكِّب الـ trigger أولاً لأبطل عملية التصحيح وكتب now() بدل published_at.
-- (تم إثبات ذلك عملياً على PostgreSQL حقيقي.)
--
-- وللسبب نفسه نسقط الـ trigger إن كان موجوداً من تشغيل سابق، حتى تبقى إعادة
-- تشغيل الملف صحيحة لا شكلية.
--
-- الصفوف التي عُدِّلت سابقاً تحمل updated_at قديماً (= لحظة الإنشاء). لا يمكن
-- استعادة تاريخ تعديلها الحقيقي، لذا لا نلمسها: أي تعديل قادم سيضبطها تلقائياً.
DROP TRIGGER IF EXISTS trg_news_updated_at ON public.news;

UPDATE public.news
   SET updated_at = published_at
 WHERE updated_at IS NULL
   AND published_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3) الـ trigger — يُركَّب بعد اكتمال التصحيح
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.set_news_updated_at();
