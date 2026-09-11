/**
 * واجهة TypeScript نحو منطق التنقية المشترك.
 *
 * التنفيذ الفعلي موجود في `functions/_shared/payloadGuard.js` وهو نفس الملف
 * الذي يستعمله الخادم (functions/api/comments.js). هذا المقصود: قاعدة واحدة
 * للحكم على النص في الجهتين، فلا ينحرف فحص المتصفح عن فحص الخادم مع الوقت.
 *
 * ⚠️ تذكير أمني: كل ما هنا "تجربة مستخدم" فقط (منع الإرسال الخاطئ مبكراً).
 * الحماية الإلزامية موجودة في الخادم وفي مشغّل القاعدة
 * `comments_anti_abuse_guard`، لأن كود المتصفح يمكن تجاوزه بالكامل.
 */
export {
  CONTROL_CHARS_RE,
  INJECTION_PATTERNS,
  INVISIBLE_CHARS_RE,
  LIMITS,
  SPAM_KEYWORDS_RE,
  URL_RE,
  countUrls,
  detectInjection,
  detectSpam,
  inspectUserText,
  sanitizeUserText,
  stripInvisibleChars,
} from "../../../functions/_shared/payloadGuard.js"

export interface InspectionResult {
  ok: boolean
  value: string
  code: string | null
  log?: string
}

/**
 * رسائل عربية جاهزة للعرض، مرتبطة برموز `inspectUserText`.
 * الرموز التقنية (مثل `body:injection`) لا تُعرض أبداً للزائر.
 */
export const FIELD_ERROR_MESSAGES: Record<string, string> = {
  "name:too_short": "يرجى كتابة اسمك.",
  "name:too_long": "الاسم طويل جداً (الحد الأقصى 100 حرف).",
  "name:injection": "الاسم يحتوي على رموز غير مسموح بها.",
  "name:spam": "الاسم يبدو غير صالح.",
  "body:too_short": "التعليق قصير جداً.",
  "body:too_long": "التعليق طويل جداً (الحد الأقصى 2000 حرف).",
  "body:injection": "تعذّر قبول التعليق: يحتوي على وسوم أو أوامر غير مسموح بها.",
  "body:spam": "تعذّر قبول التعليق: يبدو أنه محتوى إشهاري.",
}

/** ترجمة رمز فحص إلى رسالة عربية (مع رسالة افتراضية آمنة). */
export function describeInspection(code: string | null): string {
  if (!code) return ""
  return FIELD_ERROR_MESSAGES[code] || "تعذّر إرسال التعليق، يرجى مراجعة النص."
}
