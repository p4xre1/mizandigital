import { useState, useMemo, useEffect } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import schoolsData from "../../data/schools.json"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import { Search, GraduationCap, Building2 } from "lucide-react"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { ProSchoolCard, ProSchoolCardSkeleton } from "../../components/schools/ProSchoolCard"
import { AnimatedSection } from "../../components/ui/AnimatedSection"

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
        const { data, error } = await supabase.from("faculties").select("*").order("created_at", { ascending: false })
        if (error) throw error
        if (data) setCmsSchools(data.map(normalizeFaculty))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchFaculties()
  }, [])

  const allSchools = useMemo(() => {
    const localSchools = schoolsData as any[]
    return Array.from(new Map([...localSchools, ...cmsSchools].map((s) => [s.slug || s.id, s])).values())
  }, [cmsSchools])

  const cities = useMemo(() => {
    const set = new Set<string>()
    allSchools.forEach((s: any) => { if (s.city) set.add(s.city) })
    return Array.from(set)
  }, [allSchools])

  const filteredSchools = useMemo(() => {
    return allSchools.filter((school: any) => {
      const name = school.name || school.name_ar || ""
      const city = school.city || ""
      const description = school.description || ""
      const matchesSearch = !searchQuery || containsText(name, searchQuery) || containsText(city, searchQuery) || containsText(description, searchQuery)
      const matchesCity = selectedCity === "all" || city === selectedCity
      return matchesSearch && matchesCity
    })
  }, [allSchools, searchQuery, selectedCity])

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "دليل كليات الحقوق",
    itemListElement: filteredSchools.map((school: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "EducationalOrganization",
        name: school.name || school.name_ar,
        address: { "@type": "PostalAddress", addressLocality: school.city, addressCountry: "MA" },
        url: school.websiteUrl || school.website || `https://www.mizan.page/schools/${school.slug || generateSlug(school.name || "") || school.id}`
      }
    }))
  }

  return (
    <>
      <AEOHead
        title="دليل كليات الحقوق والجامعات المغربية"
        description="دليل شامل لجميع كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب."
        keywords={["كليات الحقوق بالمغرب", "FSJES", ...cities]}
        schema={listSchema}
      />

      <main className="min-h-screen bg-background" dir="rtl">
        <div className="border-b border-border">
          <div className="container mx-auto max-w-[1200px] px-6 py-10 lg:px-8">
            <AnimatedSection>
              <div className="max-w-[720px] space-y-4">
                <div className="flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground">
                  <span className="h-px w-6 bg-foreground" />
                  <span>دليل الكليات</span>
                  <span className="size-[2px] rounded-full bg-border" />
                  <span>{allSchools.length} كلية</span>
                  <span className="size-[2px] rounded-full bg-border" />
                  <span>{cities.length} مدينة</span>
                </div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em] leading-[1.1] md:text-[36px]">
                  دليل كليات الحقوق والجامعات المغربية
                </h1>
                <p className="text-[14px] leading-[1.7] text-muted-foreground">
                  دليل شامل لـ FSJES و FSJP عبر مختلف مدن المملكة — معلومات التسجيل، التخصصات، والمواقع الرسمية.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {cities.slice(0, 8).map(city => (
                    <button key={city} onClick={() => setSelectedCity(city)} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${selectedCity === city ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"}`}>
                      {city}
                    </button>
                  ))}
                  {cities.length > 8 && (
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">+{cities.length - 8}</span>
                  )}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="container mx-auto max-w-[1200px] px-6 py-6 lg:px-8">
          <AnimatedSection delay={50}>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
              <div className="relative flex-1 max-w-[420px]">
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث باسم الكلية أو المدينة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-full border border-border bg-background pr-10 pl-4 text-[13px] placeholder:text-muted-foreground/60 focus:border-foreground/20 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <FilterDropdown
                  className="w-full sm:w-56"
                  value={selectedCity}
                  onChange={setSelectedCity}
                  allLabel="جميع المدن"
                  allCount={allSchools.length}
                  options={cities.map((city) => ({ value: city, label: city }))}
                />
                <span className="hidden sm:inline-flex rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground">
                  {filteredSchools.length} نتيجة
                </span>
              </div>
            </div>
          </AnimatedSection>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <ProSchoolCardSkeleton key={i} />)}
            </div>
          ) : filteredSchools.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSchools.map((school: any, idx: number) => {
                const schoolName = school.name || school.name_ar || ""
                const schoolSlug = school.slug || generateSlug(schoolName) || school.id
                return (
                  <div key={school.id} className="animate-[slideUp_0.4s_ease_both]" style={{ animationDelay: `${idx * 30}ms` }}>
                    <ProSchoolCard
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
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-border p-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full border border-border">
                <Building2 className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-[14px] font-semibold">لم يتم العثور على كلية</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">جرب البحث بكلمات مختلفة</p>
              <button onClick={() => { setSearchQuery(""); setSelectedCity("all") }} className="mt-4 rounded-full border border-border px-4 py-1.5 text-[12px] font-medium hover:border-foreground/20 transition-colors">
                إعادة ضبط
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
