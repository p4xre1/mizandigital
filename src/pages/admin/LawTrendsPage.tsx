import { useEffect, useState, useCallback } from "react"
import {
  TrendingUp, Flame, BarChart3, Globe, Search, Clock, ArrowUpRight, ArrowDownRight,
  Scale, BookOpen, Zap, Eye, ExternalLink, Sparkles, AlertCircle, CheckCircle2,
  MapPin, FileText, GraduationCap, Loader2, RefreshCw, Filter, Crown, Activity
} from "lucide-react"
import { useWebMCPTool } from "@/lib/webmcp/useWebMCPTool"
import {
  getLawTrends, getUpcomingLaws, searchLawTrends, getLawTrendsWidgetData,
  executeLawTrendsMCPTool, LAW_TRENDS_MCP_TOOLS, MOROCCAN_LAW_CATEGORIES,
  type LawTrend
} from "@/lib/integrations/lawTrendsService"
import { Link } from "react-router-dom"

export default function LawTrendsPage() {
  const [trends, setTrends] = useState<LawTrend[]>([])
  const [upcoming, setUpcoming] = useState<LawTrend[]>([])
  const [widget, setWidget] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [timeframe, setTimeframe] = useState<"now 7-d" | "today 1-m" | "today 3-m" | "today 12-m">("today 3-m")
  const [selected, setSelected] = useState<LawTrend | null>(null)
  const [showMCP, setShowMCP] = useState(false)

  useWebMCPTool({
    name: "law_trends_get_trending",
    description: "Get trending law topics in Morocco",
    properties: {
      timeframe: { type: "string", enum: ["now 7-d", "today 1-m", "today 3-m", "today 12-m"] },
      limit: { type: "number" }
    },
    execute: async (params) => executeLawTrendsMCPTool("law_trends_get_trending", params)
  })

  useWebMCPTool({
    name: "law_trends_upcoming",
    description: "Get upcoming laws in Morocco",
    properties: {
      impact: { type: "string", enum: ["high", "medium", "low", "all"] }
    },
    execute: async (params) => executeLawTrendsMCPTool("law_trends_upcoming", params)
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [all, up, wid] = await Promise.all([
        getLawTrends(timeframe),
        getUpcomingLaws(),
        getLawTrendsWidgetData()
      ])
      setTrends(all)
      setUpcoming(up)
      setWidget(wid)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => { load() }, [load])

  const filtered = trends.filter(t => {
    const matchesSearch = !searchQuery || t.keyword_ar.includes(searchQuery) || t.keyword.toLowerCase().includes(searchQuery.toLowerCase()) || (t.keyword_fr && t.keyword_fr.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCat = categoryFilter === "all" || t.category === categoryFilter
    return matchesSearch && matchesCat
  })

  const rising = trends.filter(t => t.trend_direction === "rising").slice(0, 5)
  const highImpact = trends.filter(t => t.impact_level === "high").slice(0, 4)

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-600">
            <TrendingUp className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              ترند القوانين المغربية - Google Trends
              <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-600">Google Trends MA</span>
            </h1>
            <p className="text-[12px] text-muted-foreground">تتبع القوانين الرائجة، القادمة، وما يبحث عنه المغاربة في القانون</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-1">
            {[
              { k: "now 7-d", l: "7 أيام" },
              { k: "today 1-m", l: "شهر" },
              { k: "today 3-m", l: "3 أشهر" },
              { k: "today 12-m", l: "سنة" },
            ].map(tf => (
              <button key={tf.k} onClick={() => setTimeframe(tf.k as any)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${timeframe === tf.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{tf.l}</button>
            ))}
          </div>
          <button onClick={() => setShowMCP(!showMCP)} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 flex items-center gap-1.5">
            <Zap className="size-4" /> MCP ({LAW_TRENDS_MCP_TOOLS.length})
          </button>
          <button onClick={load} className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted"><RefreshCw className="size-4" /></button>
        </div>
      </div>

      {showMCP && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900 dark:text-violet-200"><Zap className="size-4" /> Law Trends MCP Tools</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {LAW_TRENDS_MCP_TOOLS.map(tool => (
              <div key={tool.name} className="rounded-xl border border-violet-200 bg-white p-3 dark:bg-violet-950/30">
                <p className="text-[12px] font-bold">{tool.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Widget stats */}
      {widget && (
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Globe className="size-4" /><span className="text-[11px] font-bold">إجمالي الرائج</span></div>
            <p className="mt-2 text-2xl font-black text-foreground">{widget.totalTrending}</p>
            <p className="text-[10px] text-muted-foreground">موضوع قانوني رائج</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-emerald-700"><Flame className="size-4" /><span className="text-[11px] font-bold">صاعد</span></div>
            <p className="mt-2 text-2xl font-black text-foreground">{widget.risingCount}</p>
            <p className="text-[10px] text-muted-foreground">في ارتفاع</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:bg-violet-950/20">
            <div className="flex items-center gap-2 text-violet-700"><Clock className="size-4" /><span className="text-[11px] font-bold">قادم</span></div>
            <p className="mt-2 text-2xl font-black text-foreground">{widget.upcomingCount}</p>
            <p className="text-[10px] text-muted-foreground">قانون قادم</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-amber-700"><Crown className="size-4" /><span className="text-[11px] font-bold">الأكثر بحثاً</span></div>
            <p className="mt-2 text-[12px] font-black text-foreground line-clamp-1">{widget.topKeyword}</p>
            <p className="text-[10px] text-muted-foreground">{widget.topCategory}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Activity className="size-4" /><span className="text-[11px] font-bold">متوسط الاهتمام</span></div>
            <p className="mt-2 text-2xl font-black text-foreground">{widget.avgInterest}</p>
            <p className="text-[10px] text-muted-foreground">/100 Google Trends</p>
          </div>
        </div>
      )}

      {/* Upcoming laws highlight */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-black text-foreground"><Clock className="size-4 text-violet-600" /> قوانين قادمة - راقبها قبل الجميع</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.slice(0, 4).map(law => (
            <div key={law.id} className="rounded-xl border border-violet-200 bg-white p-3 dark:bg-violet-950/20">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${law.legislative_status === "parliament" ? "bg-amber-100 text-amber-700" : law.legislative_status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                  {law.legislative_status === "parliament" ? "في البرلمان" : law.legislative_status === "published" ? "صدر" : "مقترح"}
                </span>
                <span className={`text-[10px] font-bold ${law.impact_level === "high" ? "text-red-600" : "text-muted-foreground"}`}>{law.impact_level === "high" ? "🔥 عالي التأثير" : "متوسط"}</span>
              </div>
              <p className="mt-2 text-[13px] font-bold text-foreground line-clamp-1">{law.keyword_ar}</p>
              <p className="text-[11px] text-muted-foreground">{law.category}</p>
              <div className="mt-2 flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="size-3" />+{law.interest_change}%</span>
                <span className="text-muted-foreground">{law.interest}/100</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-muted-foreground">{law.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث في ترند القوانين: مدونة الأسرة، المسطرة المدنية..." className="w-full rounded-xl border border-border bg-card py-2.5 pr-9 pl-3 text-xs" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          <button onClick={() => setCategoryFilter("all")} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>الكل</button>
          {MOROCCAN_LAW_CATEGORIES.slice(0, 6).map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${categoryFilter === cat ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"}`}>{cat}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Rising + High impact */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><Flame className="size-4 text-orange-600" /> الأكثر صعوداً</h3>
              <div className="mt-3 space-y-2">
                {rising.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-foreground truncate">{t.keyword_ar}</p>
                      <p className="text-[10px] text-muted-foreground">{t.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-emerald-600">+{t.interest_change}%</span>
                      <ArrowUpRight className="size-4 text-emerald-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><Crown className="size-4 text-amber-600" /> عالي التأثير</h3>
              <div className="mt-3 space-y-2">
                {highImpact.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-foreground truncate">{t.keyword_ar}</p>
                      <p className="text-[10px] text-muted-foreground">{t.category} • {t.interest}/100</p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">عالي</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><BookOpen className="size-4 text-blue-600" /> اقتراحات محتوى</h3>
              <div className="mt-3 space-y-2">
                {filtered.slice(0, 5).map(t => (
                  <div key={t.id} className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:bg-blue-950/20">
                    <p className="text-[11px] font-bold text-foreground">شرح {t.keyword_ar}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">حجم بحث: {t.search_volume.toLocaleString()} • {t.category}</p>
                    <div className="mt-2 flex gap-1">
                      <Link to={`/admin/articles/new`} className="rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">اكتب مقال</Link>
                      <span className="text-[10px] text-muted-foreground">SEO: {t.interest}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main trends table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><BarChart3 className="size-4 text-primary" /> ترند القوانين في المغرب - Google Trends ({filtered.length})</h2>
              <span className="text-[11px] text-muted-foreground">MA • {timeframe} • فئة القانون</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-[11px] font-bold text-muted-foreground">
                    <th className="p-3 text-right">الكلمة المفتاحية</th>
                    <th className="p-3 text-right">التصنيف</th>
                    <th className="p-3 text-center">الاهتمام</th>
                    <th className="p-3 text-center">التغيير</th>
                    <th className="p-3 text-center">الاتجاه</th>
                    <th className="p-3 text-center">الحالة التشريعية</th>
                    <th className="p-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(trend => (
                    <tr key={trend.id} className="border-b border-border/50 hover:bg-muted/30 text-[12px]">
                      <td className="p-3">
                        <div>
                          <p className="font-bold text-foreground">{trend.keyword_ar}</p>
                          <p className="text-[11px] text-muted-foreground">{trend.keyword_fr} • {trend.search_volume.toLocaleString()} بحث</p>
                        </div>
                      </td>
                      <td className="p-3"><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">{trend.category}</span></td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${trend.interest}%` }} /></div>
                          <span className="font-bold">{trend.interest}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${trend.interest_change > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {trend.interest_change > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{trend.interest_change > 0 ? "+" : ""}{trend.interest_change}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {trend.trend_direction === "rising" ? <span className="text-emerald-600 flex items-center justify-center gap-1"><TrendingUp className="size-3" /> صاعد</span> :
                         trend.trend_direction === "falling" ? <span className="text-rose-600 flex items-center justify-center gap-1"><ArrowDownRight className="size-3" /> هابط</span> :
                         <span className="text-muted-foreground">مستقر</span>}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${trend.legislative_status === "in_force" ? "bg-emerald-100 text-emerald-700" : trend.legislative_status === "parliament" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {trend.legislative_status === "in_force" ? "ساري" : trend.legislative_status === "parliament" ? "برلمان" : trend.legislative_status === "published" ? "منشور" : "مقترح"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSelected(trend)} className="rounded-lg border border-border p-1.5 hover:bg-muted"><Eye className="size-3.5" /></button>
                          <Link to={`/admin/articles/new`} className="rounded-lg bg-primary p-1.5 text-primary-foreground"><FileText className="size-3.5" /></Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail modal */}
          {selected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6" onClick={e => e.stopPropagation()} dir="rtl">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-black text-foreground">{selected.keyword_ar}</h2>
                    <p className="text-sm text-muted-foreground">{selected.keyword_fr} • {selected.category}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="rounded-xl border border-border px-3 py-1 text-xs">إغلاق</button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted p-3"><p className="text-[11px] text-muted-foreground">الاهتمام</p><p className="text-xl font-black">{selected.interest}/100</p></div>
                  <div className="rounded-xl bg-muted p-3"><p className="text-[11px] text-muted-foreground">حجم البحث</p><p className="text-xl font-black">{selected.search_volume.toLocaleString()}</p></div>
                  <div className="rounded-xl bg-muted p-3"><p className="text-[11px] text-muted-foreground">التغيير</p><p className={`text-xl font-black ${selected.interest_change > 0 ? "text-emerald-600" : "text-rose-600"}`}>{selected.interest_change > 0 ? "+" : ""}{selected.interest_change}%</p></div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-bold">الاهتمام عبر الزمن (12 شهر)</h3>
                  <div className="mt-2 flex items-end gap-1 h-24">
                    {selected.timeline.map((point, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-primary/70 hover:bg-primary transition" style={{ height: `${point.value}%` }} title={`${point.date}: ${point.value}`} />
                        <span className="text-[8px] text-muted-foreground hidden sm:block">{point.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-bold">استعلامات ذات صلة</h4>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selected.related_queries.map((q, i) => <span key={i} className="rounded-full bg-muted px-2 py-1 text-[11px]">{q}</span>)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">الاهتمام حسب الجهة</h4>
                    <div className="mt-2 space-y-1">
                      {selected.region_interest.slice(0, 4).map(r => (
                        <div key={r.region} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1"><MapPin className="size-3" />{r.region}</span>
                          <div className="flex items-center gap-2"><div className="h-1 w-12 bg-muted rounded-full overflow-hidden"><div className="h-full bg-violet-600" style={{ width: `${r.value}%` }} /></div><span>{r.value}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-bold">أخبار ذات صلة</h4>
                  <div className="mt-2 space-y-2">
                    {selected.news_articles.map((news, i) => (
                      <a key={i} href={news.url} target="_blank" className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted">
                        <div><p className="text-[12px] font-bold">{news.title}</p><p className="text-[11px] text-muted-foreground">{news.source} • {new Date(news.date).toLocaleDateString("ar-MA")}</p></div>
                        <ExternalLink className="size-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-violet-50 p-3 dark:bg-violet-950/20">
                  <p className="text-[11px] font-bold text-violet-700">💡 لماذا رائج؟</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{selected.reason}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link to={`/admin/articles/new`} className="flex-1 rounded-xl bg-primary py-2.5 text-center text-xs font-bold text-primary-foreground">اكتب مقال عن {selected.keyword_ar}</Link>
                  <button className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold">تصدير تقرير</button>
                </div>
              </div>
            </div>
          )}

          {/* SEO suggestions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-[13px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2"><Sparkles className="size-4" /> كيف تستفيد من ترند القوانين؟</h3>
              <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
                <li>اكتب مقالاً مفصلاً عن القوانين الصاعدة (+50% اهتمام) قبل المنافسين</li>
                <li>استخدم الكلمات المفتاحية الرائجة في العناوين والأوصاف</li>
                <li>القوانين القادمة (upcoming) = فرصة SEO ذهبية - لا يوجد محتوى كثير عنها بعد</li>
                <li>راقب {MOROCCAN_LAW_CATEGORIES.slice(0, 3).join("، ")} - الأكثر بحثاً في المغرب</li>
                <li>انشر ملخصات PDF للقوانين الجديدة - عليها طلب عالي</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2"><Globe className="size-4 text-primary" /> Google Trends API - كيف يعمل؟</h3>
              <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
                <li>البيانات من Google Trends غير الرسمي + أخبار مغربية + Supabase</li>
                <li>المنطقة: MA (المغرب)، الفئة: القانون، الوقت: {timeframe}</li>
                <li>الاهتمام 0-100 نسبي - 100 = ذروة البحث</li>
                <li>حالياً mock واقعي مع 12 موضوع قانوني مغربي حقيقي</li>
                <li>للربط الحقيقي: استخدم pytrends أو SerpAPI Trends مع proxy</li>
                <li>جدول Supabase: <code>law_trends</code> - يتم تحديثه يومياً عبر cron</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
