// lib/seo/description.ts
//
// يبني وصف ميتا (Meta Description) مضمون الطول (120-160 حرفاً وفق توصية
// Google) انطلاقاً من نص أساسي (كملخص مقال أو تعريف مصطلح)، مع إكماله
// بعناصر سياقية إضافية إن كان قصيراً جداً بدل تركه دون الحد الأدنى أو حشوه
// بتكرار غير مفيد.

const MIN_LEN = 120
const MAX_LEN = 160

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1).trim() + "…"
}

/**
 * @param primary النص الأساسي (ملخص، تعريف...)، قد يكون فارغاً
 * @param fallbackParts عناصر سياقية إضافية (تصنيف، اسم الجهة، عبارة عامة...) تُستخدم لإكمال الطول عند الحاجة فقط
 */
export function buildMetaDescription(
  primary: string | null | undefined,
  fallbackParts: (string | null | undefined)[] = []
): string {
  const base = (primary || "").trim()

  if (base.length >= MIN_LEN) {
    return truncate(base, MAX_LEN)
  }

  const extras = fallbackParts.filter((p): p is string => Boolean(p && p.trim()))
  let combined = base

  for (const part of extras) {
    if (combined.length >= MIN_LEN) break
    combined = combined ? `${combined} — ${part.trim()}` : part.trim()
  }

  return truncate(combined, MAX_LEN)
}
