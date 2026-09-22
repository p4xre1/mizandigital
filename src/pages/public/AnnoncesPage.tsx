import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MapPin,
  Megaphone,
  Search,
  Send,
} from "lucide-react"
import eventsData from "../../data/events.json"
import schoolsData from "../../data/schools.json"
import { AEOHead } from "../../components/seo/AEOHead"
import { canonicalFor } from "@/lib/canonical"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/AuthProvider"
import { applyToAnnonce, fetchMyApplications, fetchMyResume } from "@/lib/resumes/service"
import { SITE_CONFIG } from "../../lib/seo/schema"
import type { AnnonceItem, AnnonceType } from "@/types/resume"

interface FacultyRef {
  id: string
  name: string
  slug: string
}

const TYPE_LABELS: Record<AnnonceType, string> = {
  event: "فعالية",
  seminar: "ندوة",
  news: "مستجد",
}

/**
 * صفحة الإعلانات — /annonces.
 * تدمج ثلاث مصادر إعلانية وتربطها بالكليات:
 *   1. الفعاليات المحلية (events.json) — عبر facultySlug
 *   2. الندوات (seminars CMS) — عبر faculty_id
 *   3. الأخبار (news CMS) — عبر faculty_id
 * وتتيح للمستخدم تقديم سيرته الذاتية (applications) على أي إعلان.
 */
export function AnnoncesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile: cloudProfile } = useAuth()

  const [seminars, setSeminars] = useState<any[]>([])
  const [news, setNews] = useState<any[]>([])
  const [faculties, setFaculties] = useState<FacultyRef[]>([])
  const [loading, setLoading] = useState(true)

  // فلاتر
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<AnnonceType | "all">("all")
  const initialSchool = searchParams.get("school") ?? ""
  const [schoolFilter, setSchoolFilter] = useState(initialSchool)
  const [cityFilter, setCityFilter] = useState("all")

  // وضع التقديم
  const [myResume, setMyResume] = useState<{ id: string } | null>(null)
  const [myApplications, setMyApplications] = useState<Set<string>>(new Set())
  const [applyingKey, setApplyingKey] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const [facsRes, semsRes, newsRes] = await Promise.all([
          supabase.from("faculties").select("id, name, slug"),
          (supabase.from("seminars") as any)
            .select("id, title, speaker, event_date, faculty_id, status")
            .eq("status", "published")
            .order("event_date", { ascending: false }),
          (supabase.from("news") as any)
            .select("id, slug, title, summary, faculty_id, is_published, published_at")
            .eq("is_published", true)
            .order("published_at", { ascending: false }),
        ])
        if (!mounted) return
        setFaculties((facsRes.data ?? []) as FacultyRef[])
        setSeminars((semsRes.data ?? []) as any[])
        setNews((newsRes.data ?? []) as any[])
      } catch (err) {
        console.error("خطأ في جلب الإعلانات:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // سيرة المستخدم + طلباته (لعرض «قدّمت ✓» على كل إعلان)
  useEffect(() => {
    if (!user || !cloudProfile?.profileId) return
    let mounted = true
    void (async () => {
      const resume = await fetchMyResume(cloudProfile.profileId)
      if (!mounted) return
      setMyResume(resume ? { id: resume.id } : null)
      const apps = await fetchMyApplications(cloudProfile.profileId)
      if (!mounted) return
      setMyApplications(new Set(apps.map((a) => `${a.annonce_type}:${a.annonce_id}`)))
    })()
    return () => {
      mounted = false
    }
  }, [user, cloudProfile?.profileId])

  // خريطة faculty_id (uuid) → slug عبر جدول faculties
  const facultySlugById = useMemo(() => {
    const map = new Map<string, string>()
    faculties.forEach((f) => f.slug && map.set(f.id, f.slug))
    return map
  }, [faculties])

  // أسماء الكليات (slug → name) من المحلي + CMS
  const schoolNames = useMemo(() => {
    const map = new Map<string, string>()
    ;(schoolsData as any[]).forEach((s) => {
      if (s.slug) map.set(s.slug, s.name)
    })
    faculties.forEach((f) => {
      if (f.slug && !map.has(f.slug)) map.set(f.slug, f.name)
    })
    return map
  }, [faculties])

  const annonces = useMemo<AnnonceItem[]>(() => {
    const items: AnnonceItem[] = []

    // 1) الفعاليات المحلية
    ;(eventsData as any[]).forEach((ev) => {
      if (ev.status && ev.status !== "نشطة" && ev.status !== "قادمة" && ev.status !== "أرشيف") return
      items.push({
        key: `event:${ev.id}`,
        type: "event",
        title: ev.title,
        date: ev.eventDate ?? null,
        city: ev.city ?? null,
        excerpt: ev.excerpt ?? null,
        facultySlug: ev.facultySlug ?? null,
        facultyId: null,
        url: `/events/${ev.slug || ev.id}`,
        source: ev.organizer ?? null,
      })
    })

    // 2) الندوات (CMS)
    seminars.forEach((s) => {
      items.push({
        key: `seminar:${s.id}`,
        type: "seminar",
        title: s.title,
        date: s.event_date ?? null,
        city: null,
        excerpt: s.speaker ? `المحاضر: ${s.speaker}` : null,
        facultyId: s.faculty_id ?? null,
        facultySlug: s.faculty_id ? (facultySlugById.get(s.faculty_id) ?? null) : null,
        url: `/events/${s.id}`,
        source: null,
      })
    })

    // 3) الأخبار/المباريات (CMS)
    news.forEach((n) => {
      items.push({
        key: `news:${n.id}`,
        type: "news",
        title: n.title,
        date: n.published_at ?? null,
        city: null,
        excerpt: n.summary ?? null,
        facultyId: n.faculty_id ?? null,
        facultySlug: n.faculty_id ? (facultySlugById.get(n.faculty_id) ?? null) : null,
        url: `/news/${n.slug}`,
        source: null,
      })
    })

    return items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  }, [seminars, news, facultySlugById])

  const cities = useMemo(
    () => [...new Set(annonces.map((a) => a.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "ar")),
    [annonces]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return annonces.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false
      if (schoolFilter) {
        const match = a.facultySlug === schoolFilter || (a.facultyId && facultySlugById.get(a.facultyId) === schoolFilter)
        if (!match) return false
      }
      if (cityFilter !== "all" && a.city !== cityFilter) return false
      if (q && !`${a.title} ${a.excerpt ?? ""} ${a.city ?? ""}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [annonces, typeFilter, schoolFilter, cityFilter, query, facultySlugById])

  const schoolOptions = useMemo(() => {
    const map = new Map<string, string>()
    ;(schoolsData as any[]).forEach((s) => s.slug && map.set(s.slug, s.name))
    faculties.forEach((f) => f.slug && !map.has(f.slug) && map.set(f.slug, f.name))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "ar"))
  }, [faculties])

  const setSchool = (slug: string) => {
    setSchoolFilter(slug)
    const next = new URLSearchParams(searchParams)
    if (slug) next.set("school", slug)
    else next.delete("school")
    setSearchParams(next, { replace: true })
  }

  const handleApply = async (item: AnnonceItem) => {
    if (!cloudProfile?.profileId) return
    let resumeId = myResume?.id ?? null
    if (!resumeId) {
      // إعادة قراءة السيرة لحظة التقديم (قد أُنشيت في نفس الجلسة بصفحة أخرى)
      const fresh = await fetchMyResume(cloudProfile.profileId)
      if (!fresh) return
      resumeId = fresh.id
      setMyResume({ id: fresh.id })
    }
    setApplyingKey(item.key)
    setApplyError((prev) => ({ ...prev, [item.key]: "" }))
    const result = await applyToAnnonce(cloudProfile.profileId, resumeId, {
      type: item.type,
      id: item.key.split(":")[1],
      title: item.title,
    })
    setApplyingKey(null)
    if (!result.ok) {
      setApplyError((prev) => ({ ...prev, [item.key]: result.error ?? "تعذر التقديم." }))
      return
    }
    setMyApplications((prev) => new Set(prev).add(item.key))
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "إعلانات الكليات القانونية بالمغرب",
    url: canonicalFor("/annonces"),
    numberOfItems: annonces.length,
    itemListElement: annonces.slice(0, 20).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.title,
      url: `${SITE_CONFIG.url}${item.url}`,
    })),
  }

  const appliedSet = myApplications

  return (
    <>
      <AEOHead
        title="إعلانات الكليات القانونية — مباريات، ندوات، توظيف | ميزان الرقمية"
        description="كل إعلانات كليات الحقوق المغربية في مكان واحد: مباريات التوظيف، الندوات العلمية، مستجدات التسجيل والتربصات — مع ربط كل إعلان بكلية ويمكن تقديم السيرة الذاتية مباشرة."
        directAnswer="صفحة تجمع إعلانات الكليات القانونية المغربية (فعاليات، ندوات، أخبار ومباريات) مفلترة حسب الكلية والمدينة، مع زر تقديم السيرة الذاتية."
        canonicalUrl={canonicalFor("/annonces")}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "إعلانات الكليات", url: "/annonces" },
        ]}
        keywords={[
          "إعلانات الكليات",
          "مباريات التوظيف المغرب",
          "إعلانات مباريات المحاماة",
          "ندوات كليات الحقوق",
          "تربص قانوني",
          "إعلانات التسجيل الكليات",
        ]}
        schema={schema}
      />

      <div className="mx-auto max-w-5xl px-4 py-10" dir="rtl">
        <header className="mb-8">
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-foreground">
            <Megaphone className="size-6 text-primary" />
            إعلانات الكليات القانونية
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-7 text-muted-foreground">
            مباريات، ندوات، ومستجدات مرتبطة بكليات الحقوق — اختر كليتك لتصلك إعلاناتها، وقدّم سيرتك
            الذاتية في نقرة واحدة.
          </p>
        </header>

        {/* الفلاتر */}
        <div className="mb-6 space-y-3 rounded-3xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "الكل"],
              ["event", "فعاليات"],
              ["seminar", "ندوات"],
              ["news", "مستجدات"],
            ] as Array<[AnnonceType | "all", string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`rounded-xl border px-3.5 py-1.5 text-[12px] font-extrabold transition ${
                  typeFilter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث في الإعلانات..."
                className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-3 text-[12.5px] text-foreground outline-none focus:border-primary"
              />
            </div>
            <select
              value={schoolFilter}
              onChange={(e) => setSchool(e.target.value)}
              className="cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-[12.5px] font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="">كل الكليات</option>
              {schoolOptions.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-[12.5px] font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">كل المدن</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* النتائج */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-[14px] font-extrabold text-foreground">لا توجد إعلانات مطابقة</p>
            <p className="mt-2 text-[12.5px] text-muted-foreground">جرّب تغيير الفلاتر أو العودة إلى الكل.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.map((item) => {
              const applied = appliedSet.has(item.key)
              const schoolName = item.facultySlug ? schoolNames.get(item.facultySlug) ?? null : null
              return (
                <li key={item.key} className="rounded-3xl border border-border bg-card p-5 transition hover:border-primary/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10.5px] font-black text-primary">
                          {TYPE_LABELS[item.type]}
                        </span>
                        {item.date && (
                          <span className="flex items-center gap-1 text-[11.5px] font-bold text-muted-foreground">
                            <CalendarDays className="size-3.5" />
                            {new Date(item.date).toLocaleDateString("ar-MA")}
                          </span>
                        )}
                        {item.city && (
                          <span className="flex items-center gap-1 text-[11.5px] font-bold text-muted-foreground">
                            <MapPin className="size-3.5" />
                            {item.city}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 text-[15px] font-extrabold leading-7 text-foreground">
                        <Link to={item.url} className="hover:text-primary hover:underline">
                          {item.title}
                        </Link>
                      </h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        {schoolName && (
                          <Link
                            to={`/schools/${item.facultySlug}`}
                            className="flex items-center gap-1 text-[11.5px] font-bold text-primary hover:underline"
                          >
                            <GraduationCap className="size-3.5" />
                            {schoolName}
                          </Link>
                        )}
                        {item.source && <span className="text-[11.5px] text-muted-foreground">{item.source}</span>}
                      </div>
                      {item.excerpt && (
                        <p className="mt-2 line-clamp-2 text-[12.5px] leading-6 text-muted-foreground">{item.excerpt}</p>
                      )}
                    </div>

                    {/* زر التقديم */}
                    <div className="shrink-0">
                      {applied ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-4" />
                          قدّمت ✓
                        </span>
                      ) : !user ? (
                        <Link
                          to="/login?next=/annonces"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-[12px] font-bold text-foreground transition hover:border-primary"
                        >
                          <Send className="size-3.5" />
                          قدّم سيرتك
                        </Link>
                      ) : !myResume ? (
                        <Link
                          to="/profile"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-[12px] font-bold text-foreground transition hover:border-primary"
                        >
                          <BriefcaseBusiness className="size-3.5" />
                          أنشئ سيرتك ثم قدّم
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleApply(item)}
                          disabled={applyingKey === item.key}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[12px] font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-60"
                        >
                          {applyingKey === item.key ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                          قدّم سيرتك
                        </button>
                      )}
                      {applyError[item.key] && (
                        <p className="mt-1.5 max-w-[180px] text-[10.5px] font-bold leading-5 text-rose-600 dark:text-rose-400">
                          {applyError[item.key]}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-8 text-center text-[11.5px] leading-6 text-muted-foreground">
          تجد تفاصيل كل إعلان في صفحته — و{" "}
          <Link to="/schools" className="font-bold text-primary hover:underline">
            دليل الكليات
          </Link>{" "}
          يعرض إعلانات كل كلية على صفحتها.
        </p>
      </div>
    </>
  )
}
