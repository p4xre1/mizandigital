/**
 * خدمة السيرة الذاتية وطلبات التقديم (resumes + applications).
 *
 * الهجرة: supabase/migrations/20260929000000_school_annonce_resume_links.sql
 * RLS: المالك (mizan_profiles.owner_id = auth.uid()) يكتب، والجمهور يقرأ
 *      فقط السير المنشورة وطلباته هو.
 * التخزين: وعاء "cv-files" — الملف داخل مجلد المالك <uid>/<uuid>.<ext>
 *      (لا يُكشَف إلا إذا كان is_public=true على صف السيرة).
 */
import { supabase } from "@/lib/supabase/client"
import type {
  AnnonceType,
  Application,
  ApplicationStatus,
  Resume,
  ResumeEducation,
  ResumeExperience,
} from "@/types/resume"

const CV_BUCKET = "cv-files"
const CV_MAX_BYTES = 5 * 1024 * 1024 // 5MB — نفس file_size_limit في الهجرة
const CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

function extensionFor(file: File): string | null {
  const lower = file.name.toLowerCase()
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".doc")) return "doc"
  if (lower.endsWith(".docx")) return "docx"
  return null
}

export interface ResumeInput {
  headline?: string | null
  summary?: string | null
  skills: string[]
  languages: string[]
  education: ResumeEducation[]
  experience: ResumeExperience[]
  is_public: boolean
  /** مسار ملف الـCV (null = حذف الرابط الحالي). */
  cv_file_path?: string | null
}

function describeError(error: { message?: string } | null, what: string): string {
  if (!error) return `تعذّر ${what}.`
  const msg = error.message || ""
  if (msg.includes("23505")) return "تم تقديم هذا الطلب سابقاً."
  if (msg.includes("42501")) return "لا تملك صلاحية لهذا الإجراء."
  if (msg.includes("42703")) return "العمود المطلوب غير موجود — طُبّق آخر هجرة."
  return `تعذّر ${what}: ${msg}`
}

/** جلب سيرة المستخدم (تتطلب profileId من mizan_profiles). */
export async function fetchMyResume(profileId: string): Promise<Resume | null> {
  if (!profileId) return null
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle()
  if (error) {
    console.error("خطأ في جلب السيرة الذاتية:", error)
    return null
  }
  // Json في education/experience لا يتطابق مع الأنواع المحلية → cast واضح
  return (data as unknown as Resume | null) ?? null
}

/** حفظ (إنشاء/تحديث) سيرة المستخدم — سيرة واحدة لكل بروفايل. */
export async function saveMyResume(
  profileId: string,
  input: ResumeInput
): Promise<{ ok: boolean; error?: string; resume?: Resume }> {
  if (!profileId) return { ok: false, error: "لا توجد جلسة مسجلة." }

  const payload = {
    profile_id: profileId,
    headline: input.headline || null,
    summary: input.summary || null,
    skills: input.skills ?? [],
    languages: input.languages ?? [],
    education: input.education ?? [],
    experience: input.experience ?? [],
    is_public: input.is_public ?? false,
    // cv_file_path صراحةً (حتى null) حتى يُمسح الرابط عند حذف الملف
    cv_file_path: input.cv_file_path ?? null,
  }

  const { data, error } = await supabase
    .from("resumes")
    .upsert(payload, { onConflict: "profile_id" })
    .select("*")
    .maybeSingle()

  if (error) return { ok: false, error: describeError(error, "حفظ السيرة الذاتية") }
  return { ok: true, resume: data as unknown as Resume }
}

/** رفع ملف السيرة إلى وعاء cv-files داخل مجلد المالك. */
export async function uploadCvFile(
  uid: string,
  file: File
): Promise<{ ok: boolean; error?: string; path?: string; url?: string }> {
  if (!uid) return { ok: false, error: "يجب تسجيل الدخول لرفع السيرة." }
  if (!CV_TYPES.has(file.type)) {
    return { ok: false, error: "نوع الملف غير مدعوم — المسموح: PDF أو Word." }
  }
  if (file.size > CV_MAX_BYTES) {
    return { ok: false, error: "حجم الملف يتجاوز 5MB." }
  }
  const ext = extensionFor(file)
  if (!ext) return { ok: false, error: "نوع الملف غير مدعوم — المسموح: PDF أو Word." }

  const name = `${crypto.randomUUID()}.${ext}`
  const path = `${uid}/${name}`
  const { error } = await supabase.storage
    .from(CV_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "3600" })

  if (error) return { ok: false, error: describeError(error, "رفع ملف السيرة") }

  const { data } = supabase.storage.from(CV_BUCKET).getPublicUrl(path)
  return { ok: true, path, url: data.publicUrl }
}

/** حذف ملف السيرة القديم. */
export async function deleteCvFile(uid: string, path: string): Promise<void> {
  if (!uid || !path) return
  // الأمان: لا نحذف خارج مجلد المالك أبداً.
  if (!path.startsWith(`${uid}/`)) return
  const { error } = await supabase.storage.from(CV_BUCKET).remove([path])
  if (error) console.error("تعذر حذف ملف السيرة:", error)
}

/** تسجيل تقديم سيرة المستخدم على إعلان. */
export async function applyToAnnonce(
  profileId: string,
  resumeId: string,
  annonce: { type: AnnonceType; id: string; title?: string | null }
): Promise<{ ok: boolean; error?: string; application?: Application }> {
  if (!profileId || !resumeId) return { ok: false, error: "أنشئ سيرتك الذاتية أولاً." }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      profile_id: profileId,
      resume_id: resumeId,
      annonce_type: annonce.type,
      annonce_id: annonce.id,
      annonce_title: annonce.title ?? null,
    })
    .select("*")
    .maybeSingle()

  if (error) {
    const msg = error.message || ""
    if (msg.includes("23505")) return { ok: false, error: "قدّمت على هذا الإعلان سابقاً." }
    return { ok: false, error: describeError(error, "تقديم الطلب") }
  }
  return { ok: true, application: data as Application }
}

/** طلبات المستخدم (تُعرض في /profile). */
export async function fetchMyApplications(profileId: string): Promise<Application[]> {
  if (!profileId) return []
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("profile_id", profileId)
    .order("applied_at", { ascending: false })
  if (error) {
    console.error("خطأ في جلب طلبات التقديم:", error)
    return []
  }
  return (data as Application[]) ?? []
}

export interface PublicResumeProfile {
  username: string
  display_name: string
  headline?: string | null
  occupation?: string | null
  bio?: string | null
  faculty_id?: string | null
}

/**
 * سيرة منشورة عبر اسم المستخدم (للصفحة العامة /resume/<username>).
 * القراءة العامة تمر عبر RLS (is_public فقط على الجدولين).
 * ملاحظة: join "resumes" غير مُعرَّف في Relationships الخاصة بالعميل المصنَّف،
 * فنتعامل مع النتيجة عبر cast واضح بدل اعتماد استنتاج الأنواع.
 */
export async function fetchPublicResume(
  username: string
): Promise<{ profile: PublicResumeProfile; resume: Resume } | null> {
  if (!username) return null
  const { data, error } = await (supabase.from("mizan_profiles") as any)
    .select("username, display_name, headline, occupation, bio, faculty_id, is_public, resumes(is_public, headline, summary, skills, languages, education, experience, cv_file_path)")
    .eq("username", username)
    .maybeSingle()
  if (error || !data) return null

  const row = data as unknown as PublicResumeProfile & { resumes?: Resume[] }
  const resumes = row.resumes ?? []
  const resume = resumes.find((r) => r.is_public) ?? null
  if (!resume) return null
  return { profile: row, resume }
}

/** كل طلبات إعلانات معينة (للوحة الإدارة — يمر عبر سياسة staff_read). */
export async function fetchApplications(
  filter: { status?: ApplicationStatus; annonce_type?: AnnonceType } = {}
): Promise<Application[]> {
  let query = supabase
    .from("applications")
    .select("*, mizan_profiles(username, display_name, role, faculty_id)")
    .order("applied_at", { ascending: false })
    .limit(500)
  if (filter.status) query = query.eq("status", filter.status)
  if (filter.annonce_type) query = query.eq("annonce_type", filter.annonce_type)
  const { data, error } = await query
  if (error) {
    console.error("خطأ في جلب الطلبات:", error)
    return []
  }
  return (data as unknown as Application[]) ?? []
}

/** تغيير حالة الطلب (لوحة الإدارة). */
export async function setApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("applications").update({ status }).eq("id", id)
  if (error) return { ok: false, error: describeError(error, "تحديث حالة الطلب") }
  return { ok: true }
}
