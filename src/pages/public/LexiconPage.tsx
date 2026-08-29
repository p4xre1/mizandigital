import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { containsText } from "../../lib/utils/search"
import { generateSlug, lexiconSlugById, uniqueLexiconSlug, type LexiconSlugItem } from "../../lib/utils/generateSlug"
import localLexicon from "../../data/lexicon.json"
import { supabase } from "../../lib/supabase/client"
import { useWebMCPTool } from "../../lib/webmcp/useWebMCPTool"
import {
  BookOpen,
  Search,
  Languages,
  Copy,
  Check,
  Scale,
  Bookmark,
  ArrowLeft
} from "lucide-react"

interface LexiconTerm {
  id: string
  term_ar: string
  term_fr: string
  definition: string
  category: string
  reference?: string
}

export function LexiconPage() {
  // نبدأ بالبيانات المحلية فوراً (بدون انتظار الشبكة) حتى لا تُعرض الصفحة
  // فارغة قبل اكتمال جلب Supabase — يطابق هذا أيضاً المحتوى الثابت المُولَّد
  // مسبقاً في scripts/prerender.mjs لأغراض الفهرسة.
  const [terms, setTerms] = useState<LexiconTerm[]>(localLexicon as LexiconTerm[])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicTerms()
  }, [])

  const fetchPublicTerms = async () => {
  try {
    let remoteTerms: LexiconTerm[] = []
    const { data, error } = await supabase
      .from("lexicon_terms")
      .select("*")
      .order("created_at", { ascending: false })

    // إن فشل الاتصال أو كان الجدول فارغاً، نعتمد البيانات المحلية كأساس
    if (!error && data && data.length > 0) remoteTerms = data as LexiconTerm[]

    // ندمج: Supabase أولاً، ثم مصطلحات JSON غير الموجودة في Supabase
    const remoteNames = new Set(remoteTerms.map((t) => t.term_ar))
    const merged = [
      ...remoteTerms,
      ...(localLexicon as LexiconTerm[]).filter((t) => !remoteNames.has(t.term_ar)),
    ]
    setTerms(merged)
  } catch (err) {
    // البيانات المحلية معروضة بالفعل منذ التحميل الأول، فلا حاجة لأي تراجع هنا
    console.error("خطأ في جلب المصطلحات، الاعتماد على البيانات المحلية:", err)
  }
}

  const categories = useMemo(() => {
    const set = new Set<string>()
    terms.forEach((item) => {
      if (item.category) set.add(item.category)
    })
    return Array.from(set)
  }, [terms])

  const slugById = useMemo(() => {
    const map = lexiconSlugById(localLexicon as LexiconSlugItem[])
    const taken = new Set(map.values())
    for (const term of terms) {
      if (!map.has(term.id)) {
        map.set(term.id, uniqueLexiconSlug(term, taken))
      }
    }
    return map
  }, [terms])

  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const termAr = term.term_ar || ""
      const termFr = term.term_fr || ""
      const category = term.category || ""
      const definition = term.definition || ""

      const matchesCategory = selectedCategory === "all" || category === selectedCategory

      const matchesSearch =
        !searchQuery ||
        containsText(termAr, searchQuery) ||
        containsText(termFr, searchQuery) ||
        containsText(category, searchQuery) ||
        containsText(definition, searchQuery)

      return matchesCategory && matchesSearch
    })
  }, [terms, searchQuery, selectedCategory])

  // أداة WebMCP تجريبية: تتيح لوكيل ذكاء اصطناعي البحث في المعجم القانوني
  // مباشرة (Chrome 146+ فقط، خلف علم تجريبي — لا تأثير على المتصفحات الأخرى)
  useWebMCPTool({
    name: "search_legal_terms",
    description: "يبحث في المعجم القانوني لمنصة الميزان الرقمية عن مصطلح قانوني بالعربية أو الفرنسية ويُظهر النتائج المطابقة.",
    properties: {
      query: { type: "string", description: "كلمة أو عبارة للبحث عنها في المعجم القانوني" },
    },
    required: ["query"],
    execute: ({ query }) => {
      setSearchQuery(String(query || ""))
      return { content: [{ type: "text", text: `تم تطبيق البحث عن: ${query}` }] }
    },
  })

  const handleCopyTerm = (id: string, ar: string, fr?: string) => {
    const textToCopy = fr ? `${ar} (${fr})` : ar
    navigator.clipboard.writeText(textToCopy)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const lexiconSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "name": "المعجم القانوني المغربي الشامل",
    "description": "قاموس ومصطلحات مفاهيم القانون الإداري، المدني، الجنائي، والتجاري باللغتين العربية والفرنسية.",
    "url": "https://www.mizan.page/lexicon",
    "hasDefinedTerm": filteredTerms.slice(0, 30).map((term: any, idx: number) => ({
      "@type": "DefinedTerm",
      "name": term.term_ar,
      "termCode": term.term_fr || `term-${idx}`,
      "description": term.definition,
      "inDefinedTermSet": "https://www.mizan.page/lexicon"
    }))
  }

  return (
    <>
      <SEOHead
        title="المعجم القانوني المغربي - عربي / فرنسي"
        description="قاموس ومصطلحات قانونية في مختلف الفروع (الإداري، المدني، الجنائي، التجاري) بالمغرب، مع الشرح باللغتين العربية والفرنسية والربط بالقوانين والفصول ذات الصلة."
        canonicalUrl="https://www.mizan.page/lexicon"
        keywords={[
          "المعجم القانوني المغربي",
          "مصطلحات قانونية عربي فرنسي",
          "Lexique Juridique Marocain",
          "مصطلحات القانون المدني",
          "مصطلحات القانون الجنائي"
        ]}
        schema={lexiconSchema}
      />

      <main className="container mx-auto max-w-6xl px-4 py-8 md:py-10" dir="rtl">
        {/* Header Section */}
        <header className="mb-6 md:mb-8 text-center md:text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">
            <BookOpen size={16} />
            <span>المعجم الموحد للمصطلحات</span>
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-4xl">
            المعجم القانوني المغربي (مزدوج اللغة)
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            دليل القاموس القانوني الموحد لشرح المفاهيم والنصوص التشريعية باللغتين العربية والفرنسية (Droit Marocain).
          </p>
        </header>

        {/* Search & Filter Bar */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="ابحث بالعربية أو الفرنسية (مثال: عقد، Contrat)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pr-11 pl-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition min-h-[44px]"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 w-full overflow-x-auto pb-2 sm:pb-0 scrollbar-none [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[40px] flex items-center ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              جميع الفروع ({terms.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[40px] flex items-center ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lexicon Grid */}
        {filteredTerms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filteredTerms.map((term) => {
              const termId = term.id
              const termAr = term.term_ar
              const termFr = term.term_fr
              const definition = term.definition
              const category = term.category
              const reference = term.reference

              const slug = slugById.get(termId) || generateSlug(termAr) || term.id

              return (
                <article
                  key={termId}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
                >
                  <div>
                    {/* Top Metadata */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {category && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20">
                          <Scale size={12} />
                          {category}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyTerm(termId, termAr, termFr)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="نسخ المصطلح"
                      >
                        {copiedId === termId ? (
                          <Check size={16} className="text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>

                    {/* Terms (Arabic & French) */}
                    <div className="space-y-1 mb-3">
                      <h2 className="text-base md:text-lg font-bold text-foreground group-hover:text-primary transition">
                        <Link to={`/lexicon/${slug}`} className="focus:outline-none">
                          {termAr}
                        </Link>
                      </h2>
                      {termFr && (
                        <p className="text-xs font-semibold text-muted-foreground ltr text-right font-mono">
                          {termFr}
                        </p>
                      )}
                    </div>

                    {/* Definition */}
                    {definition && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 bg-muted/30 p-3 rounded-lg border border-border/50">
                        {definition}
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                    {reference ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                        <Bookmark size={12} className="shrink-0 text-primary" />
                        <span className="truncate">المرجع: {reference}</span>
                      </div>
                    ) : (
                      <span />
                    )}

                    <Link
                      to={`/lexicon/${slug}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0 py-1 px-2"
                    >
                      <span>التفاصيل</span>
                      <ArrowLeft size={12} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Languages size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">لم يتم العثور على أي مصطلح</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              تأكد من كتابة الكلمة بشكل صحيح، أو اختر فرعاً قانونياً آخر.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
              }}
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 min-h-[44px]"
            >
              إعادة ضبط البحث
            </button>
          </div>
        )}
      </main>
    </>
  )
}