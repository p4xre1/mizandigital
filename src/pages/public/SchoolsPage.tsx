import { useState, useMemo, useEffect } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import schoolsData from "../../data/schools.json"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import { Search, MapPin, Building2, GraduationCap, Sparkles, Users, BookOpen, Award, TrendingUp } from "lucide-react"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { ProSchoolCard, ProSchoolCardSkeleton } from "../../components/schools/ProSchoolCard"
import { AnimatedSection, StaggerGrid } from "../../components/ui/AnimatedSection"

function normalizeFaculty(raw: any) {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    city: raw.city,
    logoUrl: raw.logo_url || null,
    foundedYear: raw.founded_year || null,
    description: raw.description || null,
    websiteUrl: null,
    university: raw.university || null,
  }
}

export function SchoolsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")
  const [cmsSchools, setCmsSchools] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const { data, error } = await supabase
          .from("faculties")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) throw error
        if (data) setCmsSchools(data.map(normalizeFaculty))
      } catch (err) {
        console.error("خطأ في جلب الكليات:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchFaculties()
  }, [])

  const allSchools = useMemo(() => {
    const localSchools = schoolsData as any[]
    return Array.from(
      new Map([...localSchools, ...cmsSchools].map((s) => [s.slug || s.id, s])).values()
    )
  }, [cmsSchools])

  const cities = useMemo(() => {
    const set = new Set<string>()
    allSchools.forEach((s: any) => {
      if (s.city) set.add(s.city)
    })
    return Array.from(set)
  }, [allSchools])

  const filteredSchools = useMemo(() => {
    return allSchools.filter((school: any) => {
      const name = school.name || school.name_ar || ""
      const city = school.city || ""
      const description = school.description || ""

      const matchesSearch =
        !searchQuery ||
        containsText(name, searchQuery) ||
        containsText(city, searchQuery) ||
        containsText(description, searchQuery)

      const matchesCity = selectedCity === "all" || city === selectedCity
      return matchesSearch && matchesCity
    })
  }, [allSchools, searchQuery, selectedCity])

  // Stats
  const stats = useMemo(() => {
    const cityCount = cities.length
    const withWebsite = allSchools.filter((s: any) => s.websiteUrl || s.website).length
    return { total: allSchools.length, cities: cityCount, withWebsite }
  }, [allSchools, cities])

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "دليل كليات الحقوق والجامعات المغربية",
    "description": "دليل شامل لجميع كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب.",
    "itemListElement": filteredSchools.map((school: any, index: number) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "EducationalOrganization",
        "name": school.name || school.name_ar,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": school.city,
          "addressCountry": "MA"
        },
        "url":
          school.websiteUrl ||
          school.website ||
          `https://www.mizan.page/schools/${school.slug || generateSlug(school.name || school.name_ar || "") || school.id}`
      }
    }))
  }

  return (
    <>
      <AEOHead
        title="دليل كليات الحقوق والجامعات المغربية"
        description="دليل شامل لجميع كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب (FSJES)، مع التخصصات الأكاديمية المتوفرة والمعلومات العملية بكل مؤسسة وكل مدينة."
        directAnswer="دليل كليات الحقوق بالمغرب في ميزان الرقمية يضم 21 كلية (FSJES وFSJP) مع معلومات التسجيل والمدينة والجامعة."
        keywords={["كليات الحقوق بالمغرب", "FSJES", "الجامعات المغربية", "دراسة القانون بالمغرب", ...cities]}
        schema={listSchema}
      />

      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(200_90%_60%/0.06),transparent_60%),radial-gradient(ellipse_at_bottom_right,_hsl(260_90%_60%/0.05),transparent_60%)]" dir="rtl">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-violet-500/[0.03] to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          
          <div className="container relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-10">
            <AnimatedSection animation="fadeUp">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-700 backdrop-blur dark:text-blue-300">
                      <GraduationCap className="size-4" />
                      <span>الدليل الأكاديمي الموحد</span>
                      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px]">{stats.total} كلية</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-700">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      محدث 2026
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl leading-[1.1]">
                      دليل <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">كليات الحقوق</span>
                      <span className="block text-[0.55em] font-bold text-muted-foreground mt-2">والجامعات المغربية FSJES & FSJP</span>
                    </h1>
                    <p className="text-sm leading-7 text-muted-foreground md:text-[15px]">
                      استكشف كليات العلوم القانونية والاقتصادية والاجتماعية عبر مختلف مدن المملكة، مع معلومات التسجيل، التخصصات، والمواقع الرسمية — كل شيء لطالب القانون في مكان واحد.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: Building2, label: "21 كلية معتمدة", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
                      { icon: MapPin, label: `${stats.cities} مدينة`, color: "bg-violet-500/10 text-violet-700 border-violet-500/20" },
                      { icon: Award, label: "FSJES رسمي", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
                    ].map((badge, i) => (
                      <span key={i} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${badge.color}`}>
                        <badge.icon className="size-3.5" />
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-3 lg:w-[340px] shrink-0">
                  {[
                    { value: stats.total, label: "كلية", sub: "FSJES + FSJP", icon: Building2, gradient: "from-blue-500 to-cyan-500" },
                    { value: stats.cities, label: "مدينة", sub: "مغطاة", icon: MapPin, gradient: "from-violet-500 to-purple-500" },
                    { value: stats.withWebsite || 15, label: "موقع رسمي", sub: "متاح", icon: BookOpen, gradient: "from-emerald-500 to-teal-500" },
                  ].map((stat, i) => (
                    <div key={i} className="group rounded-2xl border border-border/50 bg-card/70 backdrop-blur p-4 text-center hover:border-primary/20 hover:shadow-lg transition-all">
                      <div className={`mx-auto grid size-10 place-items-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow group-hover:scale-110 transition-transform`}>
                        <stat.icon className="size-5" />
                      </div>
                      <p className="mt-2 text-xl font-black text-foreground">{stat.value}</p>
                      <p className="text-[11px] font-bold text-foreground">{stat.label}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Morocco map visual hint */}
              <div className="mt-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <MapPin className="size-4 text-primary" />
                    المدن المغطاة:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cities.slice(0, 8).map(city => (
                      <span key={city} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                        {city}
                      </span>
                    ))}
                    {cities.length > 8 && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        +{cities.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          {/* Search */}
          <AnimatedSection animation="fadeUp" delay={100}>
            <div className="mb-8 flex flex-col gap-4 rounded-[20px] border border-border/50 bg-card/70 p-4 backdrop-blur-xl shadow-[0_8px_32px_hsl(0_0%_0%/0.04)] sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث باسم الكلية، المدينة، الجامعة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background/50 pr-12 pl-4 text-sm font-medium focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <FilterDropdown
                className="w-full sm:w-64"
                value={selectedCity}
                onChange={setSelectedCity}
                allLabel="جميع المدن"
                allCount={allSchools.length}
                icon={<MapPin size={14} />}
                options={cities.map((city) => ({ value: city, label: city }))}
              />
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="size-3.5" />{filteredSchools.length} كلية</span>
              </div>
            </div>
          </AnimatedSection>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <ProSchoolCardSkeleton key={i} />)}
            </div>
          ) : filteredSchools.length > 0 ? (
            <>
              <StaggerGrid className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" delay={150}>
                {filteredSchools.map((school: any, idx: number) => {
                  const schoolName = school.name || school.name_ar || ""
                  const schoolSlug = school.slug || generateSlug(schoolName) || school.id
                  return (
                    <ProSchoolCard
                      key={school.id}
                      id={school.id}
                      name={schoolName}
                      slug={schoolSlug}
                      city={school.city}
                      logoUrl={school.logoUrl}
                      foundedYear={school.foundedYear}
                      description={school.description}
                      websiteUrl={school.websiteUrl || school.website}
                      university={school.university}
                      isNew={idx < 2}
                      index={idx}
                    />
                  )
                })}
              </StaggerGrid>

              <AnimatedSection animation="fadeUp" delay={400} className="mt-12">
                <div className="relative overflow-hidden rounded-[24px] border border-blue-500/10 bg-gradient-to-br from-blue-500/[0.06] via-violet-500/[0.04] to-transparent p-8">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-[0_8px_20px_hsl(220_90%_60%/0.25)]">
                        <Sparkles className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-black">لم تجد كليتك؟</h3>
                        <p className="text-[12px] text-muted-foreground">أضف كلية جديدة أو صحح معلومات موجودة</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-card border border-border px-3 py-1.5 text-[11px] font-bold flex items-center gap-1">
                        <TrendingUp className="size-3.5 text-emerald-600" />
                        {stats.total} كلية متاحة
                      </span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </>
          ) : (
            <AnimatedSection animation="scaleIn">
              <div className="rounded-[24px] border border-dashed border-border bg-card p-12 text-center">
                <div className="mx-auto grid size-20 place-items-center rounded-[20px] bg-muted text-muted-foreground/50">
                  <Building2 className="size-10" />
                </div>
                <h3 className="mt-4 text-lg font-black">لم يتم العثور على كلية</h3>
                <p className="mt-1 text-sm text-muted-foreground">جرب البحث بكلمات مختلفة أو اختر مدينة أخرى</p>
                <button onClick={() => { setSearchQuery(""); setSelectedCity("all") }} className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">
                  إعادة ضبط
                </button>
              </div>
            </AnimatedSection>
          )}
        </div>
      </main>
    </>
  )
}
