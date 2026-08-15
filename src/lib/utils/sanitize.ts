/**
 * تطهير النصوص وإزالة عناصر HTML غير الآمنة لتفادي هجمات XSS
 */
export function sanitizeText(text: string): string {
  if (!text) return ""
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * إزالة وسوم HTML واستخراج النص الصافي (مفيد للوصف و SEO والمقتطفات)
 */
export function stripHtml(html: string): string {
  if (!html) return ""
  return html.replace(/<[^>]*>?/gm, "").trim()
}

/**
 * تنظيف النص وتحديده بطول معين مع إضافة نقاط النهاية (...)
 */
export function truncateCleanText(htmlOrText: string, maxLength: number = 160): string {
  const clean = stripHtml(htmlOrText)
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength)}...`
}