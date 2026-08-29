import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { NotFound } from "./NotFound"
import schoolsData from "../../data/schools.json"
import { generateSlug } from "../../lib/utils/generateSlug"
import { buildMetaDescription } from "../../lib/seo/description"
import { supabase } from "../../lib/supabase/client"
import {
  GraduationCap,
  MapPin,
  ExternalLink,
  ArrowRight,
  Globe,
  BookOpen,
  Building2,
  Share2,
  Link as LinkIcon,
  Navigation,
  Calendar,
  Loader2
} from "lucide-react"

interface SchoolPageProps {
  slug?: string
  id?: string
}

// يحوّل سجل كلية قادم من جدول "faculties" في Supabase إلى نفس الشكل المستخدم في schools.json
function normalizeFaculty(raw: any) {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    city: raw.city,
    logoUrl: raw.logo_url || null,
    foundedYear: raw.founded_year || null,
    description: raw.description || null,
  }
}

export function SchoolPage({ slug: propSlug, id: propId }: SchoolPageProps) {
  const params = useParams<{ slug?: string; id?: string }>()
  const targetQuery = propSlug || propId || params.slug || params.id

  const localSchool: any = schoolsData.find((item: any) => {
    const schoolName = item.name || item.name_ar || ""
    return item.id === targetQuery || item.slug === targetQuery || generateSlug(schoolName) === targetQuery
  })

  const [cmsSchool, setCmsSchool] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(!localSchool)

  // إذا لم تُوجد الكلية في الدليل المحلي، نبحث عنها ضمن الكليات المضافة من لوحة التحكم
  useEffect(() => {
    if (localSchool || !targetQuery) {
      setLoading(false)
      return
    }
    const fetchFaculty = async () => {
      try {
        const { data, error } = await supabase
          .from("faculties")
          .select("*")
          .or(`slug.eq.${targetQuery},id.eq.${targetQuery}`)
          .maybeSingle()

        if (error) throw error
        if (data) setCmsSchool(normalizeFaculty(data))
      } catch (err) {
        console.error("خطأ في جلب بيانات الكلية من لوحة التحكم:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchFaculty()
  }, [localSchool, targetQuery])

  const school: any = localSchool || cmsSchool

  if (loading) {
    return (
      <main className="container mx-auto flex h-[50vh] max-w-4xl items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    )
  }

  if (!school) {
    return <NotFound />
  }

  const schoolName = school.name || school.name_ar || "كلية الحقوق"
  const website = school.websiteUrl || school.website || school.officialUrl
  const canonicalSlug = school.slug || targetQuery
  const canonicalUrl = `https://www.mizan.page/schools/${canonicalSlug}`

  const schoolSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": schoolName,
    "alternateName": school.name_fr || school.code,
    "description": school.description || school.synopsis,
    "url": website || `https://www.mizan.page/schools/${school.id}`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": school.city || "المغرب",
      "addressCountry": "MA"
    }
  }

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <>
      <SEOHead
        title={`${schoolName} - دليل كليات الحقوق بالمغرب`}
        description={buildMetaDescription(school.description || school.synopsis, [
          `كلية ${schoolName}${school.city ? ` بمدينة ${school.city}` : ""}`,
          "تعرّف على المسالك القانونية وبرامج الإجازة والماستر والدكتوراة ومعلومات التواصل ضمن دليل كليات الحقوق بالمغرب.",
        ])}
        ogType="website"
        canonicalUrl={canonicalUrl}
        keywords={[
          schoolName,
          school.city,
          "كلية الحقوق",
          "FSJES",
          "ماستر القانون المغربي",
          "الدكتوراة في القانون"
        ]}
        schema={schoolSchema}
      />

      <main className="container mx-auto max-w-5xl px-4 py-12" dir="rtl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/schools"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition"
          >
            <ArrowRight size={16} />
            العودة إلى دليل الكليات
          </Link>
        </div>

        {/* Main Banner Card with Logo */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* الشعار واسم الكلية */}
            <div className="flex items-start md:items-center gap-4 flex-1">
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt={schoolName}
                  className="size-16 md:size-20 rounded-xl object-contain bg-muted/50 p-2 border border-border shrink-0"
                />
              ) : (
                <div className="size-16 md:size-20 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0 border border-primary/20">
                  {schoolName.charAt(0)}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                    <GraduationCap size={14} />
                    مؤسسة جامعية عمومية
                  </span>
                  {school.city && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      <MapPin size={12} />
                      {school.city}
                    </span>
                  )}
                  {school.foundedYear && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      <Calendar size={12} />
                      تأسست سنة {school.foundedYear}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-foreground">
                  {schoolName}
                </h1>

                {school.university && (
                  <p className="text-sm font-semibold text-muted-foreground">
                    تنسيق: {school.university}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition shadow-sm"
                >
                  <Globe size={16} />
                  <span>الموقع الرسمي</span>
                  <ExternalLink size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-xl border border-border bg-background p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
                title="مشاركة رابط الصفحة"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>

          {/* Description Section */}
          {(school.description || school.synopsis) && (
            <div className="mt-6 pt-6 border-t border-border">
              <h2 className="text-sm font-bold text-foreground mb-2">عن الكلية:</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {school.description || school.synopsis}
              </p>
            </div>
          )}
        </div>

        {/* Programs & Location Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Undergraduate & Master Streams */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-base mb-4">
              <BookOpen size={20} />
              <h2>المسالك والتخصصات الأكاديمية</h2>
            </div>
            {school.programs && school.programs.length > 0 ? (
              <ul className="space-y-2.5 text-sm">
                {school.programs.map((program: string, idx: number) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-muted-foreground rounded-lg bg-muted/50 p-2.5"
                  >
                    <span className="size-2 rounded-full bg-primary shrink-0" />
                    <span>{program}</span>
                  </li>
                ))}
              </ul>
            ) : school.studyAreas && school.studyAreas.length > 0 ? (
              <ul className="space-y-2.5 text-sm">
                {school.studyAreas.map((area: string, idx: number) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-muted-foreground rounded-lg bg-muted/50 p-2.5"
                  >
                    <span className="size-2 rounded-full bg-primary shrink-0" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                تشمل الشعب الأساسية: القانون الخاص بالعربية، القانون العام بالعربية، Droit Privé ، Droit Public.
              </p>
            )}
          </section>

          {/* Contact & Location Info */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold text-base mb-4">
              <Building2 size={20} />
              <h2>الموقع والاتصال</h2>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">المدينة والجهة:</span>
                <p className="font-semibold text-foreground">
                  {school.city || "المملكة المغربية"}
                </p>
              </div>
              
              {school.foundedYear && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">تاريخ التأسيس:</span>
                  <p className="font-medium text-foreground">
                    سنة {school.foundedYear}
                  </p>
                </div>
              )}

              {(school.address || school.mapLocation?.address) && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">العنوان الكامل:</span>
                  <p className="font-medium text-foreground">
                    {school.address || school.mapLocation?.address}
                  </p>
                </div>
              )}
              {school.mapLocation?.googleMapsUrl && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">خريطة جوجل:</span>
                  <a
                    href={school.mapLocation.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                  >
                    <Navigation size={14} />
                    <span>عرض الموقع الدقيق على الخريطة</span>
                  </a>
                </div>
              )}
              {website && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">البوابة الإلكترونية:</span>
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline break-all"
                  >
                    {website}
                  </a>
                </div>
              )}

              {/* Social Media Links */}
              {school.socialMedia && (
                <div className="pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground block mb-2">حسابات التواصل الاجتماعي:</span>
                  <div className="flex flex-wrap gap-2">
                    {school.socialMedia.facebook && (
                      <a
                        href={school.socialMedia.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 text-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500/20 transition"
                      >
                        فيسبوك الرسمي
                      </a>
                    )}
                    {school.socialMedia.linkedin && (
                      <a
                        href={school.socialMedia.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 text-sky-600 px-3 py-1.5 text-xs font-semibold hover:bg-sky-500/20 transition"
                      >
                        لينكد إن
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Useful Links Section */}
        {school.usefulLinks && school.usefulLinks.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm mb-8">
            <div className="flex items-center gap-2 text-primary font-bold text-base mb-4">
              <LinkIcon size={20} />
              <h2>روابط مفيدة ومنصات رقمية</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {school.usefulLinks.map((link: any, idx: number) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30 hover:border-primary hover:bg-muted/60 transition text-sm font-medium text-foreground"
                >
                  <span>{link.title}</span>
                  <ExternalLink size={16} className="text-primary" />
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}