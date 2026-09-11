/**
 * src/lib/seo/adapters/index.ts
 *
 * محوّلات (adapters) نحو المصادر الخارجية. كلها **معطّلة افتراضياً** وتُرجع
 * `enabled: false` حتى توفّر مفتاحاً.
 *
 * لماذا محوّلات بدل تنفيذ مباشر؟ لأن كل مقياس خارجي له مصدر بديل (CrUX
 * بدل Lighthouse، Search Console بدل Ahrefs…)، والفصل بين "ما يُحسب" و"من
 * أين تأتي البيانات" يمنع انتشار مفاتيح API داخل منطق التقييم.
 *
 * ⚠️ لا يُوضع أي مفتاح في كود يُشحن للمتصفح. المفاتيح تُقرأ من متغيرات
 * بيئة الخادم فقط (انظر SECURITY.md).
 */

/** نتيجة موحّدة لأي محوّل. */
export interface AdapterResult<T> {
  enabled: boolean
  data: T | null
  /** سبب التعطيل أو الخطأ — يُعرض في الواجهة بدل رقم مضلّل. */
  reason?: string
}

function disabled<T>(reason: string): AdapterResult<T> {
  return { enabled: false, data: null, reason }
}

// ─────────────────────────────────────────────────────────────────────────────
// CrUX — Core Web Vitals & Page Speed
// ─────────────────────────────────────────────────────────────────────────────

export interface CruxMetrics {
  lcpMs: number
  inpMs: number
  cls: number
  fcpMs: number
  ttfbMs: number
  origin: string
}

export interface CruxConfig {
  apiKey?: string
  origin?: string
}

/**
 * Core Web Vitals / Page Speed من Chrome UX Report API.
 * يحتاج مفتاح Google Cloud API.
 */
export async function fetchCruxMetrics(config: CruxConfig = {}): Promise<AdapterResult<CruxMetrics>> {
  if (!config.apiKey) {
    return disabled("يتطلب CRUX_API_KEY (Google Cloud). بدونه لا توجد بيانات Core Web Vitals حقيقية.")
  }
  const origin = config.origin || "https://www.mizan.page"
  try {
    const response = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin }),
      }
    )
    if (!response.ok) return disabled(`CrUX أرجع ${response.status}`)
    const json = await response.json()
    const metrics = json?.record?.metrics || {}
    return {
      enabled: true,
      data: {
        origin,
        lcpMs: metrics.largest_contentful_paint?.p75 ?? 0,
        inpMs: metrics.interaction_to_next_paint?.p75 ?? 0,
        cls: metrics.cumulative_layout_shift?.p75 ?? 0,
        fcpMs: metrics.first_contentful_paint?.p75 ?? 0,
        ttfbMs: metrics.experimental_time_to_first_byte?.p75 ?? 0,
      },
    }
  } catch (error) {
    return disabled(`تعذّر الوصول إلى CrUX: ${String(error)}`)
  }
}

/** تحويل Core Web Vitals إلى نتيجة 0-100 (عتبات Google الرسمية). */
export function scoreCoreWebVitals(metrics: CruxMetrics | null): { score: number; issues: string[] } {
  if (!metrics) return { score: 0, issues: ["لا توجد بيانات Core Web Vitals (CrUX معطّل)."] }
  const issues: string[] = []

  const lcp = metrics.lcpMs <= 2500 ? 100 : metrics.lcpMs <= 4000 ? 60 : 20
  if (metrics.lcpMs > 2500) issues.push(`LCP = ${metrics.lcpMs}ms — العتبة الجيدة 2500ms.`)

  const inp = metrics.inpMs <= 200 ? 100 : metrics.inpMs <= 500 ? 60 : 20
  if (metrics.inpMs > 200) issues.push(`INP = ${metrics.inpMs}ms — العتبة الجيدة 200ms.`)

  const cls = metrics.cls <= 0.1 ? 100 : metrics.cls <= 0.25 ? 60 : 20
  if (metrics.cls > 0.1) issues.push(`CLS = ${metrics.cls} — العتبة الجيدة 0.1.`)

  return { score: Math.round(lcp * 0.4 + inp * 0.3 + cls * 0.3), issues }
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Search Console — Off-Page / Indexation
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchConsoleSummary {
  clicks: number
  impressions: number
  ctr: number
  position: number
  indexedPages: number
}

/** يحتاج OAuth/Service Account — لا يمكن تشغيله من المتصفح. */
export async function fetchSearchConsoleSummary(): Promise<AdapterResult<SearchConsoleSummary>> {
  return disabled(
    "يتطلب Google Search Console API مع OAuth على الخادم. أضف نقطة نهاية في functions/api/ ثم اربطها هنا."
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Probe — AI Visibility / Mention / Citation trackers
// ─────────────────────────────────────────────────────────────────────────────

export interface LlmProbeResult {
  query: string
  mentioned: boolean
  cited: boolean
  /** النص الذي ذكر الموقع. */
  excerpt?: string
  model: string
}

export interface LlmProbeConfig {
  apiKey?: string
  endpoint?: string
  model?: string
}

/**
 * فحص فعلي لظهور الموقع في إجابات النماذج اللغوية.
 *
 * ⚠️ يتطلب مفتاح API ونفقة لكل استعلام، لذا يبقى معطلاً افتراضياً.
 * عند تفعيله: يُرسل مجموعة استعلامات مستهدفة ويبحث عن اسم الموقع أو رابطه
 * في الإجابة.
 */
export async function probeLlmVisibility(
  queries: string[],
  config: LlmProbeConfig = {}
): Promise<AdapterResult<LlmProbeResult[]>> {
  if (!config.apiKey || !config.endpoint) {
    return disabled("يتطلب LLM_PROBE_API_KEY وLLM_PROBE_ENDPOINT. بدونه تُقاس الجاهزية فقط، لا الظهور الفعلي.")
  }

  try {
    const results: LlmProbeResult[] = []
    for (const query of queries) {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model || "default", messages: [{ role: "user", content: query }] }),
      })
      if (!response.ok) continue
      const json = await response.json()
      const answer = String(json?.choices?.[0]?.message?.content || json?.content || "")
      results.push({
        query,
        model: config.model || "default",
        mentioned: /mizan\.page|ميزان الرقمية/i.test(answer),
        cited: /mizan\.page/i.test(answer),
        excerpt: answer.slice(0, 400),
      })
    }
    return { enabled: true, data: results }
  } catch (error) {
    return disabled(`تعذّر فحص النماذج: ${String(error)}`)
  }
}

/** تحويل نتائج الفحص إلى نتيجة 0-100. */
export function scoreLlmProbe(results: LlmProbeResult[] | null): { score: number; issues: string[] } {
  if (!results || results.length === 0) {
    return { score: 0, issues: ["لم يُشغَّل فحص النماذج اللغوية (llmProbe معطّل)."] }
  }
  const cited = results.filter((r) => r.cited).length
  const mentioned = results.filter((r) => r.mentioned).length
  const issues: string[] = []
  if (cited < results.length) issues.push(`${results.length - cited} من ${results.length} استعلام لم يُستشهد فيه بالموقع.`)
  if (mentioned < cited) issues.push("بعض الإشارات بلا رابط — أضف رابطاً قانونياً واضحاً في الصفحة.")
  return { score: Math.round((cited * 0.7 + mentioned * 0.3) / results.length * 100), issues }
}

/** استعلامات افتراضية لفحص الظهور، مبنية على محتوى الموقع. */
export const DEFAULT_PROBE_QUERIES = [
  "ما هي أفضل منصة عربية لطلبة القانون في المغرب؟",
  "أين أجد ملخصات قانونية بالفرنسية والعربية لكليات الحقوق بالمغرب؟",
  "ما هو دليل كليات الحقوق بالمغرب؟",
  "أين أجد معجماً للمصطلحات القانونية المغربية؟",
]
