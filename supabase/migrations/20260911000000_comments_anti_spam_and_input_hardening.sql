-- ============================================================================
-- مكافحة السبام + تحصين المدخلات لجدول public.comments
-- ============================================================================
-- المشكلة قبل هذه الهجرة:
--   CREATE POLICY "public can insert comments" ... WITH CHECK (true);
-- أي أن أي زائر (وأي سكربت) يستطيع إدراج عدد غير محدود من التعليقات مباشرة
-- عبر مفتاح anon، لأن الفحص الوحيد كان في كود React (CommentSection.tsx) وهو
-- قابل للتجاوز بالكامل بطلب HTTP واحد. عمود author_name أيضاً كان بلا أي قيد
-- على الطول.
--
-- هذه الهجرة تضيف طبقة لا يمكن تجاوزها على مستوى قاعدة البيانات، على نمط ما
-- فُعل سابقاً في 20260829120000_page_views_bot_filter_and_retention.sql:
--   1) قيود CHECK على الطول
--   2) دالة كشف الحقن/السبام (مرآة SQL لـ functions/_shared/payloadGuard.js)
--   3) مُشغّل BEFORE INSERT يسقط بصمت: البوتات، الفيض، التكرار، والمحتوى الضار
--   4) سياسات RLS مقسّمة حسب الدور بدل WITH CHECK (true)
--
-- ملاحظة عن "الإسقاط الصامت" (RETURN NULL): مقصود. لا نُخبر المهاجم أي قاعدة
-- كشفته، فلا يستطيع تعديل هجومه. الطبقة التي تُرجع أخطاء واضحة للزائر الشرعي
-- هي functions/api/comments.js.

-- ----------------------------------------------------------------------------
-- 1) أعمدة المصدر (provenance) — بلا تخزين IP خام احتراماً لخصوصية الزوّار
-- ----------------------------------------------------------------------------
-- client_ip_hash: بصمة SHA-256(IP + ملح) تُحسب في functions/api/comments.js.
-- الملح (IP_HASH_SALT) يجعل البصمة غير قابلة للعكس بجداول قوس قزح.
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS client_ip_hash text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_agent text;

COMMENT ON COLUMN public.comments.client_ip_hash IS
  'بصمة SHA-256 لعنوان IP مع ملح (لا يُخزَّن IP الخام). تُستعمل لتحديد الفيض من نفس المصدر.';

COMMENT ON COLUMN public.comments.user_agent IS
  'سلسلة user-agent كما وصلت للخادم، تُستعمل لفلترة الزوّار الآليين عبر public.is_bot_user_agent().';

-- فهارس تدعم استعلامات الفيض/التكرار في المُشغّل (بدونها يصبح الفحص مسحاً
-- كاملاً للجدول عند كل إدراج).
CREATE INDEX IF NOT EXISTS comments_ip_hash_created_idx
  ON public.comments (client_ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_author_created_idx
  ON public.comments (lower(author_name), created_at DESC);
CREATE INDEX IF NOT EXISTS comments_source_created_idx
  ON public.comments (source_type, source_slug, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2) قيد الطول على author_name
-- ----------------------------------------------------------------------------
-- التطبيع أولاً: أي صف قديم مخالف كان سيمنع إضافة القيد (ADD CONSTRAINT
-- يفشل على الجدول كله). نقطع الأسماء القديمة ولا نحذف أي تعليق.
UPDATE public.comments
   SET author_name = left(btrim(author_name), 100)
 WHERE author_name IS NULL
    OR btrim(author_name) = ''
    OR char_length(btrim(author_name)) > 100;

UPDATE public.comments
   SET author_name = 'باحث / زائر'
 WHERE author_name IS NULL OR btrim(author_name) = '';

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_author_name_length;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_author_name_length
  CHECK (char_length(btrim(author_name)) BETWEEN 1 AND 100);

-- ----------------------------------------------------------------------------
-- 3) دوال الكشف (مرآة SQL لمنطق JavaScript)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.comments_count_urls(p_text text)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT count(*) FROM regexp_matches(p_text, '(?:https?://|www\.)[^\s<>"'']{4,}', 'gi')),
    0
  );
$$;

ALTER FUNCTION public.comments_count_urls(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.comments_count_urls(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comments_count_urls(text) FROM anon, authenticated;

COMMENT ON FUNCTION public.comments_count_urls(text) IS
  'يعدّ الروابط في نص. أكثر من 3 روابط في تعليق واحد = علامة سبام قوية.';

-- ⚠️ PostgreSQL regex: `\b` هو backspace وليس حدّ كلمة. حدود الكلمة في
-- PostgreSQL هي `\m` (بداية كلمة) و`\M` (نهاية كلمة). استعمال `\b` هنا
-- يجعل النمط غير مطابق أبداً (بصمت) — راجع اختبارات tests/security.test.ts.
CREATE OR REPLACE FUNCTION public.comments_is_suspicious(p_text text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT p_text IS NOT NULL AND (
    -- وسوم HTML / script / iframe
    p_text ~* '<\s*/?\s*(script|iframe|object|embed|svg|math|style|link|meta|base|form|body|html|applet)\M'
    OR p_text ~* '<[a-z!/][^>]*>'
    -- معالجات الأحداث (onclick= / onerror =)
    OR p_text ~* '\mon[a-z]{3,}\s*='
    -- مخططات URI خطرة (بصيغة دقيقة تفادياً للرفض الخاطئ)
    OR p_text ~* '\m(javascript|vbscript)\s*:'
    OR p_text ~* '\mdata\s*:\s*(text/(html|javascript)|application/|image/svg)'
    OR p_text ~* '\mfile\s*://'
    -- وصول إلى كائنات المتصفح الحساسة
    OR p_text ~* '\m(document\s*\.\s*(cookie|write|domain)|window\s*\.\s*location|localStorage|sessionStorage)\M'
    OR p_text ~* '\m(eval|Function|setTimeout|setInterval)\s*\(\s*[''"`]'
    OR p_text ~* 'base64\s*,'
    -- حقن SQL (مستحيل بنيوياً عبر PostgREST لأنه يُعامل القيم كمعاملات،
    -- لكن يبقى دفاعاً في العمق لأي مصرف آخر)
    OR p_text ~* '\m(union\s+(all\s+)?select|insert\s+into|drop\s+(table|database|schema)|delete\s+from|truncate\s+table|alter\s+table)\M'
    OR p_text ~* '\m(xp_cmdshell|pg_sleep|pg_read_file|load_file|outfile|dumpfile|information_schema|pg_catalog|pg_shadow|waitfor\s+delay)\M'
    OR p_text ~* '([''"`])\s*(or|and)\s*[''"`]?\s*[0-9]+\s*[''"`]?\s*=\s*[''"`]?\s*[0-9]+'
    OR p_text ~* ';\s*(--|#|/\*)'
    OR p_text ~* '/\*.*\*/'
    -- كلمات سبام شائعة
    OR p_text ~* '\m(viagra|cialis|casino|slot ?machine|poker ?online|betting ?tips|crypto ?(pump|signal)|forex ?signal|seo ?backlink|backlinks? ?cheap|buy ?followers|escort|onlyfans|link ?building)\M'
  );
$$;

ALTER FUNCTION public.comments_is_suspicious(text) OWNER TO postgres;

-- ⚠️ مهم: يجب منح EXECUTE لدورَي anon وauthenticated.
-- هذه الدالة تُستدعى من داخل سياسة RLS "anon can insert moderated comments"،
-- وسياسات RLS تُقيَّم بصلاحيات المستخدم الحالي (وليس مالك الدالة). لو
-- سُحب التنفيذ من anon لفشل كل إدراج برسالة
-- "permission denied for function comments_is_suspicious".
-- المنح آمن: الدالة نقية (IMMUTABLE) وتُرجع boolean عن النص المُمرَّر فقط،
-- فلا تُسرّب أي بيانات.
REVOKE ALL ON FUNCTION public.comments_is_suspicious(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comments_is_suspicious(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.comments_is_suspicious(text) IS
  'يكشف أنماط الحقن (XSS/SQLi) وكلمات السبام. مرآة SQL لـ INJECTION_PATTERNS وSPAM_KEYWORDS_RE في functions/_shared/payloadGuard.js — يجب تحديث الاثنين معاً.';

-- ----------------------------------------------------------------------------
-- 4) المُشغّل: الفلتر الذي لا يمكن تجاوزه
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.comments_anti_abuse_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recent_ip      integer;
  v_recent_author  integer;
  v_duplicate      integer;
BEGIN
  -- المسؤول المسجَّل يدخل من لوحة التحكم ولا يُعامَل كزائر مجهول
  IF auth.role() = 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- (أ) الزوّار الآليون: نفس الدالة المستعملة في page_views
  IF public.is_bot_user_agent(NEW.user_agent) THEN
    RETURN NULL;
  END IF;

  -- (ب) الفيض من نفس عنوان IP: أكثر من 5 تعليقات في 10 دقائق
  IF NEW.client_ip_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent_ip
      FROM public.comments
     WHERE client_ip_hash = NEW.client_ip_hash
       AND created_at > now() - interval '10 minutes';
    IF v_recent_ip >= 5 THEN
      RETURN NULL;
    END IF;
  END IF;

  -- (ج) الفيض من نفس الاسم: أكثر من 3 تعليقات في 10 دقائق
  -- (تغطية حالة غياب IP، ولمنع تدوير العناوين)
  SELECT count(*) INTO v_recent_author
    FROM public.comments
   WHERE lower(author_name) = lower(NEW.author_name)
     AND created_at > now() - interval '10 minutes';
  IF v_recent_author >= 3 THEN
    RETURN NULL;
  END IF;

  -- (د) التكرار الحرفي: نفس الشخص + نفس النص على نفس المحتوى خلال 24 ساعة
  SELECT count(*) INTO v_duplicate
    FROM public.comments
   WHERE source_type = NEW.source_type
     AND source_slug = NEW.source_slug
     AND lower(author_name) = lower(NEW.author_name)
     AND body = NEW.body
     AND created_at > now() - interval '24 hours';
  IF v_duplicate >= 1 THEN
    RETURN NULL;
  END IF;

  -- (هـ) المحتوى: حقن/سبام في النص أو في الاسم
  IF public.comments_is_suspicious(NEW.body) OR public.comments_is_suspicious(NEW.author_name) THEN
    RETURN NULL;
  END IF;

  -- (و) روابط كثيرة = تعليق إشهاري
  IF public.comments_count_urls(NEW.body) > 3 THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.comments_anti_abuse_guard() OWNER TO postgres;

-- لا يُمنح التنفيذ لأحد: المُشغّل يُنفَّذ داخلياً فقط، فلا يُستدعى من REST.
REVOKE ALL ON FUNCTION public.comments_anti_abuse_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comments_anti_abuse_guard() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_comments_anti_abuse_guard ON public.comments;
CREATE TRIGGER trg_comments_anti_abuse_guard
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.comments_anti_abuse_guard();

-- ----------------------------------------------------------------------------
-- 5) سياسات RLS: استبدال WITH CHECK (true) بقيود فعلية
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "public can insert comments" ON public.comments;

-- الزائر المجهول (وهو المسار الذي يستعمله functions/api/comments.js بمفتاح anon)
CREATE POLICY "anon can insert moderated comments"
  ON public.comments FOR INSERT TO anon
  WITH CHECK (
    source_type IN ('articles', 'news')
    AND source_slug IS NOT NULL
    AND char_length(btrim(source_slug)) BETWEEN 1 AND 200
    AND char_length(btrim(author_name)) BETWEEN 1 AND 100
    AND char_length(body) BETWEEN 1 AND 2000
    AND NOT public.comments_is_suspicious(author_name)
    AND NOT public.comments_is_suspicious(body)
  );

-- المسؤول المسجَّل (مسار داخلي محتمل من لوحة التحكم) — بلا قيود السبام
CREATE POLICY "authenticated can insert comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    char_length(btrim(author_name)) BETWEEN 1 AND 100
    AND char_length(body) BETWEEN 1 AND 2000
  );

-- ملاحظة: سياسة القراءة "public can read approved comments" تبقى كما هي —
-- المشغّل trg_force_comment_unapproved يفرض is_approved = false عند الإدراج،
-- فلا يمكن لزائر نشر تعليق لنفسه مباشرة.

-- ----------------------------------------------------------------------------
-- 6) تنظيف دوري لسجلات المصدر (client_ip_hash / user_agent) بعد 90 يوماً
-- ----------------------------------------------------------------------------
-- البصمات تُحفظ لأغراض مكافحة الفيض فقط؛ الاحتفاظ بها 90 يوماً يكفي لأي
-- تحقيق عملي ويقلّص footprint البيانات الشخصية.
CREATE OR REPLACE FUNCTION public.cleanup_comments_provenance(p_older_than interval DEFAULT '90 days')
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_updated bigint;
BEGIN
  UPDATE public.comments
     SET client_ip_hash = NULL,
         user_agent = NULL
   WHERE created_at < now() - p_older_than
     AND (client_ip_hash IS NOT NULL OR user_agent IS NOT NULL);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

ALTER FUNCTION public.cleanup_comments_provenance(interval) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cleanup_comments_provenance(interval) FROM anon, authenticated;

COMMENT ON FUNCTION public.cleanup_comments_provenance(interval) IS
  'يمحو بصمات IP وuser_agent من التعليقات الأقدم من المدة المحددة (افتراضياً 90 يوماً). مجدولة عبر pg_cron — انظر job "comments-provenance-retention".';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname = 'comments-provenance-retention';

    PERFORM cron.schedule(
      'comments-provenance-retention',
      '30 4 * * 0', -- كل أحد الساعة 04:30 UTC
      $cron$SELECT public.cleanup_comments_provenance('90 days'::interval);$cron$
    );
  END IF;
END;
$$;
