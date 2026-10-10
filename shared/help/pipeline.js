// خط المعالجة المشترك: يستعمله نقطة الطلب (الخادم) ولوحة الاختبار في الإدارة،
// فيرى المشرف بالضبط ما يراه الزائر. لا يستهلك أي حصة ولا يكتب في أي مكان.
//
// الترتيب (كل خطوة تُرفض في مكانها، والقرار الأمني لا يتأثر بأي خطوة بعده):
//   1) فحص الحقن والتمويه والهندسة الاجتماعية على السؤال الأصلي   (screenMessage)
//   2) بوابة اللغة: العربية والدارجة والمختلط مقبولة، غير ذلك يُرفض  (analyzeLanguage)
//   3) رد اجتماعي جاهز (تحية، شكر، وداع، تعريف)                       (classifySocialIntent)
//   4) إشارة خطر فوري ⇒ رد السلامة بدل الجواب                          (detectEmotion)
//   5) توضيح السؤال الغامض قبل الاسترجاع، أو تأكيد صياغة المستخدم      (assessQuestion)
//   6) الجواب من المحتوى أو من أسئلة المشرف                            (answerQuestion)
//   7) التحقق من الاستشهادات القانونية وإضافة تنبيه عدم اليقين         (verifyLegalCitations)
//   8) حد الطول البرمجي، ثم الاستجابة العاطفية الخفيفة في المقدمة       (enforceLengthLimit)
//   9) فحص الخرج قبل الإرسال                                            (sanitizeAnswerResult)

import { DEFAULT_MESSAGES } from "./cms.js"
import { screenMessage } from "./guardrails.js"
import { analyzeLanguage, toArabicRetrievalText, UNSUPPORTED_LANGUAGE_ANSWER } from "./language.js"
import { answerQuestion } from "./answer.js"
import { answerLegalQuestion } from "../qa/engine.js"
import {
  assessQuestion,
  branchIsSourced,
  expiredReply,
  renderClarification,
  resolveClarificationChoice,
  toPublicClarification,
} from "../qa/clarify.js"
import { branchNotFoundReply } from "../qa/clarify-config.js"
import { classifySocialIntent, detectEmotion, stripEmotionCues, wantsDetail, wantsNeutralTone } from "./conversation.js"
import { enforceLengthLimit } from "./output.js"
import { applyLegalNotes, verifyLegalCitations } from "./legal-sources.js"
import { isSafeInternalPath } from "./cms-constants.js"
import {
  CONTINUATION_OFFER,
  EMOTION_LEADS,
  LANGUAGE_NOTICE,
  LENGTH_LIMITS,
  SAFETY_MESSAGE,
  SOCIAL_REPLIES,
  UNVERIFIED_LEGAL_NOTE,
} from "./policy.js"

/** أنماط ممنوعة في جواب يصل إلى المتصفح، مهما كان مصدره. */
export const UNSAFE_OUTPUT_PATTERNS = [/[<>]/, /javascript\s*:/i, /data\s*:\s*text\/html/i, /\bon[a-z]{3,}\s*=/i]

/**
 * فحص الخرج الأخير: يُسقط المصادر غير الداخلية، ويستبدل الجواب غير الآمن بنص الحظر.
 * @param {{ mode: string, answer: string, sources: Array<{title: string, url: string}>, reason?: string }} result
 * @param {string} blockedText
 */
export function sanitizeAnswerResult(result, blockedText) {
  const sources = (result.sources || []).filter(
    (source) => source && typeof source.title === "string" && isSafeInternalPath(source.url),
  )
  const unsafe = UNSAFE_OUTPUT_PATTERNS.some((re) => re.test(String(result.answer || "")))
  if (unsafe) {
    return { mode: "blocked", answer: blockedText, sources: [], reason: "unsafe_output" }
  }
  return { ...result, sources }
}

/**
 * تقرير أي فئة عاطفية تُضاف في المقدمة للجواب الذي وُجد، أو الذي لم يُوجد.
 * لا تُضاف أي مقدمة مع النبرة الرسمية المحايدة.
 */
function leadFor(emotion, { found, professional }) {
  if (professional) return null
  switch (emotion) {
    case "happy":
      return EMOTION_LEADS.happy
    case "happy_success":
      return EMOTION_LEADS.happy_success
    case "confused":
      return EMOTION_LEADS.confused
    case "frustrated":
      return found ? EMOTION_LEADS.frustrated_found : EMOTION_LEADS.frustrated_not_found
    case "discouraged":
      return EMOTION_LEADS.discouraged
    case "anxious":
      return EMOTION_LEADS.anxious
    default:
      return null
  }
}

/**
 * يشغّل المسار الكامل لرسالة واحدة. النتيجة تحمل "reason" داخلياً للتسجيل،
 * ونقطة الطلب تحذفه قبل الرد للزائر.
 * @param {string} text
 * @param {{ settings?: object, customEntries?: object[], entries?: object[] }} config
 */
export function runPipeline(text, config = {}, options = {}) {
  const messages = config.settings?.messages || DEFAULT_MESSAGES
  if (config.settings && config.settings.enabled === false) {
    return sanitizeAnswerResult(answerQuestion(text, config), messages.blocked)
  }

  // 1) الحقن والتمويه والهندسة الاجتماعية.
  const screen = screenMessage(text)
  if (screen.block) {
    return { mode: "blocked", answer: messages.blocked, sources: [], reason: screen.reason ?? "unknown" }
  }

  // 2) بوابة اللغة. الرسالة غير المفهومة بالعربية تُرد بإشعار اللغة ولا تُجاب.
  if (analyzeLanguage(text).lang === "other") {
    return { mode: "unsupported_language", answer: LANGUAGE_NOTICE, sources: [] }
  }

  // 3) الردود الاجتماعية الجاهزة.
  const social = classifySocialIntent(text)
  if (social) {
    return { mode: "social", answer: SOCIAL_REPLIES[social], sources: [], reason: `social_${social}` }
  }

  // 4) إشارة خطر فوري: رد السلامة، ولا جواب قانونياً معه.
  const emotion = detectEmotion(text)
  if (emotion === "distress") {
    return { mode: "safety", answer: SAFETY_MESSAGE, sources: [], reason: "safety_signal" }
  }

  const professional = wantsNeutralTone(text)
  const detailed = wantsDetail(text)
  // نص الاسترجاع بلا عبارات الإحباط أو الارتباك، فلا تجذب مدخلات عامة. الفحوص الأمنية أعلاه تعمل على النص الأصلي.
  const retrievalText = stripEmotionCues(toArabicRetrievalText(text))

  // 5) طبقة التوضيح قبل الاسترجاع: السؤال الغامض يُوضَّح أولاً، ولا يُجاب عن تخمين.
  // الاختيار من العميل معرّف فقط، ويُعاد حساب التوضيح من السؤال الأصلي في الخادم.
  const ctx = { retrievalText, previousQuestion: options.previousQuestion }
  let decision = options.clarification
    ? resolveClarificationChoice(text, options.clarification.choice, ctx)
    : assessQuestion(text, ctx)
  // سؤال منشور من المشرف بجوابه المعتمد يُجاب بجوابه مباشرة، ولا يُعرض عليه توضيح.
  if (decision.decision !== "answer" && answerQuestion(text, { ...config, retrievalText }).reason === "custom_qa") {
    decision = { decision: "answer", questionText: text, branch: null, note: null, scopeNote: null }
  }
  if (decision.decision === "clarify") return clarifyResult(decision.clarification, messages)
  if (decision.decision === "expired") return clarifyResult(expiredReply(), messages)

  // السؤال الذي يُجاب عنه: الأصلي، أو الصياغة التي أكدها المستخدم (لا تُستعمل إلا بعد تأكيده).
  const qText = decision.questionText
  const qRetrieval = qText === text ? retrievalText : stripEmotionCues(toArabicRetrievalText(qText))
  // يظهر السؤال المُستعمل في الجواب فقط إن اختلف عن كلام المستخدم (تصحيح مؤكد، أو سياق من السؤال السابق).
  const used = qText === text ? {} : { questionUsed: qText }
  const withNote = (answer) => (decision.note ? `${decision.note}\n\n${answer}` : answer)

  const base = answerQuestion(qText, { ...config, retrievalText: qRetrieval })

  // فرع محدد (مثل: التقادم الجنائي): لا يُجاب إلا من نص موثّق لذلك الفرع، وإلا فجملة عدم اليقين.
  if (decision.branch && base.reason !== "custom_qa") {
    const legal = answerLegalQuestion(qText, { retrievalText: qRetrieval })
    const branch = decision.branch
    const found =
      legal.handled &&
      legal.mode === "answer" &&
      (legal.passageIds || []).some((id) => id.startsWith(`art:${branch.codeKey}|`)) &&
      branchIsSourced(branch)
    const lead = leadFor(emotion, { found, professional })
    const body = found ? legal.answer : `${branchNotFoundReply(branch.label)}\n\n${UNVERIFIED_LEGAL_NOTE}`
    const answer = lead ? `${lead}\n\n${body}` : body
    return sanitizeAnswerResult(
      {
        mode: found ? legal.mode : "insufficient",
        answer: withNote(answer),
        sources: found ? legal.sources : [],
        reason: found ? legal.reason : "branch_unverified",
        ...used,
      },
      messages.blocked,
    )
  }

  // محرك الأسئلة القانونية: يتقدم على المحتوى العام فقط حين يجد أدلة قانونية في المصادر المعتمدة.
  // لا يتجاوز: الأسئلة المخصصة من المشرف (custom_qa)، والرفض، والحظر، والتعطيل.
  const engineEligible = base.reason !== "custom_qa" && !["refused", "blocked", "disabled", "unsupported_language"].includes(base.mode)
  if (engineEligible) {
    const legal = answerLegalQuestion(qText, { retrievalText: qRetrieval })
    if (legal.handled) {
      const found = legal.mode === "answer"
      const lead = leadFor(emotion, { found, professional })
      const scope = found && decision.scopeNote ? `\n\n${decision.scopeNote}` : ""
      const answer = `${lead ? `${lead}\n\n` : ""}${legal.answer}${scope}`
      return sanitizeAnswerResult(
        { mode: legal.mode, answer: withNote(answer), sources: legal.sources, reason: legal.reason, ...used },
        messages.blocked,
      )
    }
  }

  if (base.mode === "not_found") {
    const lead = leadFor(emotion, { found: false, professional })
    const answer = lead ? `${lead}\n\n${base.answer}` : base.answer
    return sanitizeAnswerResult({ ...base, answer: withNote(answer), ...used }, messages.blocked)
  }

  // الرفض والحظر والمتوقف وخارج الموضوع تبقى كما هي، بلا أي تعديل عاطفي.
  if (base.mode !== "answer") {
    return sanitizeAnswerResult({ ...base, ...used }, messages.blocked)
  }

  // 6) والجواب الموجود: الحد البرمجي، ثم التنبيهات القانونية، ثم المقدمة العاطفية.
  const maxWords = detailed ? LENGTH_LIMITS.detailedMaxWords : LENGTH_LIMITS.defaultMaxWords
  const limited = enforceLengthLimit(base.answer, maxWords)
  let body = limited.text
  if (limited.truncated) body = `${body}\n\n${CONTINUATION_OFFER}`
  body = applyLegalNotes(body, verifyLegalCitations(limited.text))
  const lead = leadFor(emotion, { found: true, professional })
  const scope = decision.scopeNote ? `\n\n${decision.scopeNote}` : ""
  const answer = `${lead ? `${lead}\n\n` : ""}${body}${scope}`
  return sanitizeAnswerResult({ ...base, answer: withNote(answer), ...used }, messages.blocked)
}

/** نتيجة التوضيح: نص للعرض، وبيانات عامة للواجهة (بلا نصوص الخيارات). */
function clarifyResult(clar, messages) {
  const pub = toPublicClarification(clar)
  return sanitizeAnswerResult(
    { mode: "clarify", answer: renderClarification(pub), sources: [], clarification: pub, reason: `clarify_${pub.kind}` },
    messages.blocked,
  )
}
