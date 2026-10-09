// shared/help/retrieve.js
//
// بحث بسيط بلا نموذج لغوي: تطبيع عربي + تطابق كلمات بأوزان حسب الحقل.
// يعمل وحده كمساعد "الاسترجاع فقط"، ويصلح لاحقاً كطبقة تحت نموذج لغوي.

const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g
const PUNCT_RE = /[^\p{L}\p{N}\s]/gu

const INVISIBLE_RE = /[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g

/**
 * توحيد النص قبل أي فحص أمني: NFKC يحوّل الأشكال العرضية (مثل ＜ و ｓ) إلى صورتها
 * القياسية، ويُزال كل حرف غير مرئي يُستعمل لإخفاء كلمة عن الفلاتر.
 * كل فحص في المساعد يمر عبر هذه الدالة.
 */
export function canonicalize(text) {
  return String(text || "").normalize("NFKC").replace(INVISIBLE_RE, "")
}

/** تطبيع النص العربي والفرنسي/الإنجليزي للمقارنة. */
export function normalize(text) {
  return canonicalize(text)
    .replace(DIACRITICS_RE, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(PUNCT_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

const STOPWORDS = new Set(
  [
    "في", "من", "على", "الي", "عن", "ما", "ماذا", "هل", "كيف", "اين", "لماذا", "هو", "هي",
    "و", "او", "ان", "مع", "هذا", "هذه", "التي", "الذي", "يمكن", "اريد", "لي", "كان", "عند",
    "the", "les", "des", "une", "est", "que", "qui", "sur", "pour", "dans", "avec", "comment", "quoi",
    // حشو المحادثة: يسبب مطابقة جزئية خاطئة ("لم" داخل "الملف") إن بقي في البحث.
    "لم", "لا", "اشعر", "انني", "اني", "استطيع", "افهم", "فهمت", "بغيت", "ابغي", "شيء", "اي",
    // أدوات دارجة بالحروف العربية.
    "ديال", "ديالك", "ديالي", "ديالنا", "ديالهم", "فيه", "عليك", "عليكم", "انت", "انا", "يوجد", "توجد", "نفعل", "نبحث",
    // أدوات فرنسية شائعة يُطابقها البحث الجزئي بكثرة.
    "le", "la", "de", "du", "et", "un", "au", "en", "ou", "entre", "quelle", "quel", "est-ce", "ce", "se",
  ].map(normalize),
)

/** كلمات البحث بعد إزالة أدوات الربط وأل التعريف. */
export function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.startsWith("ال") ? t.slice(2) : t))
}

const FIELD_WEIGHTS = { title: 3, keywords: 2, body: 1 }
/** أقل نقاط تُعتبر تطابقاً حقيقياً. */
export const MIN_SCORE = 3

/**
 * ترتيب المدخلات حسب تطابق الكلمات.
 * @param {string} query
 * @param {Array<{title:string, keywords:string[], body:string, url:string, id:string}>} entries
 * @param {{limit?: number}} [options]
 * @returns {Array<{entry:any, score:number}>}
 */
export function rankEntries(query, entries, options = {}) {
  const limit = options.limit ?? 3
  const tokens = [...new Set(tokenize(query))]
  if (tokens.length === 0) return []

  const scored = []
  for (const entry of entries) {
    const fields = {
      title: normalize(entry.title),
      keywords: normalize((entry.keywords || []).join(" ")),
      body: normalize(entry.body),
    }
    let score = 0
    let distinct = 0
    for (const token of tokens) {
      let best = 0
      for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
        if (fields[field].includes(token) && weight > best) best = weight
      }
      score += best
      if (best > 0) distinct += 1
    }
    if (score >= MIN_SCORE) scored.push({ entry, score, distinct })
  }

  // الترتيب: النقاط، ثم عدد الكلمات المختلفة المطابقة، ثم المعرّف (لثبات النتيجة).
  scored.sort((a, b) => b.score - a.score || b.distinct - a.distinct || a.entry.id.localeCompare(b.entry.id))
  return scored.slice(0, limit)
}
