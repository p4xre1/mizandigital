// shared/help/language.js
//
// كشف لغة السؤال: المساعد يجيب بالعربية فقط، لكنه يقبل كل ما يُفهم منه العربية:
//   • العربية الفصحى والدارجة المكتوبة بالحروف العربية.
//   • الدارجة بالحروف اللاتينية (Arabizi) مثل: wach kayn chi qanoun dyal lkrae
//     وتُعرف بقائمة كلمات محددة (DARIJA_LATIN) لا بالتخمين.
//   • العربية المختلطة بكلمات فرنسية أو إنجليزية (مصطلحات قانونية مثلاً)، بشرط أن تكون
//     العربية هي التي تحمل السؤال.
// ويُرفض الفرنسي والإنجليزي والسيريلي وغيرها عندما لا تحمل أي كلمة عربية أو دارجة.
//
// الحكم يعتمد على عدّ الكلمات (tokens) لا الحروف، لأن الحروف تُفضّل الكلمات الطويلة
// ولا تميّز بين كلمة عربية واحدة ومصطلح فرنسي طويل. كل قرار قابل للقياس في
// tests/help-language-accuracy.test.ts.

import { normalize } from "./retrieve.js"

const ARABIC_LETTER_RE = /\p{Script=Arabic}/u
const LETTER_RE = /\p{L}/u
/** فواصل الكلمات: مسافات وعلامات ترقيم (بما فيها الفاصلة العربية والفرنسية والأبوستروف). */
const TOKEN_SPLIT_RE = /[\s\p{P}\p{S}\p{Z}]+/u

/**
 * الدارجة بالحروف اللاتينية. المفتاح بعد التحويل إلى صيغة قانونية (انظر latinKey)،
 * والقيمة معناها بالعربية الفصحى. لا تُضاف كلمات تشترك مع الفرنسية أو الإنجليزية
 * (مثل fin أو dial أو chi أو ma أو bye) لأنها تُفسد قرار الرفض.
 */
export const DARIJA_LATIN = new Map(
  Object.entries({
    wach: "هل",
    kayn: "يوجد",
    kayna: "توجد",
    kaynin: "يوجد",
    chno: "ما",
    chnou: "ما",
    shno: "ما",
    shnou: "ما",
    kifach: "كيف",
    kif: "كيف",
    bghit: "اريد",
    bghiti: "اريد",
    bghina: "نريد",
    alach: "لماذا",
    dyal: "ديال",
    dyalek: "ديالك",
    dyalna: "ديالنا",
    dyalhom: "ديالهم",
    dyali: "ديالي",
    daba: "الان",
    bzaf: "كثير",
    mzyan: "جيد",
    mezyan: "جيد",
    salam: "سلام",
    alikom: "عليكم",
    alaykum: "عليكم",
    marhba: "مرحبا",
    marhaba: "مرحبا",
    ahlan: "اهلا",
    chokran: "شكرا",
    shukran: "شكرا",
    bslama: "مع السلامه",
    chkoun: "من",
    shkoun: "من",
    nta: "انت",
    nti: "انت",
    ana: "انا",
    andi: "عندي",
    andek: "عندك",
    qanoun: "قانون",
    lqanoun: "القانون",
    lkhdma: "الخدمه",
    mohami: "محامي",
    lmohami: "المحامي",
    nmout: "نموت",
    aafak: "من فضلك",
    ghadi: "سوف",
    khoya: "اخي",
    wakha: "حسنا",
    kanbghi: "اريد",
    lkrae: "الدراسه",
    kaynch: "يوجد",
    chi: "شي",
    f: "في",
    fih: "فيه",
    ndir: "نفعل",
    nqalbo: "نبحث",
    ala: "على",
    alik: "عليك",
  }),
)

/**
 * يحوّل أرقام الدارجة اللاتينية إلى الحروف التي تمثلها، ثم يُنزع التشكيل وتُوحّد الحروف.
 * أمثلة: 3lach → alach ، 9anoun → qanoun ، lmo7ami → lmohami.
 * @param {string} token
 */
export function latinKey(token) {
  return String(token || "")
    .toLowerCase()
    .replace(/2/g, "a")
    .replace(/3/g, "a")
    .replace(/5/g, "kh")
    .replace(/6/g, "t")
    .replace(/7/g, "h")
    .replace(/8/g, "gh")
    .replace(/9/g, "q")
}

/** كلمات (tokens) النص، مع تجاهل ما لا يحوي أي حرف. */
export function tokenize(text) {
  return String(text || "")
    .split(TOKEN_SPLIT_RE)
    .filter((t) => LETTER_RE.test(t))
}

/**
 * @param {string} text
 * @returns {{
 *   lang: "ar" | "darija_latin" | "mixed" | "other" | "none",
 *   arabic: number, darija: number, foreign: number, words: number
 * }}
 *   ar           : عربية (مع أو بدون كلمات أجنبية)
 *   darija_latin : دارجة بالحروف اللاتينية فقط
 *   mixed        : عربية مختلطة بكلمات أجنبية (تُقبل)
 *   other        : لا تحمل أي عربية أو دارجة مفهومة (تُرفض)
 *   none         : لا حروف أصلاً (أرقام ورموز)، وتُعامل كعربية في المسار العادي
 */
export function analyzeLanguage(text) {
  const tokens = tokenize(text)
  let arabic = 0
  let darija = 0
  let foreign = 0
  for (const token of tokens) {
    if (ARABIC_LETTER_RE.test(token)) {
      arabic += 1
    } else if (DARIJA_LATIN.has(latinKey(token))) {
      darija += 1
    } else {
      foreign += 1
    }
  }
  const words = arabic + darija + foreign
  const base = { arabic, darija, foreign, words }

  if (words === 0) return { lang: "none", ...base }

  const understood = arabic + darija
  if (understood === 0) return { lang: "other", ...base }

  if (arabic === 0) {
    // دارجة لاتينية: يجب أن تغلب الكلمات المفهومة على الأجنبية.
    return darija >= foreign ? { lang: "darija_latin", ...base } : { lang: "other", ...base }
  }

  // عربية: تُقبل إذا حملت كلمتين مفهومتين على الأقل، أو إذا كانت نصف الكلمات أو أكثر.
  const accepted = understood >= 2 || arabic / words >= 0.5
  if (!accepted) return { lang: "other", ...base }
  return { lang: foreign > 0 || darija > 0 ? "mixed" : "ar", ...base }
}

/**
 * واجهة متوافقة مع الاستعمال القديم: "ar" | "other" | "none".
 * الدارجة اللاتينية والمختلط يُعدّان "ar" لأن المساعد يفهمهما.
 * @param {string} text
 * @returns {"ar" | "other" | "none"}
 */
export function detectLanguage(text) {
  const { lang } = analyzeLanguage(text)
  if (lang === "other") return "other"
  if (lang === "none") return "none"
  return "ar"
}

/**
 * يحوّل كلمات الدارجة اللاتينية المعروفة إلى العربية، لتحسين الاسترجاع فقط.
 * لا يحذف شيئاً من السؤال الأصلي، ولا يُستعمل في أي فحص أمني.
 * @param {string} text
 * @returns {string}
 */
export function toArabicRetrievalText(text) {
  const mapped = tokenize(text).map((token) => {
    if (ARABIC_LETTER_RE.test(token)) return token
    return DARIJA_LATIN.get(latinKey(token)) ?? ""
  })
  return normalize(mapped.filter(Boolean).join(" "))
}

export const UNSUPPORTED_LANGUAGE_ANSWER =
  "هذا المساعد يعمل باللغة العربية فقط. اكتب سؤالك بالعربية من فضلك. · Cet assistant fonctionne uniquement en arabe. Merci d'écrire votre question en arabe."
