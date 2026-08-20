export type ArticleStatus = "draft" | "under_review" | "published" | "archived"

export interface Category {
  id: string
  name: string
  name_ar?: string // Optional alias for backward compatibility
  name_fr?: string | null
  slug: string
  description?: string | null
  icon?: string | null
  count?: number | null
}

export interface Faculty {
  id: string
  name: string
  name_ar?: string // Optional alias for backward compatibility
  name_fr?: string | null
  city: string
  slug: string
  founded_year?: number | null
  logo_url?: string | null
  description?: string | null
  created_at?: string | null
}

export interface Article {
  id: string
  title: string
  title_fr?: string | null
  slug: string
  content: string
  excerpt?: string | null
  cover_image?: string | null
  category_id?: string | null
  faculty_id?: string | null
  semester?: string | null
  status: ArticleStatus
  target_keyword?: string | null
  meta_title?: string | null
  meta_description?: string | null
  canonical_url?: string | null
  is_featured?: boolean | null
  author_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  published_at?: string | null
}

export interface LegalArticleRef {
  // رقم الفصل/المادة كما يرد في النص الرسمي (مثال: "230" أو "4")
  number: string
  // النص الحرفي أو الموجز للمقتضى القانوني المرتبط بالمصطلح
  phrase: string
}

export interface LegalSource {
  // الاسم الكامل للقانون/المدونة بالعربية (مثال: "قانون الالتزامات والعقود")
  code_ar: string
  // الاختصار الشائع إن وجد (مثال: "ق.ل.ع")
  code_short?: string
  // الاسم بالفرنسية إن وجد (مثال: "Code des obligations et des contrats")
  code_fr?: string
  // لائحة الفصول/المواد التي يرد فيها المصطلح ضمن هذا القانون
  articles: LegalArticleRef[]
}

export interface LexiconTerm {
  id: string
  term_ar: string
  term_fr: string
  definition: string
  category: string
  // "الشجرة القانونية": كل القوانين/المدونات التي يرد فيها المصطلح، مع أرقام
  // الفصول/المواد والمقتضى القانوني لكل واحدة منها. اختياري وغير متوفر بعد
  // لكل المصطلحات — يُستكمل تدريجياً بعد بحث قانوني موثّق لكل مصطلح.
  legal_sources?: LegalSource[]
  created_at?: string | null
  updated_at?: string | null
}