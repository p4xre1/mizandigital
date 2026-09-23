/**
 * نماذج بيانات دليل المسارات والمهن القانونية في المغرب.
 *
 * المصدر الوحيد للبيانات: src/data/careers.json (+ career-categories.json،
 * morocco-cities.json، career-competitions.json). هذه الأنواع تعكس مخطط
 * البيانات حرفياً حتى يظهر أي انحراف بين الملف والواجهة في مرحلة الـ typecheck
 * بدل أن يسقط في الإنتاج.
 *
 * قاعدة محرّرية مثبتة هنا: لا يوجد أي حقل يحمل «أهلية» أو «احتمال قبول» أو
 * حكماً على صلاحية الطالب القانونية. كل شرط يحمل `status` للتعبير عن حالة
 * التحقق، وسلوك الواجهة يتبع هذا الحقل لا النص.
 */

/** طبيعة المسار المهني — القيم المسموح بها في التصميم نفسه. */
export type WorkModel =
  | "public_sector"
  | "liberal_regulated"
  | "private_sector"
  | "academic"
  | "mixed";

/** هل يحتاج المسار إلى تكوين قانوني؟ */
export type LegalEducationNeed = "required" | "recommended" | "depends" | "not_required";

/** حالة التحقق من شرط أو مصدر. */
export type VerificationStatus = "verified" | "verify_official_source" | "needs_official_verification";

/** نوع الشرط: قانون ثابت، إعلان سنوي، تسجيل مهني، مسطرة مؤسسية، شرط مشغل خاص. */
export type RequirementType =
  | "legal_text"
  | "legal_or_annual_notice"
  | "annual_notice"
  | "professional_registration"
  | "institution_practice"
  | "private_employer"
  | "needs_verification";

/** مسار الولوج: مباراة عمومية، مهنة منظمة، توظيف خاص، مسطرة أكاديمية. */
export type CompetitionPath =
  | "annual_public_competition"
  | "regulated_profession"
  | "private_recruitment"
  | "academic_competition"
  | "not_applicable";

/** نوع الاختبار المرتبط بالمسار. */
export type CareerQuizType = "career_discovery" | "career_knowledge" | "competition_practice";

export interface CareerDegree {
  level: string;
  label_ar: string;
  status: VerificationStatus;
  note_ar: string;
}

export interface CareerAgeRequirement {
  has_requirement: boolean;
  /** لا تُملأ من هذه الصفحة أبداً: القيم الرقمية تبقى null حتى التحقق الرسمي. */
  minimum: number | null;
  maximum: number | null;
  basis: string;
  status: VerificationStatus;
  note_ar: string;
}

export interface CareerEntryStep {
  step: number;
  title_ar: string;
  description_ar: string;
}

/** نوع العلاقة بين المسار والنص القانوني — نفس قيد جدول career_laws. */
export type CareerLawRelationship =
  | "governing_framework"
  | "access_conditions"
  | "training"
  | "professional_ethics"
  | "public_employment"
  | "annual_notice_reference";

/** حالة إسناد المرجع القانوني: منشور في أرشيف ميزان أم بانتظار الإضافة. */
export type CareerLawVerification = "verified" | "needs_archive_entry" | "needs_official_verification";

/**
 * مرجع قانوني بشري لمسار واحد.
 *
 * `law_slug` هو معرّف النص في أرشيف ميزان — نصّي دائماً، وقيمته null عندما لا
 * يوجد النص في الأرشيف بعد (فتُعرض التسمية بلا رابط). لا يُكتب هنا UUID قاعدة
 * البيانات: الملف التحريري لا يعرف معرّفات الصفوف، وأي إعادة بناء للأرشيف
 * تُبطلها.
 */
export interface CareerLegalFrameworkEntry {
  law_slug: string | null;
  label_ar: string;
  relationship_type: CareerLawRelationship;
  relationship_ar: string;
  verification_status: CareerLawVerification;
  last_verified: string | null;
}

export interface CareerRequirement {
  id: string;
  label_ar: string;
  value_ar: string;
  requirement_type: RequirementType;
  status: VerificationStatus;
  source_url: string | null;
  last_verified: string | null;
  /** يُملأ فقط عند شرط مرتبط بإعلان سنوي متحقق منه. */
  notice_year?: number | null;
  /**
   * نطاق الإعلان السنوي: `check_current_notice` يعني «الشروط في الإعلان
   * الجاري به العمل، وليست قاعدة دائمة». كل شرط غير مرتبط بإعلان = not_applicable.
   */
  notice_status?: "check_current_notice" | "not_applicable" | "verified_notice";
}

export interface CareerSource {
  title_ar: string;
  source_type: string;
  url: string;
  last_verified: string | null;
  status: VerificationStatus | "needs_official_verification";
}

export interface CareerQuizConfig {
  career_quiz_slug: string;
  has_knowledge_quiz: boolean;
  has_discovery_quiz: boolean;
  competition_path: CompetitionPath;
  competition_note_ar: string;
  related_quiz_topics: string[];
}

export interface CareerRecord {
  id: string;
  slug: string;
  title_ar: string;
  title_fr: string;
  category_id: string;
  category_ar: string;
  short_description: string;
  work_model: WorkModel;
  work_model_ar: string;
  employment_modes: string[];
  can_freelance: boolean;
  can_work_government: boolean;
  can_work_private_sector: boolean;
  requires_legal_education: LegalEducationNeed;
  school_recommendation_message: string;
  main_areas: string[];
  typical_degree: CareerDegree;
  age_requirement: CareerAgeRequirement;
  entry_path: CareerEntryStep[];
  training_after_admission: { label_ar: string; status: VerificationStatus };
  skills: string[];
  best_for: string[];
  lexicon_term_ids: string[];
  related_career_ids: string[];
  requirements: CareerRequirement[];
  sources: CareerSource[];
  /** معرّفات النصوص القانونية في أرشيف ميزان (نصّية، وقد تكون فارغة). */
  law_slugs: string[];
  /** الإطار القانوني المعروض: تسميات بشرية + ربط اختياري بالأرشيف. */
  legal_framework: CareerLegalFrameworkEntry[];
  quiz_config: CareerQuizConfig;
  last_reviewed: string;
  review_status: string;
  canonical_url: string;
}

export interface CareerCategory {
  id: string;
  slug: string;
  title_ar: string;
  title_fr: string;
  description_ar: string;
  order: number;
}

export interface MoroccoCity {
  id: string;
  name_ar: string;
  /** نسخة لاتينية مطابقة للاسم العربي (تُستعمل في البحث والتحقق الآلي). */
  name: string;
  aliases: string[];
  region_ar: string;
  latitude: number;
  longitude: number;
  source_note_ar?: string;
}

/** حالة سجل المباراة — `open`/`upcoming` ممنوعتان بلا مصدر رسمي. */
export type CompetitionStatus = "upcoming" | "open" | "closed" | "historical" | "unverified";

export interface CareerCompetition {
  id: string;
  career_id: string;
  title_ar: string;
  status: CompetitionStatus;
  official_notice_url: string;
  official_notice_date: string | null;
  source_verified_at: string | null;
  last_reviewed: string;
  note_ar?: string;
  disclaimer_ar: string;
}

/** إحداثيات موقع — كما هي في src/data/schools.json وmorocco-cities.json. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** سجل كلية كما يظهر في دليل schools.json (الجزء الذي يستهلكه هذا المسار). */
export interface CareerSchoolRecord {
  id: string;
  slug: string;
  name: string;
  short_name?: string;
  university?: string;
  city?: string;
  officialUrl?: string | null;
  location?: {
    city_ar?: string;
    region_ar?: string;
    latitude?: number;
    longitude?: number;
  } | null;
}

export interface RankedSchool {
  school: CareerSchoolRecord;
  /** المسافة بخط مستقيم بالكيلومترات (مقرّبة عند العرض لا في الحساب). */
  distanceKm: number;
}

/** مصطلح معجم مقلَّص مخصص لصفحات المسارات (يولّده generate-career-lexicon.mjs). */
export interface CareerLexiconTerm {
  id: string;
  slug: string;
  term_ar: string;
  term_fr: string | null;
  definition?: string;
  category?: string | null;
  last_reviewed?: string | null;
}
