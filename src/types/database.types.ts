export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: string
          permissions: string[]
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          role?: string
          permissions?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          role?: string
          permissions?: string[]
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name_ar: string
          name_fr: string
          slug: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          name_fr: string
          slug: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          name_fr?: string
          slug?: string
          description?: string | null
          created_at?: string
        }
      }
      faculties: {
        Row: {
          id: string
          name_ar: string
          name_fr: string
          city: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          name_fr: string
          city: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          name_fr?: string
          city?: string
          slug?: string
          created_at?: string
        }
      }
      articles: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string | null
          cover_image: string | null
          category_id: string | null
          faculty_id: string | null
          author_id: string | null
          status: string
          published_at: string | null
          views_count: number
          seo_title: string | null
          seo_description: string | null
          focus_keyword: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt?: string | null
          cover_image?: string | null
          category_id?: string | null
          faculty_id?: string | null
          author_id?: string | null
          status?: string
          published_at?: string | null
          views_count?: number
          seo_title?: string | null
          seo_description?: string | null
          focus_keyword?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          cover_image?: string | null
          category_id?: string | null
          faculty_id?: string | null
          author_id?: string | null
          status?: string
          published_at?: string | null
          views_count?: number
          seo_title?: string | null
          seo_description?: string | null
          focus_keyword?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dictionary_terms: {
        Row: {
          id: string
          term_ar: string
          term_fr: string
          definition_ar: string
          definition_fr: string | null
          slug: string
          category_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          term_ar: string
          term_fr: string
          definition_ar: string
          definition_fr?: string | null
          slug: string
          category_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          term_ar?: string
          term_fr?: string
          definition_ar?: string
          definition_fr?: string | null
          slug?: string
          category_id?: string | null
          created_at?: string
        }
      }
      seminars: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          speaker_name: string
          video_url: string | null
          event_date: string
          location: string | null
          faculty_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          speaker_name: string
          video_url?: string | null
          event_date: string
          location?: string | null
          faculty_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          speaker_name?: string
          video_url?: string | null
          event_date?: string
          location?: string | null
          faculty_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}