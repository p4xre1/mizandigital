import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { buildMetaDescription } from "../../lib/seo/description"
import eventsData from "../../data/events.json"
import { supabase } from "../../lib/supabase/client"
import { useTrackView } from "@/hooks/useTrackView"
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
  CheckCircle2,
  Loader2,
} from "lucide-react"

interface EventPageProps {
  slug?: string
}

function normalizeSeminar(raw: any) {
  return {
    id: `seminar-${raw.id}`,
    title: raw.title,
    excerpt: raw.agenda || "",
    description: raw.agenda || "",
    organizer: raw.speaker_title || null,
    speaker: raw.speaker || null,
    city: null,
    eventDate: raw.event_date || null,
    time: raw.event_time || null,
    category: "ندوة قانونية",
    registrationUrl: raw.video_url || null,
    sourceUrl: raw.attachment_url || null,
    image: raw.image_url || null,
    isSeminar: true,
  }
}

export function EventPage({ slug }: EventPageProps) {
  const params = useParams<{ slug?: string }>()
  const eventSlug = slug || params.slug
  const [copied, setCopied] = useState(false)
  const [seminarEvent, setSeminarEvent] = useState<any | null>(null)
  const [loadingSeminar, setLoadingSeminar] = useState<boolean>(false)

  // تتبّع قراءة حقيقية لهذه الفعالية/الندوة (مرة واحدة لكل جلسة متصفح)
  useTrackView("event", eventSlug)

  // Find target event by id or slug within the local static catalog first
  const localEvent = (eventsData as any[]).find(
    (item) => item.id === eventSlug || item.slug === eventSlug
  )

  // إذا لم يوجد ضمن events.json المحلي، ولكن المعرّف يشير إلى ندوة من لوحة
  // التحكم (بصيغة "seminar-<id>")، نجلبها مباشرة من Supabase
  useEffect(() => {
    if (localEvent || !eventSlug?.startsWith("seminar-")) return
    const rawId = eventSlug.replace(/^seminar-/, "")
    setLoadingSeminar(true)
    ;(supabase.from("seminars") as any)
      .select("*")
      .eq("id", rawId)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (!error && data) setSeminarEvent(normalizeSeminar(data))
      })
      .finally(() => setLoadingSeminar(false))
  }, [eventSlug, localEvent])

  const event = localEvent || seminarEvent

  if (loadingSeminar && !event) {
    return (
      <main className="container mx-auto flex h-[50vh] max-w-4xl items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    )
  }

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
          title="الفعالية غير موجودة"
          description="عذراً، لم يتم العثور على هذه الفعالية أو الندوة في الأرشيف الأكاديمي لمنصة الميزان الرقمية. قد تكون غير منشورة بعد أو تم حذفها أو تغيير رابطها."
          noindex
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
              title="العودة لجدول الندوات"
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

  const todayStr = new Date().toISOString().slice(0, 10)
  const eventDate = event.eventDate || event.date
  const location = event.city || event.location
  const description = event.excerpt || event.description || event.summary
  const bodyParagraphs: string[] = Array.isArray(event.body) ? event.body : []
  const topics: string[] = Array.isArray(event.topics) ? event.topics : []
  const registerLink = event.registrationUrl || event.sourceUrl
  const registerLabel = event.registrationUrl ? "رابط التسجيل" : (event.sourceLabel || "المصدر الرسمي")
  const isUpcoming = (eventDate || "") >= todayStr
  const canonicalUrl = `https://www.mizan.page/events/${event.slug || eventSlug}`

  // Schema.org Structured Data for EducationEvent
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    "name": event.title,
    "description": description,
    "image": event.image || undefined,
    "startDate": eventDate ? `${eventDate}T${event.time || "09:00"}:00` : undefined,
    "eventStatus": isUpcoming
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventMovedOnline",
    "eventAttendanceMode": event.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": location || "المغرب",
      "address": location || "المغرب"
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
        description={buildMetaDescription(description, [
          `تفاصيل وبرنامج فعالية "${event.title}"`,
          "ندوات وأيام دراسية قانونية موثّقة ضمن الأرشيف الأكاديمي لمنصة الميزان الرقمية، مع روابط المشاهدة والوثائق المرافقة.",
        ])}
        canonicalUrl={canonicalUrl}
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
          <Link to="/" title="الصفحة الرئيسية لمنصة ميزان الرقمية" className="hover:text-primary transition">
            الرئيسية
          </Link>
          <span>/</span>
          <Link to="/events" title="الندوات واللقاءات القانونية القادمة" className="hover:text-primary transition">
            الندوات والفعاليات
          </Link>
          <span>/</span>
          <span className="truncate max-w-[200px] text-foreground font-semibold">
            {event.title}
          </span>
        </nav>

        {/* Hero Image */}
        {event.image && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-border shadow-sm">
            <img
              src={event.image}
              alt={event.title}
              className="w-full max-h-[420px] object-cover"
            />
          </div>
        )}

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
            {eventDate && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground font-medium">
                    تاريخ الانعقاد
                  </span>
                  <span className="text-xs font-bold text-foreground">{eventDate}</span>
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

            {location && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground font-medium">
                    المكان والمدينة
                  </span>
                  <span className="text-xs font-bold text-foreground">{location}</span>
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
              {bodyParagraphs.length > 0 ? (
                bodyParagraphs.map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
              ) : (
                <p>{description}</p>
              )}
            </div>

            {/* Topics / Tags */}
            {topics.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
                {topics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground border border-border/50"
                  >
                    <Tag size={11} />
                    {topic}
                  </span>
                ))}
              </div>
            )}
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
          {registerLink && (
            <section className="rounded-2xl bg-primary/10 border border-primary/20 p-6 text-center">
              <h3 className="text-base font-bold text-foreground">
                {event.registrationUrl ? "هل ترغب في المشاركة أو الحضور؟" : "لمزيد من التفاصيل والمصدر الرسمي"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {event.registrationUrl
                  ? "يمكنك التسجيل عبر البوابة الرسمية للجهة المنظمة."
                  : "هذه البطاقة أُعدّت استناداً إلى مصدر رسمي؛ للتفاصيل الكاملة يُرجى زيارة الرابط."}
              </p>
              <a
                href={registerLink}
                title={registerLabel}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md transition hover:opacity-90"
              >
                <span>{registerLabel}</span>
                <ExternalLink size={14} />
              </a>
            </section>
          )}

          {/* Back Action */}
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <Link
              to="/events"
              title="العودة لجداول الندوات والفعاليات"
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