export type ArticleStatus = "draft" | "under_review" | "published" | "archived"

export interface Category {
  id: string
  name: string
  name_ar?: string
  name_fr?: string | null
  slug: string
  description?: string | null
  icon?: string | null
  count?: number | null
}

export interface Faculty {
  id: string
  name: string
  name_ar?: string
  name_fr?: string | null
  city: string
  slug: string
  founded_year?: number | null
  logo_url?: string | null
  description?: string | null
  created_at?: string | null
}

/** Canonical school record matching the public schools.json shape while remaining compatible with Supabase CMS records. */
export interface School {
  id: string
  slug: string
  name: string
  university: string
  city: string
  officialUrl?: string | null
  mapLocation?: { address?: string | null; googleMapsUrl?: string | null } | null
  synopsis?: string | null
  studyAreas?: string[]
  verifiedAt?: string | null
  registrationInfo?: Record<string, unknown> | null
  usefulLinks?: Array<{ title: string; url: string }>
  body?: string[]
  logoUrl?: string | null
  foundedYear?: string | number | null
  socialMedia?: { facebook?: string | null; linkedin?: string | null } | null
}

export interface NewsItem {
  id: string
  title: string
  summary?: string | null
  content?: string | null
  source?: string | null
  source_url?: string | null
  image_url?: string | null
  image_alt?: string | null
  slug: string
  category_id?: string | null
  category?: Category | null
  is_published: boolean
  published_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  views_count?: number | null
  target_keyword?: string | null
  meta_title?: string | null
  meta_description?: string | null
  focus_keyword?: string | null
}

export interface PdfSummary {
  id: string
  title: string
  slug: string
  description?: string | null
  semester: string
  professor?: string | null
  faculty_id?: string | null
  file_url: string
  file_size_bytes?: number | null
  download_count?: number | null
  status?: ArticleStatus
  uploaded_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface Article {
  id: string
  title: string
  title_fr?: string | null
  slug: string
  content: string
  excerpt?: string | null
  cover_image?: string | null
  cover_image_alt?: string | null
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
  number: string
  phrase: string
}

export interface LegalSource {
  code_ar: string
  code_short?: string
  code_fr?: string
  articles: LegalArticleRef[]
}

export interface LexiconTerm {
  id: string
  term_ar: string
  term_fr: string
  definition: string
  category: string
  legal_sources?: LegalSource[]
  created_at?: string | null
  updated_at?: string | null
}