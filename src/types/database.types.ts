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
          bonus_credits: number
          referred_by: string | null
          created_at: string
          updated_at: string
          referral_code: string | null
          referral_count: number | null
          daily_credits: number | null
          full_name: string | null
          progress: Json | null
          bio: string | null
          avatar_url: string | null
          admin_god_mode: boolean | null
          last_updated_at: string | null
          is_frozen: boolean | null
          ads_exempt: boolean | null
          preferred_lang: string | null
          last_ip_address: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
        }
        Insert: {
          id: string
          email: string
          bonus_credits?: number
          referred_by?: string | null
          created_at?: string
          updated_at?: string
          referral_code?: string | null
          referral_count?: number | null
          daily_credits?: number | null
          full_name?: string | null
          progress?: Json | null
          bio?: string | null
          avatar_url?: string | null
          admin_god_mode?: boolean | null
          last_updated_at?: string | null
          is_frozen?: boolean | null
          ads_exempt?: boolean | null
          preferred_lang?: string | null
          last_ip_address?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          bonus_credits?: number
          referred_by?: string | null
          created_at?: string
          updated_at?: string
          referral_code?: string | null
          referral_count?: number | null
          daily_credits?: number | null
          full_name?: string | null
          progress?: Json | null
          bio?: string | null
          avatar_url?: string | null
          admin_god_mode?: boolean | null
          last_updated_at?: string | null
          is_frozen?: boolean | null
          ads_exempt?: boolean | null
          preferred_lang?: string | null
          last_ip_address?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          count: number | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          count?: number | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          count?: number | null
        }
        Relationships: []
      }
      faculties: {
        Row: {
          id: string
          name: string
          city: string
          slug: string
          founded_year: number | null
          logo_url: string | null
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          city: string
          slug: string
          founded_year?: number | null
          logo_url?: string | null
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          city?: string
          slug?: string
          founded_year?: number | null
          logo_url?: string | null
          description?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      pdf_summaries: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          semester: string
          professor: string | null
          faculty_id: string | null
          file_url: string
          file_size_bytes: number | null
          download_count: number | null
          status: string | null
          uploaded_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          semester: string
          professor?: string | null
          faculty_id?: string | null
          file_url: string
          file_size_bytes?: number | null
          download_count?: number | null
          status?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          semester?: string
          professor?: string | null
          faculty_id?: string | null
          file_url?: string
          file_size_bytes?: number | null
          download_count?: number | null
          status?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      articles: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string | null
          category_id: string | null
          faculty_id: string | null
          semester: string | null
          meta_title: string | null
          meta_description: string | null
          target_keyword: string | null
          canonical_url: string | null
          json_ld: Json | null
          views_count: number | null
          is_featured: boolean | null
          status: string | null
          author_id: string | null
          created_at: string | null
          updated_at: string | null
          cover_image: string | null
          published_at: string | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt?: string | null
          category_id?: string | null
          faculty_id?: string | null
          semester?: string | null
          meta_title?: string | null
          meta_description?: string | null
          target_keyword?: string | null
          canonical_url?: string | null
          json_ld?: Json | null
          views_count?: number | null
          is_featured?: boolean | null
          status?: string | null
          author_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          cover_image?: string | null
          published_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          category_id?: string | null
          faculty_id?: string | null
          semester?: string | null
          meta_title?: string | null
          meta_description?: string | null
          target_keyword?: string | null
          canonical_url?: string | null
          json_ld?: Json | null
          views_count?: number | null
          is_featured?: boolean | null
          status?: string | null
          author_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          cover_image?: string | null
          published_at?: string | null
        }
        Relationships: []
      }
      lexicon_terms: {
        Row: {
          id: string
          term_ar: string
          definition: string
          category: string
          created_at: string | null
          updated_at: string | null
          term_fr: string | null
        }
        Insert: {
          id?: string
          term_ar: string
          definition: string
          category: string
          created_at?: string | null
          updated_at?: string | null
          term_fr?: string | null
        }
        Update: {
          id?: string
          term_ar?: string
          definition?: string
          category?: string
          created_at?: string | null
          updated_at?: string | null
          term_fr?: string | null
        }
        Relationships: []
      }
      seminars: {
        Row: {
          id: string
          title: string
          speaker: string
          speaker_title: string | null
          video_url: string
          event_date: string | null
          event_time: string | null
          agenda: string | null
          attachment_url: string | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          speaker: string
          speaker_title?: string | null
          video_url: string
          event_date?: string | null
          event_time?: string | null
          agenda?: string | null
          attachment_url?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          speaker?: string
          speaker_title?: string | null
          video_url?: string
          event_date?: string | null
          event_time?: string | null
          agenda?: string | null
          attachment_url?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          article_id: string | null
          pdf_id: string | null
          news_id: string | null
          source_type: string | null
          source_slug: string | null
          author_name: string
          body: string
          is_approved: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          article_id?: string | null
          pdf_id?: string | null
          news_id?: string | null
          source_type?: string | null
          source_slug?: string | null
          author_name?: string
          body: string
          is_approved?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          article_id?: string | null
          pdf_id?: string | null
          news_id?: string | null
          source_type?: string | null
          source_slug?: string | null
          author_name?: string
          body?: string
          is_approved?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      content_stats: {
        Row: {
          source_type: string
          source_slug: string
          views_count: number
        }
        Insert: {
          source_type: string
          source_slug: string
          views_count?: number
        }
        Update: {
          source_type?: string
          source_slug?: string
          views_count?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string | null
          new_data: Json | null
          created_at: string | null
          old_data: Json | null
          ip_address: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name?: string | null
          new_data?: Json | null
          created_at?: string | null
          old_data?: Json | null
          ip_address?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action: string
          table_name?: string | null
          new_data?: Json | null
          created_at?: string | null
          old_data?: Json | null
          ip_address?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          id: string
          title: string
          summary: string | null
          content: string | null
          source: string | null
          source_url: string | null
          image_url: string | null
          is_published: boolean | null
          published_at: string | null
          slug: string
          created_at: string | null
          views_count: number | null
        }
        Insert: {
          id?: string
          title: string
          summary?: string | null
          content?: string | null
          source?: string | null
          source_url?: string | null
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          created_at?: string | null
          views_count?: number | null
        }
        Update: {
          id?: string
          title?: string
          summary?: string | null
          content?: string | null
          source?: string | null
          source_url?: string | null
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          created_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}