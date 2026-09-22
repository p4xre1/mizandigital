import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import { Link } from "react-router-dom"
import {
  BriefcaseBusiness,
  FileText,
  Globe,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react"
import { useAuth } from "@/lib/auth/AuthProvider"
import { supabase } from "@/lib/supabase/client"
import {
  deleteCvFile,
  fetchMyResume,
  saveMyResume,
  uploadCvFile,
} from "@/lib/resumes/service"
import type { ResumeEducation, ResumeExperience } from "@/types/resume"

interface CvFile {
  path: string
  url: string
}

/**
 * محرر السيرة الذاتية — قسم مستقل داخل /profile.
 * يخزن في جدول resumes (سيرة واحدة لكل بروفايل) ويرفع ملف الـCV
 * إلى وعاء cv-files داخل مجلد المالك <uid>/<uuid>.<ext>.
 */
export function ResumeEditor() {
  const { user, profile: cloudProfile } = useAuth()
  const username = cloudProfile?.username ?? ""

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const [headline, setHeadline] = useState("")
  const [summary, setSummary] = useState("")
  const [skillsText, setSkillsText] = useState("")
  const [languagesText, setLanguagesText] = useState("")
  const [education, setEducation] = useState<ResumeEducation[]>([])
  const [experience, setExperience] = useState<ResumeExperience[]>([])
  const [cv, setCv] = useState<CvFile | null>(null)
  const [isPublic, setIsPublic] = useState(false)

  const profileId = cloudProfile?.profileId ?? ""

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }
    const resume = await fetchMyResume(profileId)
    if (resume) {
      setHeadline(resume.headline ?? "")
      setSummary(resume.summary ?? "")
      setSkillsText((resume.skills ?? []).join(", "))
      setLanguagesText((resume.languages ?? []).join(", "))
      setEducation((resume.education ?? []) as ResumeEducation[])
      setExperience((resume.experience ?? []) as ResumeExperience[])
      setIsPublic(resume.is_public ?? false)
      if (resume.cv_file_path) {
        const { data } = supabase.storage.from("cv-files").getPublicUrl(resume.cv_file_path)
        setCv({ path: resume.cv_file_path, url: data.publicUrl })
      }
    }
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  if (!user) {
    return (
      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-[15px] font-extrabold text-foreground">السيرة الذاتية</h2>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
          سجّل دخولك لإنشاء سيرتك الذاتية والقدّم بها على إعلانات الكليات.
        </p>
      </section>
    )
  }

  const splitChips = (value: string) =>
    value
      .split(/[،,]/)
      .map((part) => part.trim())
      .filter(Boolean)

  const handleCvChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !user?.id) return

    setUploading(true)
    setStatusMsg(null)
    const result = await uploadCvFile(user.id, file)
    setUploading(false)

    if (!result.ok || !result.path || !result.url) {
      setStatusMsg({ kind: "error", text: result.error ?? "تعذر رفع الملف." })
      return
    }
    if (cv && cv.path !== result.path) void deleteCvFile(user.id, cv.path)
    setCv({ path: result.path, url: result.url })
    setStatusMsg({ kind: "ok", text: "تم رفع الملف — اضغط «حفظ السيرة» لتثبيته." })
  }

  const handleRemoveCv = () => {
    if (!cv || !user?.id) return
    void deleteCvFile(user.id, cv.path)
    setCv(null)
    setStatusMsg({ kind: "ok", text: "تم حذف ملف السيرة — احفظ التغييرات لتثبيته." })
  }

  const handleSave = async () => {
    setSaving(true)
    setStatusMsg(null)
    const result = await saveMyResume(profileId, {
      headline: headline || null,
      summary: summary || null,
      skills: splitChips(skillsText),
      languages: splitChips(languagesText),
      education,
      experience,
      is_public: isPublic,
      cv_file_path: cv?.path ?? null,
    })
    setSaving(false)
    if (!result.ok) {
      setStatusMsg({ kind: "error", text: result.error ?? "تعذر حفظ السيرة." })
      return
    }
    setStatusMsg({
      kind: "ok",
      text: isPublic
        ? "حُفظت سيرتك ونُشرت — رابطها العام جاهز."
        : "حُفظت سيرتك (خاصة حتى تفعّل النشر).",
    })
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-foreground">السيرة الذاتية</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            استعملها للقدّم على إعلانات المباريات والندوات والتوظيف.
          </p>
        </div>
        {username && (
          <Link
            to={`/resume/${username}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-[11.5px] font-bold text-foreground transition hover:border-primary"
          >
            <Globe className="size-3.5" />
            عرض سيرتك العامة
          </Link>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {statusMsg && (
            <p
              className={`rounded-xl border p-3 text-[12.5px] font-bold leading-6 ${
                statusMsg.kind === "ok"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              }`}
            >
              {statusMsg.text}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="resume-headline">
                اللقب (سطر تحت الاسم)
              </label>
              <input
                id="resume-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={120}
                placeholder="طالب قانون — ماستر قانون الأعمال"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="resume-languages">
                اللغات (افصل بفاصلة)
              </label>
              <input
                id="resume-languages"
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                maxLength={120}
                placeholder="العربية، الفرنسية، الإنجليزية"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="resume-summary">
              نبذة مهنية
            </label>
            <textarea
              id="resume-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="أهدافك المهنية، خبراتك، وما الذي تبحث عنه..."
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] leading-6 text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="resume-skills">
              المهارات (افصل بفاصلة)
            </label>
            <input
              id="resume-skills"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              maxLength={300}
              placeholder="قانون العقود، البحث القانوني، الترافع، Word"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
            />
          </div>

          {/* التعليم */}
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-foreground">
                <GraduationCap className="size-4" />
                المسار التعليمي
              </h3>
              <button
                type="button"
                onClick={() => setEducation((prev) => [...prev, { degree: "", school: "", year: null }])}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-muted-foreground transition hover:text-foreground"
              >
                <Plus className="size-3" />
                إضافة
              </button>
            </div>
            {education.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">أضف مستوياتك (ليسانس، ماستر، دكتوراه...).</p>
            ) : (
              <div className="space-y-3">
                {education.map((item, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_28px]">
                    <input
                      value={item.degree}
                      onChange={(e) => setEducation((prev) => prev.map((it, i) => (i === idx ? { ...it, degree: e.target.value } : it)))}
                      placeholder="الشهادة"
                      className="rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary"
                    />
                    <input
                      value={item.school}
                      onChange={(e) => setEducation((prev) => prev.map((it, i) => (i === idx ? { ...it, school: e.target.value } : it)))}
                      placeholder="المؤسسة / الكلية"
                      className="rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary"
                    />
                    <input
                      value={item.year ?? ""}
                      onChange={(e) => setEducation((prev) => prev.map((it, i) => (i === idx ? { ...it, year: e.target.value || null } : it)))}
                      placeholder="السنة"
                      className="rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setEducation((prev) => prev.filter((_, i) => i !== idx))}
                      className="flex items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-rose-500"
                      aria-label="حذف"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* الخبرة */}
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-foreground">
                <BriefcaseBusiness className="size-4" />
                الخبرة والممارسة
              </h3>
              <button
                type="button"
                onClick={() => setExperience((prev) => [...prev, { title: "", company: "", period: null }])}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-muted-foreground transition hover:text-foreground"
              >
                <Plus className="size-3" />
                إضافة
              </button>
            </div>
            {experience.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">تربصات، محاماة متدربة، عمل حر... (اختياري).</p>
            ) : (
              <div className="space-y-3">
                {experience.map((item, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_28px]">
                    <input
                      value={item.title}
                      onChange={(e) => setExperience((prev) => prev.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)))}
                      placeholder="المنصب"
                      className="rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary"
                    />
                    <input
                      value={item.company}
                      onChange={(e) => setExperience((prev) => prev.map((it, i) => (i === idx ? { ...it, company: e.target.value } : it)))}
                      placeholder="المؤسسة"
                      className="rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary"
                    />
                    <input
                      value={item.period ?? ""}
                      onChange={(e) => setExperience((prev) => prev.map((it, i) => (i === idx ? { ...it, period: e.target.value || null } : it)))}
                      placeholder="الفترة"
                      className="rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setExperience((prev) => prev.filter((_, i) => i !== idx))}
                      className="flex items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-rose-500"
                      aria-label="حذف"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ملف الـ CV */}
          <div className="rounded-2xl border border-border bg-background p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold text-foreground">
              <FileText className="size-4" />
              ملف السيرة (PDF أو Word — حتى 5MB)
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[12px] font-bold text-foreground transition hover:border-primary">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {cv ? "استبدال الملف" : "رفع ملف"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleCvChange}
                  disabled={uploading}
                />
              </label>
              {cv && (
                <>
                  <a
                    href={cv.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[12px] font-bold text-primary hover:underline"
                  >
                    معاينة الملف
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoveCv}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-bold text-muted-foreground transition hover:text-rose-500"
                  >
                    <Trash2 className="size-3.5" />
                    حذف
                  </button>
                </>
              )}
            </div>
          </div>

          {/* النشر */}
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background p-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="size-4 accent-[#2563eb]"
            />
            <span className="text-[12.5px] font-bold text-foreground">
              نشر سيرتي في {username ? `/resume/${username}` : "رابطي العام"} ودليل المطابقة
            </span>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ السيرة
          </button>
        </div>
      )}
    </section>
  )
}
