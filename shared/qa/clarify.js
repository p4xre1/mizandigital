// shared/qa/clarify.js
//
// طبقة التوضيح: تقرر قبل الاسترجاع هل يحتاج السؤال إلى توضيح، وتبني الاقتراحات والخيارات.
// قواعد حتمية (لا تعلّم آلي ولا فهم دلالي)، وكل قاعدة تُختبر على حدة في tests/clarify.test.ts.
//
// القواعد بالترتيب:
//   1) incomplete / missing_reference: لا موضوع في السؤال (بعد حذف الكلمات العامة والاستفهام).
//      المرجع ("هذا"، "كيف يعمل") يُحل من السؤال السابق إن وُجد، وإلا يُطلب التوضيح.
//   2) misspelling: كلمة محتوى غير موجودة في فهرس الكلمات، وقريبة (تحرير واحد أو اثنان) من مصطلح معجمي.
//      لا يُستبدل الخطأ بصمت: يُعرض الاقتراح للتأكيد.
//   3) ambiguous_branch: مفهوم له أكثر من فرع (مثل التقادم: مدني، جنائي، تجاري) دون تحديد الفرع.
//      الفرع الذي لا تملك المصادر نصاً موثّقاً عنه يُجاب عنه بجملة عدم اليقين.
//   4) ambiguous_term: مصطلح مشترك في رأس عبارة لها أكثر من مصطلح في المعجم، دون مطابقة كاملة.
//   5) answer: غير ذلك، يُمرّ السؤال كما هو إلى الخط الحالي دون تغيير.
//
// لا يُعاد نص الاقتراح من العميل أبداً: الاختيار يُقبل بمعرّف فقط، والسؤال يُعاد حسابه من الأصل.

import { getDefaultEngine } from "./engine.js"
import { analyzeQuestion } from "./analyze.js"
import { normalizeArabic } from "./normalize.js"
import { transliterateLegalLatin } from "./translit.js"
import { screenMessage } from "../help/guardrails.js"
import { allEntries } from "../help/knowledge.js"
import {
  AMBIGUOUS_PREVIOUS_REPLY,
  CHOICE_IDS,
  CHOICE_LABELS,
  CLARIFY_CONFIRM_QUESTION,
  CLARIFY_LIMITS,
  CONCEPTS,
  EXPIRED_REPLY,
  EXPLAIN_REPLY,
  HOW_IT_WORKS_RE,
  INCOMPLETE_REPLY,
  NEGATION_WORDS,
  PREFIX_LETTERS,
  REFERENCE_WORDS,
  UNCLEAR_REFERENCE_REPLY,
  VAGUE_WORDS,
  branchNotFoundReply,
  scopeNoteReply,
} from "./clarify-config.js"

const ARABIC_RE = /[\u0600-\u06FF]/
const LATIN_RE = /[A-Za-z]/
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/
const UNSAFE_RE = /[<>]/
const EDGE_RE = /^[\s"'«»“”‘’.,،؛:؟?!()[\]{}\-–]+|[\s"'«»“”‘’.,،؛:؟?!()[\]{}\-–]+$/g
const N = (text) => normalizeArabic(text)

/** فهارس الكلمات والمصطلحات، تُبنى مرة واحدة لكل محرك. */
const indexCache = new WeakMap()

/**
 * الكلمات المعروفة في محتوى الموقع نفسه (الأدلة والأسئلة والمعجم). الكلمة المعروفة هنا ليست خطأً إملائياً،
 * حتى لو لم تكن في فهرس المصطلحات القانونية. بدونها تُعد كلمات عادية مثل "الموقع" أخطاء.
 */
let siteWords = null
function siteKnownWords() {
  if (siteWords) return siteWords
  siteWords = new Set()
  const collect = (value) => {
    if (typeof value === "string") {
      for (const tok of N(value).split(" ")) if (tok) siteWords.add(tok)
    } else if (Array.isArray(value)) {
      value.forEach(collect)
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(collect)
    }
  }
  collect(allEntries())
  return siteWords
}

function indexFor(engine) {
  const cached = indexCache.get(engine)
  if (cached) return cached

  const labelByNorm = new Map()
  for (const p of engine.corpus.passages) {
    if (p.kind !== "definition") continue
    for (const label of p.termLabels || []) {
      const norm = N(label)
      if (norm && !labelByNorm.has(norm)) labelByNorm.set(norm, String(label).trim())
    }
  }
  const labels = [...labelByNorm].map(([norm, display]) => ({ norm, display, tokens: norm.split(" ") }))

  const wordDisplay = new Map()
  for (const { display } of labels) {
    for (const word of display.split(/\s+/)) {
      const norm = N(word)
      if (norm.length >= 4 && !wordDisplay.has(norm)) wordDisplay.set(norm, word)
    }
  }

  const concepts = CONCEPTS.map((c) => ({
    id: c.id,
    triggers: c.triggers.map(N),
    branches: c.branches.map((b) => ({ id: b.id, label: b.label, codeKey: b.codeKey, qualifiers: b.qualifiers.map(N) })),
  }))

  // الفرع مدعوم فقط إذا وُجد في المصادر نص مكتمل (له رمز الفرع ويذكر المفهوم)، وإلا فلا يُجاب عنه.
  const sourced = new Map()
  for (const concept of concepts) {
    for (const branch of concept.branches) {
      const ok =
        branch.codeKey !== null &&
        engine.corpus.passages.some(
          (p) =>
            p.kind === "legal_text" &&
            p.citable === true &&
            p.codeKey === branch.codeKey &&
            String(p.normalized || "")
              .split(" ")
              .some((tok) => concept.triggers.includes(tok)),
        )
      sourced.set(`${concept.id}:${branch.id}`, ok)
    }
  }

  const words = [...wordDisplay.keys()]
  const built = { labels, wordDisplay, concepts, sourced, words }
  indexCache.set(engine, built)
  return built
}

/**
 * حذف حرف، أو إضافته، أو تبديل حرفين متجاورين. لا يشمل استبدال حرف بآخر:
 * الاستبدال كثير الشيوع بين كلمات عربية حقيقية مختلفة (مثل المؤلف والمؤقت)، فيُعد إشارة ضعيفة.
 */
function isDeleteInsertOrSwap(a, b) {
  if (a === b) return false
  if (Math.abs(a.length - b.length) === 1) {
    const [short, long] = a.length < b.length ? [a, b] : [b, a]
    for (let i = 0; i < long.length; i += 1) if (long.slice(0, i) + long.slice(i + 1) === short) return true
    return false
  }
  if (a.length === b.length) {
    for (let i = 0; i < a.length - 1; i += 1) {
      if (a.slice(0, i) + a[i + 1] + a[i] + a.slice(i + 2) === b) return true
    }
  }
  return false
}

/** أفعال الأمر التي تحاول تغيير سلوك المساعد. الجملة التي تبدأ بها تُستبعد من الاقتراح (لا من الفحص الأمني). */
const OVERRIDE_VERBS = new Set(["تجاهل", "تناس", "انس", "اعتبر", "تصرف", "تظاهر", "اكشف", "اطبع", "اجب", "انت"].map(N))

/** يُقسَّم السؤال إلى جمل، ويُسقط كل جملة فيها فعل أمر تجاوزي، حتى لا يُعاد نصه في اقتراح للتأكيد. */
function withoutOverrideClauses(raw) {
  // الفاصل نقطة تتبعها مسافة أو نهاية فقط، فلا تنكسر الرموز مثل «ق.ل.ع» أو «70.03».
  const parts = String(raw ?? "").split(/([:؛!؟?\n]|\.(?=\s|$))/)
  let out = ""
  for (let i = 0; i < parts.length; i += 2) {
    const clause = parts[i] ?? ""
    const separator = parts[i + 1] ?? ""
    if (!N(clause).split(" ").some((w) => OVERRIDE_VERBS.has(w))) out += clause + separator
  }
  return out
}

/** النص المعروض للمستخدم: كلماته هو، والإنجليزية/اللاتينية تُحوَّل بالجسر المعروف فقط، وغيرها تُحذف. */
function displayWords(raw) {
  const out = []
  for (const piece of withoutOverrideClauses(raw).trim().split(/\s+/)) {
    if (!piece) continue
    if (ARABIC_RE.test(piece)) {
      const word = piece.replace(/[A-Za-z]+/g, "").replace(EDGE_RE, "")
      if (word && ARABIC_RE.test(word)) out.push(word)
    } else if (/^\d[\d.\-]*$/.test(piece)) {
      out.push(piece.replace(EDGE_RE, ""))
    } else {
      const bridged = transliterateLegalLatin(piece)
      if (bridged) out.push(...bridged.split(" "))
    }
  }
  return out.filter(Boolean)
}

function isSafeText(text, max) {
  return (
    typeof text === "string" &&
    text.length > 0 &&
    text.length <= max &&
    ARABIC_RE.test(text) &&
    !LATIN_RE.test(text) &&
    !CONTROL_RE.test(text) &&
    !UNSAFE_RE.test(text) &&
    !screenMessage(text).block
  )
}

function clip(text, max) {
  const s = String(text ?? "")
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…"
}

function toQuestionText(words) {
  const text = words.join(" ").replace(/\s+/g, " ").trim()
  if (!text) return null
  const withMark = /[؟?]$/.test(text) ? text : `${text}؟`
  return isSafeText(withMark, CLARIFY_LIMITS.maxSuggestionChars) ? withMark : null
}

function negationCount(text) {
  const words = N(text).split(" ")
  return words.filter((w) => NEGATION_WORDS.map(N).includes(w)).length
}

/** لا يجوز أن يسقط نفي أو استثناء من السؤال عند الاقتراح أو عرض الخيار. */
function keepsNegation(baseText, candidateText) {
  return negationCount(candidateText) >= negationCount(baseText)
}

/** استبدال أول كلمة تطابق. يُعيد الكلمات الجديدة، أو null إن لم توجد كلمة مطابقة. */
function replaceFirst(words, matchFn, replacement) {
  let replaced = false
  const out = words.map((w) => {
    if (replaced) return w
    const prefix = matchFn(N(w))
    if (prefix === null) return w
    replaced = true
    return `${prefix}${replacement}`
  })
  return replaced ? out : null
}

function triggerMatcher(triggers) {
  return (norm) => {
    for (const t of triggers) {
      if (norm === t) return ""
      for (const p of PREFIX_LETTERS) if (norm === p + t) return p
    }
    return null
  }
}

/** صياغة اقتراح أو خيار: آمنة، عربية فقط، ولا تُسقط نفياً. */
function variant(baseWords, candidateWords) {
  const question = toQuestionText(candidateWords)
  if (!question) return null
  return keepsNegation(baseWords.join(" "), question) ? question : null
}

function describe(analysis, idx, engine) {
  const tokens = analysis.tokens
  const qSet = new Set(tokens)
  for (const variants of analysis.variants.values()) for (const v of variants) qSet.add(v)
  const content = analysis.content
  const contentSet = new Set(content)

  const exact = idx.labels.filter((l) => l.tokens.every((t) => qSet.has(t)))
  const heads = idx.labels.filter((l) => l.tokens.length >= 2 && contentSet.has(l.tokens[0]) && !exact.includes(l))

  const concepts = []
  for (const concept of idx.concepts) {
    const trigger = concept.triggers.find((t) => qSet.has(t))
    if (!trigger) continue
    const branch = concept.branches.find((b) => b.qualifiers.some((x) => qSet.has(x))) ?? null
    concepts.push({ concept, trigger, branch })
  }

  const vague = new Set(VAGUE_WORDS.map(N))
  const refs = new Set(REFERENCE_WORDS.map(N))
  const nonVague = content.filter((t) => !vague.has(t))
  const entities = analysis.entities
  const hasEntity = entities.articles.length > 0 || entities.lawNumbers.length > 0 || entities.codes.length > 0

  // أخطاء إملائية: شرط صارم. الكلمة المجهولة الوحيدة في السؤال، طولها خمسة أحرف أو أكثر،
  // وتختلف عن مصطلح معجمي بحذف أو إضافة أو تبديل حرفين. ما عدا ذلك لا يُعد خطأً.
  const known = (t) => engine.index.vocabulary.has(t) || siteKnownWords().has(t)
  const unknown = content.filter((t) => ARABIC_RE.test(t) && t.length >= 3 && !/\d/.test(t) && !known(t))
  const typos = []
  if (exact.length === 0 && concepts.length === 0 && !hasEntity && unknown.length === 1) {
    const t = unknown[0]
    if (t.length >= 5) {
      const candidates = idx.words.filter((w) => w.length >= 5 && isDeleteInsertOrSwap(t, w))
      if (candidates.length > 0) typos.push({ token: t, candidates: candidates.slice(0, CLARIFY_LIMITS.maxTypoCandidates) })
    }
  }

  // السؤال عن المفهوم وحده (مثل: ما هو التقادم؟) لا يحتاج فرعاً. أي كلمة أخرى عربية ذات معنى تُبطل ذلك.
  const conceptWords = new Set(idx.concepts.flatMap((c) => c.triggers))
  const focusOnly = concepts.length > 0 && nonVague.filter((t) => ARABIC_RE.test(t)).every((t) => conceptWords.has(t))

  return {
    exact,
    heads,
    concepts,
    focusOnly,
    typos,
    intent: analysis.intent.type,
    deictic: tokens.some((t) => refs.has(t)),
    howItWorks: HOW_IT_WORKS_RE.test(analysis.normalized),
    topic: exact.length > 0 || heads.length > 0 || concepts.length > 0 || hasEntity || nonVague.length > 0,
  }
}

function branchRef(concept, branch, trigger) {
  return { conceptId: concept.id, id: branch.id, label: branch.label, codeKey: branch.codeKey, trigger }
}

function analysisOf(text, engine) {
  return analyzeQuestion(text, { config: engine.config })
}

/** مرجع الفرع من السؤال السابق، إن كان سليماً وآمناً. */
function resolvePrevious(raw, engine, idx) {
  if (typeof raw !== "string" || !raw.trim() || raw.length > CLARIFY_LIMITS.maxPreviousQuestionChars) return null
  if (CONTROL_RE.test(raw) || screenMessage(raw).block) return null
  const analysis = analysisOf(raw, engine)
  if (!analysis.ok) return null
  const q = describe(analysis, idx, engine)
  const words = displayWords(raw)
  const hit = q.concepts.find((c) => c.branch)
  return {
    display: toQuestionText(words),
    branch: hit ? branchRef(hit.concept, hit.branch, hit.trigger) : null,
  }
}

/** هل يملك الفرع نصاً موثّقاً في المصادر؟ */
export function branchIsSourced(branch, engine = getDefaultEngine()) {
  if (!branch?.conceptId) return false
  return indexFor(engine).sourced.get(`${branch.conceptId}:${branch.id}`) === true
}

/** ملاحظة نطاق للإجابة العامة: تذكر الفروع التي لا تملك مصادر موثقة. */
function scopeNoteFor(question, engine, idx) {
  const analysis = analysisOf(question, engine)
  if (!analysis.ok) return null
  const qSet = new Set(analysis.tokens)
  for (const variants of analysis.variants.values()) for (const v of variants) qSet.add(v)
  for (const concept of idx.concepts) {
    if (!concept.triggers.some((t) => qSet.has(t))) continue
    if (concept.branches.some((b) => b.qualifiers.some((x) => qSet.has(x)))) return null
    const missing = concept.branches.filter((b) => idx.sourced.get(`${concept.id}:${b.id}`) !== true).map((b) => b.label)
    return missing.length > 0 ? scopeNoteReply(missing) : null
  }
  return null
}

function clarifyDecision(kind, explanation, suggestion = null, options = []) {
  return { decision: "clarify", clarification: { kind, explanation, suggestion, options } }
}

function answerDecision(questionText, extra = {}) {
  return { decision: "answer", questionText, branch: extra.branch ?? null, note: extra.note ?? null, scopeNote: extra.scopeNote ?? null }
}

/**
 * يقرر هل يُجاب السؤال مباشرة أم يُوضَّح أولاً.
 * @param {string} raw  السؤال الأصلي كما كتبه المستخدم (بعد الفحوص الأمنية في خط المعالجة)
 * @param {{ engine?: object, retrievalText?: string, previousQuestion?: string }} [options]
 */
export function assessQuestion(raw, options = {}) {
  const engine = options.engine ?? getDefaultEngine()
  const idx = indexFor(engine)
  const text = String(raw ?? "")
  const analysis = analyzeQuestion(text, { retrievalText: options.retrievalText ?? "", config: engine.config })
  if (!analysis.ok) {
    return ARABIC_RE.test(text) ? answerDecision(text) : clarifyDecision("incomplete", INCOMPLETE_REPLY)
  }

  const q = describe(analysis, idx, engine)
  const words = displayWords(text)
  const prev = resolvePrevious(options.previousQuestion, engine, idx)

  // 1) لا موضوع في السؤال.
  if (!q.topic) {
    if (q.deictic || q.howItWorks) {
      if (prev?.display) {
        return clarifyDecision(
          "missing_reference",
          AMBIGUOUS_PREVIOUS_REPLY,
          { question: prev.display, branch: prev.branch, scopeNote: null },
        )
      }
      return clarifyDecision("missing_reference", UNCLEAR_REFERENCE_REPLY)
    }
    return clarifyDecision("incomplete", INCOMPLETE_REPLY)
  }

  // 2) خطأ إملائي محتمل: اقتراح للتأكيد، لا استبدال صامت.
  if (q.typos.length > 0) return misspellingDecision(q.typos[0], words, text, idx, engine)

  // 3) مفهوم له فروع.
  if (q.concepts.length > 0) {
    const hit = q.concepts[0]
    if (hit.branch) return answerDecision(text, { branch: branchRef(hit.concept, hit.branch, hit.trigger) })
    if (q.intent === "definition" && q.focusOnly) return answerDecision(text, { scopeNote: scopeNoteFor(text, engine, idx) })
    if (prev?.branch) {
      const inherited = replaceFirst(words, triggerMatcher([hit.trigger]), prev.branch.label)
      const question = inherited ? variant(words, inherited) : null
      if (question) {
        return answerDecision(question, {
          branch: prev.branch,
          note: `بناءً على سؤالك السابق اعتمدت «${prev.branch.label}».`,
        })
      }
    }
    return branchDecision(hit, words, text, idx, engine)
  }

  // 4) مصطلح في رأس عبارة له أكثر من مصطلح في المعجم، دون مطابقة كاملة.
  if (q.exact.length === 0 && q.heads.length > 0) {
    const byHead = new Map()
    for (const label of q.heads) {
      const head = label.tokens[0]
      byHead.set(head, [...(byHead.get(head) ?? []), label])
    }
    const [head, group] = [...byHead].sort((a, b) => b[1].length - a[1].length)[0]
    if (group.length >= 2) return termDecision(head, group, words, text, idx)
  }

  // 5) جواب مباشر.
  return answerDecision(text, { scopeNote: scopeNoteFor(text, engine, idx) })
}

function misspellingDecision(typo, words, text, idx, engine) {
  const displayWord = words.find((w) => N(w) === typo.token) ?? typo.token
  const variants = typo.candidates
    .map((cand) => {
      const replaced = replaceFirst(words, (n) => (n === typo.token ? "" : null), idx.wordDisplay.get(cand) ?? cand)
      const question = replaced ? variant(words, replaced) : null
      return question ? { cand, question } : null
    })
    .filter(Boolean)
  if (variants.length === 0) {
    return clarifyDecision("misspelling", `كلمة «${displayWord}» في سؤالك قد تكون مكتوبة بخطأ إملائي. أعد كتابتها بالشكل الصحيح.`)
  }
  const explanation = `كلمة «${displayWord}» في سؤالك قد تكون مكتوبة بخطأ إملائي. لن أستبدلها دون تأكيدك.`
  const suggestion = { question: variants[0].question, branch: null, scopeNote: scopeNoteFor(variants[0].question, engine, idx) }
  const options = variants.slice(1).map((v, i) => ({
    id: `option-${i + 1}`,
    label: clip(`أقصد ${idx.wordDisplay.get(v.cand) ?? v.cand}`, CLARIFY_LIMITS.maxLabelChars),
    question: v.question,
    branch: null,
    scopeNote: null,
  }))
  return clarifyDecision("misspelling", explanation, suggestion, options.slice(0, CLARIFY_LIMITS.maxOptions))
}

function branchDecision(hit, words, text, idx, engine) {
  const triggerWord = words.find((w) => N(w) === hit.trigger || PREFIX_LETTERS.some((p) => N(w) === p + hit.trigger)) ?? hit.trigger
  const explanation = `«${triggerWord}» قد يُقصد به أكثر من فرع في القانون: ${hit.concept.branches.map((b) => b.label).join("، ")}. لكل فرع قواعده، فلن أفترض الفرع المقصود.`
  const base = toQuestionText(words)
  const suggestion = base ? { question: base, branch: null, scopeNote: null } : null
  const options = []
  hit.concept.branches.forEach((b, i) => {
    const replaced = replaceFirst(words, triggerMatcher(hit.concept.triggers), b.label)
    const question = replaced ? variant(words, replaced) : null
    if (!question) return
    options.push({
      id: `option-${i + 1}`,
      label: clip(`أقصد ${b.label}`, CLARIFY_LIMITS.maxLabelChars),
      question,
      branch: branchRef(hit.concept, b, hit.trigger),
      scopeNote: null,
    })
  })
  return clarifyDecision("ambiguous_branch", explanation, suggestion, options.slice(0, CLARIFY_LIMITS.maxOptions))
}

function termDecision(head, group, words, text, idx) {
  const headWord = words.find((w) => N(w) === head) ?? head
  const labels = [...new Map(group.map((l) => [l.display, l])).values()]
  const items = labels
    .map((label) => {
      const replaced = replaceFirst(words, (n) => (n === head ? "" : null), label.display)
      const question = replaced ? variant(words, replaced) : null
      return question ? { label, question } : null
    })
    .filter(Boolean)
  if (items.length < 2) return answerDecision(text)
  // لا يُختار قراءة بعينها: كل القراءات المعقولة تُعرض بالتساوي.
  const explanation = `«${headWord}» يرد في المعجم بأكثر من مصطلح: ${items.map((i) => i.label.display).join("، ")}. هل تقصد أحدهما؟`
  const suggestion = null
  const options = items.slice(0, CLARIFY_LIMITS.maxOptions).map((item, i) => ({
    id: `option-${i + 1}`,
    label: clip(`أقصد ${item.label.display}`, CLARIFY_LIMITS.maxLabelChars),
    question: item.question,
    branch: null,
    scopeNote: null,
  }))
  return clarifyDecision("ambiguous_term", explanation, suggestion, options)
}

/**
 * الحالة العامة لما يُعرض للمستخدم: نص الشرح، والاقتراح، والخيارات، واختيارات الأزرار.
 * لا تُعاد نصوص الأسئلة المرشحة للخيارات، فالعميل لا يعرفها ولا يرسلها.
 */
export function toPublicClarification(clar) {
  const explanation = clip(clar.explanation, CLARIFY_LIMITS.maxExplanationChars)
  const suggestion = clar.suggestion ? clar.suggestion.question : null
  const options = (clar.options || []).slice(0, CLARIFY_LIMITS.maxOptions)
  const choices = []
  if (suggestion) choices.push({ id: "suggested", label: CHOICE_LABELS.suggested })
  for (const o of options) choices.push({ id: o.id, label: clip(o.label, CLARIFY_LIMITS.maxLabelChars) })
  if (choices.length > 0) choices.push({ id: "explain", label: CHOICE_LABELS.explain })
  return { kind: clar.kind, explanation, suggestion, choices }
}

/** نص احتياطي يُعرض في الرسالة نفسها (ولمسار الإدارة)، ويطابق الأزرار. */
export function renderClarification(pub) {
  const parts = [pub.explanation]
  if (pub.suggestion) parts.push(`السؤال المقترح: «${pub.suggestion}»\n\n${CLARIFY_CONFIRM_QUESTION}`)
  const options = pub.choices.filter((c) => c.id.startsWith("option-"))
  if (options.length > 0) parts.push(options.map((c) => `- ${c.label}`).join("\n"))
  return parts.join("\n\n")
}

export function explainReply() {
  return { kind: "explain", explanation: EXPLAIN_REPLY, suggestion: null, options: [] }
}

export function expiredReply() {
  return { kind: "expired", explanation: EXPIRED_REPLY, suggestion: null, options: [] }
}

/**
 * الاختيار من العميل: معرّف فقط. يُعاد حساب التوضيح من السؤال الأصلي، ثم يُقبل الخيار إن وُجد.
 * @returns {{decision:'answer'|'clarify'|'expired', questionText?:string, branch?:object|null, note?:string|null, scopeNote?:string|null, clarification?:object}}
 */
export function resolveClarificationChoice(raw, choice, options = {}) {
  if (!CHOICE_IDS.includes(choice)) return { decision: "expired" }
  const engine = options.engine ?? getDefaultEngine()
  const idx = indexFor(engine)
  const decision = assessQuestion(raw, { ...options, engine })
  if (decision.decision !== "clarify") return { decision: "expired" }
  const clar = decision.clarification

  if (choice === "explain") {
    if (clar.suggestion === null && clar.options.length === 0) return { decision: "expired" }
    return { decision: "clarify", clarification: explainReply() }
  }
  const item = choice === "suggested" ? clar.suggestion : clar.options.find((o) => o.id === choice)
  if (!item) return { decision: "expired" }
  return answerDecision(item.question, {
    branch: item.branch ?? null,
    scopeNote: item.scopeNote ?? scopeNoteFor(item.question, engine, idx),
  })
}

