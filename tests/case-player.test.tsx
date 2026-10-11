// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { PublicCase } from "@/lib/cases/model"

const publicOne = vi.fn()
const check = vi.fn()
vi.mock("@/lib/cases/service", () => ({ casesService: { publicOne: (...a: unknown[]) => publicOne(...a), check: (...a: unknown[]) => check(...a) } }))

const { CasePlayer } = await import("@/components/cases/CasePlayer")

const item: PublicCase = {
  id: "1", slug: "hurmat-al-manzil", title: "تفتيش منزل بلا إجراء", law_code: "constitution-2011", difficulty: "easy",
  story: "وصل عناصر من الشرطة إلى منزل أسرة.\n\nأرادوا التفتيش دون إذن.", question: "هل يجوز هذا التفتيش؟",
  options: ["نعم دائماً", "نعم نهاراً", "لا إلا وفق الإجراءات", "نعم بموافقة الجيران"],
  hint: "راجع الفصل 24", image_url: "", image_alt: "", reviewed_by: "مراجعة داخلية", reviewed_on: "2026-10-10", updated_at: "",
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  publicOne.mockReset()
  check.mockReset()
  publicOne.mockResolvedValue(item)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function render(slug = item.slug) {
  await act(async () => {
    root.render(<MemoryRouter><CasePlayer slug={slug} /></MemoryRouter>)
  })
  await act(async () => { await Promise.resolve() })
}

function optionButtons(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("[role=group] button"))
}

async function click(button: HTMLButtonElement) {
  await act(async () => { button.click() })
  await act(async () => { await Promise.resolve() })
}

describe("لعبة الحالة: التخمين والكشف", () => {
  test("يعرض القصة والسؤال والخيارات دون الجواب", async () => {
    await render()
    const text = container.textContent ?? ""
    expect(text).toContain("وصل عناصر من الشرطة")
    expect(text).toContain("هل يجوز هذا التفتيش؟")
    expect(optionButtons()).toHaveLength(4)
    expect(text).not.toContain("الحل")
    expect(text).not.toContain("المواد المرجعية")
  })

  test("الخطأ يعرض التلميح فقط ويعطّل الخيار", async () => {
    check.mockResolvedValue({ status: "wrong", hint: "راجع الفصل 24" })
    await render()
    await click(optionButtons()[0])
    expect(check).toHaveBeenCalledWith("hurmat-al-manzil", 0)
    expect(container.textContent).toContain("تلميح: راجع الفصل 24")
    expect(container.textContent).not.toContain("الحل")
    expect(optionButtons()[0].disabled).toBe(true)
    expect(optionButtons()[2].disabled).toBe(false)
  })

  test("الصواب يكشف الشرح والمواد ويقفل الخيارات", async () => {
    check.mockResolvedValueOnce({ status: "wrong", hint: "راجع الفصل 24" })
    check.mockResolvedValueOnce({
      status: "correct", correctIndex: 2, explanation: "لا يجوز التفتيش إلا وفق القانون.",
      articles: [{ law: "constitution-2011", article: 24, text: "لا تنتهك حرمة المنزل." }],
    })
    await render()
    await click(optionButtons()[0])
    await click(optionButtons()[2])
    const text = container.textContent ?? ""
    expect(text).toContain("الحل")
    expect(text).toContain("لا يجوز التفتيش إلا وفق القانون.")
    expect(text).toContain("لا تنتهك حرمة المنزل.")
    expect(text).toContain("عدد المحاولات: 2")
    expect(optionButtons().every(b => b.disabled)).toBe(true)
  })

  test("حالة غير منشورة تعرض رسالة بدل الخطأ التقني", async () => {
    publicOne.mockResolvedValue(null)
    await render("unknown-case")
    expect(container.textContent).toContain("غير موجودة أو لم تُنشر")
  })

  test("تعطّل الشبكة لا يُظهر إجابة ولا يتجمد الزر", async () => {
    check.mockRejectedValue(new Error("network"))
    await render()
    await click(optionButtons()[1])
    expect(container.textContent).toContain("تعذر التحقق من الإجابة")
    expect(optionButtons()[1].disabled).toBe(false)
  })
})
