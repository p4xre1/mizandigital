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
    `${input.xpEarned ? `+${input.xpEarned} نقطة خبرة · ` : ""}mizan.page/quiz`,
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

/** ينشئ رابط مشاركة واتساب لنتيجة الاختبار. */
export function buildWhatsAppShareUrl(input: ShareCardInput): string {
  const text = `حققت %${Math.round(input.score)} في اختبار «${input.title}» على منصة ميزان الرقمية — رتبتي الحالية ${input.rank}. جرّب حظك: https://mizan.page/quiz`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/** ينشئ رابط مشاركة لينكد إن (يشارك رابط المنصة). */
export function buildLinkedInShareUrl(): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://mizan.page/quiz")}`
}

/**
 * يشارك البطاقة: عبر Web Share API على الجوال (تشمل واتساب ولينكد إن مباشرة)،
 * وإلا ينزّلها كصورة PNG على الحاسوب.
 */
export async function shareOrDownloadCard(blob: Blob, filename = "mizan-result.png"): Promise<"shared" | "downloaded" | "failed"> {
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

  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return "downloaded"
  } catch {
    return "failed"
  }
}
