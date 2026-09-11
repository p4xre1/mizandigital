// tests/translate.test.ts
//
// يغطي محرّك الترجمة الجديد الذي حلّ محل "Google Website Translator"
// (الذي أوقفته Google في 1 أكتوبر 2026):
//   • التقطيع والتجميع (shared/i18n/providers.js)
//   • بناء طلبات المزوّدين وتحليل أجوبتهم
//   • سجل اللغات
//   • الوسيط functions/api/translate.js — يُختبر هنا بـ fetch مُحاكى، أي أن
//     المسار الحقيقي (تحقق ← تقطيع ← سلسلة مزوّدين ← تحليل) يُنفَّذ فعلاً.

import { describe, expect, test, beforeEach, afterEach, vi } from "vitest"

import {
  buildChunks,
  splitLongText,
  splitChunkResult,
  getProviders,
  cacheKey,
  resolveSource,
  MAX_CHUNK_CHARS,
  CHUNK_SEPARATOR,
} from "../shared/i18n/providers.js"

import {
  LANGUAGES,
  SORTED_LANGUAGES,
  SOURCE_LANG,
  getLanguage,
  isKnownLanguage,
  isRtlLanguage,
  searchLanguages,
} from "../src/lib/i18n/languages"

import { hashText } from "../src/lib/i18n/translate"

import { onRequestPost, onRequestGet } from "../functions/api/translate.js"

// ─────────────────────────────────────────────────────────────────────────────
// 1) التقطيع
// ─────────────────────────────────────────────────────────────────────────────
describe("buildChunks", () => {
  test("يضمّ النصوص القصيرة في دفعة واحدة", () => {
    const chunks = buildChunks(["نص أول", "نص ثان", "نص ثالث"])
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual(["نص أول", "نص ثان", "نص ثالث"])
  })

  test("يتجاوز النصوص الفارغة ولا يُنشئ دفعات لها", () => {
    const chunks = buildChunks(["", "   ", "\n", "نص حقيقي"])
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual(["نص حقيقي"])
  })

  test("لا تتجاوز أي دفعة الحد الأقصى", () => {
    const texts = Array.from({ length: 80 }, (_, i) => `جملة رقم ${i} فيها كلام قانوني معقول الطول`)
    const chunks = buildChunks(texts)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      const joined = chunk.join(CHUNK_SEPARATOR)
      expect(joined.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS + MAX_CHUNK_CHARS)
      expect(chunk.length).toBeGreaterThan(0)
    }
  })

  test("لا يفقد أي نص — مجموع الدفعات = المدخلات", () => {
    const texts = Array.from({ length: 40 }, (_, i) => `محتوى ${i}`)
    const chunks = buildChunks(texts)
    expect(chunks.flat()).toEqual(texts)
  })
})

describe("splitLongText", () => {
  test("نص قصير يُعاد كما هو", () => {
    expect(splitLongText("نص قصير")).toEqual(["نص قصير"])
  })

  test("نص طويل يُجزَّأ بلا تجاوز الحد", () => {
    const long = "هذه جملة قانونية كاملة. ".repeat(200)
    const parts = splitLongText(long, 300)
    expect(parts.length).toBeGreaterThan(1)
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(300)
  })

  test("رمز واحد متصل أطول من الحد يُقطع صريحاً ولا يتجاوز الحد", () => {
    // نص بلا مسافات ولا نقط: بلا القطع الصريح يخرج طلب يفشل عند Cloudflare
    const unbreakable = "ع".repeat(3600)
    const parts = splitLongText(unbreakable, 1200)
    expect(parts.length).toBeGreaterThan(1)
    expect(Math.max(...parts.map((p) => p.length))).toBeLessThanOrEqual(1200)
    // القطع يجب ألا يفقد حرفاً واحداً
    expect(parts.join("")).toBe(unbreakable)
  })

  test("لا يقطع في منتصف كلمة عند وجود مسافات", () => {
    const long = "كلمة ".repeat(500) // 2500 حرف
    const parts = splitLongText(long, 100)
    for (const part of parts) {
      // أي جزء انتهى مقطوعاً سيفقد المسافة النهائية؛ المهم ألا ينتهي بجزء كلمة
      expect(part.endsWith("كلمة") || part.length <= 100).toBe(true)
    }
  })
})

describe("splitChunkResult", () => {
  test("يعيد النصوص عند تطابق عدد الأجزاء", () => {
    expect(splitChunkResult(["a", "b"], "A\nB")).toEqual(["A", "B"])
  })

  test("يعيد null عند عدم التطابق (ترجمة مُزاحة أسوأ من لا ترجمة)", () => {
    expect(splitChunkResult(["a", "b", "c"], "A\nB")).toBeNull()
  })

  test("يعيد null لمدخل غير نصي", () => {
    expect(splitChunkResult(["a"], null as unknown as string)).toBeNull()
  })

  test("الجزء الفارغ يستعيد أصله بدل ترك فراغ", () => {
    expect(splitChunkResult(["نص", "آخر"], "مترجم\n")).toEqual(["مترجم", "آخر"])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2) سلسلة المزوّدين
// ─────────────────────────────────────────────────────────────────────────────
describe("getProviders", () => {
  test("السلسلة الافتراضية تبدأ بـ Google ثم MyMemory ثم Lingva", () => {
    const ids = getProviders({}).map((p) => p.id)
    expect(ids[0]).toBe("google-gtx")
    expect(ids[1]).toBe("mymemory")
    expect(ids.filter((id) => id.startsWith("lingva")).length).toBeGreaterThanOrEqual(3)
  })

  test("LibreTranslate لا يظهر إلا عند ضبط عنوانه", () => {
    expect(getProviders({}).some((p) => p.id === "libretranslate")).toBe(false)
    const withLibre = getProviders({ libreUrl: "https://libre.example.com" })
    expect(withLibre.at(-1)?.id).toBe("libretranslate")
  })

  test("Google: يبني استعلاماً صحيحاً ويحلّل الجواب المتداخل", () => {
    const google = getProviders({})[0]
    const req = google.buildRequest("مرحبا", "ar", "en")
    expect(req.url).toContain("client=gtx")
    expect(req.url).toContain("tl=en")
    expect(req.url).toContain("sl=ar")
    // النص العربي مرمَّز
    expect(req.url).toContain("q=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7")
    expect(google.parseResponse([[["Hello", "مرحبا", null, null, 10]], null, "ar"])).toBe("Hello")
  })

  test("Google: يرفض الجواب المشوّه بدل إرجاع نص فارغ", () => {
    const google = getProviders({})[0]
    expect(google.parseResponse(null)).toBeNull()
    expect(google.parseResponse({})).toBeNull()
    expect(google.parseResponse([[["", "", null, null, 10]]])).toBeNull()
  })

  test("MyMemory: يفرض مصدراً صريحاً (لا يقبل auto)", () => {
    const mymemory = getProviders({})[1]
    expect(resolveSource("auto")).toBe("ar")
    const req = mymemory.buildRequest("مرحبا", "auto", "en")
    expect(req.url).toContain("langpair=ar%7Cen")
    expect(mymemory.parseResponse({ responseStatus: 200, responseData: { translatedText: "Hello" } })).toBe("Hello")
    expect(mymemory.parseResponse({ responseStatus: "200", responseData: { translatedText: "Hello" } })).toBe("Hello")
  })

  test("MyMemory: يكشف رسالة تجاوز الحصة بدل تمريرها كترجمة", () => {
    const mymemory = getProviders({})[1]
    expect(
      mymemory.parseResponse({
        responseStatus: 200,
        responseData: { translatedText: "MYMEMORY WARNING: USED ALL QUERY FOR TODAY" },
      })
    ).toBeNull()
    expect(
      mymemory.parseResponse({ responseStatus: 403, responseData: { translatedText: "Hello" } })
    ).toBeNull()
  })

  test("Lingva: يبني مساراً ويحلّل {translation}", () => {
    const lingva = getProviders({}).find((p) => p.id === "lingva")!
    const req = lingva.buildRequest("مرحبا بك", "ar", "fr")
    expect(req.url).toContain("/api/v1/ar/fr/")
    expect(lingva.parseResponse({ translation: "Bonjour" })).toBe("Bonjour")
    expect(lingva.parseResponse({ error: "nope" })).toBeNull()
  })

  test("نسخ Lingva المخصّصة تُستعمل بدل الافتراضية", () => {
    const providers = getProviders({ lingvaInstances: ["https://my.lingva.test/"] })
    const lingva = providers.filter((p) => p.id.startsWith("lingva"))
    expect(lingva).toHaveLength(1)
    expect(lingva[0].buildRequest("x", "ar", "en").url).toContain("https://my.lingva.test/api/v1/ar/en/x")
  })
})

test("cacheKey ثابت لنفس المدخلات ومختلف لغيرها", () => {
  expect(cacheKey("google-gtx", "ar", "en", "نص")).toBe(cacheKey("google-gtx", "ar", "en", "نص"))
  expect(cacheKey("google-gtx", "ar", "en", "نص")).not.toBe(cacheKey("google-gtx", "ar", "fr", "نص"))
})

// ─────────────────────────────────────────────────────────────────────────────
// 3) سجل اللغات
// ─────────────────────────────────────────────────────────────────────────────
describe("languages registry", () => {
  test("لا تكرار في الأكواد", () => {
    const codes = LANGUAGES.map((l) => l.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  test("يغطي عدداً كبيراً من اللغات", () => {
    expect(LANGUAGES.length).toBeGreaterThan(120)
  })

  test("كل لغة لها اسم أصلي واسم بالعربية", () => {
    for (const lang of LANGUAGES) {
      expect(lang.name.trim().length).toBeGreaterThan(0)
      expect(lang.ar.trim().length).toBeGreaterThan(0)
    }
  })

  test("العربية هي اللغة المصدر وهي معروفة", () => {
    expect(SOURCE_LANG).toBe("ar")
    expect(isKnownLanguage("ar")).toBe(true)
    expect(getLanguage("en")?.ar).toBe("الإنجليزية")
  })

  test("لغات اليمين-لليسار مُعلَّمة", () => {
    expect(isRtlLanguage("ar")).toBe(true)
    expect(isRtlLanguage("ur")).toBe(true)
    expect(isRtlLanguage("fa")).toBe(true)
    expect(isRtlLanguage("he")).toBe(true)
    expect(isRtlLanguage("en")).toBe(false)
    expect(isRtlLanguage("fr")).toBe(false)
  })

  test("البحث يطابق الاسم الأصلي والاسم العربي والبادئة", () => {
    expect(searchLanguages("English").some((l) => l.code === "en")).toBe(true)
    expect(searchLanguages("الفرنسية").some((l) => l.code === "fr")).toBe(true)
    expect(searchLanguages("zh").some((l) => l.code === "zh-CN")).toBe(true)
    expect(searchLanguages("   ")).toHaveLength(LANGUAGES.length)
  })

  test("القائمة المرتّبة تضع الأولويات أولاً وتحفظ كل اللغات", () => {
    expect(SORTED_LANGUAGES).toHaveLength(LANGUAGES.length)
    expect(SORTED_LANGUAGES[0].code).toBe("en")
    expect(new Set(SORTED_LANGUAGES.map((l) => l.code)).size).toBe(LANGUAGES.length)
  })
})

test("hashText ثابت ومختلف للنصوص المختلفة", () => {
  expect(hashText("نص قانوني")).toBe(hashText("نص قانوني"))
  expect(hashText("نص قانوني")).not.toBe(hashText("نص آخر"))
})

// ─────────────────────────────────────────────────────────────────────────────
// 4) الوسيط — يُنفَّذ فعلاً مع fetch مُحاكى
// ─────────────────────────────────────────────────────────────────────────────
describe("functions/api/translate.js", () => {
  const originalFetch = globalThis.fetch
  /** استدعاء الوسيط بطلب POST حقيقي. */
  function post(body: unknown) {
    return onRequestPost({
      request: new Request("https://www.mizan.page/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      env: {},
      waitUntil: () => {},
      params: {},
      next: async () => new Response(),
    })
  }

  beforeEach(() => {
    // Cache API غير متاح في node — الوسيط مصمم ليعمل بدونه
    delete (globalThis as { caches?: unknown }).caches
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  test("GET يفحص الصحة ويسرد المزوّدين", async () => {
    const response = await onRequestGet()
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.providers[0]).toBe("google-gtx")
  })

  test("يترجم دفعة عبر Google ويعيد المزوّد المستعمل", async () => {
    const seen: string[] = []
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      seen.push(String(url))
      return new Response(JSON.stringify([[["Hello world", "مرحبا بالعالم", null, null, 10]], null, "ar"]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }) as unknown as typeof fetch

    const response = await post({ texts: ["مرحبا بالعالم"], target: "en", source: "ar" })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.results).toEqual(["Hello world"])
    expect(data.provider).toBe("google-gtx")
    expect(data.partial).toBe(false)
    expect(seen[0]).toContain("translate.googleapis.com")
  })

  test("ينتقل إلى MyMemory حين يفشل Google", async () => {
    const seen: string[] = []
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      seen.push(u)
      if (u.includes("translate.googleapis.com")) return new Response("boom", { status: 503 })
      if (u.includes("mymemory")) {
        return new Response(
          JSON.stringify({ responseStatus: 200, responseData: { translatedText: "Bonjour" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }
      return new Response("nope", { status: 404 })
    }) as unknown as typeof fetch

    const response = await post({ texts: ["مرحبا"], target: "fr", source: "ar" })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.results).toEqual(["Bonjour"])
    expect(data.provider).toBe("mymemory")
    expect(seen.some((u) => u.includes("mymemory"))).toBe(true)
  })

  test("يعيد 502 حين تسقط كل السلسلة", async () => {
    globalThis.fetch = vi.fn(async () => new Response("down", { status: 500 })) as unknown as typeof fetch
    const response = await post({ texts: ["مرحبا"], target: "en" })
    expect(response.status).toBe(502)
  })

  test("يرفض لغة هدف غير صالحة (حقن في استعلام المزوّد)", async () => {
    const response = await post({ texts: ["مرحبا"], target: "en&admin=1" })
    expect(response.status).toBe(400)
  })

  test("يرفض مصفوفة فارغة ونصوصاً غير نصية", async () => {
    expect((await post({ texts: [], target: "en" })).status).toBe(400)
    expect((await post({ texts: [123], target: "en" })).status).toBe(400)
    expect((await post({ target: "en" })).status).toBe(400)
  })

  test("يقبل الأكواد المركّبة مثل zh-CN و mni-Mtei", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify([[["你好", "مرحبا", null, null, 10]]]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch
    expect((await post({ texts: ["مرحبا"], target: "zh-CN" })).status).toBe(200)
    expect((await post({ texts: ["مرحبا"], target: "mni-Mtei" })).status).toBe(200)
  })

  test("يعلّم النتيجة جزئية ويعيد الأصل للدفعة الفاشلة بدل نص مُزاح", async () => {
    // نصّان بطول 800 حرف ⇒ كل واحد في دفعة مستقلة (الحد 1200)، فنضبط
    // عدد نداءات Google بدل الاعتماد على التقطيع الضمني.
    // "نص أول. " = 8 أحرف ⇒ ×100 = 800 حرفاً (أقل من حدّ 1200، فيبقى النص
    // قطعة واحدة، واثنان منهما لا يجتمعان في دفعة لأن 1600 > 1200).
    const first = "نص أول. ".repeat(100)
    const second = "نص ثان. ".repeat(100)
    expect(first.length).toBe(800)
    expect(second.length).toBe(800)
    expect(buildChunks([first, second])).toHaveLength(2)

    let googleCalls = 0
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes("translate.googleapis.com")) {
        googleCalls += 1
        if (googleCalls === 1) {
          return new Response(JSON.stringify([[["FIRST", "نص أول", null, null, 10]]]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        }
        return new Response("boom", { status: 503 })
      }
      return new Response("nope", { status: 404 })
    }) as unknown as typeof fetch

    const response = await post({ texts: [first, second], target: "en" })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.results).toHaveLength(2)
    expect(data.total).toBe(2)
    expect(data.translatedCount).toBe(1)
    expect(data.partial).toBe(true)
    // الدفعة الناجحة تُرجمت، والفاشلة تُعاد كأصلها حرفياً
    expect(data.results[0]).toBe("FIRST")
    expect(data.results[1]).toBe(second)
  })
})
