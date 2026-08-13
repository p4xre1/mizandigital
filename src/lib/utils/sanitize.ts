/**
 * تطهير النصوص وإزالة عناصر HTML غير الآمنة لتفادي XSS
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

export function stripHtml(html: string): string {
  if (!html) return ""
  return html.replace(/<[^>]*>?/gm, "").trim()
}