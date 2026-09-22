import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  BriefcaseBusiness,
  FileText,
  Globe,
  GraduationCap,
  Languages,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react"
import { AEOHead } from "../../components/seo/AEOHead"
import { canonicalFor } from "@/lib/canonical"
import { supabase } from "@/lib/supabase/client"
import { fetchPublicResume } from "@/lib/resumes/service"
import { SITE_CONFIG } from "../../lib/seo/schema"
import type { ResumeEducation, ResumeExperience } from "@/types/resume"

interface PublicResumeData {
  profile: {
    username: string
    display_name: string
    headline?: string | null
    occupation?: string | null
    bio?: string | null
    faculty_id?: string | null
  }
  resume: {
    headline?: string | null
    summary?: string | null
    skills: string[]
    languages: string[]
    education: ResumeEducation[]
    experience: ResumeExperience[]
    cv_file_path?: string | null
  }
}

/**
 * السيرة الذاتية العامة — /resume/<username>.
 * تُعرض فقط إذا كان البروفايل محملاً وسيرته is_public=true (RLS يفرض ذلك).
 */
export function ResumePage() {
  const params = useParams<{ username: string }>()
  const username = params.username ? decodeURIComponent(params.username) : ""

  const [data, setData] = useState<PublicResumeData | null>(null)
  const [facultyName, setFacultyName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    void (async () => {
      const result = await fetchPublicResume(username)
      if (!mounted) return
      setData((result as PublicResumeData | null) ?? null)
      if (result && result.profile.faculty_id) {
        const { data: faculty } = await supabase
          .from("faculties")
          .select("name")
          .eq("id", result.profile.faculty_id)
          .maybeSingle()
        if (mounted) setFacultyName((faculty as { name: string } | null)?.name ?? null)
      }
      if (mounted) setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [username])

  const canonical = useMemo(() => canonicalFor(`/resume/${username}`), [username])

  const schema = useMemo(() => {
    if (!data) return null
    const p = data.profile
    const r = data.resume
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      name: p.display_name,
      url: canonical,
      jobTitle: r.headline ?? p.headline ?? p.occupation ?? undefined,
      description: r.summary ?? p.bio ?? undefined,
      alumniOf: facultyName ?? undefined,
      knowsAbout: r.skills ?? [],
      sameAs: [canonical],
    }
  }, [data, canonical, facultyName])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <AEOHead
          title="سيرة ذاتية غير متوفرة"
          description="هذه السيرة الذاتية غير منشورة أو لا يوجد بروفايل بهذا الاسم."
          canonicalUrl={canonical}
        />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-xl font-black text-foreground">السيرة غير متوفرة</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            ربما لم يفعّل صاحب البروفايل نشر سيرته، أو أن اسم المستخدم غير صحيح.
          </p>
          <Link
            to="/profile"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <Sparkles className="size-4" />
            أنشئ سيرتك الذاتية
          </Link>
        </div>
      </>
    )
  }

  const { profile: p, resume: r } = data
  const cvUrl = r.cv_file_path
    ? `${(import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? ""}/storage/v1/object/public/cv-files/${r.cv_file_path}`
    : null

  return (
    <>
      <AEOHead
        title={`السيرة الذاتية — ${p.display_name} | ${SITE_CONFIG.name}`}
        description={`${r.headline ?? p.headline ?? p.display_name}${facultyName ? ` — ${facultyName}` : ""}. سيرة ذاتية قانونية على ميزان الرقمية.`}
        canonicalUrl={canonical}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: `بروفايل ${p.username}`, url: `/u/${p.username}` },
          { name: "السيرة الذاتية", url: `/resume/${p.username}` },
        ]}
        schema={schema ?? undefined}
      />

      <div className="mx-auto max-w-3xl px-4 py-10" dir="rtl">
        {/* الترويسة */}
        <header className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="size-7" />
              </div>
              <div>
                <h1 className="text-lg font-black text-foreground">{p.display_name}</h1>
                <p className="text-[13px] font-bold text-primary">{r.headline ?? p.headline ?? p.occupation ?? "سيرة ذاتية"}</p>
                {facultyName && (
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
                    <GraduationCap className="size-3.5" />
                    {facultyName}
                  </p>
                )}
              </div>
            </div>
            <Link
              to={`/u/${p.username}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[11.5px] font-bold text-muted-foreground transition hover:text-foreground"
            >
              <Globe className="size-3.5" />
              البروفايل الكامل
            </Link>
          </div>

          {r.summary && <p className="mt-4 text-[13.5px] leading-7 text-muted-foreground">{r.summary}</p>}

          {cvUrl && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-[13px] font-bold text-primary transition hover:bg-primary/10"
            >
              <FileText className="size-4" />
              تحميل ملف السيرة (CV)
            </a>
          )}
        </header>

        {/* المهارات واللغات */}
        {(r.skills.length > 0 || r.languages.length > 0) && (
          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            {r.skills.length > 0 && (
              <div className="mb-4">
                <h2 className="mb-2 text-[14px] font-extrabold text-foreground">المهارات</h2>
                <div className="flex flex-wrap gap-2">
                  {r.skills.map((skill) => (
                    <span key={skill} className="rounded-xl border border-border bg-background px-3 py-1.5 text-[12px] font-bold text-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {r.languages.length > 0 && (
              <div>
                <h2 className="mb-2 flex items-center gap-1.5 text-[14px] font-extrabold text-foreground">
                  <Languages className="size-4" />
                  اللغات
                </h2>
                <div className="flex flex-wrap gap-2">
                  {r.languages.map((lang) => (
                    <span key={lang} className="rounded-xl border border-border bg-background px-3 py-1.5 text-[12px] font-bold text-foreground">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* التعليم */}
        {r.education.length > 0 && (
          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-[14px] font-extrabold text-foreground">
              <GraduationCap className="size-4" />
              المسار التعليمي
            </h2>
            <ul className="space-y-3">
              {r.education.map((item, idx) => (
                <li key={idx} className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-[13.5px] font-extrabold text-foreground">{item.degree}</p>
                  <p className="mt-0.5 text-[12.5px] font-bold text-muted-foreground">
                    {item.school}
                    {item.year ? ` — ${item.year}` : ""}
                  </p>
                  {item.details && <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{item.details}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* الخبرة */}
        {r.experience.length > 0 && (
          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-[14px] font-extrabold text-foreground">
              <BriefcaseBusiness className="size-4" />
              الخبرة والممارسة
            </h2>
            <ul className="space-y-3">
              {r.experience.map((item, idx) => (
                <li key={idx} className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-[13.5px] font-extrabold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] font-bold text-muted-foreground">
                    {item.company}
                    {item.period ? ` — ${item.period}` : ""}
                  </p>
                  {item.details && <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{item.details}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 text-center text-[11.5px] text-muted-foreground">
          سيرة منشورة على {SITE_CONFIG.name} —{" "}
          <Link to="/profile" className="font-bold text-primary hover:underline">
            أنشئ سيرتك الذاتية
          </Link>
        </p>
      </div>
    </>
  )
}
