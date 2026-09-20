import { useState, useMemo, useEffect } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import schoolsData from "../../data/schools.json"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { canonicalSchool, canonicalSchools } from "../../lib/canonical"
import { supabase } from "../../lib/supabase/client"
import { Search, MapPin, GraduationCap, Building2 } from "lucide-react"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { Link } from "react-router-dom"

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
        // url = صفحة الدليل (الرابط القانوني)، والموقع الرسمي في sameAs:
        // الرابط الداخلي هو ما يجب أن يفهرَس، ورابط الجامعة ملكُ المؤسسة.
        url: canonicalSchool(school.slug || generateSlug(school.name || "") || school.id),
        sameAs: school.websiteUrl || school.website || undefined
      }
    }))
  }

  return (
    <>
      <AEOHead title="دليل كليات الحقوق والجامعات المغربية" description="دليل شامل لجميع كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب." keywords={["كليات الحقوق بالمغرب", "FSJES", ...cities]} canonicalUrl={canonicalSchools()} schema={listSchema} />

      <main className="min-h-screen bg-white dark:bg-[#0f172a]" dir="rtl">
        <div className="bg-[#f8fafc] dark:bg-[#0f172a] border-b border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="container mx-auto max-w-[1280px] px-6 py-10">
            <div className="max-w-[800px]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-3 py-1 text-[11px] font-bold text-[#2563eb] dark:text-[#60a5fa]">
                <GraduationCap className="size-3.5" />
                {allSchools.length} كلية - {cities.length} مدينة
              </span>
              <h1 className="mt-3 text-[28px] md:text-[36px] font-black tracking-[-0.02em] text-[#0f172a] dark:text-white leading-[1.1]">
                دليل كليات الحقوق والجامعات المغربية
              </h1>
              <p className="mt-3 text-[14px] leading-7 text-[#475569] dark:text-[#94a3b8]">دليل شامل لـ FSJES و FSJP عبر مختلف مدن المملكة.</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {cities.slice(0, 8).map(city => (
                  <button key={city} onClick={() => setSelectedCity(city)} className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${selectedCity === city ? "bg-[#2563eb] text-white border-[#2563eb]" : "bg-white dark:bg-[#1e293b] border-[#e2e8f0] dark:border-[#334155] hover:border-[#2563eb]/20 hover:bg-[#eff6ff] dark:hover:bg-[#334155]"}`}>
                    {city}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-[400px]">
                  <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input type="text" maxLength={100} autoComplete="off" spellCheck={false} placeholder="ابحث باسم الكلية أو المدينة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] pr-10 pl-4 text-[13px] outline-none focus:border-[#2563eb]/30 focus:ring-2 focus:ring-[#2563eb]/10" />
                </div>
                <FilterDropdown className="w-48" value={selectedCity} onChange={setSelectedCity} allLabel="جميع المدن" allCount={allSchools.length} options={cities.map((city) => ({ value: city, label: city }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-[1280px] px-6 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-[#f1f5f9] dark:bg-[#1e293b] animate-pulse" />
              ))}
            </div>
          ) : filteredSchools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchools.map((school: any) => {
                const schoolName = school.name || school.name_ar || ""
                const schoolSlug = school.slug || generateSlug(schoolName) || school.id
                return (
                  <Link key={school.id} to={`/schools/${schoolSlug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl p-5 hover:border-[#2563eb]/20 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="size-11 grid place-items-center rounded-xl bg-[#2563eb] text-white font-black text-[14px] shrink-0 shadow-sm">
                          {schoolName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                            <MapPin className="size-3" />
                            {school.city}
                            {school.foundedYear && <><span>-</span><span>{school.foundedYear}</span></>}
                          </div>
                          <h3 className="font-bold text-[13px] leading-tight mt-1 text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{schoolName}</h3>
                          {school.university && <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] mt-1">{school.university}</div>}
                        </div>
                      </div>
                      <span className="size-7 grid place-items-center rounded-full bg-[#f1f5f9] dark:bg-[#334155] group-hover:bg-[#2563eb] group-hover:text-white transition-colors">
                        <span className="text-[12px]">↗</span>
                      </span>
                    </div>
                    {school.description && <p className="mt-3 text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed line-clamp-2">{school.description}</p>}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] bg-[#eff6ff] dark:bg-[#1e3a5f] text-[#2563eb] dark:text-[#60a5fa] px-2 py-0.5 rounded-full border border-[#dbeafe] dark:border-[#334155] font-bold">{school.city}</span>
                      {school.foundedYear && <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">تأسست {school.foundedYear}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1e293b] border border-dashed border-[#e2e8f0] dark:border-[#334155] rounded-2xl p-12 text-center">
              <div className="size-12 mx-auto grid place-items-center rounded-full bg-[#f1f5f9] dark:bg-[#334155]">
                <Building2 className="size-5 text-[#94a3b8]" />
              </div>
              <h3 className="mt-3 font-bold">لم يتم العثور على كلية</h3>
              <button onClick={() => { setSearchQuery(""); setSelectedCity("all") }} className="mt-4 rounded-full bg-[#2563eb] text-white px-4 py-1.5 text-[12px] font-bold">إعادة ضبط</button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
