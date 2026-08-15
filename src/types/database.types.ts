export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category_id: string | null
          content: string
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          faculty_id: string | null
          id: string
          is_featured: boolean | null
          json_ld: Json | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          semester: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"] | null
          target_keyword: string | null
          title: string
          title_fr: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content: string
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          faculty_id?: string | null
          id?: string
          is_featured?: boolean | null
          json_ld?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          semester?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"] | null
          target_keyword?: string | null
          title: string
          title_fr?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          faculty_id?: string | null
          id?: string
          is_featured?: boolean | null
          json_ld?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          semester?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"] | null
          target_keyword?: string | null
          title?: string
          title_fr?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          count: number | null
          description: string | null
          icon: string | null
          id: string
          name: string
          name_fr: string | null
          slug: string
        }
        Insert: {
          count?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          name_fr?: string | null
          slug: string
        }
        Update: {
          count?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          name_fr?: string | null
          slug?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          article_id: string | null
          author_name: string
          body: string
          created_at: string | null
          id: string
          is_approved: boolean
          pdf_id: string | null
        }
        Insert: {
          article_id?: string | null
          author_name?: string
          body: string
          created_at?: string | null
          id?: string
          is_approved?: boolean
          pdf_id?: string | null
        }
        Update: {
          article_id?: string | null
          author_name?: string
          body?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean
          pdf_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdf_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          city: string
          created_at: string | null
          description: string | null
          founded_year: number | null
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          city: string
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          city?: string
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      lexicon_terms: {
        Row: {
          category: string
          created_at: string | null
          definition: string
          id: string
          term_ar: string
          term_fr: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          definition: string
          id?: string
          term_ar: string
          term_fr: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          definition?: string
          id?: string
          term_ar?: string
          term_fr?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pdf_summaries: {
        Row: {
          created_at: string | null
          description: string | null
          download_count: number | null
          faculty_id: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          professor: string | null
          semester: string
          slug: string
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          faculty_id?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          professor?: string | null
          semester: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          faculty_id?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          professor?: string | null
          semester?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_summaries_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_god_mode: boolean | null
          ads_exempt: boolean | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          bio: string | null
          bonus_credits: number
          created_at: string
          daily_credits: number | null
          email: string
          full_name: string | null
          id: string
          is_frozen: boolean | null
          last_ip_address: unknown
          last_updated_at: string | null
          preferred_lang: string | null
          progress: Json | null
          referral_code: string | null
          referral_count: number | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          admin_god_mode?: boolean | null
          ads_exempt?: boolean | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          bonus_credits?: number
          created_at?: string
          daily_credits?: number | null
          email: string
          full_name?: string | null
          id: string
          is_frozen?: boolean | null
          last_ip_address?: unknown
          last_updated_at?: string | null
          preferred_lang?: string | null
          progress?: Json | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          admin_god_mode?: boolean | null
          ads_exempt?: boolean | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          bonus_credits?: number
          created_at?: string
          daily_credits?: number | null
          email?: string
          full_name?: string | null
          id?: string
          is_frozen?: boolean | null
          last_ip_address?: unknown
          last_updated_at?: string | null
          preferred_lang?: string | null
          progress?: Json | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seminars: {
        Row: {
          agenda: string | null
          attachment_url: string | null
          created_at: string | null
          event_date: string | null
          event_time: string | null
          id: string
          speaker: string
          speaker_title: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          video_url: string
        }
        Insert: {
          agenda?: string | null
          attachment_url?: string | null
          created_at?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          speaker: string
          speaker_title?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          video_url: string
        }
        Update: {
          agenda?: string | null
          attachment_url?: string | null
          created_at?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          speaker?: string
          speaker_title?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_bonus_credits: {
        Args: { amount: number; user_id: string }
        Returns: Json
      }
      admin_freeze_user: {
        Args: { freeze_status: boolean; target_user_id: string }
        Returns: undefined
      }
      apply_referral_code: {
        Args: { referral_code: string; referred_user: string }
        Returns: Json
      }
      deduct_credit: { Args: { user_id: string }; Returns: Json }
      generate_referral_code: { Args: never; Returns: string }
      get_auth_role: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      handle_safe_account_deletion: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      increment_article_views: {
        Args: { target_article_id: string }
        Returns: undefined
      }
      increment_document_downloads: {
        Args: { target_doc_id: string }
        Returns: undefined
      }
      increment_news_views: {
        Args: { target_news_id: string }
        Returns: undefined
      }
      is_active_user: { Args: { user_uuid: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_dev: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      reset_daily_credits: { Args: never; Returns: undefined }
    }
    Enums: {
      content_status: "draft" | "published" | "under_review" | "archived"
      user_role: "super_admin" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      content_status: ["draft", "published", "under_review", "archived"],
      user_role: ["super_admin", "editor"],
    },
  },
} as const
