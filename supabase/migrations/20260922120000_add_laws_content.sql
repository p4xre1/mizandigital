-- عمود content في جدول laws: نص القانون / المقتطفات القانونية.
--
-- نص صافٍ (بلا HTML) — يُفصَل بين الفقرات بسطر فارغ، ويُعرض كما هو في:
--   1) صفحة القانون الثابتة /pdf/<slug> (يولّدها scripts/prerender.mjs).
--   2) صفحة التحميل client-side (src/pages/public/PdfDownloadPage.tsx).
--   3) llms-full.txt (القسم «كل النصوص القانونية»).
--
-- تطبيق على القاعدة البعيدة:
--   Supabase → SQL Editor → نسخ الأمر أدناه (تقريبي، يُنفَّذ مرة واحدة).
-- ويُبقي هذا الملف محفوظاً لمطابقة سجل الترقيات المحلي مع النسخ البعيدة.
ALTER TABLE public.laws ADD COLUMN IF NOT EXISTS content text;

COMMENT ON COLUMN public.laws.content IS
  'نص القانون أو مقتطفاته القانونية — نص صافٍ تُفصل فقراته بسطر فارغ (بلا HTML)';
