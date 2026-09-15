import { useState, useMemo, useEffect } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import schoolsData from "../../data/schools.json"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import { Search, MapPin, Building2 } from "lucide-react"
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

      <main className="min-h-screen bg-[#f8f7f4]" dir="rtl">
        <div className="bg-[#0a0a0a] text-white text-[11px] h-8 flex items-center">
          <div className="container mx-auto max-w-[1280px] px-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              دليل الكليات • {allSchools.length} كلية • {cities.length} مدينة
            </span>
            <span className="opacity-60 hidden sm:block">الرئيسية / الكليات</span>
          </div>
        </div>

        <div className="bg-white border-b border-black/10">
          <div className="container mx-auto max-w-[1280px] px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-1 h-5 bg-[#0a0a0a]" />
                  <h1 className="text-[28px] font-black tracking-[-0.02em]">دليل كليات الحقوق</h1>
                  <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded font-bold">FSJES & FSJP</span>
                </div>
                <p className="text-[13px] text-muted-foreground max-w-[600px]">دليل شامل لـ FSJES و FSJP عبر مختلف مدن المملكة — معلومات التسجيل، التخصصات، والمواقع الرسمية.</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {cities.slice(0, 8).map(city => (
                    <button key={city} onClick={() => setSelectedCity(city)} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${selectedCity === city ? "bg-black text-white border-black" : "bg-[#f8f7f4] border-black/5 hover:border-black/15"}`}>
                      {city}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="ابحث باسم الكلية..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 w-64 rounded-full border border-black/10 bg-[#f8f7f4] pr-9 pl-3 text-[12px] outline-none focus:border-black/20" />
                </div>
                <FilterDropdown className="w-44" value={selectedCity} onChange={setSelectedCity} allLabel="جميع المدن" allCount={allSchools.length} options={cities.map((city) => ({ value: city, label: city }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-[1280px] px-4 py-6">
          {loading ? (
            <div className="grid grid-cols-12 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="col-span-4 h-40 bg-white border border-black/5 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredSchools.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                <span className="size-1 h-4 bg-black" />
                <h2 className="font-black text-[12px] uppercase">Featured Posts • كليات الحقوق</h2>
                <span className="ms-auto text-[10px] bg-black text-white px-2 py-0.5 rounded font-bold">{filteredSchools.length} كلية</span>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSchools.map((school: any, idx: number) => {
                      const schoolName = school.name || school.name_ar || ""
                      const schoolSlug = school.slug || generateSlug(schoolName) || school.id
                      return (
                        <Link key={school.id} to={`/schools/${schoolSlug}`} className="group bg-white border border-black/5 rounded p-4 hover:border-black/15 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <div className="size-10 grid place-items-center rounded bg-black text-white font-black text-[14px] shrink-0">
                                {schoolName.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <MapPin className="size-3" />
                                  {school.city}
                                  {school.foundedYear && <><span>•</span><span>{school.foundedYear}</span></>}
                                </div>
                                <h3 className="font-bold text-[13px] leading-tight mt-1 group-hover:text-[#dc2626]">{schoolName}</h3>
                                {school.university && <div className="text-[10px] text-muted-foreground mt-1">{school.university}</div>}
                              </div>
                            </div>
                            <span className="size-6 grid place-items-center rounded-full border border-black/10 group-hover:bg-black group-hover:text-white transition-colors">
                              <span className="text-[12px]">↗</span>
                            </span>
                          </div>
                          {school.description && <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{school.description}</p>}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-4">
                  <div className="bg-white border border-black/5 rounded p-4">
                    <div className="flex items-center gap-2 mb-3 border-b-2 border-black pb-2">
                      <span className="size-1 h-4 bg-[#dc2626]" />
                      <h3 className="font-black text-[12px] uppercase">Trending Now</h3>
                    </div>
                    <div className="space-y-3">
                      {cities.slice(0, 5).map((city, idx) => {
                        const count = allSchools.filter((s: any) => s.city === city).length
                        return (
                          <button key={city} onClick={() => setSelectedCity(city)} className="w-full flex items-center gap-2 text-right hover:bg-[#f8f7f4] p-2 rounded transition-colors">
                            <span className="size-5 grid place-items-center rounded-full bg-black text-white text-[10px] font-black">{idx + 3}</span>
                            <span className="flex-1 text-[12px] font-bold">{city}</span>
                            <span className="text-[10px] bg-[#f8f7f4] border border-black/5 px-2 py-0.5 rounded">{count} كلية</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-[#111] text-white rounded p-4">
                    <h3 className="font-black text-[12px] mb-2">Express Posts</h3>
                    <p className="text-[11px] opacity-60 leading-relaxed mb-3">استكشف كليات الحقوق حسب المدينة — دليل محدث 2026</p>
                    <div className="grid grid-cols-2 gap-2">
                      {cities.slice(0, 4).map(city => (
                        <button key={city} onClick={() => setSelectedCity(city)} className="bg-white/10 hover:bg-white/20 rounded p-2 text-[11px] font-bold transition-colors text-right">
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-dashed border-black/10 rounded p-12 text-center">
              <div className="size-12 mx-auto grid place-items-center rounded-full border border-black/10">
                <Building2 className="size-5" />
              </div>
              <h3 className="mt-3 font-bold">لم يتم العثور على كلية</h3>
              <button onClick={() => { setSearchQuery(""); setSelectedCity("all") }} className="mt-4 rounded-full border border-black/10 px-4 py-1.5 text-[12px] hover:border-black/20">إعادة ضبط</button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
