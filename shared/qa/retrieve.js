// shared/qa/retrieve.js
//
// المراحل 7 و8: الاسترجاع بالعبارة الحرفية والكلمات (BM25 على الجذور المحافظة) والتطابق التقريبي،
// مع إشارات الكيانات (فصل، قانون، اسم مصطلح).
//
// الدلالة (semantic): غير مُنفَّذة. لا يوجد نموذج محلي ولا فهرس متجهات في المستودع، فلا تُدّعى دلالة.
// النتائج كلها مطابقة لفظية أو صرفية محدودة، وكل إشارة تُعاد مع درجتها لتفسير القرار.

import { QA_CONFIG } from "./config.js"
import { stemVariants } from "./morph.js"

/** مسافة ليفنشتاين مع حد مبكر: لا نحتاج أكثر من 1 هنا. */
function withinOneEdit(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (a.length > b.length) i += 1
    else if (b.length > a.length) j += 1
    else {
      i += 1
      j += 1
    }
  }
  edits += (a.length - i) + (b.length - j)
  return edits <= 1
}

/**
 * يبني الفهرس مرة واحدة لكل مجموعة مقاطع.
 * @param {{ passages: any[] }} corpus
 * @param {{ titleBoost?: number, keywordWeight?: number, k1?: number, b?: number }} [options]
 */
export function buildIndex(corpus, options = {}) {
  const titleBoost = options.titleBoost ?? 2
  const keywordWeight = options.keywordWeight ?? 0.5
  const k1 = options.k1 ?? 1.2
  const b = options.b ?? 0.75

  const docs = corpus.passages.map((p) => {
    const tf = new Map()
    const rawSet = new Set()
    const add = (token, weight) => {
      rawSet.add(token)
      for (const v of stemVariants(token)) tf.set(v, (tf.get(v) ?? 0) + weight)
    }
    for (const t of p.titleTokens) add(t, titleBoost)
    for (const t of p.bodyTokens) add(t, 1)
    for (const t of p.keywordTokens) add(t, keywordWeight)
    let length = 0
    for (const w of tf.values()) length += w
    return { passage: p, tf, rawSet, length }
  })

  const N = docs.length || 1
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / N || 1
  const df = new Map()
  for (const d of docs) for (const v of d.tf.keys()) df.set(v, (df.get(v) ?? 0) + 1)

  // المفردات: كل صيغ الكلمات (الأصلية والجذور) بتكرارها، لتصحيح الإملاء بمسافة 1.
  const vocabulary = new Map()
  for (const d of docs) {
    for (const t of d.rawSet) {
      for (const v of stemVariants(t)) if (v.length >= 4) vocabulary.set(v, (vocabulary.get(v) ?? 0) + 1)
    }
  }

  return { docs, N, avgdl, df, k1, b, vocabulary }
}

/** BM25 لكلمة واحدة (صيغة مُجذّرة) على مستند. */
function bm25Term(index, doc, variant) {
  const f = doc.tf.get(variant)
  if (!f) return 0
  const dfv = index.df.get(variant) ?? 0
  const idf = Math.log(1 + (index.N - dfv + 0.5) / (dfv + 0.5))
  const denom = f + index.k1 * (1 - index.b + (index.b * doc.length) / index.avgdl)
  return idf * ((f * (index.k1 + 1)) / denom)
}

/**
 * يحل كلمات السؤال: إن لم توجد كلمة في الفهرس، يُقبل تصحيح واحد بمسافة 1 إن كان المرشح وحيداً.
 * @returns {Array<{ token: string, resolved: string, fuzzy: boolean }>}
 */
export function resolveQueryTokens(content, index) {
  const out = []
  for (const token of content) {
    const exact = index.vocabulary.has(token) || [...stemVariants(token)].some((v) => index.df.has(v))
    if (exact || token.length < 4) {
      out.push({ token, resolved: token, fuzzy: false })
      continue
    }
    // نقارن كل صيغ الكلمة (مع وبدون ال والسوابق) بالفهرس. صيغ الكلمة الواحدة لا تُعدّ مرشحين مختلفين.
    const forms = [...stemVariants(token)].filter((f) => f.length >= 4)
    const found = [...index.vocabulary.keys()].filter((v) => forms.some((f) => withinOneEdit(f, v)))
    const groups = []
    for (const w of found) {
      const forms2 = stemVariants(w)
      const g = groups.find((grp) => grp.some((x) => x === w || forms2.includes(x) || stemVariants(x).includes(w)))
      if (g) g.push(w)
      else groups.push([w])
    }
    // مرشح واحد، أو مرشح مهيمن (تكراره ≥ ثلاثة أضعاف الثاني) = تصحيح مقبول. غير ذلك = غامض فيُترك كما هو.
    const groupFreq = (g) => Math.max(...g.map((w) => index.vocabulary.get(w) ?? 0))
    const ranked = groups.map((g) => ({ g, f: groupFreq(g) })).sort((a, b) => b.f - a.f)
    const dominant = ranked.length === 1 || (ranked.length > 1 && ranked[0].f >= DOMINANCE_RATIO * ranked[1].f)
    if (dominant) {
      // داخل المجموعة نختار الصيغة الأكثر تكراراً.
      const best = ranked[0].g.reduce((a, b) => ((index.vocabulary.get(b) ?? 0) > (index.vocabulary.get(a) ?? 0) ? b : a))
      out.push({ token, resolved: best, fuzzy: true })
    } else {
      out.push({ token, resolved: token, fuzzy: false })
    }
  }
  return out
}

/**
 * يحسب الإشارات لكل مقطع ويُعيد المرشحين مع درجتهم وإشاراتهم.
 * @param {ReturnType<typeof import("./analyze.js").analyzeQuestion>} question  نتيجة analyzeQuestion (ok: true)
 * @param {ReturnType<typeof buildIndex>} index
 * @param {typeof QA_CONFIG} [config]
 */
/** نسبة الهيمنة لقبول تصحيح إملائي من بين عدة مرشحين. قيمة استدلالية، تُختبر في tests/qa-retrieve.test.ts. */
const DOMINANCE_RATIO = 3

/** صيغ الكلمة للمطابقة: صيغها الصرفية، ومعها الصيغة بـ"ال" (لأن العنوان قد يكون معرّفاً). */
export function formsOf(token) {
  const set = new Set(stemVariants(token))
  if (token.length >= 3 && !token.startsWith("ال")) set.add(`ال${token}`)
  return set
}

/** هل تتابع labelTokens داخل forms (كل موضع مجموعة صيغ الكلمة)؟ */
function sequenceIn(forms, labelTokens) {
  const L = labelTokens.length
  if (L === 0) return false
  for (let i = 0; i + L <= forms.length; i += 1) {
    let ok = true
    for (let j = 0; j < L && ok; j += 1) ok = forms[i + j].has(labelTokens[j])
    if (ok) return true
  }
  return false
}

export function retrieve(question, index, config = QA_CONFIG) {
  const w = config.weights
  const resolved = resolveQueryTokens(question.content, index)
  const contentCount = question.content.length
  const phraseList = question.phrases

  // ذكر المصطلح الكامل يعتمد على الكلمات الأصلية وصيغها الصرفية.
  // التصحيح التقريبي لا يفتح النطاق من كلمة عابرة في سؤال طويل («بصداع» ≠ «الصداق»).
  // يبقى التصحيح إشارة أضعف فقط إذا غطى اسم المصطلح كل كلمات محتوى السؤال.
  const queryForms = question.tokens.map((t) => formsOf(t))
  const fuzzyMap = new Map(resolved.filter((r) => r.fuzzy).map((r) => [r.token, r.resolved]))
  const correctedForms = question.tokens.map((t) => formsOf(fuzzyMap.get(t) ?? t))
  const correctedContent = resolved.map((r) => formsOf(r.resolved))
  const contentForms = question.content.map((t) => formsOf(t))

  const candidates = []
  for (const doc of index.docs) {
    const p = doc.passage

    // العبارة الحرفية: عدد الكلمات في كل عبارة موجودة في النص (بحدود كلمات كاملة).
    let phrase = 0
    for (const ph of phraseList) {
      if (` ${p.normalized} `.includes(` ${ph} `)) phrase += ph.split(" ").length - 1
    }

    // اسم المصطلح ورد في السؤال كاملاً، أو جزئياً (كل كلمات السؤال المحتوى داخل الاسم).
    let mention = 0
    let partial = false
    for (const label of p.labelNorms) {
      if (!label) continue
      const labelTokens = label.split(" ")
      if (sequenceIn(queryForms, labelTokens)) mention = 1
      else if (
        fuzzyMap.size > 0 && contentCount > 0 &&
        sequenceIn(correctedForms, labelTokens) &&
        correctedContent.every((forms) => labelTokens.some((token) => forms.has(token)))
      ) {
        mention = Math.max(mention, 0.5)
      } else if (contentCount > 0 && labelTokens.length > contentCount && contentForms.every((vs) => labelTokens.some((lt) => vs.has(lt)))) {
        partial = true
      }
    }

    // BM25 على الجذور، مع وزن الكلمة الأصلية أكبر من الجذر.
    let bm = 0
    let covered = 0
    let fuzzyHits = 0
    let coveredCount = 0
    for (const r of resolved) {
      const forms = stemVariants(r.resolved)
      let best = 0
      let matched = false
      for (const v of forms) {
        const s = bm25Term(index, doc, v) * (v === r.resolved ? 1 : 0.6) * (r.fuzzy ? 0.5 : 1)
        if (s > best) best = s
        if (doc.tf.has(v)) matched = true
      }
      bm += best
      if (matched || doc.rawSet.has(r.resolved)) { covered += 1; coveredCount += 1 }
      if (r.fuzzy && matched) fuzzyHits += 1
    }
    const coverage = contentCount > 0 ? covered / contentCount : 0

    // الكيانات: رقم فصل أو مادة (مع القانون إن ذُكر)، ورقم قانون.
    let articleRef = false
    for (const a of question.entities.articles) {
      if (p.article !== a.number) continue
      if (a.codeKey && p.codeKey !== a.codeKey) continue
      articleRef = true
    }
    let lawRef = false
    for (const n of question.entities.lawNumbers) {
      if (p.lawNumber === n || p.codeKey === `قانون ${n}`) lawRef = true
    }

    const authority = config.authority[p.authorityKey] ?? 0
    const score =
      w.exactPhrase * phrase +
      w.termMention * mention +
      w.bm25 * bm +
      w.fuzzy * fuzzyHits +
      w.articleRef * (articleRef ? 1 : 0) +
      w.lawRef * (lawRef ? 1 : 0) +
      w.authority * authority

    const eligibleSignal = mention > 0 || articleRef || lawRef || coverage >= config.minCoverage
    if (score >= config.minScore && eligibleSignal) {
      candidates.push({
        passage: p,
        score: Number(score.toFixed(4)),
        features: { phrase, mention, partial, bm25: Number(bm.toFixed(4)), fuzzyHits, articleRef, lawRef, coverage: Number(coverage.toFixed(3)), covered: coveredCount, authority },
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score || (a.passage.id < b.passage.id ? -1 : 1))
  return candidates
}
