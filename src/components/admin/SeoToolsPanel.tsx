import { useEffect, useState } from "react"
import { Download, FileCode2, ShieldCheck } from "lucide-react"
import { buildSitemap, type SitemapBuildResult } from "@/lib/seo/sitemapBuilder"
import { decide, parseRobots, type RobotsDecision } from "@/lib/seo/robotsRules"
import { SITE_ORIGIN } from "../../../shared/seo/url-policy.js"

const DEFAULT_AGENT = "Googlebot"
const DEFAULT_URL = `${SITE_ORIGIN}/archive`

export function SeoToolsPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SitemapBuilderCard />
      <RobotsTesterCard />
    </div>
  )
}

function SitemapBuilderCard() {
  const [input, setInput] = useState("")
  const [result, setResult] = useState<SitemapBuildResult | null>(null)

  const build = () => setResult(buildSitemap(input, { lastmod: new Date().toISOString().slice(0, 10) }))

  const download = () => {
    if (!result?.xml) return
    const blob = new Blob([result.xml], { type: "application/xml;charset=utf-8" })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = href
    anchor.download = "sitemap.xml"
    anchor.click()
    URL.revokeObjectURL(href)
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-1 flex items-center gap-2 text-[13px] font-extrabold text-foreground">
        <FileCode2 className="size-4 text-violet-600" /> منشئ sitemap.xml
      </h3>
      <p className="mb-3 text-[11px] text-muted-foreground">
        الصق رابطاً في كل سطر. تُقبل روابط {SITE_ORIGIN} فقط بصيغة https، وتُستبعد المكررات.
      </p>
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={7}
        dir="ltr"
        spellCheck={false}
        placeholder={`${SITE_ORIGIN}/archive\n${SITE_ORIGIN}/quiz`}
        className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={build}
          className="rounded-xl bg-primary px-3 py-2 text-[12px] font-bold text-primary-foreground hover:opacity-90"
        >
          بناء الملف
        </button>
        {result?.xml && (
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[12px] font-bold text-foreground hover:bg-muted"
          >
            <Download className="size-3.5" /> تنزيل sitemap.xml
          </button>
        )}
      </div>

      {result && (
        <div className="mt-3 space-y-2 text-[11px]">
          {result.error ? (
            <p className="font-bold text-rose-600">{result.error}</p>
          ) : (
            <p className="font-bold text-emerald-700 dark:text-emerald-300">
              {result.urls.length} رابطاً جاهزاً للخريطة.
            </p>
          )}
          {result.rejected.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-muted p-3 text-muted-foreground" dir="ltr">
              {result.rejected.map((item, index) => (
                <li key={`${item.line}-${index}`}>
                  <span className="font-mono">{item.line}</span> — {item.reason}
                </li>
              ))}
            </ul>
          )}
          {result.xml && (
            <pre dir="ltr" className="max-h-48 overflow-auto rounded-xl bg-muted p-3 font-mono text-[10px] text-foreground">
              {result.xml}
            </pre>
          )}
        </div>
      )}
    </section>
  )
}

function RobotsTesterCard() {
  const [robotsText, setRobotsText] = useState<string | null>(null)
  const [robotsError, setRobotsError] = useState<string | null>(null)
  const [agent, setAgent] = useState(DEFAULT_AGENT)
  const [url, setUrl] = useState(DEFAULT_URL)
  const [decision, setDecision] = useState<RobotsDecision | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/robots.txt")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      })
      .then((text) => {
        if (!cancelled) setRobotsText(text)
      })
      .catch((error: unknown) => {
        if (!cancelled) setRobotsError(error instanceof Error ? error.message : "تعذر الجلب")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const test = () => {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.host !== new URL(SITE_ORIGIN).host) {
        setUrlError("الاختبار يعمل على روابط الموقع فقط")
        setDecision(null)
        return
      }
      setUrlError(null)
      setDecision(decide(parseRobots(robotsText ?? ""), agent, url))
    } catch {
      setUrlError("الرابط غير صالح")
      setDecision(null)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-1 flex items-center gap-2 text-[13px] font-extrabold text-foreground">
        <ShieldCheck className="size-4 text-emerald-600" /> اختبار robots.txt
      </h3>
      <p className="mb-3 text-[11px] text-muted-foreground">
        يقرأ /robots.txt الحالي للموقع ويطبّق قواعد RFC 9309: القاعدة الأطول تفوز، وعند التساوي يفوز Allow.
      </p>
      {robotsError && <p className="mb-2 text-[11px] font-bold text-rose-600">تعذر جلب /robots.txt: {robotsError}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] font-bold text-foreground">
          اسم الزاحف
          <input
            value={agent}
            onChange={(event) => setAgent(event.target.value)}
            dir="ltr"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[12px] focus:border-primary focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-[11px] font-bold text-foreground">
          الرابط
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            dir="ltr"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-[12px] focus:border-primary focus:outline-none"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={test}
        disabled={robotsText === null}
        className="mt-3 rounded-xl bg-primary px-3 py-2 text-[12px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        اختبار
      </button>

      {urlError && <p className="mt-3 text-[11px] font-bold text-rose-600">{urlError}</p>}
      {decision && (
        <div className="mt-3 space-y-1 rounded-xl bg-muted p-3 text-[11px]">
          <p className={decision.allowed ? "font-bold text-emerald-700 dark:text-emerald-300" : "font-bold text-rose-600"}>
            {decision.allowed ? "مسموح" : "ممنوع"} للزاحف «{agent}»
          </p>
          <p className="text-muted-foreground">
            المجموعة المطبّقة: {decision.group || "لا توجد مجموعة مطابقة (يُسمح افتراضياً)"}
          </p>
          {decision.rule ? (
            <p className="font-mono text-muted-foreground" dir="ltr">
              {decision.rule.type === "allow" ? "Allow" : "Disallow"}: {decision.rule.pattern}
            </p>
          ) : (
            <p className="text-muted-foreground">لا توجد قاعدة مطابقة.</p>
          )}
        </div>
      )}
    </section>
  )
}
