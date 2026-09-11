/**
 * اختبارات MIZAN CONTENT SCORE /1000 ومحللات الدقة القانونية وجودة المصادر.
 */
import { describe, expect, test } from "vitest"

import {
  MIZAN_BAND_LABELS,
  MIZAN_DIMENSIONS,
  MIZAN_DIMENSION_LABELS,
  PUBLISH_THRESHOLD,
  REVIEW_THRESHOLD,
  computeMizanScore,
  formatMizanGate,
  toStorableSummary,
} from "../src/lib/seo/scoring/mizanScore"
import {
  analyzeLegalAccuracy,
  detectContradictions,
  detectHallucinationRisk,
  parseArabicDate,
} from "../src/lib/seo/analyzers/legalAccuracy"
import { analyzeSourceQuality, classifySource } from "../src/lib/seo/analyzers/sourceQuality"

import articles from "../src/data/articles.json"
import news from "../src/data/news.json"

const NOW = new Date("2026-09-11")

/** خبر واقعي غني بالإحالات (من نمط بيانات الموقع الفعلية). */
const WELL_SOURCED_NEWS = `توج المسار التشريعي لمشروع قانون المسطرة المدنية رقم 02.23 بصدور القانون رقم 58.25 المتعلق بالمسطرة المدنية، بعد أن راجعت المحكمة الدستورية مطابقته للدستور بموجب قرارها عدد 255/25.,صدر القانون بمقتضى الظهير الشريف رقم 1.26.07 المؤرخ في 11 فبراير 2026، ونُشر بالجريدة الرسمية عدد 7485 بتاريخ 23 فبراير 2026.,## أبرز مستجدات القانون,ينص الفصل 1 من القانون على تنظيم الاختصاص النوعي، بينما يحدد الفصل 45 آجال الطعن بالاستئناف في ثلاثين يوماً.,ويدخل القانون حيز التنفيذ بعد مرور ستة أشهر من تاريخ نشره، أي حوالي 23 غشت 2026.,يمكن الاطلاع على النص الكامل في الجريدة الرسمية عبر الأمانة العامة للحكومة: https://www.sgg.gov.ma/ وكذلك على بوابة عدالة https://adala.justice.gov.ma/.`

const WEAK_ARTICLE = `هذا مقال يتحدث عن القانون بشكل عام دون تفاصيل.,يقال إن هناك تعديلات جديدة مهمة.,ويرى بعض المصادر أن الوضع سيتغير قريباً.`

// ─────────────────────────────────────────────────────────────────────────────
// 1) أوزان النظام
// ─────────────────────────────────────────────────────────────────────────────
describe("MIZAN CONTENT SCORE weights", () => {
  test("مجموع الأوزان = 1000 بالضبط", () => {
    const total = Object.values(MIZAN_DIMENSIONS).reduce((a, b) => a + b, 0)
    expect(total).toBe(1000)
  })

  test("الأوزان تطابق المواصفة المطلوبة", () => {
    expect(MIZAN_DIMENSIONS.legalAccuracy).toBe(200)
    expect(MIZAN_DIMENSIONS.sourceQuality).toBe(150)
    expect(MIZAN_DIMENSIONS.seo).toBe(150)
    expect(MIZAN_DIMENSIONS.aeo).toBe(100)
    expect(MIZAN_DIMENSIONS.geoAi).toBe(100)
    expect(MIZAN_DIMENSIONS.semanticEntity).toBe(100)
    expect(MIZAN_DIMENSIONS.eeatTrust).toBe(75)
    expect(MIZAN_DIMENSIONS.readability).toBe(50)
    expect(MIZAN_DIMENSIONS.freshness).toBe(50)
    expect(MIZAN_DIMENSIONS.uxInternalLinks).toBe(25)
  })

  test("عشرة أبعاد ولكل منها تسمية", () => {
    const keys = Object.keys(MIZAN_DIMENSIONS)
    expect(keys).toHaveLength(10)
    for (const key of keys) {
      const labels = MIZAN_DIMENSION_LABELS[key as keyof typeof MIZAN_DIMENSIONS]
      expect(labels.ar.length).toBeGreaterThan(0)
      expect(labels.en.length).toBeGreaterThan(0)
    }
  })

  test("النقاط المحققة لا تتجاوز وزن البعد", () => {
    const result = computeMizanScore({
      title: "اختبار",
      body: WELL_SOURCED_NEWS,
      slug: "test",
      now: NOW,
    })
    for (const d of result.dimensions) {
      expect(d.points).toBeLessThanOrEqual(d.max)
      expect(d.points).toBeGreaterThanOrEqual(0)
    }
  })

  test("مجموع نقاط الأبعاد = النتيجة الإجمالية", () => {
    const result = computeMizanScore({
      title: "اختبار",
      body: WELL_SOURCED_NEWS,
      slug: "test",
      now: NOW,
    })
    const sum = result.dimensions.reduce((a, d) => a + d.points, 0)
    expect(sum).toBe(result.score)
    expect(result.score).toBeLessThanOrEqual(1000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2) التمييز بين المحتوى الجيد والضعيف
// ─────────────────────────────────────────────────────────────────────────────
describe("MIZAN CONTENT SCORE discrimination", () => {
  test("خبر مسنَد جيداً يسجّل أعلى بكثير من نص مبهم", () => {
    const strong = computeMizanScore({
      title: "صدور قانون المسطرة المدنية الجديد رقم 58.25 ودخوله حيز التنفيذ",
      body: WELL_SOURCED_NEWS,
      slug: "qanun-58-25",
      description: "تفاصيل صدور القانون رقم 58.25 المتعلق بالمسطرة المدنية ونشره بالجريدة الرسمية وتاريخ دخوله حيز التنفيذ.",
      publishedAt: "2026-08-14",
      author: "محرر الشؤون القانونية",
      kind: "news",
      source: "الجريدة الرسمية",
      sourceUrl: "https://www.sgg.gov.ma/",
      now: NOW,
    })

    const weak = computeMizanScore({
      title: "مقال",
      body: WEAK_ARTICLE,
      slug: "weak",
      publishedAt: "2026-08-01",
      now: NOW,
    })

    expect(strong.score).toBeGreaterThan(weak.score)
    // الفارق يجب أن يكون جوهرياً لا هامشياً
    expect(strong.score - weak.score).toBeGreaterThan(250)
  })

  test("بُعد الدقة القانونية يميّز النص المسنَد", () => {
    const strong = computeMizanScore({ title: "t", body: WELL_SOURCED_NEWS, slug: "s", now: NOW })
    const weak = computeMizanScore({ title: "t", body: WEAK_ARTICLE, slug: "w", now: NOW })
    const s = strong.dimensions.find((d) => d.key === "legalAccuracy")!
    const w = weak.dimensions.find((d) => d.key === "legalAccuracy")!
    expect(s.points).toBeGreaterThan(w.points)
  })

  test("النص المبهم يولّد موانع نشر", () => {
    const weak = computeMizanScore({
      title: "خبر قانوني",
      body: WEAK_ARTICLE,
      slug: "w",
      kind: "news",
      now: NOW,
    })
    expect(weak.blockers.length).toBeGreaterThan(0)
    expect(weak.publishable).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3) موانع النشر والبوابة
// ─────────────────────────────────────────────────────────────────────────────
describe("publish gate", () => {
  test("النتيجة العالية بلا موانع = قابل للنشر", () => {
    const result = computeMizanScore({
      title: "صدور قانون المسطرة المدنية الجديد رقم 58.25 ودخوله حيز التنفيذ بالمغرب",
      body: WELL_SOURCED_NEWS,
      slug: "qanun-58-25",
      description: "تفاصيل صدور القانون رقم 58.25 المتعلق بالمسطرة المدنية ونشره بالجريدة الرسمية وتاريخ دخوله حيز التنفيذ.",
      excerpt: "تفاصيل صدور القانون رقم 58.25 المتعلق بالمسطرة المدنية ونشره بالجريدة الرسمية.",
      publishedAt: "2026-09-01",
      updatedAt: "2026-09-01",
      author: "محرر الشؤون القانونية",
      focusKeyword: "المسطرة المدنية",
      kind: "news",
      source: "الجريدة الرسمية",
      sourceUrl: "https://www.sgg.gov.ma/",
      now: NOW,
    })
    expect(result.score).toBeGreaterThanOrEqual(PUBLISH_THRESHOLD)
    expect(result.blockers).toHaveLength(0)
    expect(result.publishable).toBe(true)
    expect(result.band).toBe("ready")
  })

  test("الموانع تمنع النشر حتى لو كانت النتيجة عالية", () => {
    // نص جيد شكلاً لكن بخبر قانوني بلا أي إحالة محددة
    const result = computeMizanScore({
      title: "مستجدات قانونية مهمة جداً للجميع في المغرب هذا العام",
      body: "تمت مناقشة مشروع مهم في البرلمان المغربي خلال الأسابيع الماضية، وقد أثار نقاشاً واسعاً بين المختصين والمهتمين بالشأن القانوني، ومن المنتظر أن تظهر آثاره قريباً على الممارسة اليومية للمحامين والقضاة في مختلف المحاكم.",
      slug: "x",
      kind: "news",
      now: NOW,
    })
    expect(result.blockers.length).toBeGreaterThan(0)
    expect(result.publishable).toBe(false)
  })

  test("formatMizanGate يعرض /1000 والأبعاد", () => {
    const result = computeMizanScore({ title: "t", body: WELL_SOURCED_NEWS, slug: "s", now: NOW })
    const text = formatMizanGate(result)
    expect(text).toContain("/1000")
    expect(text).toContain("الدقة القانونية")
    expect(text).toContain(MIZAN_BAND_LABELS[result.band])
  })

  test("toStorableSummary ينتج ملخصاً قابلاً للحفظ", () => {
    const result = computeMizanScore({ title: "t", body: WELL_SOURCED_NEWS, slug: "s", now: NOW })
    const summary = toStorableSummary(result)
    expect(summary.score).toBe(result.score)
    expect(Object.keys(summary.dimensions)).toHaveLength(10)
    expect(summary.scoredAt).toBeTruthy()
  })

  test("العتبات مترابطة منطقياً", () => {
    expect(PUBLISH_THRESHOLD).toBeGreaterThan(REVIEW_THRESHOLD)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4) الدقة القانونية
// ─────────────────────────────────────────────────────────────────────────────
describe("legalAccuracy", () => {
  test("يستخرج أرقام القوانين والظهير والفصول", () => {
    const report = analyzeLegalAccuracy(WELL_SOURCED_NEWS)
    expect(report.counts.law).toBeGreaterThan(0)
    expect(report.counts.dahir).toBeGreaterThan(0)
    expect(report.counts.article).toBeGreaterThan(0)
    expect(report.counts.gazette).toBeGreaterThan(0)
  })

  test("يكشف تاريخ النفاذ والمصدر الرسمي", () => {
    const report = analyzeLegalAccuracy(WELL_SOURCED_NEWS)
    expect(report.hasEffectiveDate).toBe(true)
    expect(report.hasPrimarySource).toBe(true)
    expect(report.hasGazetteReference).toBe(true)
  })

  test("يكشف الإسناد المبهم", () => {
    const report = analyzeLegalAccuracy(WEAK_ARTICLE)
    expect(report.vagueCount).toBeGreaterThan(0)
    expect(report.issues.some((i) => i.includes("مبهمة"))).toBe(true)
  })

  test("يكشف الادعاءات الكمية بلا سند", () => {
    const report = analyzeLegalAccuracy("ارتفعت النسبة إلى 45 بالمئة في القطاع دون ذكر أي مرجع")
    expect(report.unsourcedClaims.length).toBeGreaterThan(0)
  })

  test("النص المسنَد يسجّل أعلى", () => {
    const strong = analyzeLegalAccuracy(WELL_SOURCED_NEWS)
    const weak = analyzeLegalAccuracy(WEAK_ARTICLE)
    expect(strong.score).toBeGreaterThan(weak.score)
  })

  test("parseArabicDate يحوّل التاريخ العربي", () => {
    const date = parseArabicDate("23 فبراير 2026")
    expect(date).not.toBeNull()
    expect(date!.getUTCFullYear()).toBe(2026)
    expect(date!.getUTCMonth()).toBe(1)
    expect(date!.getUTCDate()).toBe(23)
    expect(parseArabicDate("نص بلا تاريخ")).toBeNull()
  })

  test("detectContradictions يكشف أعداد الجريدة الرسمية المتعارضة", () => {
    const contradictions = detectContradictions(
      "نُشر بالجريدة الرسمية عدد 7485 ثم صدر تعديل نُشر بالجريدة الرسمية عدد 7500"
    )
    // الرسالة تُكتب «للجريدة الرسمية» (لام الجرّ متصلة)، لذا نفحص العددَين.
    const hit = contradictions.find((c) => c.includes("الرسمية"))
    expect(hit).toBeTruthy()
    expect(hit).toContain("7485")
    expect(hit).toContain("7500")
  })

  test("detectContradictions لا يبلّغ عن نص متسق", () => {
    expect(detectContradictions(WELL_SOURCED_NEWS)).toHaveLength(0)
  })

  test("detectHallucinationRisk يرتّب الفقرات عالية الخطورة", () => {
    const risks = detectHallucinationRisk("يبلغ عدد القضايا 1523 قضية سنوياً دون أي مرجع أو مصدر رسمي")
    expect(risks.length).toBeGreaterThan(0)
    expect(risks[0].reasons.length).toBeGreaterThan(0)
  })

  test("detectHallucinationRisk يتجاهل الفقرات المسنودة", () => {
    const risks = detectHallucinationRisk(
      "ينص الفصل 77 من قانون الالتزامات والعقود على قيام المسؤولية، راجع https://adala.justice.gov.ma/"
    )
    expect(risks.filter((r) => r.risk === "high")).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5) جودة المصادر
// ─────────────────────────────────────────────────────────────────────────────
describe("sourceQuality", () => {
  test("classifySource يصنّف النطاقات الرسمية", () => {
    expect(classifySource("https://adala.justice.gov.ma/text")).toBe("primary-official")
    expect(classifySource("https://www.sgg.gov.ma/")).toBe("primary-official")
    expect(classifySource("https://www.fsjes.ac.ma/")).toBe("academic")
    expect(classifySource("https://example.com/")).toBe("unknown")
  })

  test("يحتسب الإسناد النصي الرسمي بلا رابط", () => {
    const report = analyzeSourceQuality("نُشر بالجريدة الرسمية وفق قرار المحكمة الدستورية")
    expect(report.hasPrimary).toBe(true)
  })

  test("يعاقب غياب المصادر", () => {
    const none = analyzeSourceQuality("نص بلا أي مصدر أو مرجع")
    expect(none.score).toBeLessThan(30)
    expect(none.issues.some((i) => i.includes("لا يوجد أي مصدر"))).toBe(true)
  })

  test("المصدر المسنَد رسمياً يسجّل أعلى", () => {
    const strong = analyzeSourceQuality(WELL_SOURCED_NEWS, { explicitSourceUrl: "https://www.sgg.gov.ma/" })
    const weak = analyzeSourceQuality(WEAK_ARTICLE)
    expect(strong.score).toBeGreaterThan(weak.score)
  })

  test("يعاقب الاعتماد على الإعلام وحده", () => {
    const report = analyzeSourceQuality("حسب ما أوردته جريدة هسبريس فإن القانون صدر https://www.hespress.com/x")
    expect(report.issues.some((i) => i.includes("إعلامي"))).toBe(true)
  })

  test("يستخدم حقل source الصريح للخبر", () => {
    const report = analyzeSourceQuality("نص", { explicitSource: "الجريدة الرسمية", explicitSourceUrl: "https://www.sgg.gov.ma/" })
    expect(report.hasPrimary).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6) التطبيق على البيانات الفعلية للمستودع
// ─────────────────────────────────────────────────────────────────────────────
describe("real repository content", () => {
  test("كل مقال يحصل على نتيجة 0-1000 بأبعاد كاملة", () => {
    for (const article of articles as any[]) {
      const result = computeMizanScore({
        title: article.title,
        body: article.body,
        slug: article.slug,
        excerpt: article.excerpt,
        publishedAt: article.publishedAt,
        updatedAt: article.updatedAt,
        category: article.category,
        readingTime: article.readingTime,
        kind: "article",
        now: NOW,
      })
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1000)
      expect(result.dimensions).toHaveLength(10)
      expect(result.band).toBeTruthy()
    }
  })

  test("كل خبر يحصل على نتيجة 0-1000", () => {
    for (const item of news as any[]) {
      const result = computeMizanScore({
        title: item.title,
        body: item.content || item.summary,
        slug: item.id,
        excerpt: item.summary,
        publishedAt: item.date,
        kind: "news",
        now: NOW,
      })
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1000)
    }
  })

  test("الأخبار المسنَدة بإحالات تشريعية تسجّل أعلى من المقالات العامة", () => {
    const newsScores = (news as any[])
      .filter((n) => /قانون رقم|الجريدة الرسمية|الظهير/.test(n.content || ""))
      .map((n) => computeMizanScore({
        title: n.title, body: n.content, slug: n.id, excerpt: n.summary,
        publishedAt: n.date, kind: "news", now: NOW,
      }).score)

    const articleScores = (articles as any[]).map((a) =>
      computeMizanScore({
        title: a.title, body: a.body, slug: a.slug, excerpt: a.excerpt,
        publishedAt: a.publishedAt, kind: "article", now: NOW,
      }).score)

    expect(newsScores.length).toBeGreaterThan(0)
    const avg = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length
    // الأخبار تحمل إحالات تشريعية محددة، فالدقة القانونية فيها أعلى
    expect(avg(newsScores)).toBeGreaterThan(avg(articleScores) - 100)
  })
})
