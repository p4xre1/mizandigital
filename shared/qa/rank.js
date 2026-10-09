// shared/qa/rank.js
//
// المرحلتان 9 و10: ترتيب المرشحين، ثم تطبيق القيود القانونية. القيود ليست تجميلاً في الترتيب:
//
//   • الانطباق (applicability): إن ذكر السؤال قانوناً بعينه، فالنصوص من قانون آخر لا تُقبل دليلاً
//     لهذا السؤال (تُستبعد بسبب "applicability_mismatch").
//   • الإلغاء (repeal): النص المُلغى بحسب السجل لا يُقدَّم جواباً، بل يُذكر تنبيه بإلغائه.
//   • الحالة غير المُتحقَّق منها: تُقبل كدليل، لكنها تحمل علامة "unverified" ويُكتب ذلك في الجواب.
//   • التعارض: نصان مختلفان لنفس القانون والفصل لا يُرجَّح أحدهما تلقائياً؛ يُعرضان مع تنبيه.
//   • المصدر الموثوق قبل المصدر الضعيف: الترتيب بالسلطة يُضاف إلى الدرجة، ولا يُنقذ مرشحاً بلا صلة
//     (فالبوابة في retrieve.js تسبقه).

/**
 * @param {ReturnType<typeof import("./retrieve.js").retrieve>} candidates
 * @param {ReturnType<typeof import("./analyze.js").analyzeQuestion>} question
 */
export function applyConstraints(candidates, question) {
  const explicitCodes = new Set(question.entities.codes.map((c) => c.key))
  const explicitLaws = new Set(question.entities.lawNumbers)

  const eligible = []
  const excluded = []

  for (const c of candidates) {
    const p = c.passage
    const isLegal = p.kind === "legal_text" || p.kind === "constitutional_reference" || p.kind === "law_record"

    if (isLegal && (explicitCodes.size > 0 || explicitLaws.size > 0)) {
      const matchesCode = explicitCodes.has(p.codeKey) || (p.lawNumber && explicitLaws.has(p.lawNumber))
      const matchesLaw = explicitLaws.size > 0 && [...explicitLaws].some((n) => p.codeKey === `قانون ${n}`)
      if (!matchesCode && !matchesLaw) {
        excluded.push({ id: p.id, reason: "applicability_mismatch" })
        continue
      }
    }

    if (p.status === "repealed") {
      excluded.push({ id: p.id, reason: "repealed" })
      continue
    }

    const flags = []
    if (isLegal && p.verification?.currency === "unverified") flags.push("unverified")
    if (isLegal && p.status === "unknown") flags.push("status_unknown")
    eligible.push({ ...c, flags })
  }

  return { eligible, excluded, conflicts: findConflicts(eligible), repealedSeen: excluded.filter((x) => x.reason === "repealed") }
}

/** صيغة مقارنة للنص: بلا حذف "..." ولا علامات ترقيم ولا فروق مسافات. */
export function quoteCore(text) {
  return String(text ?? "")
    .replace(/\.{3,}|…/g, " ")
    .replace(/[\s؛;:,.،؟!«»"'()\-]+/g, " ")
    .trim()
}

/**
 * نسختان لنفس المادة لا تُعدّان تعارضاً إن كانت إحداهما جزءاً من الأخرى (اقتباس أطول أو أقصر).
 * التعارض الحقيقي: نصوص مختلفة لا يحتوي أحدها الآخر.
 * @param {Array<{ passage: any }>} eligible
 */
export function findConflicts(eligible) {
  const groups = new Map()
  for (const c of eligible) {
    const p = c.passage
    if (p.kind !== "legal_text" && p.kind !== "constitutional_reference") continue
    if (!p.codeKey || !p.article) continue
    const key = `${p.codeKey}|${p.article}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }
  const conflicts = []
  for (const [key, passages] of groups) {
    const cores = passages.map((p) => quoteCore(p.quote))
    const longest = cores.reduce((a, b) => (b.length > a.length ? b : a), "")
    const differs = cores.some((c) => !longest.includes(c))
    if (differs && new Set(cores).size > 1) conflicts.push({ key, passageIds: passages.map((p) => p.id) })
  }
  return conflicts
}

/**
 * يقرر هل السؤال غامض بين مصطلحين متقاربين (يُطلب توضيح واحد).
 * الشرط: مرشحان أو أكثر من المعجم كلهم مطابق جزئياً أو كلياً، وليس أيّ منهم مطابقاً تماماً وحده،
 * ودرجة الأول ليست متفوقة بوضوح. الأرقام (فصل أو قانون) تحسم السؤال دائماً.
 * @param {Array<{ passage: any, score: number, features: any }>} eligible
 * @param {typeof import("./config.js").QA_CONFIG} config
 * @returns {Array<{ id: string, termId: string, label: string, definition: string }> | null}
 */
export function clarificationOptions(eligible, config) {
  const defs = eligible.filter((c) => c.passage.kind === "definition")
  if (defs.length < 2) return null
  const top = defs[0]
  const exactTop = top.features.mention > 0
  // لو وُجد مصطلح مطابق تماماً وكان المرشح الثاني ليس بقربه، فلا غموض.
  const close = defs.filter((c) => c.score >= top.score * config.clarifyRatio && (c.features.mention > 0 || c.features.partial))
  if (close.length < 2) return null
  if (exactTop && close.every((c) => c.features.mention === 0)) return null

  const seen = new Set()
  const options = []
  for (const c of close) {
    const key = c.passage.id
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      id: c.passage.id,
      termId: c.passage.termIds[0],
      label: c.passage.title,
      category: c.passage.keywords?.[1] ?? null,
      definition: c.passage.body,
    })
    if (options.length >= config.maxClarifyOptions) break
  }
  return options.length >= 2 ? options : null
}
