/**
 * مساعدات المشاركة العامة (بلا أي اعتماد على ميزة بعينها).
 *
 * كانت هذه الدوال داخل `lib/quiz/shareCard.ts` لأن أول من احتاجها كان بطاقة
 * نتيجة الاختبار، ثم صارت لوحة مشاركة المقال/الخبر تحتاجها هي نفسها. نقلها
 * إلى utils يجعل الاعتماد متجهاً من الميزات نحو المشترك لا من ميزة إلى ميزة،
 * و`shareCard.ts` يعيد تصديرها حتى لا يتغيّر أي مستورد قائم.
 */

/**
 * يفتح نافذة مشاركة خارجية (واتساب/لينكد إن/إكس...).
 *
 * داخل الإطارات المعزولة (iframes) — مثل نافذة المعاينة في بيئات التطوير —
 * يحجب المتصفح النوافذ المنبثقة، فيرجع `window.open` بـ null. نميّز هذه
 * الحالة ونُرجع "blocked" لتعرض الواجهة حينها صندوق نسخ الرابط بدل أن تبدو
 * وكأن الزر معطّل.
 */
export function openExternalShare(url: string): "opened" | "blocked" {
  if (typeof window === "undefined") return "blocked"
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer")
    return win ? "opened" : "blocked"
  } catch {
    return "blocked"
  }
}

/** نسخ نص إلى الحافظة مع بديل (execCommand) لأن الـ API محجوب في بعض الإطارات. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof document === "undefined") return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* نكمل بالبديل أدناه */
  }
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
