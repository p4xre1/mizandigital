import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { NotFound } from "./NotFound"
import schoolsData from "../../data/schools.json"
import { generateSlug } from "../../lib/utils/generateSlug"
import {
  GraduationCap,
  MapPin,
  ExternalLink,
  ArrowRight,
  Globe,
  BookOpen,
  Building2,
  Share2
} from "lucide-react"

interface SchoolPageProps {
  slug?: string
  id?: string
}

export function SchoolPage({ slug: propSlug, id: propId }: SchoolPageProps) {
  const params = useParams<{ slug?: string; id?: string }>()
  const targetQuery = propSlug || propId || params.slug || params.id

  // Match school by ID or generated slug
  const school: any = schoolsData.find((item: any) => {
    const schoolName = item.name || item.name_ar || ""
    return item.id === targetQuery || generateSlug(schoolName) === targetQuery
  })

  if (!school) {
    return <NotFound />
  }

  const schoolName = school.name || school.name_ar || "كلية الحقوق"
  const website = school.websiteUrl || school.website

  // EducationalOrganization Schema for Google Search Indexing
  const schoolSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": schoolName,
    "alternateName": school.name_fr || school.code,
    "description": school.description,
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
        description={
          school.description
            ? school.description.slice(0, 160)
            : `تعرف على المسالك القانونية وبرامج الماستر والدكتوراة بـ ${schoolName}.`
        }
        ogType="website"
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

        {/* Main Banner Card */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
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
              </div>

              <h1 className="text-2xl md:text-4xl font-black text-foreground">
                {schoolName}
              </h1>

              {school.university && (
                <p className="text-base font-semibold text-muted-foreground">
                  تنسيق: {school.university}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
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
          {school.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <h2 className="text-sm font-bold text-foreground mb-2">عن الكلية:</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {school.description}
              </p>
            </div>
          )}
        </div>

        {/* Programs / Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {school.address && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">العنوان الكامل:</span>
                  <p className="font-medium text-foreground">{school.address}</p>
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
            </div>
          </section>
        </div>
      </main>
    </>
  )
}