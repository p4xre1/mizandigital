/**
 * أثر فشل تسجيل الزيارة — كي لا يختفي العطل بصمت.
 *
 * الكتابة إلى page_views تتجاهل الخطأ عمداً: لا نريد أن يرى الزائر خطأً لأن
 * عدّاداً فشل. لكن التجاهل المطلق يعني أن عطلاً في الإدراج (مشروع Supabase
 * موقوف، مفتاح anon تغيّر، سياسة الإدراج سُحذفت، ترويسة CSP منعت الطلب) يوقف
 * الأرقام بلا أي أثر: لا خطأ في اللوحة ولا في السجلات، فقط أرقام لا تتحرّك.
 *
 * هذا الملف يحفظ آخر فشل في sessionStorage (بلا أي معلومة شخصية: نوع المحتوى
 * ومعرّفه ورسالة الخطأ ووقتها) ويكتب تحذيراً واحداً في console المتصفح لكل جلسة
 * مع خطوات الفحص. الزائر لا يرى شيئاً على الشاشة؛ المطوّر والمالك يريان السبب.
 */

const FAILURE_KEY = "mizan:track_last_error"
const WARNED_KEY = "mizan:track_warned"

/** أقصى طول لرسالة الخطأ المحفوظة — لا نحفظ ردوداً طويلة أو أي بيانات أخرى. */
const MAX_MESSAGE = 300

export interface TrackFailure {
  /** وقت الفشل (ISO) */
  at: string
  /** نوع المحتوى الذي فشل تسجيله */
  contentType: string
  /** معرّف المحتوى (مسار أو سلاق) */
  contentId: string
  /** رسالة الخطأ كما أعادها العميل، مقتطعة */
  message: string
}

/** sessionStorage إن كان متاحاً — بعض المتصفحات ترمي في الوضع الخاص أو المحجوب. */
function safeSession(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage
  } catch {
    return null
  }
}

/** يستخرج رسالة قصيرة من أي شكل خطأ (PostgrestError أو Error أو نص). */
export function describeTrackError(error: unknown): string {
  if (!error) return "خطأ غير معروف"
  if (typeof error === "string") return error.slice(0, MAX_MESSAGE)

  const e = error as { message?: string; code?: string; details?: string; hint?: string }
  const parts = [e.code, e.message].filter(Boolean).join(": ")
  const base = parts || e.details || e.hint || "خطأ غير معروف"
  return String(base).slice(0, MAX_MESSAGE)
}

const HINT =
  "الزيارات لن تُسجَّل في لوحة التحكم كلما استمر هذا. تحقّق بالترتيب: " +
  "1) مشروع Supabase نشط وغير موقوف، 2) VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY مضبوطان في بيئة النشر، " +
  "3) سياسة الإدراج «anyone can log a page view» موجودة على public.page_views، " +
  "4) ترويسة CSP لا تمنع الاتصال بنطاق Supabase."

/**
 * يسجّل فشل إدراج زيارة: أثر في sessionStorage + تحذير واحد في console لكل جلسة.
 * لا يرمي أي خطأ مهما حدث (التتبّع لا يُسقط التطبيق).
 */
export function recordTrackFailure(contentType: string, contentId: string, error: unknown): void {
  const record: TrackFailure = {
    at: new Date().toISOString(),
    contentType,
    contentId: String(contentId ?? ""),
    message: describeTrackError(error),
  }

  const storage = safeSession()
  try {
    storage?.setItem(FAILURE_KEY, JSON.stringify(record))
  } catch {
    /* تجاهل إن كان التخزين غير متاح أو ممتلئاً */
  }

  let alreadyWarned = false
  try {
    alreadyWarned = storage?.getItem(WARNED_KEY) === "1"
  } catch {
    alreadyWarned = false
  }
  if (alreadyWarned) return

  try {
    // console.warn لا error: لا نُفزع الزائر ولا نُفشل أي مراقبة أخطاء حقيقية
    console.warn(`[mizan] تعذّر تسجيل الزيارة (${contentType}). السبب: ${record.message}\n${HINT}`)
  } catch {
    /* تجاهل */
  }
  try {
    storage?.setItem(WARNED_KEY, "1")
  } catch {
    /* تجاهل */
  }
}

/** آخر فشل مسجَّل في هذه الجلسة — للتشخيص اليدوي وسؤال «هل الإدراج يعمل؟». */
export function readTrackFailure(): TrackFailure | null {
  const storage = safeSession()
  try {
    const raw = storage?.getItem(FAILURE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TrackFailure
    if (!parsed || typeof parsed !== "object" || typeof parsed.at !== "string") return null
    return parsed
  } catch {
    return null
  }
}
