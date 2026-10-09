// shared/qa/corpus.js
//
// بناء فهرس المقاطع القانونية والمعرفية من بيانات المستودع. لا يُضاف أي نص من خارج الملفات.
//
// المصادر (وما يُسمح باستعماله كدليل قانوني):
//   1) تعريفات المعجم (src/data/lexicon.client.json): تعريف = دليل "معرفي"، لا نص قانوني.
//   2) اقتباسات النصوص القانونية المسندة في المعجم (legal_sources.articles): نص قانوني مقتبس،
//      يُعرض بعبارة "نص مقتطف" إن كان اقتباساً جزئياً. لا يحمل المعجم حالة سريان لكل نص،
//      فتبقى حالة السريان "غير مُتحقَّق منها" حتى يُضاف الحقل.
//   3) إحالات الدستور (src/data/reference-map.json): اقتباسات حرفية من الدستور مع حالة
//      المراجعة (targetVerified). الإحالة التي لم يُتحقق هدفها تُعرض كذلك.
//   4) سجلات الأرشيف القانوني (src/data/laws.client.json): حالياً فارغة في البناء الحالي.
//      عند وجودها تُستعمل كسجل رسمي، وتُقرأ منها حالة السريان إن وُجدت.
//
// لا تُضاف صفحات الموقع ولا الأسئلة الشائعة ولا المقالات إلى فهرس الأدلة القانونية.
// (جواب "أين أجد" يبقى لمسار الموقع الحالي.)

import lexiconTerms from "../../src/data/lexicon.client.json"
import referenceMap from "../../src/data/reference-map.json"
import lawsSnapshot from "../../src/data/laws.client.json"
import { LEXICON_ENTRIES } from "../help/knowledge.js"
import { normalizeArabic, tokenizeNormalized } from "./normalize.js"

const LEXICON_URL_BY_ID = new Map(LEXICON_ENTRIES.map((e) => [e.id.replace(/^lexicon-/, ""), e.url]))
const REFERENCE_PAGE = "/pro-tools"

/** نص لا يُستعمل كدليل إلا إذا كان مكتملاً: رقم فصل، ونص، ومصدر. */
function isCitable(p) {
  return Boolean(p.quote && p.codeKey && p.article)
}

function hash(text) {
  let h = 0
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/**
 * @param {{
 *   terms?: any[], references?: any[], laws?: any[]
 * }} [data]  افتراضياً بيانات المستودع. تُمرَّر بيانات مخصصة في الاختبارات.
 * @returns {{ passages: any[], termLabels: Map<string, string>, terms: any[] }}
 */
export function buildCorpus(data = {}) {
  const terms = data.terms ?? lexiconTerms
  const references = data.references ?? referenceMap.references
  const referenceMeta = data.referenceMeta ?? referenceMap.meta
  const laws = data.laws ?? lawsSnapshot.laws ?? []

  const passages = []
  const byQuote = new Map()

  for (const term of terms) {
    if (!term.term_ar || !term.definition) continue
    const url = LEXICON_URL_BY_ID.get(term.id) ?? `/lexicon`
    const authorityKey = term.review_status === "published" ? "definition_published" : "definition_internal"
    passages.push({
      id: `def:${term.id}`,
      kind: "definition",
      title: term.term_ar,
      body: term.definition,
      quote: null,
      explanation: null,
      termIds: [term.id],
      termLabels: [term.term_ar],
      keywords: [term.term_fr, term.category, ...(term.exam_keywords || [])].filter(Boolean),
      codeKey: null,
      codeName: null,
      article: null,
      articleLabel: null,
      lawNumber: null,
      sourceTitle: `معجم ميزان: ${term.term_ar}`,
      url,
      official: null,
      status: "unknown",
      verification: { reviewStatus: term.review_status ?? null, lastVerified: term.last_reviewed ?? null },
      authorityKey,
    })

    for (const source of term.legal_sources || []) {
      for (const art of source.articles || []) {
        const quote = String(art.quotation || art.phrase || "").trim()
        const number = String(art.number ?? art.article_number ?? "").trim()
        if (!quote || !number || !source.code_short) continue
        const key = `${source.code_short}|${number}|${hash(quote)}`
        const existing = byQuote.get(key)
        if (existing) {
          if (!existing.termIds.includes(term.id)) {
            existing.termIds.push(term.id)
            existing.termLabels.push(term.term_ar)
            existing.keywords.push(term.term_ar)
          }
          continue
        }
        const passage = {
          id: `art:${source.code_short}|${number}|${hash(quote)}`,
          kind: "legal_text",
          title: `${source.code_ar}: ${number}`,
          body: quote,
          quote,
          quotationType: art.quotation_type || null,
          explanation: null,
          termIds: [term.id],
          termLabels: [term.term_ar],
          keywords: [source.code_ar, term.term_ar, term.term_fr].filter(Boolean),
          codeKey: source.code_short,
          codeName: source.code_ar,
          article: number,
          articleLabel: `${source.code_short} رقم ${number}`,
          lawNumber: null,
          sourceTitle: `${source.code_ar}`,
          url,
          official: source.source_url || null,
          status: "unknown",
          verification: {
            reviewStatus: term.review_status ?? null,
            lastVerified: source.last_verified ?? null,
            currency: "unverified",
          },
          authorityKey: "code_text",
        }
        byQuote.set(key, passage)
        passages.push(passage)
      }
    }
  }

  for (const ref of references) {
    const quote = String(ref.excerpt || "").trim()
    if (!quote) continue
    const fromArticle = String(ref.fromArticle || "")
    const numberMatch = fromArticle.match(/(\d+)/)
    const number = numberMatch ? numberMatch[1] : null
    passages.push({
      id: `ref:${ref.id}`,
      kind: "constitutional_reference",
      title: `${fromArticle} ← ${ref.toArticle || ref.toText || ""}`.trim(),
      body: quote,
      quote,
      quotationType: "excerpt",
      explanation: ref.relationship || null,
      termIds: [],
      termLabels: [],
      keywords: [ref.topic, ref.toText, ref.toArticle, ref.type].filter(Boolean),
      codeKey: "دستور 2011",
      codeName: "الدستور المغربي",
      article: number,
      articleLabel: fromArticle || null,
      lawNumber: null,
      sourceTitle: "الدستور المغربي (2011): خريطة الإحالات",
      url: REFERENCE_PAGE,
      official: referenceMeta?.sourceUrl ?? null,
      status: "unknown",
      verification: {
        reviewedOn: referenceMeta?.reviewedOn ?? null,
        targetVerified: ref.targetVerified === true,
        currency: "unverified",
      },
      authorityKey: "constitution_text",
    })
  }

  for (const law of laws) {
    if (!law.law_number) continue
    passages.push({
      id: `law:${law.slug}`,
      kind: "law_record",
      title: law.title || `قانون ${law.law_number}`,
      body: law.title || "",
      quote: null,
      explanation: null,
      termIds: [],
      termLabels: [],
      keywords: [law.official_gazette_number].filter(Boolean),
      codeKey: `قانون ${law.law_number}`,
      codeName: law.title || null,
      article: null,
      articleLabel: null,
      lawNumber: law.law_number,
      sourceTitle: law.title || `قانون ${law.law_number}`,
      url: law.public_path || null,
      official: law.pdf_url || null,
      status: law.status === "repealed" || law.repealed_by ? "repealed" : (law.status === "in_force" ? "in_force" : "unknown"),
      verification: {
        publicationDate: law.publication_date ?? null,
        sourceVerifiedAt: law.source_verified_at ?? null,
        currency: law.status === "in_force" ? "record" : "unverified",
      },
      authorityKey: "law_record",
    })
  }

  const termLabels = new Map()
  for (const term of terms) if (term.term_ar) termLabels.set(term.id, term.term_ar)

  for (const p of passages) {
    p.citable = p.kind === "law_record" ? Boolean(p.lawNumber && p.url) : isCitable(p)
    p.normalized = normalizeArabic([p.title, p.body, ...(p.keywords || [])].join(" "))
    p.titleNorm = normalizeArabic(p.title)
    p.bodyNorm = normalizeArabic(p.body)
    p.labelNorms = (p.termLabels || []).map((l) => normalizeArabic(l))
    p.tokens = tokenizeNormalized(p.normalized, { maxTokens: 5000 }).tokens
    p.titleTokens = tokenizeNormalized(p.titleNorm, { maxTokens: 500 }).tokens
    p.bodyTokens = tokenizeNormalized(p.bodyNorm, { maxTokens: 5000 }).tokens
    p.keywordTokens = tokenizeNormalized(normalizeArabic((p.keywords || []).join(" ")), { maxTokens: 500 }).tokens
  }

  return { passages, termLabels, terms }
}
