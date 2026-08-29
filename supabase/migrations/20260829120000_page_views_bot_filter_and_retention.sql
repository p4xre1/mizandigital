-- ============================================================================
-- تصفية الزوّار الآليين (bots/crawlers) + سياسة أرشفة/تنظيف لجدول page_views
-- ============================================================================
-- المشكلة: أي طلب INSERT على public.page_views كان يُقبل من أي زائر بما في ذلك
-- Googlebot وBingbot وأي سكربت يستدعي REST endpoint مباشرة، مما يُضخّم أرقام
-- "الزيارات الحقيقية" في لوحة التحكم. هذا الملف يضيف طبقة حماية على مستوى
-- قاعدة البيانات (بالإضافة إلى الفلترة الأولية في useTrackView على العميل)
-- حتى لا يعتمد الأمان فقط على كود الواجهة الذي يمكن تجاوزه بسهولة.

-- ----------------------------------------------------------------------------
-- 1) دالة كشف الزوّار الآليين بالاعتماد على user_agent
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_bot_user_agent(p_user_agent text)
RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    p_user_agent IS NULL
    OR btrim(p_user_agent) = ''
    OR p_user_agent ~* (
      'bot|crawl|spider|slurp|mediapartners|facebookexternalhit|' ||
      'whatsapp|telegrambot|preview|headless|phantomjs|puppeteer|' ||
      'playwright|selenium|scrapy|curl|wget|python-requests|python-urllib|' ||
      'go-http-client|okhttp|axios/|node-fetch|libwww-perl|httpclient|' ||
      'ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|yandexbot|' ||
      'baiduspider|sogou|linkedinbot|discordbot|slackbot|embedly|' ||
      'quora link preview|pinterestbot|redditbot|applebot|uptimerobot|' ||
      'pingdom|gtmetrix|lighthouse|monitor'
    );
$$;

COMMENT ON FUNCTION public.is_bot_user_agent(text) IS
  'يُرجع true إذا كان الـ user_agent فارغاً أو يطابق نمط زاحف/بوت معروف (Googlebot, Bingbot, سكربتات، أدوات مراقبة...). يُستخدم لمنع تلويث إحصاءات page_views.';

-- ----------------------------------------------------------------------------
-- 2) Trigger على مستوى القاعدة: يتجاهل الإدخال بصمت (بدون خطأ) إن كان بوتاً
-- ----------------------------------------------------------------------------
-- ملاحظة: التجاهل الصامت (RETURN NULL) مقصود — لا نريد أن يفشل الطلب من جهة
-- العميل بخطأ يظهر في console الزائر، فقط لا يُسجَّل الصف في الجدول.
CREATE OR REPLACE FUNCTION public.page_views_filter_bots()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_bot_user_agent(NEW.user_agent) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_page_views_filter_bots ON public.page_views;
CREATE TRIGGER trg_page_views_filter_bots
  BEFORE INSERT ON public.page_views
  FOR EACH ROW
  EXECUTE FUNCTION public.page_views_filter_bots();

-- ----------------------------------------------------------------------------
-- 3) تنظيف/أرشفة السجلات القديمة (retention)
-- ----------------------------------------------------------------------------
-- نحتفظ بالسجلات الخام لمدة 6 أشهر فقط. الإحصاءات المجمّعة (get_total_visits،
-- get_visits_by_type...) تُحسب من هذا الجدول عند الطلب، لذا فترة 6 أشهر كافية
-- لأي تقرير عملي (يومي/أسبوعي/شهري/ربع سنوي) دون تضخّم الجدول إلى الأبد.
CREATE OR REPLACE FUNCTION public.cleanup_old_page_views(p_older_than interval DEFAULT '180 days')
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deleted bigint;
BEGIN
  DELETE FROM public.page_views
  WHERE created_at < now() - p_older_than;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

ALTER FUNCTION public.cleanup_old_page_views(interval) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.cleanup_old_page_views(interval) FROM anon, authenticated;

COMMENT ON FUNCTION public.cleanup_old_page_views(interval) IS
  'يحذف سجلات page_views الأقدم من المدة المحدَّدة (افتراضياً 180 يوماً). مجدولة عبر pg_cron أسبوعياً — انظر job "page-views-retention" أدناه.';

-- جدولة أسبوعية عبر pg_cron (المُفعَّل مسبقاً في remote_schema.sql).
-- تُحذف الوظيفة القديمة أولاً لتفادي التكرار عند إعادة تشغيل الهجرة.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'page-views-retention';

    PERFORM cron.schedule(
      'page-views-retention',
      '0 3 * * 0', -- كل أحد الساعة 03:00 UTC
      $cron$SELECT public.cleanup_old_page_views('180 days'::interval);$cron$
    );
  END IF;
END;
$$;
