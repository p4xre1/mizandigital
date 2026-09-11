/**
 * اختبارات طبقة الحماية: تنقية المدخلات، تحديد المعدل، مصيدة البوتات،
 * والتحقق من أنواع الملفات المرفوعة.
 *
 * ملاحظة: الفحص النهائي لسياسات القاعدة ومشغّل comments_anti_abuse_guard
 * لا يمكن إجراؤه في vitest (يحتاج PostgreSQL حقيقياً) — انظر SECURITY.md.
 */
import { describe, expect, test, vi, afterEach } from "vitest"
import { readFileSync } from "node:fs"

import {
  countUrls,
  detectInjection,
  detectSpam,
  inspectUserText,
  sanitizeUserText,
  stripInvisibleChars,
} from "../functions/_shared/payloadGuard.js"

import {
  checkHoneypotAndTiming,
  checkRateLimit,
  fingerprint,
  getClientIp,
  readJsonBody,
  verifyTurnstile,
} from "../functions/_shared/guard.js"

import { fileExtension, validateUploadType } from "../functions/api/r2/presign.js"
import { validateObjectKey } from "../functions/api/r2/delete.js"

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────────────────────────────────────
// 1) كشف الحقن
// ─────────────────────────────────────────────────────────────────────────────
describe("detectInjection", () => {
  const attacks = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<iframe src='//evil.tld'></iframe>",
    "<svg/onload=alert(1)>",
    "javascript:alert(document.cookie)",
    "vbscript:msgbox(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "file:///etc/passwd",
    "<div onclick=steal()>x</div>",
    "document.cookie",
    "window.location='//evil.tld'",
    "eval('payload')",
    "admin' OR '1'='1",
    "x UNION SELECT username, password FROM users",
    "'; DROP TABLE comments;--",
    "1; SELECT pg_sleep(10)",
    "SELECT * FROM information_schema.tables",
    "../../etc/passwd",
  ]

  test.each(attacks)("يرفض: %s", (payload) => {
    expect(detectInjection(payload).safe).toBe(false)
  })

  // نصوص قانونية عربية/إنجليزية سليمة يجب ألا تُرفض
  const legitimate = [
    "مقالة مفيدة جداً، شكراً على توضيح مبدأ المسؤولية التقصيرية.",
    "الفصل 77 من قانون الالتزامات والعقود يحدد الأساس.",
    "data: the results show a clear trend -- see the analysis below.",
    "هل يمكن شرح الفرق بين العقد والالتزام؟",
    "The ratio decidendi of this ruling is well explained, thank you.",
    "أوافقك الرأي 100% وهذا رأيي الشخصي -- مع التقدير",
    "5 > 3 و 2 < 4 في هذه المقارنة العددية",
  ]

  test.each(legitimate)("يقبل: %s", (text) => {
    const result = detectInjection(text)
    expect(result.safe, `false positive, matched: ${result.matches.join(",")}`).toBe(true)
  })

  test("يرجع safe=true للنص الفارغ", () => {
    expect(detectInjection("").safe).toBe(true)
    expect(detectInjection(null as unknown as string).safe).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2) كشف السبام
// ─────────────────────────────────────────────────────────────────────────────
describe("detectSpam", () => {
  test("يرفض كثرة الروابط", () => {
    const text = "زوروا http://a.example http://b.example http://c.example http://d.example"
    const result = detectSpam(text)
    expect(result.spam).toBe(true)
    // السبب يحمل العدد أيضاً: "too_many_urls:4"
    expect(result.reasons.some((r) => r.startsWith("too_many_urls"))).toBe(true)
  })

  test("يقبل 3 روابط أو أقل", () => {
    expect(detectSpam("راجع http://a.example و http://b.example").spam).toBe(false)
  })

  test("يرفض كلمات السبام الشائعة", () => {
    expect(detectSpam("buy viagra online cheap casino bonus").spam).toBe(true)
  })

  test("يرفض تكرار الحرف المبالغ فيه", () => {
    expect(detectSpam("aaaaaaaaaaaaaaaaaa رائع").spam).toBe(true)
  })

  test("يرفض النص اللاتيني كله بأحرف كبيرة", () => {
    expect(detectSpam("BUY CHEAP BACKLINKS NOW FOR YOUR SITE").spam).toBe(true)
  })

  test("countUrls يعدّ الروابط بشكل صحيح", () => {
    expect(countUrls("no links here")).toBe(0)
    expect(countUrls("a https://x.example b www.y.example")).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3) التنقية
// ─────────────────────────────────────────────────────────────────────────────
describe("sanitizeUserText", () => {
  test("يزيل الأصفار العريضة وعلامات تجاوز الاتجاه (Trojan Source)", () => {
    const raw = "تع\u200Bليق \u202Eخفي\u200F هنا"
    const clean = sanitizeUserText(raw)
    expect(clean).toBe("تعليق خفي هنا")
    expect(stripInvisibleChars(raw)).not.toContain("\u202E")
  })

  test("يزيل حروف التحكم ويُبقي الأسطر الجديدة", () => {
    expect(sanitizeUserText("سطر\u0000 أول\u0007\nسطر ثاني")).toBe("سطر أول\nسطر ثاني")
  })

  test("يطوي المسافات الزائدة والأسطر الفارغة المتتالية", () => {
    expect(sanitizeUserText("  a   b  \n\n\n\n  c  ")).toBe("a b\n\nc")
  })

  test("يقصّ النص عند الحد الأقصى", () => {
    expect(sanitizeUserText("x".repeat(500), { maxLength: 100 })).toHaveLength(100)
  })

  test("يتعامل بأمان مع المدخلات غير النصية", () => {
    expect(sanitizeUserText(undefined as unknown as string)).toBe("")
    expect(sanitizeUserText(123 as unknown as string)).toBe("")
    expect(sanitizeUserText(null as unknown as string)).toBe("")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4) الفحص الشامل
// ─────────────────────────────────────────────────────────────────────────────
describe("inspectUserText", () => {
  test("يقبل تعليقاً سليماً ويُرجع النص المنقّى", () => {
    const r = inspectUserText("  شكراً على المقالة المفيدة  ", { field: "body", minLength: 2 })
    expect(r.ok).toBe(true)
    expect(r.value).toBe("شكراً على المقالة المفيدة")
    expect(r.code).toBeNull()
  })

  test("يرفض النص القصير جداً", () => {
    expect(inspectUserText("x", { field: "body", minLength: 2 }).code).toBe("body:too_short")
  })

  test("يرفض الحقن برمز مستقر", () => {
    expect(inspectUserText("<script>x</script>", { field: "body" }).code).toBe("body:injection")
  })

  test("يرفض السبام برمز مستقر", () => {
    const spam = "http://a.example http://b.example http://c.example http://d.example"
    expect(inspectUserText(spam, { field: "body" }).code).toBe("body:spam")
  })

  test("maxUrls=0 يمنع أي رابط في الاسم", () => {
    expect(inspectUserText("http://spam.example", { field: "name", maxUrls: 0 }).ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5) تحديد عنوان IP
// ─────────────────────────────────────────────────────────────────────────────
describe("getClientIp", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://example.com", { headers }) as unknown as Request

  test("يفضّل CF-Connecting-IP (غير قابل للتزوير)", () => {
    expect(
      getClientIp(req({ "CF-Connecting-IP": "1.2.3.4", "X-Forwarded-For": "9.9.9.9" }))
    ).toBe("1.2.3.4")
  })

  test("يستعمل X-Forwarded-For كحل أخير", () => {
    expect(getClientIp(req({ "X-Forwarded-For": "5.6.7.8, 10.0.0.1" }))).toBe("5.6.7.8")
  })

  test("يرجع unknown عند غياب الترويسات", () => {
    expect(getClientIp(req({}))).toBe("unknown")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6) تحديد المعدل
// ─────────────────────────────────────────────────────────────────────────────
function fakeKv() {
  const store = new Map<string, string>()
  return {
    store,
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    async put(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe("checkRateLimit", () => {
  const bucket = `test-${Math.random().toString(36).slice(2)}`

  test("يسمح حتى الحد ثم يرفض (KV)", async () => {
    const kv = fakeKv()
    const key = `${bucket}-kv`
    const results = []
    for (let i = 0; i < 4; i++) {
      results.push(await checkRateLimit({ kv, bucket, key, limit: 3, windowSeconds: 60 }))
    }
    expect(results.slice(0, 3).every((r) => r.allowed)).toBe(true)
    expect(results[3].allowed).toBe(false)
    expect(results[3].backend).toBe("kv")
    expect(results[3].retryAfterSeconds).toBeGreaterThan(0)
  })

  test("يسمح حتى الحد ثم يرفض (ذاكرة العامل عند غياب KV)", async () => {
    const key = `${bucket}-mem`
    const results = []
    for (let i = 0; i < 4; i++) {
      results.push(await checkRateLimit({ bucket, key, limit: 3, windowSeconds: 60 }))
    }
    expect(results.slice(0, 3).every((r) => r.allowed)).toBe(true)
    expect(results[3].allowed).toBe(false)
    expect(results[3].backend).toBe("memory")
  })

  test("يفصل بين المفاتيح المختلفة", async () => {
    const kv = fakeKv()
    await checkRateLimit({ kv, bucket, key: `${bucket}-a`, limit: 1, windowSeconds: 60 })
    const other = await checkRateLimit({ kv, bucket, key: `${bucket}-b`, limit: 1, windowSeconds: 60 })
    expect(other.allowed).toBe(true)
  })

  test("يتراجع إلى الذاكرة عند عطل KV بدل إسقاط الخدمة", async () => {
    const broken = {
      async get() {
        throw new Error("kv down")
      },
      async put() {
        throw new Error("kv down")
      },
    }
    const r = await checkRateLimit({ kv: broken, bucket, key: `${bucket}-broken`, limit: 5, windowSeconds: 60 })
    expect(r.allowed).toBe(true)
    expect(r.backend).toBe("memory")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7) مصيدة البوتات والزمن
// ─────────────────────────────────────────────────────────────────────────────
describe("checkHoneypotAndTiming", () => {
  const startedAt = Date.now() - 20_000 // 20 ثانية — مدة تعبئة واقعية

  test("يقبل الإرسال البشري العادي", () => {
    expect(checkHoneypotAndTiming({ website: "", formStartedAt: startedAt }).ok).toBe(true)
  })

  test("يرفض حين يُملأ الحقل المخفي", () => {
    const r = checkHoneypotAndTiming({ website: "http://spam.example", formStartedAt: startedAt })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe("honeypot_filled")
  })

  test("يرفض الإرسال اللحظي (بوت)", () => {
    const r = checkHoneypotAndTiming({ website: "", formStartedAt: Date.now() })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe("submitted_too_fast")
  })

  test("يرفض طابعاً زمنياً في المستقبل (ساعة معدّلة)", () => {
    const r = checkHoneypotAndTiming({ website: "", formStartedAt: Date.now() + 86_400_000 })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe("submitted_too_fast")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8) حدّ حجم الجسم
// ─────────────────────────────────────────────────────────────────────────────
describe("readJsonBody", () => {
  const jsonRequest = (body: string) =>
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }) as unknown as Request

  test("يقرأ JSON صالحاً", async () => {
    const r = await readJsonBody(jsonRequest('{"a":1}'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.body.a).toBe(1)
  })

  test("يرفض JSON غير صالح بـ 400", async () => {
    const r = await readJsonBody(jsonRequest("{not json"))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(400)
  })

  test("يرفض الجسم الضخم بـ 413", async () => {
    const r = await readJsonBody(jsonRequest(JSON.stringify({ x: "y".repeat(5000) })), 100)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(413)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9) بصمة IP و Turnstile
// ─────────────────────────────────────────────────────────────────────────────
describe("fingerprint", () => {
  test("بصمة مستقرة ولا تكشف القيمة الأصلية", async () => {
    const a = await fingerprint("1.2.3.4", "salt")
    const b = await fingerprint("1.2.3.4", "salt")
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
    expect(a).not.toContain("1.2.3.4")
  })

  test("الملح يغيّر البصمة", async () => {
    expect(await fingerprint("1.2.3.4", "salt-a")).not.toBe(
      await fingerprint("1.2.3.4", "salt-b")
    )
  })
})

describe("verifyTurnstile", () => {
  test("يتخطى التحقق بأمان حين لا يوجد مفتاح سري", async () => {
    const r = await verifyTurnstile({ secret: "", token: "abc" })
    expect(r.skipped).toBe(true)
    expect(r.verified).toBe(false)
  })

  test("يرفض عند غياب الرمز والمفتاح مضبوط", async () => {
    const r = await verifyTurnstile({ secret: "secret", token: "" })
    expect(r.skipped).toBe(false)
    expect(r.verified).toBe(false)
  })

  test("يتحقق عبر Cloudflare عند توفر الرمز", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
    )
    const r = await verifyTurnstile({ secret: "secret", token: "valid-token", remoteIp: "1.2.3.4" })
    expect(r.verified).toBe(true)
    vi.unstubAllGlobals()
  })

  test("لا يرفض المستخدم عند عطل شبكة Cloudflare", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      })
    )
    const r = await verifyTurnstile({ secret: "secret", token: "abc" })
    expect(r.skipped).toBe(true)
    expect(r.codes).toContain("network-error")
    vi.unstubAllGlobals()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 10) أنواع ملفات R2 المسموحة
// ─────────────────────────────────────────────────────────────────────────────
describe("validateUploadType", () => {
  test("يقبل الصور والمستندات العادية", () => {
    expect(validateUploadType("photo.jpg", "image/jpeg").ok).toBe(true)
    expect(validateUploadType("lecture.pdf", "application/pdf").ok).toBe(true)
    expect(validateUploadType("data.csv", "text/csv; charset=utf-8").ok).toBe(true)
  })

  test("يرفض HTML (XSS مخزّن على نطاق الوسائط)", () => {
    expect(validateUploadType("page.html", "text/html").ok).toBe(false)
  })

  test("يرفع 415 لـ SVG حتى لو ادّعى أنه صورة", () => {
    expect(validateUploadType("logo.svg", "image/svg+xml").ok).toBe(false)
  })

  test("يرفض تطابقاً مزيفاً بين الاسم والنوع", () => {
    // اسم يبدو صورة لكن النوع نص/HTML
    expect(validateUploadType("innocent.png", "text/html").ok).toBe(false)
    // نوع صورة لكن الامتداد ملف تنفيذي
    expect(validateUploadType("payload.exe", "image/png").ok).toBe(false)
    expect(validateUploadType("shell.php", "image/png").ok).toBe(false)
  })

  test("يرفض غياب الامتداد", () => {
    expect(validateUploadType("noext", "image/png").ok).toBe(false)
  })

  test("fileExtension يستخرج الامتداد بحروف صغيرة", () => {
    expect(fileExtension("archive.TAR.GZ")).toBe("gz")
    expect(fileExtension("noext")).toBe("")
    expect(fileExtension("trailing.")).toBe("")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 11) مفاتيح كائنات R2 المسموح حذفها
// ─────────────────────────────────────────────────────────────────────────────
describe("validateObjectKey", () => {
  test("يقبل المفاتيح داخل المجلدات المعتمدة", () => {
    expect(validateObjectKey("images/123-photo.jpg").ok).toBe(true)
    expect(validateObjectKey("/documents/1-lecture.pdf").ok).toBe(true)
  })

  test("يرفض اجتياز المسارات", () => {
    expect(validateObjectKey("images/../../secret").ok).toBe(false)
  })

  test("يرفض المجلدات غير المعتمدة", () => {
    expect(validateObjectKey("private/keys.json").ok).toBe(false)
    expect(validateObjectKey("../other-bucket/x").ok).toBe(false)
  })

  test("يرفض حذف مجلد كامل بدل كائن", () => {
    expect(validateObjectKey("images/").ok).toBe(false)
    expect(validateObjectKey("images").ok).toBe(false)
  })

  test("يرفض المفتاح الفارغ أو الطويل جداً", () => {
    expect(validateObjectKey("").ok).toBe(false)
    expect(validateObjectKey("images/" + "a".repeat(500)).ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 12) تطابق طبقتَي الحماية (JavaScript ↔ SQL)
// ─────────────────────────────────────────────────────────────────────────────
describe("تكامل طبقة JavaScript مع هجرة SQL", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260911000000_comments_anti_spam_and_input_hardening.sql", import.meta.url),
    "utf8"
  )

  test("الهجرة تُنشئ المُشغّل والسياسات بدل السياسة المفتوحة", () => {
    expect(migration).toContain("trg_comments_anti_abuse_guard")
    expect(migration).toContain('DROP POLICY IF EXISTS "public can insert comments"')
    expect(migration).toContain("anon can insert moderated comments")
    expect(migration).toContain("authenticated can insert comments")
  })

  test("الهجرة تمنح EXECUTE لدور anon (سياسة RLS تستدعي الدالة)", () => {
    // بدون هذا المنح يفشل كل إدراج برسالة permission denied.
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.comments_is_suspicious\(text\) TO anon/
    )
  })

  test("لا يوجد \\b في أنماط regex داخل SQL (PostgreSQL يعامله كـ backspace)", () => {
    // حدود الكلمة في PostgreSQL هي \m و\M. استعمال \b يجعل النمط غير مطابق
    // أبداً وبصمت — وهو خطأ وقع فعلاً والتُقط بالاختبار مقابل PostgreSQL حقيقي.
    const start = migration.indexOf("CREATE OR REPLACE FUNCTION public.comments_is_suspicious")
    const end = migration.indexOf("ALTER FUNCTION public.comments_is_suspicious")
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const body = migration.slice(start, end)
    expect(body).not.toMatch(/\\b(?![a-z])/)
    expect(body).toContain("\\m")
    expect(body).toContain("\\M")
  })
})
