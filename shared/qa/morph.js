// shared/qa/morph.js
//
// المرحلة 4: تطبيع صرفي محافظ. ليس محللاً صرفياً كاملاً ولا يدّعي ذلك.
//
// الفكرة: لكل رمز مُطبَّع نُنتج صيغه الممكنة بإزالة سوابق (و، ف، ب، ل، ك، ال) ولاحقة الجمع
// (ات) مع شروط صارمة. الصيغة الأصلية تبقى دائماً في القائمة، فلا يخسر البحث الحرفي شيئاً.
//
// الحمايات:
//   • كلمات النفي والاستثناء لا تُقطع أبداً (لا، لم، لن، ليس، غير، إلا، عدم...).
//   • لا تُنتج صيغة أقصر من 3 أحرف (فلا تتحول "ليس" إلى "يس").
//   • الكلمات المحمية (PROTECTED_WORDS) تبقى كما هي.
// الصيغ تُطبَّق بالقاعدة نفسها على السؤال والنص، فيتطابقان حتى لو كان القطع غير دقيق.

/** كلمات لا تُقطع: النفي والاستثناء والأدوات التي يغيّر قطعها المعنى. */
export const PROTECTED_WORDS = new Set([
  "لا", "لم", "لن", "ليس", "ليست", "ليسوا", "غير", "الا", "عدم", "بدون", "ماعدا", "لكن", "لكن",
  "ولا", "ولم", "ولن", "فلا", "فلم", "بلا", "لدى", "علي", "الي", "ان", "ام", "او",
])

const CONJ = ["و", "ف"]
const PREP = ["ب", "ل", "ك"]
const DEF = "ال"
const PLURAL = "ات"

const MIN_STEM = 3

/**
 * يولّد الصيغ بمسار واحد لكل فئة: سابقة عطف (مرة واحدة)، ثم حرف جر (مرة واحدة)، ثم "ال" (مرة واحدة)،
 * ثم لاحقة الجمع (مرة واحدة). بهذا لا تُزال "ال" مرتين ولا تنشأ صيغ مثل "تزامات".
 * @param {string} token  رمز مُطبَّع (بعد normalizeArabic)
 * @returns {string[]} الصيغ الممكنة، الأصلية أولاً، بلا تكرار.
 */
export function stemVariants(token) {
  if (!token) return []
  if (PROTECTED_WORDS.has(token) || /\d/.test(token)) return [token]

  const out = new Set([token])
  const add = (word) => {
    if (word.length >= MIN_STEM && !PROTECTED_WORDS.has(word)) out.add(word)
  }
  const walk = (word, used) => {
    if (!used.conj) {
      for (const c of CONJ) {
        if (word.startsWith(c) && word.length - c.length >= MIN_STEM) {
          const rest = word.slice(c.length)
          add(rest)
          walk(rest, { ...used, conj: true })
        }
      }
    }
    if (!used.prep) {
      for (const p of PREP) {
        if (word.startsWith(p) && word.length - p.length >= MIN_STEM) {
          const rest = word.slice(p.length)
          add(rest)
          walk(rest, { ...used, prep: true })
        }
      }
    }
    // "لل" = حرف الجر "ل" + "ال" مع حذف لام التعريف في الكتابة (للزوجة ← زوجة).
    if (!used.def && !used.prep && word.startsWith("لل") && word.length - 2 >= MIN_STEM) {
      const rest = word.slice(2)
      add(rest)
      add(DEF + rest) // "للتقادم" ← "التقادم" (لام التعريف مدمجة في الكتابة)
      walk(rest, { ...used, prep: true, def: true })
    }
    if (!used.def && word.startsWith(DEF) && word.length - DEF.length >= MIN_STEM) {
      const rest = word.slice(DEF.length)
      add(rest)
      walk(rest, { ...used, def: true })
    }
    if (!used.plural && word.endsWith(PLURAL) && word.length - PLURAL.length >= MIN_STEM) {
      add(word.slice(0, -PLURAL.length))
      walk(word.slice(0, -PLURAL.length), { ...used, plural: true })
    }
  }
  walk(token, { conj: false, prep: false, def: false, plural: false })
  return [...out]
}
