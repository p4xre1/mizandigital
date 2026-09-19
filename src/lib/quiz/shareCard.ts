/**
 * توليد بطاقة النتيجة البصرية (Viral Loop).
 *
 * الفكرة من المواصفة: كل نتيجة اختبار تتحول إلى بطاقة تحمل اسم صاحبها
 * ورابط بروفايله، يشاركها عبر واتساب ولينكد إن فتعود بزوار جدد.
 *
 * التنفيذ: نرسم البطاقة على <canvas> داخل المتصفح (بلا أي مكتبة خارجية ولا
 * طلب شبكي، وبلا أي أثر على حجم الحزمة)، ثم نشتركها عبر Web Share API إن
 * كانت متاحة، وإلا ننزّلها كصورة PNG.
 */

export interface ShareCardInput {
  /** عنوان الاختبار (مثال: القانون المدني — S2). */
  title: string
  score: number
  correct: number
  total: number
  /** الرتبة الحالية بعد الاختبار (مثال: B). */
  rank: string
  /** اسم المستخدم في الرابط العام (اختياري). */
  username?: string | null
  xpEarned?: number
}

const WIDTH = 1080
const HEIGHT = 1080

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

/** يرسم بطاقة النتيجة ويرجعها كملف PNG جاهز للمشاركة أو التنزيل. */
export async function renderShareCard(input: ShareCardInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null

  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // خلفية متدرجة (كحلي → أزرق ميزان)
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  background.addColorStop(0, "#0f1e3d")
  background.addColorStop(1, "#1d4ed8")
  ctx.fillStyle = background
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // هالة ذهبية ناعمة في الزاوية
  const glow = ctx.createRadialGradient(WIDTH - 140, 160, 40, WIDTH - 140, 160, 460)
  glow.addColorStop(0, "rgba(217,174,74,0.28)")
  glow.addColorStop(1, "rgba(217,174,74,0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.direction = "rtl"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  // الشعار النصي
  ctx.fillStyle = "#d9ae4a"
  ctx.font = "700 34px 'Cairo', system-ui, sans-serif"
  ctx.fillText("ميزان الرقمية", WIDTH / 2, 130)

  ctx.fillStyle = "rgba(255,255,255,0.72)"
  ctx.font = "400 26px 'Cairo', system-ui, sans-serif"
  ctx.fillText("منصة القانون المغربية", WIDTH / 2, 180)

  // عنوان الاختبار (قصّه على سطرين كحد أقصى)
  ctx.fillStyle = "#ffffff"
  ctx.font = "800 52px 'Cairo', system-ui, sans-serif"
  const title = input.title.length > 46 ? `${input.title.slice(0, 46)}…` : input.title
  ctx.fillText(title, WIDTH / 2, 300)

  // دائرة النتيجة
  const centerX = WIDTH / 2
  const centerY = 560
  const radius = 190

  ctx.lineWidth = 26
  ctx.strokeStyle = "rgba(255,255,255,0.18)"
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.stroke()

  const percentage = Math.max(0, Math.min(100, Math.round(input.score))) / 100
  ctx.strokeStyle = percentage >= 0.7 ? "#4ade80" : percentage >= 0.5 ? "#fbbf24" : "#fb7185"
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * percentage)
  ctx.stroke()

  ctx.fillStyle = "#ffffff"
  ctx.font = "800 130px 'Cairo', system-ui, sans-serif"
  ctx.fillText(`%${Math.round(input.score)}`, centerX, centerY - 20)

  ctx.fillStyle = "rgba(255,255,255,0.8)"
  ctx.font = "600 32px 'Cairo', system-ui, sans-serif"
  ctx.fillText(`${input.correct} من ${input.total} إجابة صحيحة`, centerX, centerY + 80)

  // شريط معلومات الرتبة والخبرة
  ctx.fillStyle = "rgba(255,255,255,0.08)"
  roundRect(ctx, 190, 810, WIDTH - 380, 110, 28)
  ctx.fill()

  ctx.fillStyle = "#d9ae4a"
  ctx.font = "800 40px 'Cairo', system-ui, sans-serif"
  ctx.fillText(`الرتبة ${input.rank}`, WIDTH / 2, 845)

  ctx.fillStyle = "rgba(255,255,255,0.78)"
  ctx.font = "600 28px 'Cairo', system-ui, sans-serif"
  ctx.fillText(
    `${input.xpEarned ? `+${input.xpEarned} نقطة خبرة - ` : ""}mizan.page/quiz`,
    WIDTH / 2,
    885
  )

  // رابط البروفايل العام
  if (input.username) {
    ctx.fillStyle = "#ffffff"
    ctx.font = "700 30px 'Cairo', system-ui, sans-serif"
    ctx.fillText(`mizan.page/u/${input.username}`, WIDTH / 2, 975)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png")
  })
}

/** ينشئ نص المشاركة الجاهز للنسخ أو لإرساله عبر واتساب. */
export function buildShareText(input: ShareCardInput): string {
  const scorePart = input.total > 0
    ? `حصلت على ${input.correct} من ${input.total} (${Math.round(input.score)} من 100)`
    : `نتيجتي ${Math.round(input.score)} من 100`

  return [
    `${scorePart} في اختبار «${input.title}» على منصة ميزان الرقمية.`,
    `رتبتي الحالية: ${input.rank}.`,
    input.username ? `بروفايلي: https://mizan.page/u/${input.username}` : "",
    "جرّب حظك: https://mizan.page/quiz",
  ]
    .filter(Boolean)
    .join("\n")
}

/** رابط مشاركة واتساب (api.whatsapp.com أنسب من wa.me للمشاركة النصية). */
export function buildWhatsAppShareUrl(input: ShareCardInput): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(buildShareText(input))}`
}

/** رابط مشاركة لينكد إن — share-offsite هو نقطة النهاية الرسمية للمشاركة. */
export function buildLinkedInShareUrl(url = "https://mizan.page/quiz"): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

/** نص ورابط مشاركة البروفايل العام (يختلف عن بطاقة نتيجة الاختبار). */
export function buildProfileShare(input: { displayName: string; username: string; rank: string }): {
  text: string
  whatsappUrl: string
  linkedinUrl: string
  url: string
} {
  const url = `https://mizan.page/u/${input.username}`
  const text = `${input.displayName} على منصة ميزان الرقمية — الرتبة ${input.rank}.\nبروفايلي القانوني: ${url}`
  return {
    text,
    whatsappUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
    linkedinUrl: buildLinkedInShareUrl(url),
    url,
  }
}

/**
 * يفتح نافذة مشاركة خارجية (واتساب/لينكد إن...).
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

/** ينشئ رابطاً مؤقتاً للصورة لعرضها أو تنزيلها داخل الواجهة. */
export function blobToObjectUrl(blob: Blob): string | null {
  try {
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/** ينزّل ملفاً (الصورة) — ويرجع "blocked" إن حجب المتصفح التنزيل. */
export function downloadBlob(blob: Blob, filename: string): "downloaded" | "blocked" {
  if (typeof document === "undefined") return "blocked"
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.rel = "noopener"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return "downloaded"
  } catch {
    return "blocked"
  }
}

/**
 * يشارك البطاقة: عبر Web Share API على الجوال (تشمل واتساب ولينكد إن مباشرة)،
 * وإلا ينزّلها كصورة PNG على الحاسوب. النتيجة تُخبر الواجهة بما حدث فعلاً
 * حتى تعرض الرسالة المناسبة.
 */
export async function shareOrDownloadCard(
  blob: Blob,
  filename = "mizan-result.png"
): Promise<"shared" | "downloaded" | "blocked" | "failed"> {
  if (typeof window === "undefined") return "failed"

  const file = new File([blob], filename, { type: "image/png" })

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: "نتيجتي في ميزان الرقمية" })
      return "shared"
    } catch {
      // المستخدم ألغى المشاركة — نعتبرها محاولة ناجحة بلا تنزيل
      return "shared"
    }
  }

  return downloadBlob(blob, filename)
}
