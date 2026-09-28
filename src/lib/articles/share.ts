/**
 * روابط مشاركة المقال/الخبر — مصدر واحد للحقيقة.
 *
 * لماذا هنا وليس داخل المكوّن؟ لأن الرابط المشارك يجب أن يكون الرابط القانوني
 * (canonical) نفسه المُعلن في og:url، لا `window.location.href` الذي قد يحمل
 * شرطة نهاية أو معاملات تتبع فتتقسّم الإشارة بين نسختين من المقال نفسه.
 * الصفحة تبني canonical عبر lib/canonical وتمرّره إلى هنا كما هو.
 *
 * كل الروابط نقاط نهاية رسمية للمشاركة (intent/sharer/share-offsite) ولا
 * تحتاج مفاتيح API، وتُفتح عبر openExternalShare الذي يميّز حجب المتصفح
 * للنوافذ المنبثقة فتعرض الواجهة بديل النسخ بدل زرٍّ يبدو معطّلاً.
 */

export interface ArticleShareInput {
  /** عنوان المقال/الخبر كما يظهر في <h1>. */
  title: string
  /** الرابط القانوني المطلق للمقال (canonicalArticle / canonicalNews). */
  url: string
  /** الملخص — يُقتطع حتى يبقى نص المشاركة ضمن حدّ الشبكات. */
  summary?: string
}

export type ArticleShareNetwork = "x" | "facebook" | "linkedin" | "whatsapp"

export interface ArticleShareTarget {
  id: ArticleShareNetwork
  label: string
  url: string
}

/** أقصى طول لملخص مضمّن في نص المشاركة (حدّ إكس 280 محرفاً للرابط والنص معاً). */
const SUMMARY_LIMIT = 110

/** نص المشاركة: عنوان + ملخص مقتطع + الرابط القانوني في سطر أخير. */
export function buildArticleShareText({ title, url, summary }: ArticleShareInput): string {
  const cleanSummary = (summary ?? "").trim().replace(/\s+/g, " ")
  const clipped =
    cleanSummary.length > SUMMARY_LIMIT ? `${cleanSummary.slice(0, SUMMARY_LIMIT).trimEnd()}…` : cleanSummary
  const headline = clipped ? `${title} — ${clipped}` : title
  return `${headline}\n${url}`
}

/**
 * أهداف المشاركة الأربعة. تُبنى دفعة واحدة لأن اللوحة تعرضها معاً،
 * والترتيب ثابت (إكس ← فيسبوك ← لينكد إن ← واتساب) وهو ترتيب الشبكات
 * الأكثر استعمالاً من قرّاء المنصة القانونيين.
 */
export function buildArticleShareTargets(input: ArticleShareInput): ArticleShareTarget[] {
  const text = buildArticleShareText(input)
  const encodedUrl = encodeURIComponent(input.url)
  const encodedText = encodeURIComponent(text)
  return [
    { id: "x", label: "إكس", url: `https://twitter.com/intent/tweet?text=${encodedText}` },
    { id: "facebook", label: "فيسبوك", url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { id: "linkedin", label: "لينكد إن", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { id: "whatsapp", label: "واتساب", url: `https://api.whatsapp.com/send?text=${encodedText}` },
  ]
}

/** هل مشاركة النظام متاحة؟ (الجوال أساساً — تُخفى الزر إن لم تكن) */
export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function"
}
