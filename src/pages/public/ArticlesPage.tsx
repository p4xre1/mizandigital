import { useState, useEffect, useMemo } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { truncateCleanText } from "../../lib/utils/sanitize"
import { supabase } from "../../lib/supabase/client"
import articlesData from "../../data/articles.json"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { ProContentCard, ProContentCardSkeleton } from "../../components/content/ProContentCard"
import { AnimatedSection, StaggerGrid } from "../../components/ui/AnimatedSection"
import {
  BookOpen,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  Clock,
  GraduationCap,
  FileText,
  Scale,
  Library,
  Flame,
} from "lucide-react"

interface ArticleItem {
  id: string
  title: string
  slug: string
  summary?: string | null
  category?: string | null
  date?: string | null
  image?: string | null
  imageAlt?: string | null
  readingTime?: string | null
}

function normalizeCmsArticle(raw: any): ArticleItem {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug || generateSlug(raw.title),
    summary: raw.excerpt || "",
    category: raw.category?.name || raw.category?.name_fr || null,
    date: raw.published_at || raw.created_at || null,
    image: raw.cover_image || null,
    imageAlt: raw.cover_image_alt || null,
    readingTime: "5 دقائق",
  }
}

function normalizeLocalArticle(raw: any): ArticleItem {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug || generateSlug(raw.title),
    summary: raw.excerpt || raw.summary || "",
    category: raw.category || null,
    date: raw.publishedAt || raw.date || null,
    image: raw.image || raw.coverImage || null,
    imageAlt: raw.imageAlt || raw.coverImageAlt || null,
    readingTime: raw.readingTime || "4 دقائق",
  }
}

const categoryConfig: Record<string, { color: "blue" | "violet" | "emerald" | "amber" | "rose" | "primary", icon: any }> = {
  "القانون المدني": { color: "blue", icon: Scale },
  "القانون الجنائي": { color: "rose", icon: FileText },
  "القانون التجاري": { color: "amber", icon: Library },
  "مدونة الأسرة": { color: "violet", icon: BookOpen },
  "المسطرة المدنية": { color: "emerald", icon: Scale },
  "المسطرة الجنائية": { color: "rose", icon: FileText },
  "القانون الإداري": { color: "blue", icon: GraduationCap },
  "default": { color: "primary", icon: BookOpen },
}

export function ArticlesPage() {
  const [items, setItems] = useState<ArticleItem[]>(
    (articlesData as any[]).map(normalizeLocalArticle)
  )
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, published_at, created_at, cover_image, cover_image_alt, category:categories(name, name_fr)")
        .eq("status", "published")
        .order("published_at", { ascending: false })

      if (error) throw error

      const cmsItems = (data || []).map(normalizeCmsArticle)
      const localItems = (articlesData as any[]).map(normalizeLocalArticle)

      const merged = Array.from(
        new Map([...localItems, ...cmsItems].map((item) => [item.slug, item])).values()
      ).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

      setItems(merged)
    } catch (err) {
      console.error("خطأ في جلب المقالات:", err)
    } finally {
      setLoading(false)
    }
  }

  const availableCategories = useMemo(() => {
    const cats = items.map((item) => item.category).filter(Boolean) as string[]
    return Array.from(new Set(cats))
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory
      const matchesSearch =
        !searchQuery ||
        containsText(item.title, searchQuery) ||
        containsText(item.summary || "", searchQuery)
      return matchesCategory && matchesSearch
    })
  }, [items, searchQuery, activeCategory])

  const featured = filteredItems[0]
  const rest = filteredItems.slice(1)

  const pageTitle = "المقالات والدراسات القانونية"
  const pageDescription =
    "شرح القانون المغربي بأسلوب منهجي واضح: مقالات ودراسات تحليلية معمّقة في مختلف فروع القانون المغربي (المدني، التجاري، الجنائي، الشغل...)، موجهة لطلبة كليات الحقوق والباحثين."

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pageTitle,
    description: pageDescription,
    itemListElement: filteredItems.slice(0, 30).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Article",
        headline: item.title,
        description: truncateCleanText(item.summary || "", 160),
        datePublished: item.date || undefined,
        url: `${SITE_CONFIG.url}/articles/${item.slug}`,
      },
    })),
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: pageTitle, url: "/articles" },
  ])

  return (
    <>
      <AEOHead
        title={pageTitle}
        description={pageDescription}
        keywords={[
          "مقالات قانونية",
          "شرح القانون المغربي",
          "دراسات قانونية مغربية",
          "تحليل تشريعي",
          "بحوث الطلبة القانونية",
        ]}
        schema={[listSchema, breadcrumbSchema]}
      />

      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.06),transparent_60%),radial-gradient(ellipse_at_bottom_right,_hsl(var(--accent-gold)/0.04),transparent_60%)]" dir="rtl">
        {/* Hero Header */}
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-violet-500/[0.03] to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          
          <div className="container relative mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 md:py-16 lg:px-10">
            <AnimatedSection animation="fadeUp">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary backdrop-blur">
                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                    <BookOpen className="size-4" />
                    <span>المقالات والدراسات</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px]">{filteredItems.length} مقال</span>
                  </div>
                  
                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl lg:text-[2.75rem] leading-[1.1]">
                      <span className="pro-gradient-text">{pageTitle.split(" ")[0]}</span> {pageTitle.split(" ").slice(1).join(" ")}
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
                      {pageDescription}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { icon: FileText, label: "منهجية قانونية", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
                      { icon: Scale, label: "تحليل تشريعي", color: "bg-violet-500/10 text-violet-700 border-violet-500/20" },
                      { icon: GraduationCap, label: "لطلبة الحقوق", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
                    ].map((badge, i) => (
                      <span key={i} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${badge.color}`}>
                        <badge.icon className="size-3.5" />
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: items.length, label: "مقال", icon: BookOpen, color: "from-blue-500 to-cyan-500" },
                      { value: availableCategories.length, label: "تصنيف", icon: Library, color: "from-violet-500 to-purple-500" },
                      { value: "200", label: "كلمة/د", icon: Clock, color: "from-amber-500 to-orange-500" },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur p-4 text-center">
                        <div className={`mx-auto grid size-10 place-items-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow`}>
                          <stat.icon className="size-5" />
                        </div>
                        <p className="mt-2 text-xl font-black text-foreground">{stat.value}</p>
                        <p className="text-[11px] font-bold text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="container mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
          {/* Search & Filters - Pro glass */}
          <AnimatedSection animation="fadeUp" delay={100}>
            <div className="mb-8 flex flex-col gap-4 rounded-[20px] border border-border/50 bg-card/70 p-4 backdrop-blur-xl shadow-[0_8px_32px_hsl(0_0%_0%/0.04)] sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث في المقالات: المسؤولية المدنية، العقود، مدونة الأسرة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background/50 pr-12 pl-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 text-muted-foreground hover:bg-muted/80">
                    <span className="text-xs px-1">✕</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <FilterDropdown
                  className="w-full sm:w-64"
                  value={activeCategory}
                  onChange={setActiveCategory}
                  allLabel="جميع التصنيفات"
                  icon={<Filter size={14} />}
                  options={availableCategories.map((cat) => ({ value: cat, label: cat }))}
                />
                <div className="hidden sm:flex items-center gap-1 rounded-xl bg-muted p-1">
                  <span className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground">{filteredItems.length} مقال</span>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Featured + Grid - FIXED to show all articles */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProContentCardSkeleton key={i} variant={i === 0 ? "hero" : "default"} />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              {/* Bento grid with featured hero */}
              <div className="space-y-6">
                {featured && (
                  <AnimatedSection animation="scaleIn">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <ProContentCard
                          href={`/articles/${featured.slug}`}
                          title={featured.title}
                          image={featured.image}
                          imageAlt={featured.imageAlt}
                          badgeLabel={featured.category || "مقال مميز"}
                          badgeColor={categoryConfig[featured.category || ""]?.color || "primary"}
                          formattedDate={featured.date ? new Date(featured.date).toLocaleDateString("ar-MA", { year: "numeric", month: "short", day: "numeric" }) : null}
                          summary={featured.summary ? truncateCleanText(featured.summary, 160) : null}
                          readingTime={featured.readingTime || "5 دقائق"}
                          isFeatured
                          isTrending
                          tags={featured.category ? [featured.category, "قانون مغربي"] : ["قانون"]}
                          variant="hero"
                          index={0}
                        />
                      </div>
                      <div className="space-y-4">
                        {rest.slice(0, 2).map((item, idx) => {
                          const cfg = categoryConfig[item.category || ""] || categoryConfig.default
                          return (
                            <ProContentCard
                              key={item.id}
                              href={`/articles/${item.slug}`}
                              title={item.title}
                              image={item.image}
                              imageAlt={item.imageAlt}
                              badgeLabel={item.category}
                              badgeColor={cfg.color}
                              formattedDate={item.date ? new Date(item.date).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                              summary={item.summary ? truncateCleanText(item.summary, 80) : null}
                              readingTime={item.readingTime || "4 د"}
                              isNew
                              index={idx + 1}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </AnimatedSection>
                )}

                {/* Rest of articles - always visible grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(featured ? rest.slice(2) : filteredItems).map((item, idx) => {
                    const cfg = categoryConfig[item.category || ""] || categoryConfig.default
                    const isNew = item.date ? (Date.now() - new Date(item.date).getTime()) < 7 * 24 * 3600000 : false
                    const isTrending = idx < 2

                    return (
                      <div key={item.id} className="animate-[fadeUp_0.6s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${(idx + 3) * 60}ms` }}>
                        <ProContentCard
                          href={`/articles/${item.slug}`}
                          title={item.title}
                          image={item.image}
                          imageAlt={item.imageAlt}
                          badgeLabel={item.category}
                          badgeColor={cfg.color}
                          formattedDate={item.date ? new Date(item.date).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                          summary={item.summary ? truncateCleanText(item.summary, 120) : null}
                          readingTime={item.readingTime || "4 د"}
                          isNew={isNew}
                          isTrending={isTrending}
                          tags={item.category ? [item.category] : undefined}
                          index={idx + 3}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Bottom CTA */}
              <AnimatedSection animation="fadeUp" delay={400} className="mt-12">
                <div className="relative overflow-hidden rounded-[24px] border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-violet-500/[0.04] to-accent-gold/[0.03] p-8">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
                  <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-right">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-[0_8px_20px_hsl(var(--primary)/0.25)]">
                        <Sparkles className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-black text-foreground">هل تبحث عن موضوع محدد؟</h3>
                        <p className="text-[12px] text-muted-foreground">استخدم البحث المتقدم أو تصفح حسب التصنيف</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-[11px] font-bold">
                        <Flame className="size-3.5 text-orange-500" />
                        {availableCategories.length} تصنيف
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[12px] font-black text-background">
                        <TrendingUp className="size-4" />
                        {filteredItems.length} مقال متاح
                      </span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </>
          ) : (
            <AnimatedSection animation="scaleIn">
              <div className="relative overflow-hidden rounded-[24px] border border-dashed border-border bg-card p-12 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent" />
                <div className="relative">
                  <div className="mx-auto grid size-20 place-items-center rounded-[20px] bg-muted text-muted-foreground/50">
                    <BookOpen className="size-10" />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-foreground">لا توجد مقالات مطابقة</h3>
                  <p className="mt-1 text-sm text-muted-foreground">جرب تغيير كلمات البحث أو التصنيف</p>
                  <button
                    onClick={() => { setSearchQuery(""); setActiveCategory("all") }}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition"
                  >
                    <Sparkles className="size-4" />
                    إعادة ضبط البحث
                  </button>
                </div>
              </div>
            </AnimatedSection>
          )}
        </div>
      </main>
    </>
  )
}
