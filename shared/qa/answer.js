// shared/qa/answer.js
//
// المرحلة 11: بناء الجواب من الأدلة فقط. لا يوجد نموذج لغوي، فكل جملة إما:
//   • نص مُقتبس حرفياً من الدليل (تعريف المعجم، أو نص مادة، أو اقتباس دستوري)، أو
//   • قالب ثابت من هذه الوحدة (عنوان، تنبيه، جملة عدم اليقين)، ولا يُدرج فيه أي رقم أو اسم
//     إلا ما ورد في الأدلة أو في السؤال.
//
// الاستراتيجية حسب النية:
//   definition        ← تعريف المصطلح + نصوص مرتبطة به إن وُجدت
//   conditions        ← النصوص المرتبطة بالمصطلح (لا قائمة شروط مُخترعة)
//   legislation_lookup← نص الفصل المطلوب، أو تنبيه بعدم وجوده، أو الإلغاء، أو التعارض
//   comparison        ← تعريفا المصطلحين جنباً إلى جنب، دون فروق لم تُذكر في المصادر
//   procedure         ← لا جواب إجرائي إلا بمصدر إجرائي (لا يوجد في المحتوى الحالي) ⇒ غير متحقق
//   explanation/lookup← أقرب دليل قوي، وإلا غير متحقق
//   clarify           ← مصطلحان متقاربان: سؤال توضيحي واحد

import { UNVERIFIED_LEGAL_NOTE, REPEALED_LEGAL_NOTE } from "../help/policy.js"
import { clarificationOptions } from "./rank.js"

const CURRENCY_NOTE =
  "لم أتحقق من سريان هذا النص حالياً من النص الرسمي المحيّن."

/** نص الاقتباس كما هو، مع مصدره ورقمه. الاسم والرقم من البيانات فقط. */
function citationLabel(p) {
  if (p.kind === "constitutional_reference") return `${p.articleLabel ?? "نص"} من الدستور المغربي (2011)`
  return `رقم ${p.article} من ${p.codeName} (${p.codeKey})`
}

function quoteBlock(p) {
  const kind = p.quotationType === "excerpt" ? "نص مقتطف" : "نص"
  return `${kind} ${citationLabel(p)}:\n«${p.quote}»`
}

function currencyLine(passages) {
  const legal = passages.filter((p) => p.kind === "legal_text" || p.kind === "constitutional_reference")
  if (legal.length === 0) return null
  const dates = legal
    .map((p) => (p.kind === "constitutional_reference" ? p.verification?.reviewedOn : p.verification?.lastVerified))
    .filter(Boolean)
  const last = dates.sort().at(-1)
  return last
    ? `${CURRENCY_NOTE} آخر مراجعة لهذا المصدر في المعجم: ${last}.`
    : CURRENCY_NOTE
}

function firstWords(text, n) {
  return String(text).split(/\s+/).slice(0, n).join(" ")
}

/** جواب غير متحقق: جملة عدم اليقين المعتمدة مع عبارة تشرح ما لم يُوجد. */
function insufficient(reason) {
  return `${reason}\n\n${UNVERIFIED_LEGAL_NOTE}`
}

/**
 * يُبقي نسخة واحدة لكل (قانون، فصل): الأطول بين النسخ المتداخلة. إن وُجد تعارض فيُبقى الكل.
 * @param {any[]} passages  مرتبة حسب الأفضلية؛ يُحفظ الترتيب
 * @param {Array<{ key: string, passageIds: string[] }>} conflicts
 */
function dedupeByArticle(passages, conflicts) {
  const conflicting = new Set(conflicts.map((c) => c.key))
  const bestByKey = new Map()
  const out = []
  for (const p of passages) {
    const key = p.codeKey && p.article ? `${p.codeKey}|${p.article}` : null
    if (!key || conflicting.has(key)) {
      out.push(p)
      continue
    }
    const prev = bestByKey.get(key)
    if (!prev) {
      bestByKey.set(key, p)
      out.push(p)
    } else if (String(p.quote).length > String(prev.quote).length) {
      out[out.indexOf(prev)] = p
      bestByKey.set(key, p)
    }
  }
  return out
}

/**
 * @param {object} ctx
 * @param {ReturnType<typeof import("./analyze.js").analyzeQuestion>} ctx.question
 * @param {ReturnType<typeof import("./rank.js").applyConstraints>} ctx.constrained
 * @param {typeof import("./config.js").QA_CONFIG} ctx.config
 * @returns {{ mode: "answer" | "clarify" | "insufficient", answer: string, passages: any[] }}
 */
export function composeAnswer({ question, constrained, config }) {
  const eligible = constrained.eligible
  const intent = question.intent.type
  const numbers = new Set(question.entities.articles.map((a) => a.number))

  // 1) التوضيح قبل أي جواب في الاستفسارات العامة.
  if (intent === "definition" || intent === "lookup" || intent === "explanation") {
    const options = clarificationOptions(eligible, config)
    if (options) {
      const lines = options.map((o, i) => `${i + 1}. ${o.label}: ${firstWords(o.definition, 8)}…`)
      return {
        mode: "clarify",
        answer: `سؤالك يحتمل أكثر من مصطلح في المعجم. هل تقصد أحد هذه المصطلحات؟\n${lines.join("\n")}\nأرجو تحديد المصطلح المقصود في سؤالك.`,
        passages: options.map((o) => eligible.find((c) => c.passage.id === o.id).passage),
      }
    }
  }

  const definitions = eligible.filter((c) => c.passage.kind === "definition").map((c) => c.passage)
  const legalEntries = eligible.filter((c) => c.passage.citable && (c.passage.kind === "legal_text" || c.passage.kind === "constitutional_reference"))
  const coveredById = new Map(legalEntries.map((c) => [c.passage.id, c.features.covered ?? 0]))
  // نص المادة الواحدة يُعرض مرة واحدة: الأطول إن كانت النسخ متطابقة أو متداخلة، والتعارض يُعرض كاملاً.
  const legal = dedupeByArticle(legalEntries.map((c) => c.passage), constrained.conflicts)
  const topDefinition = definitions[0] ?? null

  // 2) الإلغاء: إن طابق السؤالَ نصٌ مُلغى، يُعلَن ذلك صراحة ولا يُقدَّم نصاً ساري المفعول.
  const repealedMatch = constrained.excluded.some((x) => x.reason === "repealed")
  if (repealedMatch && numbers.size > 0) {
    return {
      mode: "insufficient",
      answer: `${REPEALED_LEGAL_NOTE}النص المذكور في سؤالك. لن أقدمه نصاً ساري المفعول.`,
      passages: [],
    }
  }

  if (intent === "comparison") {
    const mentioned = definitions.filter((p) => constrained.eligible.find((c) => c.passage.id === p.id)?.features.mention > 0)
    const distinct = []
    for (const p of mentioned) if (!distinct.some((d) => d.termIds[0] === p.termIds[0])) distinct.push(p)
    if (distinct.length >= 2) {
      const [a, b] = distinct
      return {
        mode: "answer",
        answer: `${a.title}: ${a.body}\n\n${b.title}: ${b.body}\n\nهذا ما تقوله تعريفات المعجم لكل مصطلح. لا أستطيع استخراج فروق أخرى من مصادرنا المعتمدة.`,
        passages: [a, b],
      }
    }
    if (distinct.length === 1) {
      // تعريف واحد فقط في المصادر: نعرضه، ونصرّح بأن المقارنة غير ممكنة دون الآخر. لا نستنتج فروقاً.
      const [a] = distinct
      return {
        mode: "answer",
        answer: `${a.title}: ${a.body}\n\nلم أجد في مصادرنا تعريفاً للمصطلح الآخر الوارد في سؤالك، لذلك لا أستطيع المقارنة بينهما.`,
        passages: [a],
      }
    }
    return { mode: "insufficient", answer: insufficient("لم أجد في مصادرنا تعريفين واضحين للمصطلحين المذكورين في سؤالك للمقارنة بينهما."), passages: [] }
  }

  if (intent === "procedure") {
    return { mode: "insufficient", answer: insufficient("مصادرنا المعتمدة لا تتضمن خطوات إجرائية لهذا السؤال."), passages: [] }
  }

  if (intent === "legislation_lookup" && numbers.size > 0) {
    const wanted = question.entities.articles
    const found = legal.filter((p) => wanted.some((a) => a.number === p.article && (!a.codeKey || a.codeKey === p.codeKey)))
    if (found.length === 0) {
      const label = wanted.map((a) => `رقم ${a.number}${a.codeKey ? ` من ${a.codeKey}` : ""}`).join("، ")
      return { mode: "insufficient", answer: insufficient(`لم أجد ${label} في مصادرنا المعتمدة.`), passages: [] }
    }
    const blocks = found.slice(0, config.maxEvidence).map(quoteBlock)
    const conflict = constrained.conflicts.some((c) => found.some((p) => c.passageIds.includes(p.id)))
    const parts = [...blocks]
    if (conflict) parts.push("يوجد في مصادرنا نصان مختلفان لهذا الفصل، ولا أستطيع ترجيح أحدهما.")
    parts.push(currencyLine(found))
    return { mode: "answer", answer: parts.filter(Boolean).join("\n\n"), passages: found.slice(0, config.maxEvidence) }
  }

  if (intent === "legislation_lookup" && question.entities.lawNumbers.length > 0) {
    const records = eligible.filter((c) => c.passage.kind === "law_record" && question.entities.lawNumbers.includes(c.passage.lawNumber)).map((c) => c.passage)
    if (records.length > 0) {
      const r = records[0]
      return {
        mode: "answer",
        answer: `يوجد في الأرشيف القانوني سجل للقانون رقم ${r.lawNumber}: ${r.title}. هذا السجل لا يتضمن نص المواد، وحالة سريانه ${r.status === "in_force" ? "مذكورة في السجل" : "غير مُتحقَّق منها"}.`,
        passages: [r],
      }
    }
    return { mode: "insufficient", answer: insufficient("لم أجد هذا القانون في الأرشيف القانوني المعتمد."), passages: [] }
  }

  if (intent === "conditions") {
    const related = legal.filter((p) => topDefinition && p.termIds.includes(topDefinition.termIds[0]))
    const pool = (related.length > 0 ? related : legal.filter((p) => question.entities.articles.some((a) => a.number === p.article)))
      // الأولوية لما يغطي أكبر عدد من كلمات السؤال (مثلاً "صحة" و"الالتزام" معاً).
      .sort((a, b) => (coveredById.get(b.id) ?? 0) - (coveredById.get(a.id) ?? 0))
    if (pool.length === 0) {
      return { mode: "insufficient", answer: insufficient("لا تتضمن مصادرنا المعتمدة نصاً مرتبطاً بهذا المصطلح يذكر شروطه."), passages: [] }
    }
    const shown = pool.slice(0, config.maxEvidence)
    const head = "النصوص المرتبطة بالمصطلح في مصادرنا المعتمدة، وليست قائمة شاملة لكل الشروط:"
    return {
      mode: "answer",
      answer: [head, ...shown.map(quoteBlock), currencyLine(shown)].filter(Boolean).join("\n\n"),
      passages: shown,
    }
  }

  // 3) الجواب المعرفي (تعريف، شرح، أو بحث عام): التعريف، ثم النصوص المرتبطة به.
  const topDefinitionMention = topDefinition ? eligible.find((c) => c.passage === topDefinition)?.features.mention ?? 0 : 0
  if (topDefinition && topDefinitionMention > 0) {
    const linked = legal.filter((p) => p.termIds.includes(topDefinition.termIds[0])).slice(0, config.maxEvidence)
    const parts = [`${topDefinition.title}: ${topDefinition.body}`]
    if (linked.length > 0) {
      parts.push("نصوص مرتبطة بالمصطلح في مصادرنا:")
      parts.push(...linked.map(quoteBlock))
      parts.push(currencyLine(linked))
    }
    return { mode: "answer", answer: parts.filter(Boolean).join("\n\n"), passages: [topDefinition, ...linked] }
  }

  // أقرب نص: يلزم أن يغطي كلمتين على الأقل من السؤال، أو أن يطابق رقماً مذكوراً. لا يكفي تطابق كلمة واحدة.
  const strong = dedupeByArticle(
    legalEntries.filter((c) => (c.features.covered ?? 0) >= 2 || c.features.articleRef || c.features.lawRef).map((c) => c.passage),
    constrained.conflicts,
  )
  if (strong.length > 0) {
    const shown = strong.slice(0, config.maxEvidence)
    return {
      mode: "answer",
      answer: ["أقرب نص مرجعي في مصادرنا لسؤالك:", ...shown.map(quoteBlock), currencyLine(shown)].filter(Boolean).join("\n\n"),
      passages: shown,
    }
  }

  return { mode: "insufficient", answer: insufficient("لم أجد في مصادرنا المعتمدة ما يجيب عن سؤالك بوضوح."), passages: [] }
}

export { citationLabel, quoteBlock, currencyLine }
