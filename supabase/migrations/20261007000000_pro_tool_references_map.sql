-- خريطة الإحالات القانونية: إتاحة الأداة وتوسيع الحقول الاختيارية.
--
-- لا يضيف هذا الترحيل أي مادة قانونية. المحتوى المنشور الأول للخريطة ملفّ
-- منسّق في المستودع (src/data/reference-map.json)، مراجعته مقابلة نصية مع
-- المصدر الرسمي وموثّقة في Git. هذا الترحيل يفعل شيئين فقط:
--   1) يُتيح الأداة للجميع بعد أن كانت معطّلة بانتظار المحتوى.
--   2) يضبط الحقول الاختيارية الجديدة للإحالات على مستوى قاعدة البيانات،
--      حتى لا تُقبل قيمة خارج التصنيف أو رابط غير HTTPS من أي عميل.
--
-- عكسي: لا يحذف شيئاً، ولا يلمس المواد الموجودة، ولا يغيّر السياسات القائمة.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.pro_tools') IS NULL THEN
    RAISE EXCEPTION 'public.pro_tools is missing. Apply 20260928000000_pro_legal_tools.sql first.';
  END IF;
END$$;

UPDATE public.pro_tools
   SET title = 'خريطة الإحالات القانونية',
       description = 'ابحث عن الروابط بين النصوص ومصادرها: من يُحيل على من، وبأي نوع من العلاقة، مع رابط المصدر الرسمي.',
       enabled = true
 WHERE slug = 'references';

-- ─────────────────────────────────────────────────────────────────────────────
-- التحقق من حقول الإحالة.
--
-- ماذا نتحقق منه هنا ولماذا؟ التحقق في الواجهة (validateEntry) راحة للمحرّر،
-- لا ضمانة: أي عميل يستطيع استدعاء الجدول مباشرة. القيد الحقيقي يجب أن يقع
-- حيث تُكتب البيانات.
--   • relation_type: قيمة من تصنيف مغلق. القيم الأخرى تُرسم بلون مجهول في
--     الخريطة، فيصير اللون بلا معنى — وهو أخطر من حقل فارغ.
--   • target_verified: 'true' أو 'false' فقط. أي قيمة أخرى تُقرأ في الواجهة
--     كـ«غير مثبت» فتظهر إحالة مؤكدة بمصدرها كأنها غير مؤكدة.
--   • also: قائمة أهداف بفواصل، بسقف طول يمنع إغراق الخريطة بآلاف الأضلاع
--     من مادة واحدة.
-- ملاحظة: الحقول الاختيارية (from_text, to_text, excerpt, also,
-- target_verified) لا تُشترط هنا لأن الفراغ فيها صحيح: إحالة بلا اقتباس مقبولة،
-- واقتباس مُخترع ليس كذلك.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_pro_tool_reference_payload()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  allowed_types text[] := ARRAY['explicit','delegation','procedural','penal','hierarchy','interpretive'];
BEGIN
  IF NEW.tool_slug <> 'references' THEN RETURN NEW; END IF;

  IF coalesce(btrim(NEW.payload->>'relation_type'), '') <> ''
     AND NOT (NEW.payload->>'relation_type' = ANY(allowed_types)) THEN
    RAISE EXCEPTION 'relation_type must be one of %', array_to_string(allowed_types, ', ');
  END IF;

  IF coalesce(btrim(NEW.payload->>'target_verified'), '') <> ''
     AND NEW.payload->>'target_verified' NOT IN ('true','false') THEN
    RAISE EXCEPTION 'target_verified must be true or false';
  END IF;

  IF octet_length(coalesce(NEW.payload->>'also', '')) > 1000 THEN
    RAISE EXCEPTION 'also is too long (max 1000 bytes)';
  END IF;

  -- هدف مؤكد يستلزم رابطاً آمناً: ادّعاء التثبيت بلا رابط أسوأ من عدم التثبيت،
  -- لأنه يوحي للمستخدم أن النص المُنفِّذ مفتوح أمامه وهو ليس كذلك.
  IF NEW.published
     AND NEW.payload->>'target_verified' = 'true'
     AND coalesce(btrim(NEW.payload->>'target_url'), '') !~ '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'a verified reference target needs a valid https target_url';
  END IF;

  RETURN NEW;
END$$;
ALTER FUNCTION public.validate_pro_tool_reference_payload() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_pro_tool_reference_payload() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS pro_reference_payload_check ON public.pro_tool_entries;
CREATE TRIGGER pro_reference_payload_check
  BEFORE INSERT OR UPDATE ON public.pro_tool_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_pro_tool_reference_payload();

COMMIT;
