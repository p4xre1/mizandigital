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
    // أدوات استفهام ووصل دارجة: لا تحمل موضوع السؤال، ومطابقتها الجزئية تجرّ
    // مدخلات خاطئة (مثل «شنو» داخل الكلمة المفتاحية «شنو ميزان»).
    "واش", "شنو", "شنو", "فين", "كيفاش", "شحال", "علاش", "شكون", "اللي", "لي",
    "دابا", "خاصني", "عندي", "عندك", "عندكم", "باش", "هاد", "هادا", "هادي", "راه",
    "كاين", "كاينه", "كاينين", "كاينش",
    // أدوات فرنسية شائعة يُطابقها البحث الجزئي بكثرة.
    "le", "la", "de", "du", "et", "un", "au", "en", "ou", "entre", "quelle", "quel", "est-ce", "ce", "se",
  ].map(normalize),
)

/**
 * مرادفات استرجاع فقط: تربط الصيغ الشائعة لدى الطلبة بنفس كلمة المحتوى.
 * تُطبَّق بعد التطبيع، ولا تمسّ أي فحص أمني ولا نص الجواب.
 */
const RETRIEVAL_SYNONYMS = {
  // التنزيل/الحمل بمعنى واحد عند المستخدم.
  تنزيل: "تحميل",
  نزل: "تحميل",
  ننزل: "تحميل",
  نحمل: "تحميل",
  احمل: "تحميل",
  تحمل: "تحميل",
  يحمل: "تحميل",
  // دارجة شائعة عن الحساب والقراءة والإيجاد والإنشاء.
  كونط: "حساب",
  نخلق: "انشاء",
  نعمل: "انشاء",
  ندير: "انشاء",
  نقرا: "قراءه",
  نقراء: "قراءه",
  قرا: "قراءه",
  قريت: "قراءه",
  نلقى: "اجد",
  لقيت: "اجد",
  تلقى: "اجد",
}

/**
 * سوابق تلتصق بالكلمة العربية: «بالتسجيل»، «للتحميل»، «والملخصات».
 * لا تُزال الكاف («كليات» ليست «كالـ» + «ليات») ولا تُزال سابقة إلا إن بقي
 * من الكلمة ثلاثة أحرف فأكثر.
 */
const ATTACHED_PREFIXES = ["وال", "فال", "بال", "لل", "ول", "وب", "و", "ف", "ب", "ل"]

/** إزالة سابقة ملتصقة واحدة إن بقي من الكلمة ثلاثة أحرف فأكثر. */
function stripAttachedPrefix(token) {
  for (const prefix of ATTACHED_PREFIXES) {
    if (token.startsWith(prefix) && token.length - prefix.length >= 3) return token.slice(prefix.length)
  }
  return token
}

/** لواحق جمع سالم/مؤنث تُزال للمقارنة الجذعية فقط. */
const PLURAL_SUFFIXES = ["ات", "ين", "ون", "ان"]

/**
 * جذع تقريبي للمقارنة: سابقة ملتصقة ثم لاحقة جمع، ثم تاء مربوطة منطبعة «ه».
 * يُستعمل للاسترجاع فقط — لا يغيّر النص المعروض ولا أي فحص أمني.
 */
function stemVariantsOf(token) {
  const base = stripAttachedPrefix(token)
  const variants = new Set([base])
  for (const suffix of PLURAL_SUFFIXES) {
    if (base.endsWith(suffix) && base.length - suffix.length >= 3) variants.add(base.slice(0, -suffix.length))
  }
  for (const variant of [...variants]) {
    if (variant.endsWith("ه") && variant.length - 1 >= 3) variants.add(variant.slice(0, -1))
  }
  return variants
}

/** جذوع كلمات حقل كامل (للمقارنة المتناظرة مع جذوع كلمات السؤال). */
function fieldStems(normalizedField) {
  const stems = new Set()
  for (const word of normalizedField.split(" ").filter(Boolean)) {
    if (word.length < 3) continue
    for (const variant of stemVariantsOf(word)) stems.add(variant)
  }
  return stems
}

/** صيغ كل كلمة في الحقل: الكلمة كما هي، وبلا أل التعريف، وبلا السوابق الملتصقة. */
const wordFormCache = new Map()
function wordForms(fieldText) {
  const cached = wordFormCache.get(fieldText)
  if (cached) return cached
  const forms = new Set()
  for (const word of fieldText.split(" ")) {
    if (!word) continue
    forms.add(word)
    if (word.startsWith("ال") && word.length > 4) forms.add(word.slice(2))
    forms.add(stripAttachedPrefix(word))
  }
  if (wordFormCache.size > 5000) wordFormCache.clear()
  wordFormCache.set(fieldText, forms)
  return forms
}

/**
 * هل يطابق مرشّح واحد حقلاً: "exact" تضمين جزئي مباشر، و"stem" تطابق جذع
 * (جمع/سابقة/تاء مربوطة). التطابق الجذعي أضعف في الترتيب من المباشر.
 */
function candidateMatches(candidate, fieldText, fieldStemSet) {
  // مطابقة حرفية لكلمة كاملة (مع أل التعريف والسوابق الملتصقة فقط): «وقت» لا تطابق «مؤقت».
  if (wordForms(fieldText).has(candidate)) return "exact"
  for (const variant of stemVariantsOf(candidate)) {
    if (variant.length >= 3 && fieldStemSet.has(variant)) return "stem"
  }
  return null
}

/** كلمات البحث بعد إزالة أدوات الربط وأل التعريف والسوابق الملتصقة. */
export function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.startsWith("ال") ? t.slice(2) : t))
    .map(stripAttachedPrefix)
}

const FIELD_WEIGHTS = { title: 3, keywords: 2, body: 1 }
/** أقل نقاط تُعتبر تطابقاً حقيقياً. */
export const MIN_SCORE = 3

/**
 * ترتيب المدخلات حسب تطابق الكلمات.
 * القبول: النقاط الكافية، أو مطابقة تامة لكلمة مفتاحية من كلمات المشرف
 * (الكلمات المفتاحية علامات قصدية؛ سؤال يذكر إحداها حرفياً يقصد المدخل).
 * @param {string} query
 * @param {Array<{title:string, keywords:string[], body:string, url:string, id:string}>} entries
 * @param {{limit?: number}} [options]
 * @returns {Array<{entry:any, score:number}>}
 */
export function rankEntries(query, entries, options = {}) {
  const limit = options.limit ?? 3
  const tokens = [...new Set(tokenize(query))]
  if (tokens.length === 0) return []

  // مجموعات المرادفات: كل كلمة أصلية ومرادفها يُحسبان وحدة واحدة فلا تُضاعف النقاط.
  const groups = tokens.map((token) => {
    const synonym = RETRIEVAL_SYNONYMS[token]
    return synonym && synonym !== token ? [token, synonym] : [token]
  })

  const scored = []
  for (const entry of entries) {
    const fields = {
      title: normalize(entry.title),
      keywords: normalize((entry.keywords || []).join(" ")),
      body: normalize(entry.body),
    }
    const stems = {
      title: fieldStems(fields.title),
      keywords: fieldStems(fields.keywords),
      body: fieldStems(fields.body),
    }
    const keywordWords = new Set(fields.keywords.split(" ").filter(Boolean))
  let score = 0
  let stemScore = 0
  let distinct = 0
  let exactKeyword = false
  for (const candidates of groups) {
    let best = 0
    let bestIsStem = false
    for (const candidate of candidates) {
      if (keywordWords.has(candidate)) exactKeyword = true
      for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
        if (weight <= best) continue
        const kind = candidateMatches(candidate, fields[field], stems[field])
        if (kind) {
          best = weight
          bestIsStem = kind === "stem"
        }
      }
    }
    score += best
    if (best > 0 && bestIsStem) stemScore += best
    if (best > 0) distinct += 1
  }
  if (score >= MIN_SCORE || exactKeyword) scored.push({ entry, score, distinct, stemScore })
  }

  // الترتيب: النقاط، ثم قلة الاعتماد على المطابقة الجذعية وحدها (التطابق الصريح
  // أولى)، ثم عدد الكلمات المختلفة المطابقة، ثم وجود كلمات مفتاحية منسّقة
  // للمدخل (أسئلة الشائعة بلا كلمات، فلا تتقدم صفحات الأقسام عند التعادل)،
  // ثم المعرّف (لثبات النتيجة).
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.stemScore - b.stemScore ||
      b.distinct - a.distinct ||
      Number((b.entry.keywords || []).length > 0) - Number((a.entry.keywords || []).length > 0) ||
      a.entry.id.localeCompare(b.entry.id),
  )
  return scored.slice(0, limit)
}
