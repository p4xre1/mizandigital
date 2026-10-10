// shared/qa/engine.js
//
// الواجهة الوحيدة لمحرك أسئلة المعرفة القانونية. تربط المراحل 1 إلى 12 بالترتيب، ولا تحوي منطقاً
// قانونياً بذاتها. كل مرحلة في ملفها الخاص ويُختبر كل ملف على حدة.
//
// العقد:
//   answer(raw, { retrievalText }) ⇒ { handled, mode, answer, sources, intent, passageIds, flags, reason }
//     handled = false ⇒ السؤال خارج نطاق الأدلة القانونية. يُكمل المسار الحالي للموقع (الموقع والأسئلة الشائعة).
//     handled = true  ⇒ الجواب مُتحقق منه (validate.js) ومبني من الأدلة، وهو عربي فقط.
//
// لا يُرجع المحرك نص السؤال، ولا يسجّله، ولا يحفظ الأدلة خارج الذاكرة لهذه المكالمة.

import { QA_CONFIG, withConfig } from "./config.js"
import { analyzeQuestion } from "./analyze.js"
import { buildCorpus } from "./corpus.js"
import { buildIndex, retrieve } from "./retrieve.js"
import { applyConstraints } from "./rank.js"
import { composeAnswer } from "./answer.js"
import { validateAnswer, articleNumbersIn } from "./validate.js"
import { UNVERIFIED_LEGAL_NOTE } from "../help/policy.js"

const SAFE_FALLBACK = `لم أتمكن من عرض جواب موثّق لسؤالك بوضوح حالياً.\n\n${UNVERIFIED_LEGAL_NOTE}`

/**
 * نطاق الأسئلة القانونية: اسم مصطلح (كامل أو جزئي) في المعجم، أو رقم فصل، أو رقم قانون مذكور.
 * الأرقام تُعدّ نطاقاً حتى لو لم يُوجد نصها، لأن الجواب حينها "لم أجده" وليس الرجوع للموقع.
 */
function inLegalScope(candidates, question, config) {
  if (question.entities.articles.length > 0 || question.entities.lawNumbers.length > 0) return true
  return candidates.some((c) => {
    const f = c.features
    if (f.mention > 0 || f.partial || f.articleRef || f.lawRef) return true
    // نص قانوني يغطي كلمتين أو أكثر من محتوى السؤال بنسبة كافية.
    const legalText = c.passage.kind === "legal_text" || c.passage.kind === "constitutional_reference"
    return legalText && f.covered >= 2 && f.coverage >= config.minCoverage
  })
}

function sourcesOf(passages) {
  const seen = new Set()
  const out = []
  for (const p of passages) {
    if (!p.url || !String(p.url).startsWith("/") || seen.has(p.url)) continue
    seen.add(p.url)
    out.push({ title: p.sourceTitle || p.title, url: p.url })
  }
  return out
}

/**
 * @param {{ data?: object, config?: object }} [options]  بيانات ونسخة إعدادات مخصّصة (للاختبار)
 */
export function createEngine({ data, config } = {}) {
  const cfg = withConfig(config ?? QA_CONFIG)
  const corpus = buildCorpus(data)
  const index = buildIndex(corpus)

  function answer(raw, options = {}) {
    const question = analyzeQuestion(raw, { retrievalText: options.retrievalText, config: cfg })
    if (!question.ok) return { handled: false, reason: question.code }

    const candidates = retrieve(question, index, cfg)
    if (!inLegalScope(candidates, question, cfg)) {
      // خارج النطاق: النية المعلنة "unsupported"، لأن السؤال ليس من نوع قانوني مدعوم هنا.
      return { handled: false, intent: "unsupported", reason: "out_of_legal_scope" }
    }

    const constrained = applyConstraints(candidates, question)
    const intent = question.intent.type
    const budget = cfg.answerBudgetWords[intent] ?? cfg.answerBudgetWords.lookup
    const questionNumbers = [
      ...question.entities.articles.map((a) => a.number),
      ...question.entities.lawNumbers,
    ]

    // نبدأ بعدد الأدلة الكامل، ثم نُنقص حتى يدخل الجواب الميزانية. لا يُقطع نص مُقتبس أبداً.
    let result = null
    let verdict = null
    for (let n = cfg.maxEvidence; n >= 1; n -= 1) {
      const attempt = composeAnswer({ question, constrained, config: { ...cfg, maxEvidence: n } })
      const evidence = attempt.passages
      const check = validateAnswer(attempt.answer, {
        evidenceTexts: evidence.flatMap((p) => [p.body, p.quote].filter(Boolean)),
        evidenceNumbers: evidence.flatMap((p) => [p.article, ...articleNumbersIn(`${p.body ?? ""} ${p.quote ?? ""}`)]).filter(Boolean),
        questionNumbers,
        budgetWords: budget,
      })
      if (check.ok) {
        result = attempt
        verdict = check
        break
      }
      if (!check.violations.includes("over_budget")) {
        verdict = check
        break
      }
    }

    if (!result) {
      return { handled: true, mode: "insufficient", answer: SAFE_FALLBACK, sources: [], intent, passageIds: [], flags: [], reason: `qa_${intent}_rejected`, violations: verdict?.violations ?? [] }
    }

    const passages = result.passages
    const flags = [...new Set(constrained.eligible.filter((c) => passages.includes(c.passage)).flatMap((c) => c.flags))]
    return {
      handled: true,
      mode: result.mode,
      answer: result.answer,
      sources: result.mode === "insufficient" ? [] : sourcesOf(passages),
      intent,
      passageIds: passages.map((p) => p.id),
      flags,
      reason: `qa_${result.mode}_${intent}`,
    }
  }

  return { answer, corpus, index, config: cfg }
}

let defaultEngine = null

/** المحرك الافتراضي ببيانات المستودع. يُبنى عند أول استعمال فقط. */
export function getDefaultEngine() {
  defaultEngine ??= createEngine()
  return defaultEngine
}

export function answerLegalQuestion(raw, options = {}) {
  return getDefaultEngine().answer(raw, options)
}
