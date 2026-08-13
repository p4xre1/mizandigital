export type ArticleStatus = "draft" | "published" | "archived" | "under_review"

export type UserRole = "super_admin" | "editor" | "author" | "viewer"

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  permissions: string[]
  created_at: string
}

export interface Category {
  id: string
  name_ar: string
  name_fr: string
  slug: string
  description?: string
  created_at?: string
}

export interface Faculty {
  id: string
  name_ar: string
  name_fr: string
  city: string
  slug: string
  created_at?: string
}

export interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  cover_image?: string
  category_id?: string
  faculty_id?: string
  author_id?: string
  status: ArticleStatus
  published_at?: string
  views_count?: number
  seo_title?: string
  seo_description?: string
  focus_keyword?: string
  created_at: string
  updated_at: string
  // العلاقات المرتبطة
  category?: Category
  faculty?: Faculty
  author?: UserProfile
}

export interface DictionaryTerm {
  id: string
  term_ar: string
  term_fr: string
  definition_ar: string
  definition_fr?: string
  slug: string
  category_id?: string
  created_at: string
  category?: Category
}

export interface Seminar {
  id: string
  title: string
  slug: string
  description?: string
  speaker_name: string
  video_url?: string
  event_date: string
  location?: string
  faculty_id?: string
  created_at: string
  faculty?: Faculty
}

export interface SeoMetadata {
  title: string
  description: string
  focusKeyword?: string
  ogImage?: string
  canonicalUrl?: string
}