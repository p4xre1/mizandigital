/**
 * تفضيلات القراءة — مصدر واحد للحقيقة لكل ما يخصّ تجربة قراءة المقال.
 * ─────────────────────────────────────────────────────────────────────
 * مفتاح تخزين واحد (mizan_reading_prefs) يحفظ: الخط، حجم النص، تباعد
 * الأسطر، وسمة القراءة. لا يُحفظ «وضع القراءة الأقصى» نفسه: الزائر يبدأ
 * دائماً في الوضع العادي حتى لا تُربك الصفحة غير المتوقعة الزائر الجديد.
 *
 * التطبيق على المستند يتم عبر سمات على <html> (data-reader-*) تربطها قواعد
 * CSS في globals.css، وهذا ما يسمح لسكربت الاستباق في index.html بتطبيق
 * التفضيلات قبل أول رسم (بلا وميض خط/سمة) قبل أن يركّب React أصلاً.
 *
 * السمة «ورقي» (sepia) محصورة في غلاف المقال (.reader-shell) عبر متغيرات
 * CSS فلا تتعارض مع hook السمة الموحّد useTheme الذي يدير سمة الموقع كامل.
 */

export type ReaderFontId = "default" | "naskh" | "amiri" | "plex" | "readex"
export type ReaderTextSize = "small" | "standard" | "large"
export type ReaderLineHeight = "tight" | "cozy" | "relaxed"
export type ReaderThemeChoice = "light" | "dark" | "sepia" | "auto"

export interface ReadingPrefs {
  font: ReaderFontId
  size: ReaderTextSize
  lineHeight: ReaderLineHeight
  theme: ReaderThemeChoice
}

export type ReadingPrefsPatch = Partial<ReadingPrefs>

export const READING_PREFS_STORAGE_KEY = "mizan_reading_prefs"

export const DEFAULT_READING_PREFS: ReadingPrefs = {
  font: "default",
  size: "standard",
  lineHeight: "cozy",
  theme: "auto",
}

const FONT_IDS: readonly ReaderFontId[] = ["default", "naskh", "amiri", "plex", "readex"]
const SIZE_IDS: readonly ReaderTextSize[] = ["small", "standard", "large"]
const LINE_HEIGHT_IDS: readonly ReaderLineHeight[] = ["tight", "cozy", "relaxed"]
const THEME_IDS: readonly ReaderThemeChoice[] = ["light", "dark", "sepia", "auto"]

const pick = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback

/** قراءة التفضيلات من localStorage مع تحقّق صارم من القيم (بلا ثقة بالمخزن). */
export function readReadingPrefs(): ReadingPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_READING_PREFS }
  try {
    const raw = window.localStorage.getItem(READING_PREFS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_READING_PREFS }
    const parsed = JSON.parse(raw) as Partial<ReadingPrefs> | null
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_READING_PREFS }
    return {
      font: pick(FONT_IDS, parsed.font, DEFAULT_READING_PREFS.font),
      size: pick(SIZE_IDS, parsed.size, DEFAULT_READING_PREFS.size),
      lineHeight: pick(LINE_HEIGHT_IDS, parsed.lineHeight, DEFAULT_READING_PREFS.lineHeight),
      theme: pick(THEME_IDS, parsed.theme, DEFAULT_READING_PREFS.theme),
    }
  } catch {
    return { ...DEFAULT_READING_PREFS }
  }
}

/**
 * تطبيق التفضيلات كسمات على <html>. السمات هي واجهة CSS الوحيدة: القواعد
 * في globals.css تقرأها لإنتاج متغيرات --reader-*، و«ورقي» يظهر فقط عندما
 * تتواجد السمة لأنه محصور بغلاف المقال.
 */
export function applyReadingPrefsToDocument(prefs: ReadingPrefs): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  const setUnless = (attr: string, value: string, defaultValue: string) => {
    if (value === defaultValue) root.removeAttribute(attr)
    else root.setAttribute(attr, value)
  }
  setUnless("data-reader-font", prefs.font, "default")
  setUnless("data-reader-size", prefs.size, "standard")
  setUnless("data-reader-leading", prefs.lineHeight, "cozy")
  if (prefs.theme === "sepia") root.setAttribute("data-reader-theme", "sepia")
  else root.removeAttribute("data-reader-theme")
}

/** حفظ التفضيلات + تطبيقها فوراً. يُرجع الكائن نفسه لتسهيل التسلسل. */
export function saveReadingPrefs(prefs: ReadingPrefs): ReadingPrefs {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(READING_PREFS_STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      /* وضع التصفح الخاص قد يرفض الكتابة — نتجاهل بصمت */
    }
  }
  applyReadingPrefsToDocument(prefs)
  return prefs
}

/* ── الخطوط العربية ─────────────────────────────────────────────────────
   الخطوط ذاتها ذاتية الاستضافة عبر حزم @fontsource (المجموعة العربية فقط،
   بوزني 400/700) ولا وجود لها في CSS الرئيسي. تُنزَّل ملفات woff2 من نفس
   الأصل فقط عند اختيار الخط (أو معاينته) — لا طلب خارجي، لا تغيير في CSP،
   والصفحة الافتراضية لا تدفع بايتاً واحداً مقابل الخطوط الأربعة. */

export interface ReaderFontOption {
  id: ReaderFontId
  /** اسم عربي مختصر يظهر تحت كلمة المعاينة */
  label: string
  /** كلمة المعاينة داخل الرقاقة — تُعرض بخط الرقاقة نفسه */
  sample: string
  /** قيمة font-family لمعاينة الرقاقة (المتناوب يكمل بما هو محمَّل) */
  stack: string
}

export const READER_FONTS: ReaderFontOption[] = [
  { id: "default", label: "افتراضي", sample: "القانون التجاري", stack: "var(--font-sans)" },
  { id: "naskh", label: "نسخ نوتو", sample: "القانون التجاري", stack: '"Noto Naskh Arabic", "Cairo", serif' },
  { id: "amiri", label: "أميري", sample: "القانون التجاري", stack: '"Amiri", "Cairo", serif' },
  { id: "plex", label: "بلكس", sample: "القانون التجاري", stack: '"IBM Plex Sans Arabic", "Cairo", sans-serif' },
  { id: "readex", label: "ريدكس", sample: "القانون التجاري", stack: '"Readex Pro", "Cairo", sans-serif' },
]

type LoadableFont = Exclude<ReaderFontId, "default">

const FONT_CSS_LOADERS: Record<LoadableFont, () => Promise<unknown>> = {
  naskh: () =>
    Promise.all([
      import("@fontsource/noto-naskh-arabic/arabic-400.css"),
      import("@fontsource/noto-naskh-arabic/arabic-700.css"),
    ]),
  amiri: () =>
    Promise.all([
      import("@fontsource/amiri/arabic-400.css"),
      import("@fontsource/amiri/arabic-700.css"),
    ]),
  plex: () =>
    Promise.all([
      import("@fontsource/ibm-plex-sans-arabic/arabic-400.css"),
      import("@fontsource/ibm-plex-sans-arabic/arabic-700.css"),
    ]),
  readex: () =>
    Promise.all([
      import("@fontsource/readex-pro/arabic-400.css"),
      import("@fontsource/readex-pro/arabic-700.css"),
    ]),
}

/** وعد قيد الجري لكل خط — يضمن طلب ملفات CSS مرة واحدة فقط مهما تكرر النداء. */
const fontCssInFlight = new Map<LoadableFont, Promise<void>>()

/**
 * تحميل ملفات خط القارئ عند الحاجة (idempotent). يُستدعى عند اختيار خط،
 * أو عند تحويل تفضيل محفوظ من زيارة سابقة، أو عند تحويم رقاقة خط للمعاينة.
 * الفشل صامت: يبقى النص بخط الموقع بدل انهيار الصفحة.
 */
export function ensureReaderFontLoaded(font: ReaderFontId): Promise<void> {
  if (font === "default") return Promise.resolve()
  const inFlight = fontCssInFlight.get(font)
  if (inFlight) return inFlight
  const promise = FONT_CSS_LOADERS[font]().then(
    () => undefined,
    () => undefined
  )
  fontCssInFlight.set(font, promise)
  return promise
}

/**
 * تحميل الخطوط الأربعة دفعة واحدة لمعاينة الرقاقات داخل نافذة «Aa» في وضع
 * القراءة الأقصى — يُستدعى فقط عندما تُفتح النافذة عمداً، فلا يدفع زائر
 * الصفحة العادية شيئاً.
 */
export function ensureAllReaderFontsLoaded(): Promise<void> {
  const ids = Object.keys(FONT_CSS_LOADERS) as LoadableFont[]
  return Promise.all(ids.map((id) => ensureReaderFontLoaded(id))).then(() => undefined)
}
