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

export interface LexiconTerm {
  id: string
  term_ar: string
  term_fr: string
  definition: string
  category: string
  created_at?: string | null
  updated_at?: string | null
}