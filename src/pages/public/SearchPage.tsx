import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Search, ArrowLeft, BookOpen, FileText, Newspaper, GraduationCap, Calendar, Scale, Loader2 } from "lucide-react"
import { SEOHead } from "../../components/seo/SEOHead"
import { supabase } from "../../lib/supabase/client"
import { generateSlug } from "../../lib/utils/generateSlug"

interface Result { id: string; title: string; description?: string | null; type: string; typeLabel: string; href: string }

const normalize = (value: string) => value.toLocaleLowerCase("ar-MA").trim().replace(/\s+/g, " ")

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const initialQuery = params.get("q") || ""
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => setQuery(initialQuery), [initialQuery])

  useEffect(() => {
    const q = normalize(initialQuery)
    if (!q) { setResults([]); setLoading(false); return }
    let active = true
    const run = async () => {
      setLoading(true)
      const pattern = `%${q.replace(/[%_]/g, "\\$&" )}%`
      const [articles, news, schools, terms, pdfs, events, laws] = await Promise.all([
        supabase.from("articles").select("id,title,slug,excerpt").eq("status", "published").or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`).limit(30),
        supabase.from("news").select("id,title,slug,summary").eq("is_published", true).or(`title.ilike.${pattern},summary.ilike.${pattern},content.ilike.${pattern}`).limit(30),
        supabase.from("schools").select("id,name,slug,university,city,synopsis").or(`name.ilike.${pattern},university.ilike.${pattern},city.ilike.${pattern},synopsis.ilike.${pattern}`).limit(30),
        supabase.from("lexicon_terms").select("id,term_ar,term_fr,definition,category").or(`term_ar.ilike.${pattern},term_fr.ilike.${pattern},definition.ilike.${pattern},category.ilike.${pattern}`).limit(30),
        supabase.from("pdf_summaries").select("id,title,slug,description,semester").or(`title.ilike.${pattern},description.ilike.${pattern},professor.ilike.${pattern},semester.ilike.${pattern}`).limit(30),
        supabase.from("seminars").select("id,title,speaker,speaker_title,agenda").eq("status", "published").or(`title.ilike.${pattern},speaker.ilike.${pattern},speaker_title.ilike.${pattern},agenda.ilike.${pattern}`).limit(30),
        supabase.from("laws").select("id,title,slug,law_number,description").or(`title.ilike.${pattern},law_number.ilike.${pattern},description.ilike.${pattern}`).limit(30),
      ])
      if (!active) return
      const next: Result[] = []
      ;(articles.data || []).forEach((x: any) => next.push({ id: x.id, title: x.title, description: x.excerpt, type: "article", typeLabel: "مقال", href: `/articles/${x.slug}` }))
      ;(news.data || []).forEach((x: any) => next.push({ id: x.id, title: x.title, description: x.summary, type: "news", typeLabel: "خبر", href: `/news/${x.slug}` }))
      ;(schools.data || []).forEach((x: any) => next.push({ id: x.id, title: x.name, description: `${x.university} — ${x.city}${x.synopsis ? ` — ${x.synopsis}` : ""}`, type: "school", typeLabel: "كلية", href: `/schools/${x.slug}` }))
      ;(terms.data || []).forEach((x: any) => next.push({ id: x.id, title: x.term_ar, description: [x.term_fr, x.definition, x.category].filter(Boolean).join(" — "), type: "term", typeLabel: "مصطلح قانوني", href: `/lexicon/${generateSlug(x.term_ar)}` }))
      ;(pdfs.data || []).forEach((x: any) => next.push({ id: x.id, title: x.title, description: `${x.semester}${x.description ? ` — ${x.description}` : ""}`, type: "pdf", typeLabel: "ملخص / PDF", href: `/pdf/${x.slug || x.id}` }))
      ;(events.data || []).forEach((x: any) => next.push({ id: x.id, title: x.title, description: [x.speaker, x.speaker_title, x.agenda].filter(Boolean).join(" — "), type: "event", typeLabel: "ندوة", href: `/events/seminar-${x.id}` }))
      ;(laws.data || []).forEach((x: any) => next.push({ id: x.id, title: x.title, description: [x.law_number, x.description].filter(Boolean).join(" — "), type: "law", typeLabel: "قانون", href: `/archive?law=${encodeURIComponent(x.slug)}` }))
      const unique = Array.from(new Map(next.map((x) => [`${x.type}:${x.id}`, x])).values())
      setResults(unique)
      setLoading(false)
    }
    run()
    return () => { active = false }
  }, [initialQuery])

  const groups = useMemo(() => {
    const order = ["article", "news", "law", "pdf", "term", "school", "event"]
    return order.map((type) => ({ type, items: results.filter((r) => r.type === type) })).filter((g) => g.items.length)
  }, [results])

  const submit = (event: FormEvent) => { event.preventDefault(); const q = query.trim(); setParams(q ? { q } : {}) }

  const icon = (type: string) => ({ article: FileText, news: Newspaper, law: Scale, pdf: BookOpen, term: BookOpen, school: GraduationCap, event: Calendar }[type] || Search)

  return <>
    <SEOHead title={initialQuery ? `البحث عن ${initialQuery} - ميزان الرقمية` : "البحث في ميزان الرقمية"} description="ابحث في المقالات والأخبار والقوانين والملخصات والمصطلحات وكليات الحقوق والندوات في منصة ميزان الرقمية." keywords={["البحث القانوني المغربي", "القانون المغربي", "ميزان الرقمية"]} noindex />
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-muted/30 py-12 md:py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <h1 className="text-3xl font-black sm:text-4xl">ابحث في ميزان الرقمية</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">بحث موحد في المقالات والأخبار والقوانين والملخصات والمصطلحات وكليات الحقوق والندوات.</p>
          <form onSubmit={submit} className="mt-7 flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
            <Search className="m-3 shrink-0 text-muted-foreground" size={21}/>
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="البحث في جميع محتويات ميزان الرقمية" placeholder="ابحث عن قانون، مصطلح، كلية، ملخص، مقال أو خبر..." className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none" autoFocus />
            <button type="submit" className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">بحث</button>
          </form>
        </div>
      </section>
      <section className="container mx-auto max-w-5xl px-4 py-10">
        {!initialQuery ? <div className="rounded-2xl border border-border bg-card p-10 text-center"><Search className="mx-auto mb-4 text-primary" size={36}/><h2 className="text-xl font-black">ماذا تريد أن تبحث عنه؟</h2><p className="mt-2 text-sm text-muted-foreground">اكتب كلمة أو عبارة للبحث عبر محتويات المنصة.</p></div> : loading ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div> : results.length === 0 ? <div className="rounded-2xl border border-border bg-card p-10 text-center"><h2 className="text-xl font-black">لا توجد نتائج</h2><p className="mt-2 text-sm text-muted-foreground">جرّب كلمات أخرى مثل: القانون المغربي، مدونة الشغل، كلية الحقوق، العقد، المسؤولية.</p></div> : <div className="space-y-10"><div className="flex items-center justify-between"><h2 className="text-xl font-black">نتائج البحث</h2><span className="text-sm text-muted-foreground">{results.length} نتيجة</span></div>{groups.map((group) => <div key={group.type}><h3 className="mb-4 flex items-center gap-2 text-base font-extrabold"><span className="rounded-lg bg-primary/10 p-2 text-primary">{(() => { const I = icon(group.type); return <I size={17}/> })()}</span>{group.items[0].typeLabel}</h3><div className="grid gap-4 md:grid-cols-2">{group.items.map((item) => <Link key={`${item.type}-${item.id}`} to={item.href} title={item.title} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-md"><h4 className="font-bold group-hover:text-primary">{item.title}</h4>{item.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.description}</p>}<span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">فتح الصفحة <ArrowLeft size={13}/></span></Link>)}</div></div>)}</div>}
      </section>
    </main>
  </>
}
