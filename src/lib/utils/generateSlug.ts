/**
 * توليد روابط صديقة (Slugs) تدعم العربية والفرنسية والإنجليزية
 */
export function generateSlug(text: string): string {
  if (!text) return ""

  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default generateSlug