import { useEffect, useMemo, useState, useCallback } from "react"
import {
  Activity,
  Users,
  Eye,
  RefreshCw,
  Newspaper,
  FileText,
  BookOpen,
  Calendar,
  FileBadge,
  Globe2,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Share2,
} from "lucide-react"
import { supabase } from "../../lib/supabase/client"
import { VisitsLineChart } from "../../components/analytics/VisitsLineChart"

type ContentType = "article" | "news" | "term" | "pdf" | "event" | "page"

const WINDOWS = [
  { key: "6h", label: "آخر 6 ساعات", hours: 6, bucketMinutes: 15 },
  { key: "24h", label: "آخر 24 ساعة", hours: 24, bucketMinutes: 60 },
  { key: "7d", label: "آخر 7 أيام", hours: 24 * 7, bucketMinutes: 360 },
  { key: "30d", label: "آخر شهر", hours: 24 * 30, bucketMinutes: 1440 },
] as const

type WindowKey = (typeof WINDOWS)[number]["key"]

const TYPE_META: Record<ContentType, { label: string; icon: typeof FileText; table?: string; titleCol?: string; slugCol?: string }> = {
  article: { label: "المقالات", icon: FileText, table: "articles", titleCol: "title", slugCol: "slug" },
  news: { label: "الأخبار", icon: Newspaper, table: "news", titleCol: "title", slugCol: "slug" },
  term: { label: "مصطلحات القاموس", icon: BookOpen, table: "lexicon_terms", titleCol: "term_ar", slugCol: "id" },
  pdf: { label: "ملفات PDF", icon: FileBadge, table: "pdf_summaries", titleCol: "title", slugCol: "id" },
  event: { label: "الفعاليات والندوات", icon: Calendar },
  page: { label: "تصفّح عام (كل الصفحات)", icon: Globe2 },
}

const SITE_ORIGIN = "https://mizan.page"

interface TopRow {
  content_id: string
  views: number
  title?: string
  url?: string
}

/** صف واحد من مصادر الزيارات (get_visits_by_referrer). */
interface TrafficSource {
  source: string
  views: number
  visitors: number
}

/**
 * تسميات المصادر الخاصة. referrer في تطبيق صفحة واحدة يعبّر عن **مصدر الدخول
 * للجلسة** لا عن الصفحة السابقة المباشرة (document.referrer لا يتغيّر عند
 * التنقّل الداخلي)، فالتجميع حسب المضيف هو التمثيل الصحيح.
 */
const SOURCE_LABELS: Record<string, string> = {
  direct: "مباشر / بلا مُحيل",
  internal: "تنقّل داخلي",
}

export default function AnalyticsPage() {
  const [windowKey, setWindowKey] = useState<WindowKey>("24h")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalVisits, setTotalVisits] = useState(0)
  const [uniqueVisitors, setUniqueVisitors] = useState(0)
  const [byType, setByType] = useState<Record<string, number>>({})
  const [timeseries, setTimeseries] = useState<{ label: string; value: number }[]>([])
  const [sources, setSources] = useState<TrafficSource[]>([])
  const [sourcesAvailable, setSourcesAvailable] = useState(true)
  const [topContent, setTopContent] = useState<Record<ContentType, TopRow[]>>({
    article: [], news: [], term: [], pdf: [], event: [], page: [],
  })
  const [error, setError] = useState<string | null>(null)

  const activeWindow = useMemo(() => WINDOWS.find((w) => w.key === windowKey)!, [windowKey])

  const load = useCallback(async () => {
    setError(null)
    const since = new Date(Date.now() - activeWindow.hours * 60 * 60 * 1000).toISOString()

    try {
      const [totalRes, uniqueRes, byTypeRes, seriesRes, sourcesRes, ...topRes] = await Promise.all([
        (supabase as any).rpc("get_total_visits", { p_since: since }),
        (supabase as any).rpc("get_unique_visitors", { p_since: since }),
        (supabase as any).rpc("get_visits_by_type", { p_since: since }),
        (supabase as any).rpc("get_visits_timeseries", { p_since: since, p_bucket_minutes: activeWindow.bucketMinutes }),
        (supabase as any).rpc("get_visits_by_referrer", { p_since: since, p_limit: 12 }),
        ...(["article", "news", "term", "pdf", "event", "page"] as ContentType[]).map((t) =>
          (supabase as any).rpc("get_top_content", { p_content_type: t, p_since: since, p_limit: 6 })
        ),
      ])

      if (totalRes.error) throw totalRes.error

      setTotalVisits(Number(totalRes.data ?? 0))
      setUniqueVisitors(Number(uniqueRes.data ?? 0))

      const typeMap: Record<string, number> = {}
      for (const row of byTypeRes.data ?? []) typeMap[row.content_type] = Number(row.views)
      setByType(typeMap)

      const bucketFormatter = new Intl.DateTimeFormat("ar-MA", {
        hour: activeWindow.hours <= 24 ? "2-digit" : undefined,
        minute: activeWindow.hours <= 24 ? "2-digit" : undefined,
        day: activeWindow.hours > 24 ? "2-digit" : undefined,
        month: activeWindow.hours > 24 ? "2-digit" : undefined,
      })
      setTimeseries(
        (seriesRes.data ?? []).map((row: any) => ({
          label: bucketFormatter.format(new Date(row.bucket)),
          value: Number(row.views),
        }))
      )

      // مصادر الزيارات: غياب الدالة (ترحيل لم يُطبَّق بعد) لا يُفشل الصفحة كلها
      setSourcesAvailable(!sourcesRes?.error)
      setSources(
        (sourcesRes?.data ?? []).map((row: any) => ({
          source: String(row.source ?? "direct"),
          views: Number(row.views ?? 0),
          visitors: Number(row.visitors ?? 0),
        }))
      )

      const types: ContentType[] = ["article", "news", "term", "pdf", "event", "page"]
      const topByType: Record<ContentType, TopRow[]> = {
        article: [], news: [], term: [], pdf: [], event: [], page: [],
      }
      types.forEach((t, idx) => {
        const res = topRes[idx]
        topByType[t] = (res?.data ?? []).map((row: any) => ({
          content_id: row.content_id,
          views: Number(row.views),
        }))
      })

      // إثراء العناصر بعناوين حقيقية من الجداول الأصلية بدل عرض السلاق الخام فقط
      await Promise.all(
        (["article", "news", "term", "pdf"] as ContentType[]).map(async (t) => {
          const meta = TYPE_META[t]
          const ids = topByType[t].map((r) => r.content_id)
          if (!meta.table || ids.length === 0) return
          const { data } = await (supabase as any)
            .from(meta.table)
            .select(`${meta.slugCol}, ${meta.titleCol}`)
            .in(meta.slugCol as string, ids)
          const lookup = new Map<string, string>()
          for (const row of data ?? []) lookup.set(String(row[meta.slugCol as string]), row[meta.titleCol as string])
          topByType[t] = topByType[t].map((r) => ({ ...r, title: lookup.get(r.content_id) || r.content_id }))
        })
      )
      // للفعاليات والصفحات العامة: نعرض المعرّف/المسار مباشرة (لا يوجد جدول واحد ثابت)
      topByType.event = topByType.event.map((r) => ({ ...r, title: r.content_id }))
      topByType.page = topByType.page.map((r) => ({ ...r, title: r.content_id }))

      setTopContent(topByType)
    } catch (e: any) {
      setError(e?.message || "تعذّر تحميل إحصائيات الزيارات")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeWindow])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const contentViewsTotal = Object.entries(byType)
    .filter(([k]) => k !== "page")
    .reduce((sum, [, v]) => sum + v, 0)

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">إحصائيات الزيارات والقراءة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تتبّع حقيقي لكل زيارة وقراءة عبر الموقع — المقالات، الأخبار، القاموس، الملفات، والفعاليات.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-1">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => setWindowKey(w.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  windowKey === w.key
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setRefreshing(true)
              load()
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* بطاقات الملخص */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Globe2}
              label="إجمالي زيارات الموقع"
              value={totalVisits}
              hint={activeWindow.label}
            />
            <StatCard
              icon={Users}
              label="زوّار فريدون (تقريبي)"
              value={uniqueVisitors}
              hint={activeWindow.label}
            />
            <StatCard
              icon={Eye}
              label="قراءات المحتوى (مقالات، أخبار، قاموس، PDF، فعاليات)"
              value={contentViewsTotal}
              hint={activeWindow.label}
            />
          </div>

          {/* الرسم البياني الزمني */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">تطوّر الزيارات — {activeWindow.label}</h2>
            </div>
            <VisitsLineChart points={timeseries} />
          </div>

          {/* مصادر الزيارات */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">مصادر الزيارات — {activeWindow.label}</h2>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">حسب مصدر دخول الجلسة</span>
            </div>
            {!sourcesAvailable ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                هذه البطاقة تحتاج ترحيل <code className="font-mono">20261012000500_page_views_traffic_sources.sql</code> —
                طبّقه ثم أعد التحميل.
              </p>
            ) : sources.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">لا توجد زيارات مسجّلة ضمن هذه الفترة</p>
            ) : (
              <ul className="space-y-2">
                {sources.map((s) => {
                  const max = Math.max(...sources.map((x) => x.views), 1)
                  const width = Math.max(2, Math.round((s.views / max) * 100))
                  return (
                    <li key={s.source} className="rounded-lg px-2 py-1.5 hover:bg-muted">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-foreground" dir="ltr">
                          {SOURCE_LABELS[s.source] ?? s.source}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-muted-foreground">
                          {s.views.toLocaleString("ar-MA")} زيارة، {s.visitors.toLocaleString("ar-MA")} زائر
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* توزيع حسب نوع المحتوى + أكثر المحتويات قراءة */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(["article", "news", "term", "pdf", "event"] as ContentType[]).map((type) => {
              const meta = TYPE_META[type]
              const Icon = meta.icon
              const rows = topContent[type]
              const total = byType[type] || 0
              return (
                <div key={type} className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">{meta.label}</h3>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                      {total.toLocaleString("ar-MA")} قراءة
                    </span>
                  </div>
                  {rows.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">لا توجد قراءات مسجّلة ضمن هذه الفترة</p>
                  ) : (
                    <ul className="space-y-2">
                      {rows.map((r) => (
                        <li key={r.content_id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
                          <span className="truncate text-sm font-semibold text-foreground">{r.title || r.content_id}</span>
                          <span className="shrink-0 text-xs font-bold text-muted-foreground">{r.views.toLocaleString("ar-MA")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <IndexStatusPanel />
        </>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Globe2
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <span className="text-[11px] font-bold text-muted-foreground">{hint}</span>
      </div>
      <p className="mt-4 text-3xl font-black text-foreground">{value.toLocaleString("ar-MA")}</p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  )
}

// ============================================================================
// لوحة فحص فهرسة الروابط في جوجل
// ============================================================================

interface IndexRow {
  url: string
  content_type?: string
  is_indexed: boolean | null
  coverage_state?: string | null
  checked_at?: string | null
}

function IndexStatusPanel() {
  const [rows, setRows] = useState<IndexRow[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)
  const [customUrl, setCustomUrl] = useState("")
  const [notConfigured, setNotConfigured] = useState(false)

  const loadCached = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from("index_status")
      .select("url, content_type, is_indexed, coverage_state, checked_at")
      .order("checked_at", { ascending: false })
      .limit(30)
    setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadCached()
  }, [loadCached])

  const checkUrl = async (url: string) => {
    if (!url) return
    setChecking(url)
    try {
      const { data, error } = await supabase.functions.invoke("gsc-index-status", {
        body: { url },
      })
      if (error) throw error
      if (data?.notConfigured) {
        setNotConfigured(true)
        return
      }
      await loadCached()
    } catch (e) {
      setNotConfigured(true)
    } finally {
      setChecking(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Search className="size-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">فحص الفهرسة في جوجل (Google Index Status)</h2>
      </div>

      {notConfigured && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
          فحص الفهرسة الحقيقي يتطلب ربط Google Search Console API (حساب خدمة Service Account) عبر Edge
          Function باسم <code className="rounded bg-black/10 px-1">gsc-index-status</code>. راجع تعليمات
          الإعداد التي زوّدك بها Claude لتفعيل هذه الميزة بالكامل.
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <input
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder={`${SITE_ORIGIN}/articles/...`}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          dir="ltr"
        />
        <button
          onClick={() => checkUrl(customUrl)}
          disabled={!customUrl || checking === customUrl}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {checking === customUrl ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          تحقق الآن
        </button>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          لم يتم فحص أي رابط بعد. أدخل رابطاً أعلاه واضغط "تحقق الآن".
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.url} className="flex items-center justify-between gap-3 py-2.5">
              <a
                href={r.url}
                title={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground hover:text-primary"
                dir="ltr"
              >
                {r.url}
                <ExternalLink className="size-3 shrink-0" />
              </a>
              <div className="flex shrink-0 items-center gap-2">
                {r.is_indexed === true ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="size-4" /> مفهرس
                  </span>
                ) : r.is_indexed === false ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-destructive">
                    <XCircle className="size-4" /> غير مفهرس
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{r.coverage_state || "—"}</span>
                )}
                <button
                  onClick={() => checkUrl(r.url)}
                  disabled={checking === r.url}
                  className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-muted-foreground hover:bg-muted"
                >
                  {checking === r.url ? <Loader2 className="size-3 animate-spin" /> : "إعادة فحص"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
