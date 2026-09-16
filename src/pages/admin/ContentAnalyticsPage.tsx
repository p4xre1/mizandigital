import { useEffect, useState, useCallback } from "react"
import {
  BarChart3, TrendingUp, Eye, Users, FileText, Newspaper, BookOpen,
  GraduationCap, Zap, ArrowUpRight, ArrowDownRight, Flame, Crown,
  Activity, Clock, Search, Filter, Loader2, ExternalLink, Sparkles
} from "lucide-react"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/supabase/client"
import { VisitsLineChart } from "@/components/analytics/VisitsLineChart"
import { getContentAnalytics, type ContentAnalytics, type TrendingContent } from "@/lib/analytics/contentTracking"

type TimeWindow = "24h" | "7d" | "30d"

export default function ContentAnalyticsPage() {
  const [windowKey, setWindowKey] = useState<TimeWindow>("7d")
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<ContentAnalytics | null>(null)
  const [timeseries, setTimeseries] = useState<{ label: string; value: number }[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsData, seriesRes] = await Promise.all([
        getContentAnalytics(windowKey),
        (supabase as any).rpc("get_visits_timeseries", {
          p_since: new Date(Date.now() - (windowKey === "24h" ? 24 : windowKey === "7d" ? 168 : 720) * 3600 * 1000).toISOString(),
          p_bucket_minutes: windowKey === "24h" ? 60 : windowKey === "7d" ? 360 : 1440,
        })
      ])

      setAnalytics(analyticsData)

      const formatter = new Intl.DateTimeFormat("ar-MA", {
        hour: windowKey === "24h" ? "2-digit" : undefined,
        minute: windowKey === "24h" ? "2-digit" : undefined,
        day: windowKey !== "24h" ? "2-digit" : undefined,
        month: windowKey !== "24h" ? "2-digit" : undefined,
      })

      setTimeseries(
        (seriesRes.data || []).map((row: any) => ({
          label: formatter.format(new Date(row.bucket)),
          value: Number(row.views),
        }))
      )
    } catch (e) {
      console.error("Analytics error:", e)
    } finally {
      setLoading(false)
    }
  }, [windowKey])

  useEffect(() => {
    load()
  }, [load])

  const filteredTrending = analytics?.trendingNow.filter(item =>
    !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground">تحليلات المحتوى — كل عنصر يتتبع</h1>
            <p className="text-[12px] text-muted-foreground">
              تتبع شامل لكل مقال، خبر، مصطلح، كلية — الأكثر رواجاً، الصاعد، والتفاعل
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-1">
            {[
              { k: "24h", l: "24 ساعة" },
              { k: "7d", l: "7 أيام" },
              { k: "30d", l: "شهر" },
            ].map(w => (
              <button
                key={w.k}
                onClick={() => setWindowKey(w.k as TimeWindow)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${windowKey === w.k ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"}`}
              >
                {w.l}
              </button>
            ))}
          </div>
          <button onClick={load} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted">
            تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : analytics ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600"><Eye className="size-5" /></div>
                <span className="text-[11px] font-bold text-muted-foreground">{windowKey}</span>
              </div>
              <p className="mt-4 text-3xl font-black text-foreground">{analytics.totalViews.toLocaleString("ar-MA")}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">إجمالي المشاهدات</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><Users className="size-5" /></div>
              <p className="mt-4 text-3xl font-black text-foreground">{analytics.uniqueVisitors.toLocaleString("ar-MA")}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">زوار فريدون</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-600"><FileText className="size-5" /></div>
              <p className="mt-4 text-3xl font-black text-foreground">{analytics.contentHealth.totalContent}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">إجمالي المحتوى</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{analytics.contentHealth.viewedContent} تمت مشاهدته • {analytics.contentHealth.unviewedContent} لم يشاهد</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><Flame className="size-5" /></div>
              <p className="mt-4 text-3xl font-black text-foreground">{analytics.trendingNow.length}</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">رائج الآن (24 ساعة)</p>
            </div>
          </div>

          {/* Timeseries */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">تطور المشاهدات — {windowKey}</h2>
            </div>
            <VisitsLineChart points={timeseries} />
          </div>

          {/* Views by type */}
          <div className="grid gap-3 sm:grid-cols-5">
            {Object.entries(analytics.viewsByType).map(([type, count]) => (
              <div key={type} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold text-muted-foreground">
                  {type === "article" ? "المقالات" : type === "news" ? "الأخبار" : type === "term" ? "المصطلحات" : type === "page" ? "صفحات عامة" : type}
                </p>
                <p className="mt-1 text-xl font-black text-foreground">{count.toLocaleString("ar-MA")}</p>
              </div>
            ))}
          </div>

          {/* Trending sections */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TrendingSection
              title="🔥 الأكثر رواجاً الآن (24 ساعة)"
              icon={Flame}
              items={analytics.trendingNow.slice(0, 8)}
              emptyText="لا توجد مشاهدات في آخر 24 ساعة"
              color="text-orange-600 bg-orange-500/10"
            />
            <TrendingSection
              title="📈 الصاعد — أكبر نمو"
              icon={TrendingUp}
              items={analytics.rising.slice(0, 8)}
              emptyText="لا يوجد نمو ملحوظ"
              color="text-emerald-600 bg-emerald-500/10"
              showGrowth
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <TrendingSection
              title="📚 المقالات الأكثر قراءة"
              icon={FileText}
              items={analytics.topArticles}
              emptyText="لا توجد قراءات للمقالات"
              color="text-blue-600 bg-blue-500/10"
              linkPrefix="/articles"
            />
            <TrendingSection
              title="📰 الأخبار الأكثر رواجاً"
              icon={Newspaper}
              items={analytics.topNews}
              emptyText="لا توجد قراءات للأخبار"
              color="text-green-600 bg-green-500/10"
              linkPrefix="/news"
            />
            <TrendingSection
              title="📖 المصطلحات الأكثر بحثاً"
              icon={BookOpen}
              items={analytics.topTerms}
              emptyText="لا توجد قراءات للمصطلحات"
              color="text-violet-600 bg-violet-500/10"
              linkPrefix="/lexicon"
            />
          </div>

          {/* Search trending */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Search className="size-4 text-primary" /> بحث في الرائج
              </h2>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث في العناوين الرائجة..."
                  className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-3 text-xs"
                />
              </div>
            </div>
            {filteredTrending.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">لا توجد نتائج</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredTrending.map(item => (
                  <TrendingCard key={`${item.type}-${item.id}`} item={item} showGrowth />
                ))}
              </div>
            )}
          </div>

          {/* Content health */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-[13px] font-extrabold text-foreground">صحة المحتوى</h3>
              <div className="mt-3 space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">إجمالي المحتوى</span><span className="font-bold">{analytics.contentHealth.totalContent}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">تمت مشاهدته</span><span className="font-bold text-emerald-600">{analytics.contentHealth.viewedContent}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">لم يشاهد</span><span className="font-bold text-amber-600">{analytics.contentHealth.unviewedContent}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">متوسط المشاهدات</span><span className="font-bold">{Math.round(analytics.contentHealth.avgViews)}</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
              <h3 className="text-[13px] font-extrabold text-violet-900 dark:text-violet-200">💡 توصيات</h3>
              <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
                {analytics.contentHealth.unviewedContent > 0 && <li>{analytics.contentHealth.unviewedContent} مقال لم يشاهد — روّج لها في الرئيسية</li>}
                {analytics.rising.length > 0 && <li>المقال "{analytics.rising[0]?.title}" صاعد +{analytics.rising[0]?.growth}% — ضعه في المقدمة</li>}
                {analytics.trendingNow.length > 0 && <li>🔥 {analytics.trendingNow.length} مقال رائج الآن — استغلها في النشرة</li>}
                <li>استخدم الروابط الداخلية للمصطلحات لزيادة التفاعل</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-[13px] font-extrabold text-emerald-900 dark:text-emerald-200">🔗 الربط الداخلي</h3>
              <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                المصطلحات القانونية (250 مصطلح) تربط تلقائياً في المقالات والأخبار. كل مصطلح يظهر مرة واحدة فقط لتجنب spam.
                <br />
                <br />
                ✅ يعمل في: المقالات، الأخبار، المحتوى المُصدّر مسبقاً (prerendered)
                <br />
                ✅ يحسن SEO + يبقي القارئ في الموقع
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
      )}
    </div>
  )
}

function TrendingSection({
  title,
  icon: Icon,
  items,
  emptyText,
  color,
  showGrowth = false,
  linkPrefix = "/articles",
}: {
  title: string
  icon: any
  items: TrendingContent[]
  emptyText: string
  color: string
  showGrowth?: boolean
  linkPrefix?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className={`grid size-8 place-items-center rounded-lg ${color}`}><Icon className="size-4" /></div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <span className="mr-auto rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <TrendingCard key={`${item.type}-${item.id}`} item={item} showGrowth={showGrowth} linkPrefix={linkPrefix} />
          ))}
        </div>
      )}
    </div>
  )
}

function TrendingCard({ item, showGrowth, linkPrefix = "/articles" }: { item: TrendingContent, showGrowth?: boolean, linkPrefix?: string }) {
  const isPositiveGrowth = item.growth > 0
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background p-3 hover:bg-muted/50 transition">
      <div className="min-w-0 flex-1">
        <Link to={`${linkPrefix}/${item.slug}`} className="line-clamp-1 text-[13px] font-bold text-foreground hover:text-primary">
          {item.title}
        </Link>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="size-3" />{item.views.toLocaleString("ar-MA")}</span>
          {item.category && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{item.category}</span>}
          {showGrowth && (
            <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${isPositiveGrowth ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {isPositiveGrowth ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {isPositiveGrowth ? "+" : ""}{item.growth}%
            </span>
          )}
        </div>
      </div>
      <a href={`${linkPrefix}/${item.slug}`} target="_blank" rel="noreferrer" className="grid size-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground">
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  )
}
