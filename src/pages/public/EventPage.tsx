import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import eventsData from "../../data/events.json"
import {
  Calendar,
  MapPin,
  Building2,
  Clock,
  ArrowRight,
  Share2,
  Check,
  ExternalLink,
  Sparkles,
  User,
  FileText,
  AlertCircle,
  Tag,
  CheckCircle2
} from "lucide-react"

interface EventPageProps {
  slug?: string
}

export function EventPage({ slug }: EventPageProps) {
  const params = useParams<{ slug?: string }>()
  const eventSlug = slug || params.slug
  const [copied, setCopied] = useState(false)

  // Find target event by id or slug
  const event = (eventsData as any[]).find(
    (item) => item.id === eventSlug || item.slug === eventSlug
  )

  // Handle Share / Copy Link
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Not Found State
  if (!event) {
    return (
      <>
        <SEOHead
          title="الفعالية غير موجودة - منصة الميزان"
          description="عذراً، لم يتم العثور على الفعالية المطلوبة في الأرشيف الأكاديمي."
        />
        <main className="container mx-auto max-w-4xl px-4 py-20 text-center" dir="rtl">
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-8">
            <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold text-foreground">الفعالية غير موجودة</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              قد تكون الندوة ملغاة، أو تم تغيير الرابط الخاص بها.
            </p>
            <Link
              to="/events"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
            >
              <ArrowRight size={16} />
              <span>العودة لجدول الندوات</span>
            </Link>
          </div>
        </main>
      </>
    )
  }

  const todayStr = "2026-08-15"
  const isUpcoming = (event.date || "") >= todayStr

  // Schema.org Structured Data for EducationEvent
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    "name": event.title,
    "description": event.summary || event.description,
    "startDate": event.date ? `${event.date}T${event.time || "09:00"}:00` : undefined,
    "eventStatus": isUpcoming
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventMovedOnline",
    "eventAttendanceMode": event.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": event.location || event.city || "المغرب",
      "address": event.location || event.city || "المغرب"
    },
    "organizer": {
      "@type": "Organization",
      "name": event.organizer || event.university || "جامعة مغربية",
      "url": "https://www.mizan.page"
    },
    "url": `https://www.mizan.page/events/${event.id}`
  }

  return (
    <>
      <SEOHead
        title={`${event.title} - الندوات والأيام الدراسية`}
        description={event.summary || `تفاصيل وبرنامج الندوة العلمية: ${event.title}`}
        keywords={[
          event.title,
          event.category || "ندوة قانونية",
          event.organizer || "كليات الحقوق بالمغرب",
          "فعاليات قانونية مغربية"
        ]}
        schema={eventSchema}
      />

      <main className="container mx-auto max-w-4xl px-4 py-10" dir="rtl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition">
            الرئيسية
          </Link>
          <span>/</span>
          <Link to="/events" className="hover:text-primary transition">
            الندوات والفعاليات
          </Link>
          <span>/</span>
          <span className="truncate max-w-[200px] text-foreground font-semibold">
            {event.title}
          </span>
        </nav>

        {/* Top Header & Actions */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              {event.category && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                  <Tag size={12} />
                  {event.category}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-bold ${
                  isUpcoming
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isUpcoming ? (
                  <>
                    <Sparkles size={12} />
                    فعالية قادمة
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} />
                    ندوة منتهية
                  </>
                )}
              </span>
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
              title="مشاركة رابط الفعالية"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-green-600 dark:text-green-400" />
                  <span>تم نسخ الرابط</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span>مشاركة</span>
                </>
              )}
            </button>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
            {event.title}
          </h1>

          {/* Key Quick Specs Bar */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-border">
            {event.date && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground font-medium">
                    تاريخ الانعقاد
                  </span>
                  <span className="text-xs font-bold text-foreground">{event.date}</span>
                </div>
              </div>
            )}

            {event.time && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground font-medium">
                    التوقيت
                  </span>
                  <span className="text-xs font-bold text-foreground">{event.time}</span>
                </div>
              </div>
            )}

            {event.organizer && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground font-medium">
                    الجهة المنظمة
                  </span>
                  <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
                    {event.organizer}
                  </span>
                </div>
              </div>
            )}

            {event.location && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground font-medium">
                    المكان والمدينة
                  </span>
                  <span className="text-xs font-bold text-foreground">{event.location}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content & Details Body */}
        <div className="space-y-8">
          {/* Summary / Description */}
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              <span>تقديم الفعالية والمحاور الأساسية</span>
            </h2>
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground space-y-4">
              <p>{event.description || event.summary}</p>
            </div>
          </section>

          {/* Speakers / Panelists Section */}
          {Array.isArray(event.speakers) && event.speakers.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <User size={20} className="text-primary" />
                <span>المتدخلون والمتأطرون</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.speakers.map((speaker: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs font-semibold text-foreground"
                  >
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <span>{speaker}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Registration CTA / External Link */}
          {event.registrationUrl && isUpcoming && (
            <section className="rounded-2xl bg-primary/10 border border-primary/20 p-6 text-center">
              <h3 className="text-base font-bold text-foreground">
                هل ترغب في المشاركة أو الحضور؟
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                يمكنك التسجيل عبر البوابة الرسمية للجهة المنظمة.
              </p>
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md transition hover:opacity-90"
              >
                <span>رابط التسجيل أو الحضور الافتراضي</span>
                <ExternalLink size={14} />
              </a>
            </section>
          )}

          {/* Back Action */}
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
            >
              <ArrowRight size={16} />
              <span>العودة لجداول الندوات والفعاليات</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}