import { useState, useMemo, useEffect } from "react"
import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import schoolsData from "../../data/schools.json"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import { Search, MapPin, Building2, ExternalLink, ArrowLeft, GraduationCap, Loader2 } from "lucide-react"
import { FilterDropdown } from "../../components/ui/FilterDropdown"

// يحوّل سجل كلية قادم من جدول "faculties" في Supabase إلى نفس الشكل
// المستخدم في schools.json المحلي، لعرضهما معاً في نفس الصفحة/البطاقات.
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
  }
}

export function SchoolsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")
  const [cmsSchools, setCmsSchools] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // جلب الكليات المضافة من لوحة التحكم (CMS) ودمجها مع الدليل المحلي
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
        console.error("خطأ في جلب الكليات من لوحة التحكم:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchFaculties()
  }, [])

  // دمج كليات لوحة التحكم مع الدليل المحلي، مع إزالة التكرار بالأولوية لبيانات لوحة التحكم عند تطابق الـ slug
  const allSchools = useMemo(() => {
    const localSchools = schoolsData as any[]
    return Array.from(
      new Map([...localSchools, ...cmsSchools].map((s) => [s.slug || s.id, s])).values()
    )
  }, [cmsSchools])

  // Extract unique list of cities from schools dataset
  const cities = useMemo(() => {
    const set = new Set<string>()
    allSchools.forEach((s: any) => {
      if (s.city) set.add(s.city)
    })
    return Array.from(set)
  }, [allSchools])

  // Filter schools based on Arabic normalized search and city filter
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

  // ItemList Schema for Google Search Indexing
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
        "url": school.websiteUrl || school.website || `https://www.mizan.page/schools/${school.id}`
      }
    }))
  }

  return (
    <>
      <SEOHead
        title="دليل كليات الحقوق والجامعات المغربية"
        description="دليل شامل لجميع كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب (FSJES)، مع التخصصات الأكاديمية المتوفرة والمعلومات العملية بكل مؤسسة وكل مدينة."
        keywords={["كليات الحقوق بالمغرب", "FSJES", "الجامعات المغربية", "دراسة القانون بالمغرب", ...cities]}
        schema={listSchema}
      />

      <main className="container mx-auto max-w-6xl px-4 py-10" dir="rtl">
        {/* Header Section */}
        <header className="mb-8 text-center md:text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">
            <GraduationCap size={16} />
            <span>الدليل الأكاديمي الموحد</span>
          </div>
          <h1 className="text-3xl font-black text-foreground md:text-4xl">
            دليل كليات الحقوق والجامعات المغربية
          </h1>
          <p className="mt-2 text-base text-muted-foreground max-w-2xl">
            استكشف كليات العلوم القانونية والاقتصادية والاجتماعية (FSJES) عبر مختلف مدن المملكة المغربية، وتعرف على التخصصات والمواقع الرسمية.
          </p>
        </header>

        {/* Filter & Search Bar */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3 items-stretch bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="ابحث باسم الكلية، المدينة، أو التخصص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pr-10 pl-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition min-h-[44px]"
            />
          </div>

          {/* City Dropdown */}
          <FilterDropdown
            className="sm:w-64 shrink-0"
            value={selectedCity}
            onChange={setSelectedCity}
            allLabel="جميع المدن"
            allCount={allSchools.length}
            icon={<MapPin size={14} />}
            options={cities.map((city) => ({ value: city, label: city }))}
          />
        </div>

        {/* Grid of Schools */}
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredSchools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school: any) => {
              const schoolName = school.name || school.name_ar || ""
              const schoolSlug = school.slug || generateSlug(schoolName) || school.id
              const website = school.websiteUrl || school.website

              return (
                <article
                  key={school.id}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {school.logoUrl ? (
                        <img
                          src={school.logoUrl}
                          alt={schoolName}
                          className="size-11 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <Building2 size={24} />
                        </div>
                      )}
                      {school.city && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          <MapPin size={12} />
                          {school.city}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition line-clamp-2">
                      <Link to={`/schools/${schoolSlug}`} title={schoolName}>
                        {schoolName}
                      </Link>
                    </h2>

                    {school.description && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {school.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-2 text-xs">
                    <Link
                      to={`/schools/${schoolSlug}`}
                      title={`تفاصيل الكلية: ${schoolName}`}
                      className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
                    >
                      تفاصيل الكلية
                      <ArrowLeft size={14} />
                    </Link>

                    {website && (
                      <a
                        href={website}
                        title={`الموقع الرسمي لـ ${schoolName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition"
                      >
                        <span>الموقع الرسمي</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Building2 size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">لم يتم العثور على أي كلية</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              جرب البحث بكلمات مختلفة أو اختر مدينة أخرى.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setSelectedCity("all")
              }}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
            >
              إعادة ضبط البحث
            </button>
          </div>
        )}
      </main>
    </>
  )
}