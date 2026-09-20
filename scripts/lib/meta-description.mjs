// يبني وصف الميتا للصفحات المولَّدة مسبقاً بنفس قواعد التطبيق تماماً.
//
// هذا ملف mirrors لـ src/lib/seo/description.ts: سكربتات node لا تستطيع
// استيراد TypeScript، فالنسخة هنا نسخة طبق الأصل. إن تغيّر الحد في التطبيق
// غيّره هنا (الملفان مغطّيان بالاختبار الذي يقارن المخرجين).
//
// لماذا نهتم؟ لأن الوصف في HTML المُسبق هو ما تقرأه زواحف لا تشغّل JS،
// وأي فرق عنه بعد hydration يجعل النتيجة غير متوقعة عند الاقتباس.

const MIN_LEN = 120
const MAX_LEN = 160

function truncate(text, maxLen) {
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1).trim()}…`
}

/**
 * @param {string|null|undefined} primary النص الأساسي (تعريف، ملخص…)
 * @param {(string|null|undefined)[]} fallbackParts عناصر سياقية تُضاف عند القِصَر فقط
 */
export function buildMetaDescription(primary, fallbackParts = []) {
  const base = (primary || "").trim()

  if (base.length >= MIN_LEN) return truncate(base, MAX_LEN)

  let combined = base
  for (const part of fallbackParts.filter((p) => Boolean(p && p.trim()))) {
    if (combined.length >= MIN_LEN) break
    combined = combined ? `${combined} — ${part.trim()}` : part.trim()
  }

  return truncate(combined, MAX_LEN)
}
