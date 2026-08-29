import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

export type TrackableContentType = "article" | "news" | "term" | "pdf" | "event" | "page"

const VISITOR_KEY = "mizan:visitor_id"
const SESSION_KEY = "mizan:session_id"

/** معرّف زائر ثابت عبر الزيارات (يُخزَّن في localStorage) — يُستخدم لحساب "الزوّار الفريدين" فقط، وليس معلومة شخصية. */
function getVisitorId(): string {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return "anon"
  }
}

/** معرّف جلسة المتصفح الحالية (يُخزَّن في sessionStorage) */
function getSessionId(): string {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      window.sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return "anon-session"
  }
}

/**
 * فحص أوّلي على العميل لتجنّب إرسال طلب شبكة أصلاً من زوّار آليين معروفين
 * (Googlebot، Bingbot، أدوات فحص الروابط، سكربتات...). هذا مجرد تحسين أداء
 * وتقليل الضجيج — الحماية الفعلية موجودة في trigger على مستوى قاعدة البيانات
 * (page_views_filter_bots) لأن أي طرف يمكنه تجاوز كود الواجهة والكتابة مباشرة
 * على REST endpoint الخاص بـ Supabase.
 */
const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegrambot|preview|headless|phantomjs|puppeteer|playwright|selenium|scrapy|curl|wget|python-requests|python-urllib|go-http-client|okhttp|axios\/|node-fetch|libwww-perl|httpclient|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|yandexbot|baiduspider|sogou|linkedinbot|discordbot|slackbot|embedly|pinterestbot|redditbot|applebot|uptimerobot|pingdom|gtmetrix|lighthouse|monitor/i

function isLikelyBot(): boolean {
  const ua = navigator.userAgent || ""
  if (!ua || BOT_UA_PATTERN.test(ua)) return true
  // بعض أدوات الفحص الآلي (Lighthouse، بعض أنماط Puppeteer) تُبقي navigator.webdriver = true
  if ((navigator as any).webdriver) return true
  return false
}

interface TrackOptions {
  /** إذا true (الافتراضي): يُسجَّل حدث واحد فقط لكل عنصر لكل جلسة متصفح (لعدّ "قراءات" حقيقية لا إعادة تحميل). إذا false: يُسجَّل كل تنقّل (لعدّ زيارات الموقع الفعلية). */
  dedupePerSession?: boolean
}

/**
 * يسجّل حدث زيارة/قراءة حقيقي في جدول public.page_views عبر Supabase.
 * يُستخدم على صفحات المقالات، الأخبار، مصطلحات القاموس، ملفات PDF، والفعاليات،
 * وكذلك بشكل عام على مستوى التطبيق لحساب إجمالي زيارات الموقع.
 */
export function useTrackView(
  contentType: TrackableContentType,
  contentId: string | null | undefined,
  options: TrackOptions = {}
) {
  const { dedupePerSession = true } = options

  useEffect(() => {
    if (!contentId) return
    if (isLikelyBot()) return

    const dedupeKey = `mizan:pv:${contentType}:${contentId}`
    if (dedupePerSession && window.sessionStorage.getItem(dedupeKey) === "1") {
      return
    }

    let cancelled = false

    ;(async () => {
      const { error } = await (supabase as any).from("page_views").insert({
        content_type: contentType,
        content_id: contentId,
        path: window.location.pathname,
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
      })

      if (!cancelled && !error && dedupePerSession) {
        try {
          window.sessionStorage.setItem(dedupeKey, "1")
        } catch {
          /* تجاهل إن كان sessionStorage غير متاح */
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, contentId, dedupePerSession])
}
