// tests/qa-benchmark.test.ts
//
// قياس محرك أسئلة المعرفة القانونية على tests/fixtures/qa-benchmark.json.
// المقياس يقيس صحة المسار على بيانات المستودع، لا الصحة القانونية (ليس تدقيقاً قانونياً).
import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { createEngine } from "../shared/qa/engine.js"
import { toArabicRetrievalText } from "../shared/help/language.js"
import { answerQuestion } from "../shared/help/answer.js"

type Item = {
  id: string
  question: string
  expectedIntent: string
  expectedMode: string
  expectedTerms: string[]
  expectedArticles: string[]
}

const bench = JSON.parse(readFileSync("tests/fixtures/qa-benchmark.json", "utf8")) as { items: Item[] }
const engine = createEngine()
const passageById = new Map(engine.index.docs.map((d: any) => [d.passage.id, d.passage]))

/** صفة الدليل ذات الصلة بالبنود المتوقعة: مصطلح متوقع، أو فصل متوقع. */
function isRelevant(passage: any, item: Item): boolean {
  if (item.expectedArticles.some((k) => k === `${passage.codeKey}|${passage.article}`)) return true
  if (item.expectedTerms.some((t) => (passage.termIds ?? []).includes(t))) return true
  return false
}

function run(item: Item) {
  const r: any = engine.answer(item.question, { retrievalText: toArabicRetrievalText(item.question) })
  const mode = r.handled ? r.mode : "unhandled"
  const used = (r.passageIds ?? []).map((id: string) => passageById.get(id)).filter(Boolean)
  return { item, r, mode, used }
}

const results = bench.items.map(run)

// الأسئلة التي تُسلَّم للمسار الحالي للموقع (خارج نطاق الأدلة القانونية) لا يُتوقع أن يجيب عنها المحرك.
const HANDOFF = ["unsupported", "refused"]
// فئة "personal" (نصيحة شخصية) ليست نية في المحرك. المحرك يعلنها unsupported، والرفض يتم في طبقة السياسة.
const intentMatches = (x: any) =>
  x.r.intent === x.item.expectedIntent || (["unsupported", "personal"].includes(x.item.expectedIntent) && x.r.intent === "unsupported")
const modeMatches = (x: any) => x.mode === x.item.expectedMode || (x.mode === "unhandled" && HANDOFF.includes(x.item.expectedMode))

describe("benchmark: qa engine on repo data", () => {
  test("metrics", () => {
    const intentOk = results.filter(intentMatches).length
    const modeOk = results.filter(modeMatches).length

    // الاسترجاع والاستشهاد: للعناصر التي لها دليل متوقع وتجيب بالفعل.
    const answerable = results.filter((x) => x.item.expectedMode === "answer" && (x.item.expectedTerms.length || x.item.expectedArticles.length))
    const hit = answerable.filter((x) => x.used.some((p: any) => isRelevant(p, x.item))).length
    let usedTotal = 0
    let usedRelevant = 0
    for (const x of answerable) {
      for (const p of x.used) {
        usedTotal += 1
        if (isRelevant(p, x.item)) usedRelevant += 1
      }
    }

    // الجواب المعطى حين يجب الامتناع: نسبة الأجوبة غير المدعومة.
    const mustAbstain = results.filter((x) => ["insufficient", "unsupported", "refused", "clarify"].includes(x.item.expectedMode))
    const unsupportedAnswers = mustAbstain.filter((x) => x.mode === "answer").map((x) => x.item.id)

    const metrics = {
      items: results.length,
      intentAccuracy: `${intentOk}/${results.length}`,
      modeAccuracy: `${modeOk}/${results.length}`,
      recall_at_answer: `${hit}/${answerable.length}`,
      precision_of_cited_passages: `${usedRelevant}/${usedTotal}`,
      unsupported_answers: unsupportedAnswers,
      unsupported_rate: `${unsupportedAnswers.length}/${mustAbstain.length}`,
    }
    console.log("QA_METRICS " + JSON.stringify(metrics))
    const mismatches = results
      .filter((x) => !modeMatches(x))
      .map((x) => `${x.item.id} exp=${x.item.expectedMode} got=${x.mode} intent=${x.r.intent}`)
    console.log("QA_MODE_MISMATCH " + JSON.stringify(mismatches, null, 1))
    const intentMismatch = results
      .filter((x) => !intentMatches(x))
      .map((x) => `${x.item.id} exp=${x.item.expectedIntent} got=${x.r.intent}`)
    console.log("QA_INTENT_MISMATCH " + JSON.stringify(intentMismatch))

    // خط الأساس: المسار القديم (answerQuestion) قبل إدخال المحرك. لا يُعيد معرّفات الأدلة،
    // لذلك تُحسب الصلة تقريبياً من نص الجواب ورابط المصدر (تقدير، لا قياس دقيق).
    const legacy = bench.items.map((item) => {
      const r: any = answerQuestion(item.question, { retrievalText: toArabicRetrievalText(item.question) })
      const text = `${r.answer ?? ""} ${(r.sources ?? []).map((s: any) => `${s.title} ${s.url}`).join(" ")}`
      const labelOf = (id: string) => engine.corpus.termLabels?.get?.(id) ?? ""
      const articleHit = (key: string) => {
        const [code, num] = key.split("|")
        return r.mode === "answer" && text.includes(code) && new RegExp(`(?<!\\d)${num}(?!\\d)`).test(r.answer ?? "")
      }
      const termHit = (id: string) => {
        const label = labelOf(id)
        return Boolean(label) && text.includes(label)
      }
      const relevant = item.expectedMode === "answer" && (item.expectedTerms.some(termHit) || item.expectedArticles.some(articleHit))
      return { id: item.id, mode: r.mode, relevant, expectsAnswer: item.expectedMode === "answer", mustAbstain: ["insufficient", "unsupported", "refused", "clarify"].includes(item.expectedMode) }
    })
    const legacyAnswerable = legacy.filter((x) => x.expectsAnswer && x.mode === "answer")
    const legacyRecall = legacy.filter((x) => x.expectsAnswer && x.relevant).length
    const legacyUnsupported = legacy.filter((x) => x.mustAbstain && x.mode === "answer").map((x) => x.id)
    const legacyMetrics = {
      note: "approximate: legacy answers carry no passage ids",
      answered_with_relevant_source: `${legacyRecall}/${legacy.filter((x) => x.expectsAnswer).length}`,
      answered_items: legacyAnswerable.length,
      unsupported_answers: legacyUnsupported,
      unsupported_rate: `${legacyUnsupported.length}/${legacy.filter((x) => x.mustAbstain).length}`,
    }
    console.log("QA_LEGACY_BASELINE " + JSON.stringify(legacyMetrics))
    expect(results.length).toBe(42)
  })
})
