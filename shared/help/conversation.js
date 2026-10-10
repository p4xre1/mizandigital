// shared/help/conversation.js
//
// تصنيف نية الرسالة والإشارات العاطفية والنبرة وطلب التفصيل. كلها قواعد بسيطة قابلة للاختبار،
// لا نموذج تعلّم آلي، ولا تُعرض للزائر أي نتيجة منها كتشخيص.
//
// قواعد ثابتة في هذا الملف:
//   • الإشارة العاطفية تغيّر النبرة فقط: لا تغيّر نص الجواب ولا مصادره ولا قرار الحظر أو اللغة.
//   • الرد الاجتماعي يُعطى فقط لرسالة قصيرة كلها تحية أو شكر أو وداع أو تعريف بالمساعد.
//   • إشارة الخطر الفوري تُقدَّم على أي نبرة أخرى، وتُعطى رد السلامة بدل الجواب القانوني.

import { normalize } from "./retrieve.js"
import { analyzeLanguage, toArabicRetrievalText } from "./language.js"
import { DETAIL_REQUEST_TERMS, NEUTRAL_TONE_TERMS } from "./policy.js"

/** الأنماط تُكتب بعد normalize() (ة→ه، أ→ا، ى→ي، ئ→ي). */
const SOCIAL_PATTERNS = [
  { intent: "greeting_salam", re: /^(السلام عليكم|سلام عليكم|عليكم السلام)( ورحمه الله)?( وبركاته)?$/ },
  { intent: "greeting", re: /^(سلام|مرحبا|مرحبتين|اهلا|اهلا وسهلا|اهلا بيك|اهلين|مرحبا بيك|صباح الخير|مساء الخير)$/ },
  { intent: "thanks", re: /^(شكرا|شكرا جزيلا|شكرا لك|شكرا كثير|يعطيك الصحه|بارك الله فيك|مشكور|مشكورين)$/ },
  { intent: "goodbye", re: /^(مع السلامه|بالسلامه|وداعا|الى اللقاء)$/ },
  { intent: "identity", re: /^(من انت|من انتم|من تكون|ما انت|ماذا انت|شنو انت|واش انت)$/ },
]

/** الحد الأعلى لعدد كلمات الرسالة الاجتماعية. */
const SOCIAL_MAX_WORDS = 5

/** @returns {"greeting_salam" | "greeting" | "thanks" | "goodbye" | "identity" | null} */
export function classifySocialIntent(text) {
  const { foreign, words } = analyzeLanguage(text)
  if (words === 0 || words > SOCIAL_MAX_WORDS) return null
  // الرسالة الاجتماعية عربية أو دارجة بالكامل. أي كلمة أجنبية تجعلها سؤالاً.
  if (foreign > 0) return null
  const mapped = normalize(toArabicRetrievalText(text) || text)
  const hit = SOCIAL_PATTERNS.find((p) => p.re.test(mapped))
  return hit ? hit.intent : null
}

/**
 * نص للتحليل العاطفي: النص المطبَّع مع الدارجة المحوّلة. الأنماط تعمل على الكلمات الكاملة
 * بإحاطة النص بمسافات، فلا تطابق جزءاً من كلمة.
 */
function semanticText(text) {
  return ` ${normalize(text)} ${normalize(toArabicRetrievalText(text))} `
}

const DISTRESS_RE = [
  /(انتحر|انتحار|اقتل نفسي|اقتل روحي|اقتل راسي|ما بغيت نعيش|ما ابغي اعيش|لا اريد ان اعيش|اريد ان اموت|اريد ان اقتل نفسي)/,
  /(اريد|ابغي|ابغا|بغيت) (ان )?(اموت|نموت)/,
  /(انا في خطر|راني في خطر|في خطر الان|يهددني (احد|شخص|زوجي|زوجتي|ابي|امي))/,
]
const FRUSTRATED_RE = [
  /(لم اجد|ما لقيت|ما لقيتش|مزعج|مزعجه|غير مفيد|مش مفيد|ما مفيد|ما نفعش|ما خدمش|ما خدمتش|فاشل|زهقت|مللت|غاضب|غاضبه|عصبت|مستاء|مستاءه|خايب)/,
]
const ANXIOUS_RE = [/(خايف|خايفه|قلقان|قلقانه|قلق|اخاف|نخاف|مرعوب|مرعوبه|ضياع حقي|ضياع حقوقي)/]
const DISCOURAGED_RE = [
  /(لن (استطيع|افهم|انجح)|اشعر (اني|انني) لن|محبط|محبطه|يئست|تعبت من|ما بقاش (عندي )?امل|ما عنديش (الصبر|امل)|ما بغيتش نكمل|مش قادر نكمل)/,
]
const CONFUSED_RE = [
  /(لم افهم|لا افهم|ما فهمت|ما فهمتش|مافهمتش|مش فاهم|مش فاهمه|محتار|محتاره|ما عرفتش|مش واضح|ما وضحش|صعيب علي|خلطت)/,
]
const HAPPY_SUCCESS_RE = [/(نجحت|نجحنا|نجحت في)/]
const HAPPY_RE = [/(فرحان|فرحانه|فرحت|مبسوط|مبسوطه|رائع|ممتاز|مبروك)/]

/**
 * يعيد الفئة العاطفية الأكثر أولوية، أو "neutral".
 * الترتيب: خطر فوري > إحباط من الموقع > قلق > يأس > ارتباك > فرح > محايد.
 * @returns {"distress" | "frustrated" | "anxious" | "discouraged" | "confused" | "happy_success" | "happy" | "neutral"}
 */
export function detectEmotion(text) {
  const s = semanticText(text)
  const any = (list) => list.some((re) => re.test(s))
  if (any(DISTRESS_RE)) return "distress"
  if (any(FRUSTRATED_RE)) return "frustrated"
  if (any(ANXIOUS_RE)) return "anxious"
  if (any(DISCOURAGED_RE)) return "discouraged"
  if (any(CONFUSED_RE)) return "confused"
  if (any(HAPPY_SUCCESS_RE)) return "happy_success"
  if (any(HAPPY_RE)) return "happy"
  return "neutral"
}

/**
 * عبارات الإشارة العاطفية (بعد normalize). تُحذف من نص الاسترجاع فقط، حتى لا تجذب
 * مدخلات عامة مثل "المحتوى" أو "البحث الداخلي" لسؤال لا جواب له. لا تُحذف منها كلمات الموضوع.
 */
const EMOTION_CUE_PHRASES = [
  "لم اجد اي شي",
  "لم اجد",
  "ما لقيت",
  "ما لقيتش",
  "غير مفيد",
  "مش مفيد",
  "ما مفيد",
  "مزعج",
  "مزعجه",
  "محبط",
  "محبطه",
  "زهقت",
  "مللت",
  "لم افهم",
  "لا افهم",
  "ما فهمت",
  "ما فهمتش",
  "مش فاهم",
  "مش فاهمه",
  "محتار",
  "محتاره",
  "خايف",
  "خايفه",
  "قلقان",
  "قلقانه",
  "اخاف",
]

/**
 * يحذف عبارات الإشارة العاطفية من نص الاسترجاع. الإشارة نفسها تبقى محسوبة من النص الأصلي.
 * @param {string} retrievalText نص عربي مُحوّل للاسترجاع
 * @returns {string}
 */
export function stripEmotionCues(retrievalText) {
  let s = ` ${normalize(retrievalText)} `
  for (const phrase of EMOTION_CUE_PHRASES) {
    s = s.split(` ${normalize(phrase)} `).join(" ")
  }
  return s.replace(/\s+/g, " ").trim()
}

/** @returns {boolean} true إذا طلب الزائر نبرة رسمية محايدة صراحةً. */
export function wantsNeutralTone(text) {
  const s = normalize(text)
  return NEUTRAL_TONE_TERMS.some((term) => s.includes(normalize(term)))
}

/** @returns {boolean} true إذا طلب الزائر تفصيلاً صراحةً. */
export function wantsDetail(text) {
  const s = normalize(text)
  return DETAIL_REQUEST_TERMS.some((term) => s.includes(normalize(term)))
}
