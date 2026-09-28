// @vitest-environment jsdom
//
// مشاركة المقال/الخبر.
//
// كانت «شارك المقال» أربعة رموز بلا فعل (𝕏 f in ↗) في بطاقة جانبية دائمة؛
// صارت لوحة فعلية داخل درج يُفتح بالنقر. ما يثبّته هذا الاختبار:
//   • الرابط المشارك هو الرابط القانوني للمقال (لا window.location.href الذي
//     قد يحمل شرطة نهاية أو معاملات تتبع).
//   • نقاط النهاية رسمية: intent/tweet، sharer.php، share-offsite، api.whatsapp.
//   • الترميز مرة واحدة (لا %25 في الروابط) والملخص يُقتطع لحدّ الشبكات.
//   • حجب النافذة المنبثقة (إطارات المعاينة) يعرض الرابط في حقل قابل للنسخ
//     بدل زرٍّ يبدو معطّلاً — المسار نفسه المعتمد في مشاركة نتيجة الاختبار.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"

import {
  buildArticleShareTargets,
  buildArticleShareText,
  canNativeShare,
} from "../src/lib/articles/share"
import { ArticleSharePanel } from "../src/components/articles/ArticleSharePanel"

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const input = {
  title: "كيف تبني خطة مراجعة قانونية",
  url: "https://www.mizan.page/articles/kif-tabni-khitat-murajaa-qanuniya",
  summary: "خطة عملية من أربع مراحل لمراجعة النصوص القانونية قبل الامتحان",
}

describe("روابط مشاركة المقال", () => {
  test("النص: عنوان + ملخص + الرابط القانوني في سطر أخير", () => {
    const text = buildArticleShareText(input)
    expect(text.startsWith(input.title)).toBe(true)
    expect(text).toContain("خطة عملية من أربع مراحل")
    expect(text.trimEnd().endsWith(input.url)).toBe(true)
  })

  test("ملخص طويل يُقتطع بـ … فلا يتجاوز النص حدّ الشبكات", () => {
    const text = buildArticleShareText({ ...input, summary: "ك".repeat(400) })
    expect(text).toContain("…")
    expect(text.length).toBeLessThan(280)
  })

  test("بلا ملخص: العنوان وحده ثم الرابط (لا شرطة فارغة)", () => {
    const text = buildArticleShareText({ title: input.title, url: input.url })
    expect(text).toBe(`${input.title}\n${input.url}`)
    expect(text).not.toContain("—\n")
  })

  test("أربع شبكات بنقاط نهاية رسمية وترميز مرة واحدة", () => {
    const targets = buildArticleShareTargets(input)
    expect(targets.map((t) => t.id)).toEqual(["x", "facebook", "linkedin", "whatsapp"])
    expect(targets.map((t) => t.label)).toEqual(["إكس", "فيسبوك", "لينكد إن", "واتساب"])

    const byId = Object.fromEntries(targets.map((t) => [t.id, t.url]))
    expect(byId.x.startsWith("https://twitter.com/intent/tweet?text=")).toBe(true)
    expect(byId.facebook.startsWith("https://www.facebook.com/sharer/sharer.php?u=")).toBe(true)
    expect(byId.linkedin.startsWith("https://www.linkedin.com/sharing/share-offsite/?url=")).toBe(true)
    expect(byId.whatsapp.startsWith("https://api.whatsapp.com/send?text=")).toBe(true)

    for (const url of Object.values(byId)) {
      expect(url, "لا ترميز مزدوج").not.toContain("%25")
      expect(decodeURIComponent(url)).toContain("mizan.page/articles/kif-tabni-khitat-murajaa-qanuniya")
      expect(decodeURIComponent(url)).not.toMatch(/\/$/) // سياسة الروابط: بلا شرطة نهاية
    }
  })

  test("canNativeShare تتبع توفر navigator.share", () => {
    expect(canNativeShare()).toBe(false)
    Object.defineProperty(navigator, "share", { value: vi.fn(), configurable: true })
    expect(canNativeShare()).toBe(true)
    delete (navigator as unknown as { share?: unknown }).share
  })
})

describe("ArticleSharePanel", () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  async function renderPanel(props: { onToast?: (message: string) => void } = {}) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    container = host
    root = createRoot(host)
    await act(async () => {
      root!.render(
        <ArticleSharePanel title={input.title} url={input.url} summary={input.summary} onToast={props.onToast} />
      )
    })
    return host
  }

  beforeEach(() => {
    // jsdom لا ينفّذ window.open — نثبّت السلوك: نافذة تُفتح (غير محجوبة)
    vi.stubGlobal("open", vi.fn(() => ({} as unknown as Window)))
  })

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    container = null
    root = null
    vi.unstubAllGlobals()
    delete (navigator as unknown as { clipboard?: unknown }).clipboard
  })

  test("أزرار الشبكات ونسخ الرابط كلها بأهداف لمس 44px", async () => {
    const host = await renderPanel()
    const labels = ["إكس", "فيسبوك", "لينكد إن", "واتساب", "نسخ رابط المقال"]
    const buttons = Array.from(host.querySelectorAll("button"))
    for (const label of labels) {
      const button = buttons.find((b) => (b.textContent ?? "").includes(label))
      expect(button, label).toBeTruthy()
      expect(button!.className).toMatch(/min-h-\[44px\]/)
    }
    // مشاركة النظام مخفية حين لا يدعمها المتصفح (jsdom بلا navigator.share)
    expect(host.textContent).not.toContain("مشاركة عبر الجهاز")
    // الرابط القانوني معروض دائماً كحقل قابل للنسخ اليدوي
    const field = host.querySelector<HTMLInputElement>('input[aria-label="رابط المقال"]')
    expect(field!.value).toBe(input.url)
    expect(field!.readOnly).toBe(true)
  })

  test("نقرة شبكة تفتح رابطها في نافذة جديدة", async () => {
    const host = await renderPanel()
    const whatsapp = Array.from(host.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("واتساب")
    )!
    await act(async () => { whatsapp.click() })
    expect(window.open).toHaveBeenCalledTimes(1)
    expect((window.open as unknown as { mock: { calls: string[][] } }).mock.calls[0][0]).toContain(
      "api.whatsapp.com/send?text="
    )
    // الفتح نجح: لا صندوق حجب
    expect(host.textContent).not.toContain("تعذّر فتح")
  })

  test("حجب النافذة يعرض رابط الشبكة للبديل اليدوي + toast", async () => {
    vi.stubGlobal("open", vi.fn(() => null))
    const onToast = vi.fn()
    const host = await renderPanel({ onToast })
    const x = Array.from(host.querySelectorAll("button")).find((b) => (b.textContent ?? "").includes("إكس"))!
    await act(async () => { x.click() })
    expect(host.textContent).toContain("تعذّر فتح إكس")
    expect(host.querySelector<HTMLInputElement>('input[aria-label="رابط إكس"]')!.value).toContain(
      "twitter.com/intent/tweet"
    )
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining("حجب المتصفح"))
  })

  test("نسخ الرابط: حافظة + toast + حالة «نُسخ» مؤقتة", async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const onToast = vi.fn()
    const host = await renderPanel({ onToast })
    const copy = Array.from(host.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("نسخ رابط المقال")
    )!
    await act(async () => { copy.click() })
    expect(writeText).toHaveBeenCalledWith(input.url)
    expect(onToast).toHaveBeenCalledWith("نُسخ رابط المقال")
    expect(host.textContent).toContain("نُسخ الرابط")
  })
})
