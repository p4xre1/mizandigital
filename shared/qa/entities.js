// shared/qa/entities.js
//
// المرحلة 5: استخراج الكيانات القانونية: أرقام القوانين، أرقام الفصول والمواد، القوانين المذكورة
// بالاسم أو الاختصار، السنوات، والمؤسسات.
//
// هذه القواعد تعمل على النص المُطبَّع (normalize.js)، والاستخراج لا يخترع أي رقم أو قانون:
// كل كيان يُعاد كما ورد في السؤال، أو يُربط بقانون من قائمة CODE_ALIASES المحدودة.
// المصطلحات القانونية (مثل "الالتزام") لا تُستخرج هنا، بل تُطابَق مع المعجم في corpus.js.

/**
 * مفاتيح القوانين مطابقة لـ code_short في بيانات المعجم (src/data/lexicon.client.json).
 * كل اسم بديل يُكتب بعد normalizeArabic (النقاط تصير مسافات، والتاء المربوطة هاء).
 */
export const CODE_ALIASES = [
  { key: "ق.ل.ع", name: "قانون الالتزامات والعقود", patterns: [/(^| )ق ل ع( |$)/, /قانون الالتزامات والعقود/, /ظهير الالتزامات والعقود/] },
  { key: "ظ.ت.ع", name: "الظهير الشريف المتعلق بالتحفيظ العقاري", patterns: [/(^| )ظ ت ع( |$)/, /التحفيظ العقاري/] },
  { key: "قانون 70.03", name: "مدونة الأسرة", patterns: [/70\.03/, /مدونه الاسره/] },
  { key: "ق.ج", name: "القانون الجنائي", patterns: [/(^| )ق ج( |$)/, /القانون الجنايي/] },
  { key: "دستور 2011", name: "الدستور المغربي", patterns: [/(^| )الدستور( |$)/, /(^| )دستور 2011( |$)/] },
]

/** مؤسسات معروفة في محتوى ميزان. تُستخرج كيانات فقط، ولا تُعطى صفة مصدر من تلقاء نفسها. */
export const INSTITUTIONS = [
  "الجريده الرسميه",
  "الامانه العامه للحكومه",
  "المحكمه الدستوريه",
  "مجلس النواب",
  "مجلس المستشارين",
  "عداله",
  "المحافظه العقاريه",
  "المحكمه الابتدائيه",
  "المحكمه الاداريه",
]

const ARTICLE_LABEL_RE = /(?:^| )(الفصول|الفصل|المواد|المادة)\s+(\d+(?:[-.]\d+)?)(?= |$)/g
const BARE_ARTICLE_RE = /(?:^| )(\d+(?:-\d+)?) من (?=[^ ]+)/g
// رقم القانون: 2.00 و 70.03 و 1.11.91 (نقطة بين أرقام). لا يُخلط بالفصول، فالفصول أعداد صحيحة.
const LAW_NUMBER_RE = /(?:^| )(\d{1,2}\.\d{2}(?:\.\d{2,3})?)(?= |$)/g
const YEAR_RE = /(?:^| )(1[89]\d{2}|20\d{2})(?= |$)/g

/**
 * @param {string} normalized  النص بعد normalizeArabic
 * @returns {{
 *   codes: Array<{ key: string, name: string }>,
 *   articles: Array<{ number: string, codeKey: string | null }>,
 *   lawNumbers: string[],
 *   years: string[],
 *   institutions: string[],
 * }}
 */
export function extractEntities(normalized) {
  const text = ` ${normalized} `
  const codes = CODE_ALIASES.filter((c) => c.patterns.some((re) => re.test(normalized)))
    .map((c) => ({ key: c.key, name: c.name }))

  const articles = []
  const seenArticle = new Set()
  const pushArticle = (number, codeKey) => {
    const id = `${number}|${codeKey ?? ""}`
    if (seenArticle.has(id)) return
    seenArticle.add(id)
    articles.push({ number, codeKey })
  }
  // "الفصل 306 من ق ل ع": الفصل يرتبط بالقانون الذي يليه مباشرة إن ذُكر.
  for (const m of normalized.matchAll(ARTICLE_LABEL_RE)) {
    const number = m[2]
    const after = normalized.slice((m.index ?? 0) + m[0].length)
    const codeKey = codeAfter(after) ?? codeAfter(normalized)
    pushArticle(number, codeKey)
  }
  // "306 من ق ل ع" دون كلمة الفصل.
  for (const m of text.matchAll(BARE_ARTICLE_RE)) {
    const after = text.slice((m.index ?? 0) + m[0].length)
    const codeKey = codeAfter(after)
    if (codeKey) pushArticle(m[1], codeKey)
  }

  const lawNumbers = [...new Set([...text.matchAll(LAW_NUMBER_RE)].map((m) => m[1]))]
  const years = [...new Set([...text.matchAll(YEAR_RE)].map((m) => m[1]))]
  const institutions = INSTITUTIONS.filter((name) => normalized.includes(name))

  return { codes, articles, lawNumbers, years, institutions }
}

/** أول قانون معروف في بداية النص الباقي (بعد رقم الفصل مباشرة). */
function codeAfter(rest) {
  const head = rest.slice(0, 60)
  for (const c of CODE_ALIASES) {
    if (c.patterns.some((re) => re.test(head))) return c.key
  }
  return null
}
