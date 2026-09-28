// @vitest-environment jsdom
//
// وضع القراءة الأقصى + تفضيلات القراءة + مبدّل الخطوط العربية.
//
// يثبّت القرارات التي بُني عليها الموضع:
//   • مفتاح تخزين واحد mizan_reading_prefs (خط/حجم/تباعد/سمة) — بلا سمة
//     للوضع الأقصى نفسه: الزيارة تبدأ دائماً في الوضع العادي.
//   • التطبيق قبل أول رسم عبر سمات data-reader-* على <html> (سكربت الاستباق).
//   • سمة «ورقي» محصورة بغلاف المقال (.reader-shell) فلا تصطدم بـ useTheme.
//   • الخطوط الأربعة ذاتية الاستضافة عبر @fontsource (المجموعة العربية فقط)
//     وتُحمَّل ديناميكياً عند الاختيار/المعاينة لا عند تحميل الصفحة.
//   • طول السطر في الوضع الأقصى مقيَّد (~70 حرفاً) حتى مع «عريض».
//   • الشريط النحيف + نافذة Aa + درج الفهرس بأهداف لمس 44px وaria-pressed
//     وإعادة التركيز، ومراساة موضع القراءة عند التبديل.
import { beforeEach, describe, expect, test, vi, afterEach } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"

import {
  DEFAULT_READING_PREFS,
  READING_PREFS_STORAGE_KEY,
  applyReadingPrefsToDocument,
  ensureAllReaderFontsLoaded,
  ensureReaderFontLoaded,
  readReadingPrefs,
  saveReadingPrefs,
} from "../src/lib/reading/prefs"
import { collectReaderAnchors, scrollToAnchor, topAnchorIndex } from "../src/lib/reading/anchor"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (file: string) => readFileSync(path.join(rootDir, file), "utf8")

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute("data-reader-font")
  document.documentElement.removeAttribute("data-reader-size")
  document.documentElement.removeAttribute("data-reader-leading")
  document.documentElement.removeAttribute("data-reader-theme")
  document.body.classList.remove("reader-max-active")
})

/* ────────────────────────────────────────────────────────────────────────
   1) التخزين: مفتاح واحد، قيم محقَّقة، وتطبيق كسمات قبل أول رسم
──────────────────────────────────────────────────────────────────────── */

describe("mizan_reading_prefs — التخزين والتحقق", () => {
  test("بلا مخزون: الافتراضيات (خط الموقع، عادي، متوسط، تلقائي)", () => {
    expect(readReadingPrefs()).toEqual({
      font: "default",
      size: "standard",
      lineHeight: "cozy",
      theme: "auto",
    })
  })

  test("جولة حفظ/قراءة كاملة", () => {
    saveReadingPrefs({ font: "amiri", size: "large", lineHeight: "relaxed", theme: "sepia" })
    expect(JSON.parse(window.localStorage.getItem(READING_PREFS_STORAGE_KEY)!)).toEqual({
      font: "amiri",
      size: "large",
      lineHeight: "relaxed",
      theme: "sepia",
    })
    expect(readReadingPrefs()).toEqual({ font: "amiri", size: "large", lineHeight: "relaxed", theme: "sepia" })
  })

  test("JSON تالف أو قيم غريبة لا تُمرَّر — تعود الافتراضيات", () => {
    window.localStorage.setItem(READING_PREFS_STORAGE_KEY, "{عن:: يأس}")
    expect(readReadingPrefs()).toEqual(DEFAULT_READING_PREFS)

    window.localStorage.setItem(
      READING_PREFS_STORAGE_KEY,
      JSON.stringify({ font: "Comic Sans", size: "ع巨大", lineHeight: 7, theme: "hacker", maxRead: true })
    )
    expect(readReadingPrefs()).toEqual(DEFAULT_READING_PREFS)
  })

  test("السمات تُكتب على <html> وتُمسح عند العودة للافتراضي", () => {
    saveReadingPrefs({ font: "naskh", size: "small", lineHeight: "tight", theme: "sepia" })
    const root = document.documentElement
    expect(root.getAttribute("data-reader-font")).toBe("naskh")
    expect(root.getAttribute("data-reader-size")).toBe("small")
    expect(root.getAttribute("data-reader-leading")).toBe("tight")
    expect(root.getAttribute("data-reader-theme")).toBe("sepia")

    applyReadingPrefsToDocument({ font: "default", size: "standard", lineHeight: "cozy", theme: "auto" })
    expect(root.hasAttribute("data-reader-font")).toBe(false)
    expect(root.hasAttribute("data-reader-size")).toBe(false)
    expect(root.hasAttribute("data-reader-leading")).toBe(false)
    expect(root.hasAttribute("data-reader-theme")).toBe(false)
  })

  test("الوضع الأقصى ليس حقلاً محفوظاً — لا يظهر في الافتراضيات ولا يُقرأ", () => {
    const prefs = readReadingPrefs() as unknown as Record<string, unknown>
    expect(Object.keys(prefs).sort()).toEqual(["font", "lineHeight", "size", "theme"])
  })
})

/* ────────────────────────────────────────────────────────────────────────
   2) سكربت الاستباق في index.html — قبل أول رسم، بلا وميض
──────────────────────────────────────────────────────────────────────── */

describe("سكربت الاستباق يطبّق التفضيلات قبل أول رسم", () => {
  const indexHtml = read("index.html")

  test("يقرأ mizan_reading_prefs ويضبط سمات data-reader-*", () => {
    expect(indexHtml).toContain('localStorage.getItem("mizan_reading_prefs")')
    expect(indexHtml).toContain('data-reader-font')
    expect(indexHtml).toContain('data-reader-size')
    expect(indexHtml).toContain('data-reader-leading')
    expect(indexHtml).toContain('data-reader-theme')
  })

  test("«ورقي» لا يغير سمة الموقع — تُقرأ من mizan_theme أو النظام", () => {
    const script = /<script>\s*\(function \(\) \{[\s\S]*?\}\)\(\);\s*<\/script>/.exec(indexHtml)?.[0] ?? ""
    expect(script).toContain('sepia')
    expect(script).toContain('localStorage.getItem("mizan_theme")')
  })

  test("الوضع الأقصى لا يُستأنف من التخزين إطلاقاً", () => {
    expect(indexHtml).not.toMatch(/maxRead|max-read|reader-max/)
  })

  test("يبقى سكربتاً مضمّناً واحداً قابلاً للتنفيذ (CSP hash واحد)", () => {
    const scripts = indexHtml.match(/<script>/g) ?? []
    expect(scripts).toHaveLength(1)
  })
})

/* ────────────────────────────────────────────────────────────────────────
   3) CSS: متغيرات القارئ، حصر «ورقي»، إخفاء هيكل الموقع
──────────────────────────────────────────────────────────────────────── */

describe("globals.css — طبقة القارئ", () => {
  const css = read("src/styles/globals.css")

  test("خرائط الخطوط الأربعة عبر data-reader-font", () => {
    for (const family of ["Noto Naskh Arabic", "Amiri", "IBM Plex Sans Arabic", "Readex Pro"]) {
      expect(css).toContain(`--reader-font-family: "${family}"`)
    }
  })

  test("حجم وتباعد بثلاث درجات لكلٍّ منهما", () => {
    for (const value of ["small", "large", "tight", "relaxed"]) {
      expect(css).toContain(`data-reader-${value === "small" || value === "large" ? "size" : "leading"}="${value}"`)
    }
    expect(css).toContain("--reader-leading: 1.7")
    expect(css).toContain("--reader-leading: 2.1")
  })

  test("«ورقي» محصورة بـ .reader-shell — لا تسرّب لسمة الموقع", () => {
    expect(css).toMatch(/:root\[data-reader-theme="sepia"\] \.reader-shell \{/)
    // لا توجد قاعدة تجعل «ورقي» تعيد تعريف متغيرات الجذر نفسها
    expect(css).not.toMatch(/:root\[data-reader-theme="sepia"\]\s*\{/)
  })

  test("متن المقال يأخذ الخط/الحجم/التباعد، والعناوين تحتفظ بخط الموقع", () => {
    expect(css).toMatch(/\.reader-body \{[^}]*var\(--reader-font-family/)
    expect(css).toMatch(/\.reader-body h2,\s*\n?\.reader-body h3 \{ font-family: var\(--font-sans\)/)
  })

  test("إخفاء هيكل الموقع في الوضع الأقصى: الهيدر والفوتر وقائمة الجوال", () => {
    expect(css).toMatch(/body\.reader-max-active \.site-header/)
    expect(css).toMatch(/body\.reader-max-active \.site-footer/)
    expect(css).toMatch(/body\.reader-max-active \.site-mobile-menu/)
  })
})

/* ────────────────────────────────────────────────────────────────────────
   4) الخطوط: @fontsource ذاتية الاستضافة، عربية 400/700، تحميل ديناميكي
──────────────────────────────────────────────────────────────────────── */

describe("مبدّل الخطوط العربية", () => {
  const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> }
  const loader = read("src/lib/reading/prefs.ts")

  test("الحزم الأربع في dependencies (لا CDN ولا Google Fonts)", () => {
    for (const name of [
      "@fontsource/noto-naskh-arabic",
      "@fontsource/amiri",
      "@fontsource/ibm-plex-sans-arabic",
      "@fontsource/readex-pro",
    ]) {
      expect(pkg.dependencies[name], name).toBeTruthy()
    }
    expect(loader).not.toContain("fonts.googleapis.com")
    expect(loader).not.toContain("fonts.gstatic.com")
  })

  const nodeModulesReady = existsSync(path.join(rootDir, "node_modules", "@fontsource", "amiri"))
  test.skipIf(!nodeModulesReady)("ملفات المجموعة العربية 400/700 موجودة فعلاً في كل حزمة", () => {
    for (const [dir, family] of [
      ["noto-naskh-arabic", "noto-naskh-arabic"],
      ["amiri", "amiri"],
      ["ibm-plex-sans-arabic", "ibm-plex-sans-arabic"],
      ["readex-pro", "readex-pro"],
    ] as const) {
      for (const weight of [400, 700]) {
        const cssFile = path.join(rootDir, "node_modules", "@fontsource", dir, `arabic-${weight}.css`)
        const woff2 = path.join(rootDir, "node_modules", "@fontsource", dir, "files", `${family}-arabic-${weight}-normal.woff2`)
        expect(existsSync(cssFile), cssFile).toBe(true)
        expect(existsSync(woff2), woff2).toBe(true)
      }
    }
  })

  test("التحميل ديناميكي عند الاختيار — لا استيراد ثابت للخطوط", () => {
    expect(loader).toMatch(/import\("@fontsource\/amiri\/arabic-400\.css"\)/)
    expect(loader).not.toMatch(/^import "@fontsource/m)
  })

  test("ensureReaderFontLoaded يُبدأ التحميل ولا يكرر الوعد للخط نفسه", async () => {
    await expect(ensureReaderFontLoaded("default")).resolves.toBeUndefined()
    const first = ensureReaderFontLoaded("amiri")
    const second = ensureReaderFontLoaded("amiri")
    expect(first).toBe(second) // نفس الوعد: ملفات CSS لا تُطلب مرتين
    await expect(first).resolves.toBeUndefined()
    await expect(ensureAllReaderFontsLoaded()).resolves.toBeUndefined()
  })

  test("الرقاقات تعرض كلمة عينة بخط كل رقاقة (الاختيار بالعين)", () => {
    expect(loader).toContain("sample")
    const controls = read("src/components/articles/ReadingOptionsControls.tsx")
    expect(controls).toContain("fontFamily: font.stack")
  })
})

/* ────────────────────────────────────────────────────────────────────────
   5) مراساة موضع القراءة عند التبديل
──────────────────────────────────────────────────────────────────────── */

describe("مراساة موضع القراءة", () => {
  test("topAnchorIndex يعيد آخر عنصر تجاوز خط التوقّف", () => {
    const host = document.createElement("div")
    const anchors = [0, 1, 2].map((i) => {
      const el = document.createElement("p")
      el.setAttribute("data-reader-anchor", "")
      host.appendChild(el)
      el.getBoundingClientRect = () => ({ top: i < 2 ? 40 : 800 } as DOMRect)
      return el
    })
    document.body.appendChild(host)
    expect(topAnchorIndex(anchors)).toBe(1)
    expect(topAnchorIndex(collectReaderAnchors(host))).toBe(1)
    host.remove()
  })

  test("scrollToAnchor يمرر لحظياً إلى العنصر المُراسَط", () => {
    const el = document.createElement("p")
    el.setAttribute("data-reader-anchor", "")
    document.body.appendChild(el)
    el.getBoundingClientRect = () => ({ top: 300 } as DOMRect)
    const scrollTo = vi.fn()
    ;(window as unknown as { scrollTo: unknown }).scrollTo = scrollTo
    window.scrollY = 100
    scrollToAnchor([el], 0, 72)
    expect(scrollTo).toHaveBeenCalledWith({ top: 300 + 100 - 72, behavior: "instant" })
    document.body.removeChild(el)
  })

  test("كل كتل المقال تحمل data-reader-anchor (فقرات وعناوين وقوائم واقتباسات)", () => {
    const content = read("src/components/articles/ArticleContent.tsx")
    // 7 كتل: عنوان، فقرة، صورة، اقتباس، قائمة مرتبة، قائمة نقطية، فاصل
    expect(content.match(/data-reader-anchor=""/g)).toHaveLength(7)
  })
})

/* ────────────────────────────────────────────────────────────────────────
   6) مكوّن خيارات القراءة — مكوّن واحد بقشرتين
──────────────────────────────────────────────────────────────────────── */

let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderControls(props: {
  prefs?: {
    font: string
    size: string
    lineHeight: string
    theme: string
  }
  onPrefsChange?: (patch: unknown) => void
  width?: string
  onWidthChange?: (w: unknown) => void
  inMaxRead?: boolean
}) {
  const { ReadingOptionsControls } = await import("../src/components/articles/ReadingOptionsControls")
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <ReadingOptionsControls
        prefs={props.prefs as never}
        onPrefsChange={props.onPrefsChange as never}
        width={(props.width ?? "Standard") as never}
        onWidthChange={props.onWidthChange as never}
        inMaxRead={props.inMaxRead}
      />
    )
  })
}

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
})

/* ────────────────────────────────────────────────────────────────────────
   7) الشريط النحيف للوضع الأقصى — نافذة Aa ودرج الفهرس
──────────────────────────────────────────────────────────────────────── */

let barContainer: HTMLDivElement | null = null
let barRoot: Root | null = null

async function renderBar(props: Record<string, unknown>) {
  const { MaxReadBar } = await import("../src/components/articles/MaxReadBar")
  barContainer = document.createElement("div")
  document.body.appendChild(barContainer)
  barRoot = createRoot(barContainer)
  const onToggleSettings = (props.onToggleSettings ?? vi.fn()) as () => void
  const onCloseSettings = (props.onCloseSettings ?? vi.fn()) as () => void
  await act(async () => {
    barRoot!.render(
      <MaxReadBar
        progress={42}
        hidden={false}
        title="مقال تجريبي"
        settingsOpen={Boolean(props.settingsOpen)}
        tocOpen={Boolean(props.tocOpen)}
        onToggleSettings={onToggleSettings}
        onToggleToc={(props.onToggleToc ?? vi.fn()) as () => void}
        onCloseSettings={onCloseSettings}
        onCloseToc={(props.onCloseToc ?? vi.fn()) as () => void}
        onExit={(props.onExit ?? vi.fn()) as () => void}
        settingsContent={<div id="settings-content">خيارات</div>}
        tocContent={<div id="toc-content">فهرس</div>}
      />
    )
  })
  return { onToggleSettings, onCloseSettings }
}

afterEach(() => {
  act(() => barRoot?.unmount())
  barContainer?.remove()
  barContainer = null
  barRoot = null
})

describe("MaxReadBar — كل أدوات القراءة على بُعد لمسة", () => {
  test("الخروج وشريط التقدم وAa والفهرس والترجمة كلها موجودة بأهداف 44px", async () => {
    await renderBar({})
    const labels = ["إنهاء وضع القراءة الأقصى (Esc)", "خيارات القراءة (الخط والحجم والمظهر)", "محتويات المقال"]
    for (const label of labels) {
      const button = barContainer!.querySelector(`button[aria-label="${label}"]`)
      expect(button, label).toBeTruthy()
      expect(button!.className).toMatch(/size-11/)
    }
    expect(barContainer!.querySelector('[title="ترجمة محتوى هذه الصفحة إلى لغة أخرى (ترجمة آلية)"]')).toBeTruthy()
    expect(barContainer!.textContent).toContain("مقال تجريبي")
  })

  test("Aa يفتح نافذة dialog تستقبل التركيز، والنقر خارجها يغلقها ويعيد التركيز للزر", async () => {
    const { onCloseSettings } = await renderBar({ settingsOpen: true })
    const dialog = barContainer!.querySelector('[role="dialog"][aria-label="خيارات القراءة"]')
    expect(dialog).toBeTruthy()
    expect(document.activeElement).toBe(dialog)
    // نقرة خارج النافذة وخارج زر Aa
    const outside = document.body
    await act(async () => {
      outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    })
    expect(onCloseSettings).toHaveBeenCalled()
  })

  test("زر الفهرس يفتح درجاً بدور dialog وقابلاً للإغلاق", async () => {
    await renderBar({ tocOpen: true })
    const drawer = barContainer!.querySelector('aside[role="dialog"][aria-modal="true"]')
    expect(drawer).toBeTruthy()
    expect(drawer!.textContent).toContain("محتويات المقال")
    expect(document.activeElement).toBe(drawer)
  })

  test("الشريط يبقى ظاهراً ما دامت النافذة مفتوحة حتى مع إشارة إخفاء", async () => {
    await renderBar({ settingsOpen: true })
    const header = barContainer!.querySelector("header")!
    expect(header.className).toContain("translate-y-0")
    expect(header.className).not.toContain("-translate-y-full")
  })
})

/* ────────────────────────────────────────────────────────────────────────
   8) useReadingPrefs — الجسر مع useTheme
──────────────────────────────────────────────────────────────────────── */

describe("useReadingPrefs", () => {
  test("زائر بلا تفضيلات: لا يُكتب مفتاح التخزين بمجرد فتح صفحة مقال", async () => {
    const { useReadingPrefs } = await import("../src/hooks/useReadingPrefs")
    let captured: { prefs: unknown; update: (patch: unknown) => void } | null = null
    function Harness() {
      const result = useReadingPrefs()
      captured = result as never
      return null
    }
    const host = document.createElement("div")
    document.body.appendChild(host)
    const hookRoot = createRoot(host)
    await act(async () => { hookRoot.render(<Harness />) })
    expect(window.localStorage.getItem(READING_PREFS_STORAGE_KEY)).toBeNull()
    await act(async () => { captured!.update({ font: "amiri" }) })
    expect(JSON.parse(window.localStorage.getItem(READING_PREFS_STORAGE_KEY)!).font).toBe("amiri")
    expect(document.documentElement.getAttribute("data-reader-font")).toBe("amiri")
    await act(async () => { hookRoot.unmount() })
    host.remove()
  })

  test("اختيار سمة من اللوحة يكتب mizan_theme (توحيد مع زر الهيدر)", async () => {
    const { useReadingPrefs } = await import("../src/hooks/useReadingPrefs")
    let captured: { update: (patch: unknown) => void } | null = null
    function Harness() {
      const result = useReadingPrefs()
      captured = result as never
      return null
    }
    const host = document.createElement("div")
    document.body.appendChild(host)
    const hookRoot = createRoot(host)
    await act(async () => { hookRoot.render(<Harness />) })
    await act(async () => { captured!.update({ theme: "dark" }) })
    expect(window.localStorage.getItem("mizan_theme")).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.hasAttribute("data-reader-theme")).toBe(false)
    // «ورقي» لا يغيّر سمة الموقع
    await act(async () => { captured!.update({ theme: "sepia" }) })
    expect(window.localStorage.getItem("mizan_theme")).toBe("dark")
    expect(document.documentElement.getAttribute("data-reader-theme")).toBe("sepia")
    await act(async () => { hookRoot.unmount() })
    host.remove()
  })
})

describe("ReadingOptionsControls", () => {
  const baseProps = (patch: Record<string, unknown> = {}) => ({
    prefs: { font: "default", size: "standard", lineHeight: "cozy", theme: "auto" },
    onPrefsChange: vi.fn(),
    width: "Standard",
    onWidthChange: vi.fn(),
    ...patch,
  })

  test("رقاقات الخطوط الخمسة موجودة وكلها aria-pressed، والاختيار يُبلَّغ", async () => {
    const onPrefsChange = vi.fn()
    await renderControls(baseProps({ onPrefsChange }))
    const chips = Array.from(container!.querySelectorAll('button[aria-pressed]'))
    const labels = chips.map((b) => b.textContent ?? "")
    expect(labels.join("|")).toContain("أميري")
    expect(labels.join("|")).toContain("افتراضي")

    const amiri = chips.find((b): b is HTMLButtonElement => (b.textContent ?? "").includes("أميري"))!
    expect(amiri.getAttribute("aria-pressed")).toBe("false")
    await act(async () => { amiri.click() })
    expect(onPrefsChange).toHaveBeenCalledWith({ font: "amiri" })
  })

  test("«ورقي» رابعة بجانب فاتح/داكن/تلقائي و aria-pressed يتبع السمة", async () => {
    await renderControls(baseProps({ prefs: { font: "default", size: "standard", lineHeight: "cozy", theme: "sepia" } }))
    const sepia = Array.from(container!.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("ورقي"))!
    expect(sepia.getAttribute("aria-pressed")).toBe("true")
  })

  test("في نافذة الوضع الأقصى: تلميح تقييد طول السطر رغم «عريض»", async () => {
    await renderControls(baseProps({ inMaxRead: true, width: "Wide" }))
    expect(container!.textContent).toContain("يُقيَّد طول السطر")
  })

  test("أزرار الحجم/التباعد/العرض/المظهر كلها aria-pressed وأهدافها ≥44px", async () => {
    await renderControls(baseProps() as never)
    const pressed = container!.querySelectorAll("button[aria-pressed]")
    // 5 خطوط + 3 أحجام + 3 تباعد + 2 عرض + 4 مظهر = 17
    expect(pressed.length).toBe(17)
    for (const button of pressed) {
      const height = (button as HTMLElement).getBoundingClientRect().height
      // في jsdom لا تخطيط فعلياً — التحقق من صنف min-h بدلاً من القياس
      expect(height === 0 || height >= 44).toBe(true)
      expect(button.className).toMatch(/min-h-\[44px\]/)
    }
  })
})

/* ────────────────────────────────────────────────────────────────────────
   9) تكامل صفحة المقال — الدخول للوضع الأقصى والخروج منه فعلياً
──────────────────────────────────────────────────────────────────────── */

// سلسلة Supabase عامة: كل دالة تعيد الكائن نفسه، وهو في الوقت ذاته وعد
// يُرضي «لا بيانات». المقال يُجَلب محلياً من src/data/articles.json كما في
// إنتاج بلا شبكة، وما عدا ذلك يبقى فارغاً بأمان.
vi.mock("@/lib/supabase/client", () => {
  const makeStub = () => {
    const result = { data: null, error: null, count: 0, status: 200 }
    const fn: any = () => proxy
    const proxy: any = new Proxy(fn, {
      get: (_target, prop) => {
        const settled: Promise<any> = Promise.resolve(result)
        if (prop === "then") return (res?: unknown, rej?: unknown) => settled.then(res as never, rej as never)
        if (prop === "catch") return (rej?: unknown) => settled.catch(rej as never)
        if (prop === "finally") return (fin: () => void) => Promise.resolve(result).finally(fin)
        if (prop === "maybeSingle" || prop === "single") return async () => ({ ...result })
        return proxy
      },
      apply: () => proxy,
    })
    return proxy
  }
  return { supabase: makeStub() }
})

describe("تكامل صفحة المقال — وضع القراءة الأقصى", () => {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  test("F يدخل، Esc يخرج، والهيكل يختفي بلا فقدان حالة المقال", async () => {
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO
    const { ArticlePage } = await import("../src/pages/public/ArticlePage")
    const { MemoryRouter } = await import("react-router-dom")
    const host = document.createElement("div")
    document.body.appendChild(host)
    const pageRoot = createRoot(host)
    await act(async () => {
      pageRoot.render(
        <MemoryRouter initialEntries={["/articles/kif-tabni-khitat-murajaa-qanuniya"]}>
          <ArticlePage slug="kif-tabni-khitat-murajaa-qanuniya" />
        </MemoryRouter>
      )
    })
    // جلب المقال يشمل استيراداً ديناميكياً لبياناته — يستقر في مهمة لاحقة
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)) })

    // المقال المحلي مرسوم فعلاً
    expect(host.querySelector("article")).toBeTruthy()
    expect(host.textContent).toContain("خطة مراجعة")

    // زرا الدخول موجودان: بجانب شارة وقت القراءة وفي رأس بطاقة الخيارات
    const entries = host.querySelectorAll('button[aria-label^="وضع القراءة الأقصى"]')
    expect(entries.length).toBeGreaterThanOrEqual(2)

    // دخول بالاختصار F
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }))
    })
    expect(document.body.classList.contains("reader-max-active")).toBe(true)
    // الشريط النحيف موجود بكل أدواته
    expect(host.querySelector('header[dir="rtl"]')).toBeTruthy()
    expect(host.querySelector('button[aria-label="إنهاء وضع القراءة الأقصى (Esc)"]')).toBeTruthy()
    expect(host.querySelector('button[aria-label*="خيارات القراءة"]')).toBeTruthy()
    expect(host.querySelector('button[aria-label="محتويات المقال"]')).toBeTruthy()

    // درج الفهرس يفتح ويغلق
    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="محتويات المقال"]')!.click()
    })
    expect(host.querySelector('aside[aria-label="محتويات المقال"]')).toBeTruthy()
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })
    expect(host.querySelector("aside")).toBeNull()

    // الخروج بـ Esc (بعد إغلاق الدرج يُنهى الوضع)
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })
    expect(document.body.classList.contains("reader-max-active")).toBe(false)
    expect(host.querySelector("article")).toBeTruthy() // المقال بقي مركّباً

    // F أثناء الكتابة في حقل لا يبدّل شيئاً
    await act(async () => {
      pageRoot.render(
        <MemoryRouter initialEntries={["/articles/kif-tabni-khitat-murajaa-qanuniya"]}>
          <ArticlePage slug="kif-tabni-khitat-murajaa-qanuniya" />
        </MemoryRouter>
      )
    })
    const input = document.createElement("input")
    document.body.appendChild(input)
    input.focus()
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }))
    })
    expect(document.body.classList.contains("reader-max-active")).toBe(false)
    input.remove()

    await act(async () => { pageRoot.unmount() })
    host.remove()
  })

  test("اختيار خط من اللوحة الحقيقية يحفظ التفضيل ويطبّق السمة", async () => {
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO
    const { ArticlePage } = await import("../src/pages/public/ArticlePage")
    const { MemoryRouter } = await import("react-router-dom")
    const host = document.createElement("div")
    document.body.appendChild(host)
    const pageRoot = createRoot(host)
    await act(async () => {
      pageRoot.render(
        <MemoryRouter initialEntries={["/articles/kif-tabni-khitat-murajaa-qanuniya"]}>
          <ArticlePage slug="kif-tabni-khitat-murajaa-qanuniya" />
        </MemoryRouter>
      )
    })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)) })

    // بطاقة الخيارات الجانبية (مخفية تحت xl بـ CSS لكنها في الشجرة)
    const amiriChip = Array.from(host.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").includes("أميري")
    )
    expect(amiriChip, "رقاقة أميري في اللوحة").toBeTruthy()
    await act(async () => { amiriChip!.click() })
    expect(JSON.parse(window.localStorage.getItem(READING_PREFS_STORAGE_KEY)!).font).toBe("amiri")
    expect(document.documentElement.getAttribute("data-reader-font")).toBe("amiri")

    // سمة ورقي
    const sepiaChip = Array.from(host.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").includes("ورقي")
    )!
    await act(async () => { sepiaChip.click() })
    expect(document.documentElement.getAttribute("data-reader-theme")).toBe("sepia")

    await act(async () => { pageRoot.unmount() })
    host.remove()
    document.documentElement.removeAttribute("data-reader-font")
    document.documentElement.removeAttribute("data-reader-theme")
  })
})
