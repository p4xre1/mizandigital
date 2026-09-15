/**
 * Content Tracking - Comprehensive analytics for every item
 * Tracks views, engagement, and trending for all content types
 */

import { supabase } from "@/lib/supabase/client"

export type TrackableType = "article" | "news" | "term" | "school" | "pdf" | "event" | "law" | "quiz" | "page"

export interface ContentView {
  content_type: TrackableType
  content_id: string
  views: number
  unique_visitors: number
  last_viewed: string
  title?: string
  slug?: string
}

export interface TrendingContent {
  id: string
  type: TrackableType
  title: string
  slug: string
  views: number
  views_24h: number
  views_7d: number
  growth: number // % growth vs previous period
  category?: string
}

export interface ContentAnalytics {
  totalViews: number
  uniqueVisitors: number
  viewsByType: Record<TrackableType, number>
  topArticles: TrendingContent[]
  topNews: TrendingContent[]
  topTerms: TrendingContent[]
  topSchools: TrendingContent[]
  trendingNow: TrendingContent[] // hot in last 24h
  rising: TrendingContent[] // biggest growth
  mostEngaged: { id: string, type: TrackableType, title: string, reactions: number, comments: number, views: number }[]
  contentHealth: {
    totalContent: number
    viewedContent: number
    unviewedContent: number
    avgViews: number
  }
}

// Get comprehensive analytics for admin dashboard
export async function getContentAnalytics(timeWindow: "24h" | "7d" | "30d" = "7d"): Promise<ContentAnalytics> {
  const hours = timeWindow === "24h" ? 24 : timeWindow === "7d" ? 168 : 720
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const previousSince = new Date(Date.now() - hours * 2 * 3600 * 1000).toISOString()

  try {
    // Parallel fetch all needed data
    const [
      totalRes,
      uniqueRes,
      byTypeRes,
      topArticlesRes,
      topNewsRes,
      topTermsRes,
      topSchoolsRes,
      topPdfRes,
      topEventsRes,
      trending24hRes,
      previousPeriodRes,
      contentStatsRes,
      reactionCountsRes,
    ] = await Promise.all([
      (supabase as any).rpc("get_total_visits", { p_since: since }),
      (supabase as any).rpc("get_unique_visitors", { p_since: since }),
      (supabase as any).rpc("get_visits_by_type", { p_since: since }),
      (supabase as any).rpc("get_top_content", { p_content_type: "article", p_since: since, p_limit: 10 }),
      (supabase as any).rpc("get_top_content", { p_content_type: "news", p_since: since, p_limit: 10 }),
      (supabase as any).rpc("get_top_content", { p_content_type: "term", p_since: since, p_limit: 10 }),
      (supabase as any).rpc("get_top_content", { p_content_type: "page", p_since: since, p_limit: 10 }),
      (supabase as any).rpc("get_top_content", { p_content_type: "pdf", p_since: since, p_limit: 5 }),
      (supabase as any).rpc("get_top_content", { p_content_type: "event", p_since: since, p_limit: 5 }),
      (supabase as any).rpc("get_top_content", { p_content_type: "article", p_since: since24h, p_limit: 15 }),
      (supabase as any).rpc("get_top_content", { p_content_type: "article", p_since: previousSince, p_limit: 20 }),
      supabase.from("content_stats").select("source_type, source_slug, views_count").order("views_count", { ascending: false }).limit(20),
      (supabase as any).from("reaction_counts").select("*").order("total_count", { ascending: false }).limit(10),
    ])

    const totalViews = Number(totalRes.data || 0)
    const uniqueVisitors = Number(uniqueRes.data || 0)

    const viewsByType: Record<string, number> = {}
    for (const row of byTypeRes.data || []) {
      viewsByType[row.content_type] = Number(row.views)
    }

    // Helper to enrich with titles
    const enrichWithTitles = async (
      rows: any[],
      table: string,
      idCol: string,
      titleCol: string,
      type: TrackableType
    ): Promise<TrendingContent[]> => {
      if (!rows || rows.length === 0) return []
      
      const ids = rows.map((r: any) => r.content_id)
      let lookup = new Map<string, { title: string, slug: string, category?: string }>()
      
      try {
        if (table === "articles") {
          const { data } = await (supabase as any).from("articles").select("slug, title, category:categories(name)").in("slug", ids)
          for (const row of data || []) {
            const cat = Array.isArray(row.category) ? row.category[0]?.name : row.category?.name
            lookup.set(row.slug, { title: row.title, slug: row.slug, category: cat })
          }
        } else if (table === "news") {
          const { data } = await (supabase as any).from("news").select("slug, title").in("slug", ids)
          for (const row of data || []) lookup.set(row.slug, { title: row.title, slug: row.slug })
        } else if (table === "lexicon_terms") {
          const { data } = await (supabase as any).from("lexicon_terms").select("id, term_ar, category").in("id", ids)
          for (const row of data || []) lookup.set(row.id, { title: row.term_ar, slug: row.id, category: row.category })
        } else {
          // Fallback: use content_id as title
          for (const id of ids) lookup.set(id, { title: id, slug: id })
        }
      } catch (e) {
        console.warn(`Failed to enrich ${table}:`, e)
      }

      // Get 24h views for growth calculation
      const views24hMap = new Map<string, number>()
      for (const row of trending24hRes.data || []) {
        views24hMap.set(row.content_id, Number(row.views))
      }

      const previousMap = new Map<string, number>()
      for (const row of previousPeriodRes.data || []) {
        previousMap.set(row.content_id, Number(row.views))
      }

      return rows.map((r: any) => {
        const info = (lookup.get(r.content_id) as any) || { title: r.content_id, slug: r.content_id }
        const views24h = views24hMap.get(r.content_id) || 0
        const prevViews = previousMap.get(r.content_id) || 0
        const currentViews = Number(r.views)
        const growth = prevViews > 0 ? ((currentViews - prevViews) / prevViews) * 100 : currentViews > 0 ? 100 : 0

        return {
          id: r.content_id,
          type,
          title: info.title,
          slug: info.slug,
          views: currentViews,
          views_24h: views24h,
          views_7d: type === "article" ? currentViews : 0,
          growth: Math.round(growth),
          category: (info as any).category,
        }
      })
    }

    const topArticles = await enrichWithTitles(topArticlesRes.data || [], "articles", "slug", "title", "article")
    const topNews = await enrichWithTitles(topNewsRes.data || [], "news", "slug", "title", "news")
    const topTerms = await enrichWithTitles(topTermsRes.data || [], "lexicon_terms", "id", "term_ar", "term")
    
    // Trending now = most viewed in last 24h
    const trendingNow = await enrichWithTitles(trending24hRes.data || [], "articles", "slug", "title", "article")
    
    // Rising = biggest growth
    const rising = [...topArticles].sort((a, b) => b.growth - a.growth).slice(0, 5)

    // Most engaged = reactions + views
    const mostEngaged = (reactionCountsRes.data || []).map((r: any) => ({
      id: r.target_id,
      type: r.target_type as TrackableType,
      title: r.target_id,
      reactions: Number(r.total_count || 0),
      comments: 0,
      views: 0,
    }))

    // Content health
    const totalContentRes = await (supabase as any).from("articles").select("id", { count: "exact", head: true }).eq("status", "published")
    const viewedCount = contentStatsRes.data?.length || 0
    const totalContent = totalContentRes.count || 0

    return {
      totalViews,
      uniqueVisitors,
      viewsByType: viewsByType as Record<TrackableType, number>,
      topArticles,
      topNews,
      topTerms,
      topSchools: [],
      trendingNow,
      rising,
      mostEngaged,
      contentHealth: {
        totalContent,
        viewedContent: viewedCount,
        unviewedContent: Math.max(0, totalContent - viewedCount),
        avgViews: totalContent ? totalViews / totalContent : 0,
      }
    }
  } catch (e) {
    console.error("Content analytics error:", e)
    return {
      totalViews: 0,
      uniqueVisitors: 0,
      viewsByType: {} as any,
      topArticles: [],
      topNews: [],
      topTerms: [],
      topSchools: [],
      trendingNow: [],
      rising: [],
      mostEngaged: [],
      contentHealth: { totalContent: 0, viewedContent: 0, unviewedContent: 0, avgViews: 0 }
    }
  }
}

// Get views for single content
export async function getContentViews(contentType: TrackableType, contentId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from("content_stats")
      .select("views_count")
      .eq("source_type", contentType === "article" ? "articles" : contentType === "news" ? "news" : contentType)
      .eq("source_slug", contentId)
      .maybeSingle()
    
    return (data as any)?.views_count || 0
  } catch {
    return 0
  }
}

// Get trending content for homepage
export async function getTrendingForHomepage(limit = 5): Promise<TrendingContent[]> {
  try {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data } = await (supabase as any).rpc("get_top_content", {
      p_content_type: "article",
      p_since: since24h,
      p_limit: limit,
    })

    if (!data || data.length === 0) return []

    const ids = data.map((r: any) => r.content_id)
    const { data: articles } = await (supabase as any).from("articles").select("slug, title, excerpt").in("slug", ids)
    
    const lookup = new Map<string, any>()
    for (const a of articles || []) lookup.set(a.slug, a)

    return data.map((r: any) => {
      const article = lookup.get(r.content_id)
      return {
        id: r.content_id,
        type: "article" as TrackableType,
        title: article?.title || r.content_id,
        slug: r.content_id,
        views: Number(r.views),
        views_24h: Number(r.views),
        views_7d: Number(r.views),
        growth: 0,
      }
    })
  } catch {
    return []
  }
}

// Track content view (enhanced)
export async function trackContentView(
  contentType: TrackableType,
  contentId: string,
  path: string,
  metadata?: { referrer?: string, userAgent?: string }
) {
  try {
    const visitorId = localStorage.getItem("mizan:visitor_id") || "anon"
    const sessionId = sessionStorage.getItem("mizan:session_id") || "anon-session"

    await (supabase as any).from("page_views").insert({
      content_type: contentType,
      content_id: contentId,
      path,
      visitor_id: visitorId,
      session_id: sessionId,
      referrer: metadata?.referrer || document.referrer || null,
      user_agent: metadata?.userAgent || navigator.userAgent || null,
    })

    // Also increment content_stats for quick lookup
    await (supabase as any).rpc("increment_content_views", {
      p_type: contentType === "article" ? "articles" : contentType === "news" ? "news" : contentType,
      p_slug: contentId,
    })
  } catch (e) {
    console.warn("Track view failed:", e)
  }
}
