// lib/seo/quickAudit.ts
//
// نسخة خفيفة من قواعد SeoAuditWidget تُستخدم كـ"بوابة" قبل النشر مباشرة:
// عند الضغط على "نشر الآن" في المقالات أو الأخبار، تُحسب نتيجة سريعة، وإن
// كانت ضعيفة جداً يُعرض تنبيه يطلب من المحرر تأكيد المتابعة رغم النواقص
// بدل نشر محتوى بلا أي حد أدنى من تحسين السيو دون علمه.

export interface QuickSeoResult {
  score: number
  issues: string[]
}

export function computeQuickSeoScore({
  title,
  description,
  content,
  focusKeyword,
}: {
  title: string
  description: string
  content: string
  focusKeyword?: string
}): QuickSeoResult {
  const issues: string[] = []
  let points = 0
  const maxPoints = 5

  const titleLen = title.trim().length
  if (titleLen >= 30 && titleLen <= 60) points += 1
  else issues.push(titleLen === 0 ? "العنوان مفقود." : "طول العنوان خارج النطاق المثالي (30-60 حرفاً).")

  const descLen = description.trim().length
  if (descLen >= 120 && descLen <= 160) points += 1
  else issues.push(descLen === 0 ? "وصف الميتا (Meta Description) مفقود." : "طول وصف الميتا خارج النطاق المثالي (120-160 حرفاً).")

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
  if (wordCount >= 300) points += 1
  else issues.push(`المحتوى قصير نسبياً (${wordCount} كلمة فقط، يُفضّل 300+).`)

  if (focusKeyword?.trim()) {
    points += 1
    const kw = focusKeyword.trim().toLowerCase()
    if (title.toLowerCase().includes(kw) || description.toLowerCase().includes(kw)) points += 1
    else issues.push("الكلمة المفتاحية الرئيسية غير موجودة في العنوان أو الوصف.")
  } else {
    issues.push("لم يتم تحديد كلمة مفتاحية رئيسية (Focus Keyword).")
  }

  const score = Math.round((points / maxPoints) * 100)
  return { score, issues }
}
