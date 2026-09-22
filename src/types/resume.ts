/**
 * نماذج السيرة الذاتية وطلبات التقديم (جدولا resumes وapplications في Supabase).
 * الهجرة: supabase/migrations/20260929000000_school_annonce_resume_links.sql
 */

export interface ResumeEducation {
  /** الشهادة أو المستوى: «ليسانس قانون», «ماستر قانون خاص»... */
  degree: string
  /** المؤسسة: اسم الكلية/الجامعة. */
  school: string
  /** السنة أو السنة الجامعية: «2024», «2024-2025». */
  year?: string | null
  /** تفاصيل اختيارية. */
  details?: string | null
}

export interface ResumeExperience {
  /** المنصب: «متربص بالمحكمة», «عون إدارة»... */
  title: string
  /** المؤسسة/الشركة. */
  company: string
  /** الفترة: «2025-07 → 2025-09». */
  period?: string | null
  /** تفاصيل اختيارية. */
  details?: string | null
}

export interface Resume {
  id: string
  /** mizan_profiles.id — سيرة واحدة لكل بروفايل. */
  profile_id: string
  headline?: string | null
  summary?: string | null
  skills: string[]
  languages: string[]
  education: ResumeEducation[]
  experience: ResumeExperience[]
  /** مسار الملف داخل وعاء cv-files: <uid>/<uuid>.pdf|docx */
  cv_file_path?: string | null
  is_public: boolean
  created_at?: string | null
  updated_at?: string | null
}

/** مصدر الإعلان المرتبط بطلب التقديم. */
export type AnnonceType = "event" | "seminar" | "news"

export type ApplicationStatus = "pending" | "viewed" | "shortlisted" | "rejected"

export interface Application {
  id: string
  profile_id: string
  resume_id: string
  annonce_type: AnnonceType
  /** uuid لـ seminars/news، أو المعرف النصي للفعاليات المحلية. */
  annonce_id: string
  annonce_title?: string | null
  status: ApplicationStatus
  note?: string | null
  applied_at?: string | null
}

/** إعلان موحّد (فعالية محلية أو ندوة أو خبر) لاستعماله في /annonces وصفحة الكلية. */
export interface AnnonceItem {
  /** مفتاح فريد داخل الصفحة: <type>:<id> */
  key: string
  type: AnnonceType
  title: string
  date?: string | null
  city?: string | null
  excerpt?: string | null
  /** faculties.id (CMS) إن وُجد. */
  facultyId?: string | null
  /** slug الكلية المحلية (events.json) إن وُجد — للربط بين المحلي وCMS. */
  facultySlug?: string | null
  /** رابط الصفحة التفصيلية. */
  url: string
  source?: string | null
}
