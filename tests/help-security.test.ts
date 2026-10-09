import { describe, expect, test } from "vitest"
import { allEntries } from "../shared/help/knowledge.js"
import { answerQuestion } from "../shared/help/answer.js"
import { canonicalize, normalize } from "../shared/help/retrieve.js"
import { checkObfuscation } from "../shared/help/guardrails.js"
import {
  SECURITY_HEADERS,
  checkOrigin,
  readBoundedText,
  sanitizeAnswerResult,
  shortHash,
} from "../functions/_shared/helpSecurity.js"

describe("توحيد النص قبل الفحص", () => {
  test("NFKC يحوّل الأشكال العرضية إلى صورتها القياسية", () => {
    expect(canonicalize("＜ｓｃｒｉｐｔ＞")).toBe("<script>")
  })

  test("المحارف غير المرئية تُزال", () => {
    expect(canonicalize("<scr\u200Bi\uFEFFpt>")).toBe("<script>")
    expect(canonicalize("ab\u202Ecd")).toBe("abcd")
  })

  test("normalize يمر عبر التوحيد نفسه", () => {
    expect(normalize("ＳＣＲＩＰＴ")).toBe("script")
  })
})

describe("كشف الحمولات المموّهة", () => {
  test("كتلة طويلة بلا مسافات تُحظر", () => {
    expect(checkObfuscation("A".repeat(90)).block).toBe(true)
  })

  test("تكرار حرف عشرين مرة يُحظر، والتكرار القصير مسموح", () => {
    expect(checkObfuscation("x".repeat(20)).block).toBe(true)
    expect(checkObfuscation("ههههه كيف أبحث").block).toBe(false)
  })

  test("نص عربي عادي وروابط داخلية قصيرة لا تُحظر", () => {
    expect(checkObfuscation("كيف أحمل ملف PDF من /archive؟").block).toBe(false)
    expect(checkObfuscation("ما هو الاستئناف والنقض في القضاء الإداري؟").block).toBe(false)
  })
})

describe("بوابة المصدر", () => {
  const req = (headers: Record<string, string>) => new Request("https://mizan.page/api/help/chat", { method: "POST", headers })

  test("بلا ترويسات متصفح (أداة برمجية) مسموح", () => {
    expect(checkOrigin(req({})).ok).toBe(true)
  })

  test("same-origin و none مسموحان، وcross-site مرفوض", () => {
    expect(checkOrigin(req({ "Sec-Fetch-Site": "same-origin" })).ok).toBe(true)
    expect(checkOrigin(req({ "Sec-Fetch-Site": "none" })).ok).toBe(true)
    expect(checkOrigin(req({ "Sec-Fetch-Site": "cross-site" })).reason).toBe("cross_site")
    expect(checkOrigin(req({ "Sec-Fetch-Site": "same-site" })).ok).toBe(false)
  })

  test("Origin يطابق نطاق الطلب أو القائمة الإضافية فقط", () => {
    expect(checkOrigin(req({ Origin: "https://mizan.page" })).ok).toBe(true)
    expect(checkOrigin(req({ Origin: "https://evil.example" })).reason).toBe("origin_mismatch")
    expect(checkOrigin(req({ Origin: "null" })).ok).toBe(false)
    expect(checkOrigin(req({ Origin: "https://preview.example" }), { HELP_ALLOWED_ORIGINS: "https://preview.example" }).ok).toBe(true)
  })
})

describe("قراءة الجسم بحد صارم", () => {
  const stream = (chunks: string[]) =>
    new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(new TextEncoder().encode(c))
        controller.close()
      },
    })

  test("جسم ضمن الحد يُقرأ كاملاً", async () => {
    const request = new Request("https://x.test", { method: "POST", body: stream(['{"a":', '"ب"}']), duplex: "half" } as any)
    const result = await readBoundedText(request, 100)
    expect(result).toEqual({ ok: true, text: '{"a":"ب"}' })
  })

  test("تجاوز الحد أثناء التدفق يرفض 413", async () => {
    const request = new Request("https://x.test", { method: "POST", body: stream(["a".repeat(60), "a".repeat(60)]), duplex: "half" } as any)
    expect(await readBoundedText(request, 100)).toMatchObject({ ok: false, status: 413 })
  })

  test("Content-Length يتجاوز الحد يرفض قبل القراءة", async () => {
    const request = new Request("https://x.test", { method: "POST", headers: { "Content-Length": "999" }, body: "x" })
    expect(await readBoundedText(request, 100)).toMatchObject({ ok: false, status: 413 })
  })

  test("UTF-8 غير صالح يرفض 400", async () => {
    const request = new Request("https://x.test", { method: "POST", body: new Uint8Array([0xff, 0xfe, 0x00]) })
    expect(await readBoundedText(request, 100)).toMatchObject({ ok: false, status: 400 })
  })
})

describe("فحص الخرج قبل الإرسال", () => {
  test("جواب بوسم يُستبدل بنص الحظر ولا تبقى مصادره", () => {
    const out = sanitizeAnswerResult(
      { mode: "answer", answer: "<img src=x onerror=alert(1)>", sources: [{ title: "س", url: "/faq" }] },
      "نص الحظر",
    )
    expect(out).toMatchObject({ mode: "blocked", answer: "نص الحظر", sources: [], reason: "unsafe_output" })
  })

  test("المصادر الخارجية تُحذف، والداخلية تبقى", () => {
    const out = sanitizeAnswerResult(
      {
        mode: "answer",
        answer: "جواب نظيف",
        sources: [
          { title: "داخلي", url: "/archive" },
          { title: "خارجي", url: "https://evil.example" },
          { title: "بروتوكولي", url: "//evil.example" },
        ],
      },
      "x",
    )
    expect(out.sources).toEqual([{ title: "داخلي", url: "/archive" }])
  })
})

describe("المحتوى المدمج يجتاز فحص الخرج", () => {
  test("لا يحوي أي جواب مدمج وسوماً أو روابط خارجية", () => {
    const bad = allEntries().filter((e) => /[<>]/.test(e.body) || (e.url && !e.url.startsWith("/")))
    expect(bad.map((e) => e.id)).toEqual([])
  })

  test("أسئلة الموقع الأساسية تُجاب بجواب نظيف بعد الفحص", () => {
    for (const q of ["كيف أبحث في الأرشيف؟", "ما هي الكليات المدرجة في الدليل؟"]) {
      const out = sanitizeAnswerResult(answerQuestion(q), "x")
      expect(out.mode).toBe("answer")
    }
  })
})

describe("التجزئة والترويسات", () => {
  test("shortHash يعطي 16 محرفاً hex ثابتاً ولا يكشف المدخل", async () => {
    const a = await shortHash("user-123")
    expect(a).toMatch(/^[0-9a-f]{16}$/)
    expect(a).toBe(await shortHash("user-123"))
    expect(a).not.toContain("user")
  })

  test("الترويسات الأمنية الأساسية موجودة", () => {
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff")
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toContain("default-src 'none'")
    expect(SECURITY_HEADERS["Cache-Control"]).toBe("no-store")
  })
})
