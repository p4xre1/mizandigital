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
      categories: { Row: { id: string; name: string; slug: string; description: string | null; icon: string | null; count: number | null }; Insert: { id?: string; name: string; slug: string; description?: string | null; icon?: string | null; count?: number | null }; Update: { id?: string; name?: string; slug?: string; description?: string | null; icon?: string | null; count?: number | null }; Relationships: [] }
      faculties: { Row: { id: string; name: string; city: string; slug: string; founded_year: number | null; logo_url: string | null; description: string | null; created_at: string | null }; Insert: { id?: string; name: string; city: string; slug: string; founded_year?: number | null; logo_url?: string | null; description?: string | null; created_at?: string | null }; Update: { id?: string; name?: string; city?: string; slug?: string; founded_year?: number | null; logo_url?: string | null; description?: string | null; created_at?: string | null }; Relationships: [] }
      pdf_summaries: { Row: { id: string; title: string; slug: string; description: string | null; semester: string; professor: string | null; faculty_id: string | null; file_url: string; file_size_bytes: number | null; download_count: number | null; status: string | null; uploaded_by: string | null; created_at: string | null; updated_at: string | null }; Insert: { id?: string; title: string; slug: string; description?: string | null; semester: string; professor?: string | null; faculty_id?: string | null; file_url: string; file_size_bytes?: number | null; download_count?: number | null; status?: string | null; uploaded_by?: string | null; created_at?: string | null; updated_at?: string | null }; Update: { id?: string; title?: string; slug?: string; description?: string | null; semester?: string; professor?: string | null; faculty_id?: string | null; file_url?: string; file_size_bytes?: number | null; download_count?: number | null; status?: string | null; uploaded_by?: string | null; created_at?: string | null; updated_at?: string | null }; Relationships: [] }
      articles: { Row: { id: string; title: string; slug: string; content: string; excerpt: string | null; category_id: string | null; faculty_id: string | null; semester: string | null; meta_title: string | null; meta_description: string | null; target_keyword: string | null; canonical_url: string | null; json_ld: Json | null; views_count: number | null; is_featured: boolean | null; status: string | null; author_id: string | null; created_at: string | null; updated_at: string | null; cover_image: string | null; cover_image_alt: string | null; published_at: string | null }; Insert: any; Update: any; Relationships: [] }
      lexicon_terms: { Row: { id: string; term_ar: string; definition: string; category: string; created_at: string | null; updated_at: string | null; term_fr: string | null }; Insert: any; Update: any; Relationships: [] }
      seminars: { Row: { id: string; title: string; speaker: string; speaker_title: string | null; video_url: string; event_date: string | null; event_time: string | null; agenda: string | null; attachment_url: string | null; status: string | null; created_at: string | null }; Insert: any; Update: any; Relationships: [] }
      comments: { Row: { id: string; article_id: string | null; pdf_id: string | null; news_id: string | null; source_type: string | null; source_slug: string | null; author_name: string; body: string; is_approved: boolean; created_at: string | null }; Insert: any; Update: any; Relationships: [] }
      content_stats: { Row: { source_type: string; source_slug: string; views_count: number }; Insert: any; Update: any; Relationships: [] }
      audit_logs: { Row: { id: string; user_id: string | null; action: string; table_name: string | null; new_data: Json | null; created_at: string | null; old_data: Json | null; ip_address: string | null }; Insert: any; Update: any; Relationships: [] }
      news: { Row: { id: string; title: string; summary: string | null; content: string | null; source: string | null; source_url: string | null; image_url: string | null; image_alt: string | null; is_published: boolean | null; published_at: string | null; slug: string; created_at: string | null; views_count: number | null }; Insert: any; Update: any; Relationships: [] }
      schools: {
        Row: { id: string; name: string; slug: string; university: string | null; city: string | null; synopsis: string | null }
        Insert: any
        Update: any
        Relationships: []
      }
      laws: {
        Row: { id: string; title: string; slug: string; law_number: string | null; description: string | null }
        Insert: any
        Update: any
        Relationships: []
      }
      onboarding_responses: {
        Row: { id: string; clerk_user_id: string; user_type: string; referral_source: string; interests: string[]; created_at: string; updated_at: string }
        Insert: { id?: string; clerk_user_id: string; user_type: string; referral_source: string; interests?: string[]; created_at?: string; updated_at?: string }
        Update: { id?: string; clerk_user_id?: string; user_type?: string; referral_source?: string; interests?: string[]; created_at?: string; updated_at?: string }
        Relationships: []
      }
      // محور الاختبارات ونظام الرتب — أنشئت في ترقية 20260914000000
      quiz_questions: {
        Row: {
          id: string
          slug: string
          tier: string
          semester: string | null
          module: string | null
          body: string | null
          track: string | null
          difficulty: string
          question: string
          options: Json
          answer: number
          explanation: string
          reference: string | null
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          tier: string
          semester?: string | null
          module?: string | null
          body?: string | null
          track?: string | null
          difficulty?: string
          question: string
          options?: Json
          answer?: number
          explanation: string
          reference?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          tier?: string
          semester?: string | null
          module?: string | null
          body?: string | null
          track?: string | null
          difficulty?: string
          question?: string
          options?: Json
          answer?: number
          explanation?: string
          reference?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          id: string
          user_ref: string | null
          mode: string
          label: string | null
          total: number
          correct: number
          score: number
          xp_earned: number
          credits_earned: number
          best_streak: number
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_ref?: string | null
          mode: string
          label?: string | null
          total?: number
          correct?: number
          score?: number
          xp_earned?: number
          credits_earned?: number
          best_streak?: number
          duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_ref?: string | null
          mode?: string
          label?: string | null
          total?: number
          correct?: number
          score?: number
          xp_earned?: number
          credits_earned?: number
          best_streak?: number
          duration_ms?: number | null
          created_at?: string
        }
        Relationships: []
      }

      credit_packages: {
        Row: { id: string; slug: string; title: string; description: string | null; credits: number; price_mad: number; price_usd: number | null; bonus_credits: number; is_popular: boolean; is_active: boolean; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: string; slug: string; title: string; description?: string | null; credits: number; price_mad: number; price_usd?: number | null; bonus_credits?: number; is_popular?: boolean; is_active?: boolean; sort_order?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; slug?: string; title?: string; description?: string | null; credits?: number; price_mad?: number; price_usd?: number | null; bonus_credits?: number; is_popular?: boolean; is_active?: boolean; sort_order?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      payments: {
        Row: { id: string; user_ref: string | null; clerk_user_id: string | null; package_id: string | null; amount_mad: number; amount_usd: number | null; credits_purchased: number; bonus_credits: number; provider: string; provider_payment_id: string | null; status: string; metadata: Json; created_at: string; completed_at: string | null }
        Insert: { id?: string; user_ref?: string | null; clerk_user_id?: string | null; package_id?: string | null; amount_mad: number; amount_usd?: number | null; credits_purchased: number; bonus_credits?: number; provider?: string; provider_payment_id?: string | null; status?: string; metadata?: Json; created_at?: string; completed_at?: string | null }
        Update: { id?: string; user_ref?: string | null; clerk_user_id?: string | null; package_id?: string | null; amount_mad?: number; amount_usd?: number | null; credits_purchased?: number; bonus_credits?: number; provider?: string; provider_payment_id?: string | null; status?: string; metadata?: Json; created_at?: string; completed_at?: string | null }
        Relationships: []
      }
      credit_transactions: {
        Row: { id: string; user_ref: string; clerk_user_id: string | null; type: string; amount: number; balance_after: number | null; reason: string | null; reference_id: string | null; metadata: Json; created_at: string }
        Insert: { id?: string; user_ref: string; clerk_user_id?: string | null; type: string; amount: number; balance_after?: number | null; reason?: string | null; reference_id?: string | null; metadata?: Json; created_at?: string }
        Update: { id?: string; user_ref?: string; clerk_user_id?: string | null; type?: string; amount?: number; balance_after?: number | null; reason?: string | null; reference_id?: string | null; metadata?: Json; created_at?: string }
        Relationships: []
      }
      reactions: {
        Row: { id: string; user_ref: string; clerk_user_id: string | null; target_type: string; target_id: string; reaction_type: string; created_at: string }
        Insert: { id?: string; user_ref: string; clerk_user_id?: string | null; target_type: string; target_id: string; reaction_type: string; created_at?: string }
        Update: { id?: string; user_ref?: string; clerk_user_id?: string | null; target_type?: string; target_id?: string; reaction_type?: string; created_at?: string }
        Relationships: []
      }
      reaction_counts: {
        Row: { target_type: string; target_id: string; reaction_type: string; count: number; updated_at: string }
        Insert: { target_type: string; target_id: string; reaction_type: string; count?: number; updated_at?: string }
        Update: { target_type?: string; target_id?: string; reaction_type?: string; count?: number; updated_at?: string }
        Relationships: []
      }
      reports: {
        Row: { id: string; reporter_ref: string | null; reporter_clerk_id: string | null; target_type: string; target_id: string; reason: string; details: string | null; status: string; moderator_note: string | null; moderator_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; reporter_ref?: string | null; reporter_clerk_id?: string | null; target_type: string; target_id: string; reason: string; details?: string | null; status?: string; moderator_note?: string | null; moderator_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; reporter_ref?: string | null; reporter_clerk_id?: string | null; target_type?: string; target_id?: string; reason?: string; details?: string | null; status?: string; moderator_note?: string | null; moderator_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      moderation_actions: {
        Row: { id: string; moderator_id: string | null; target_type: string; target_id: string; action: string; reason: string | null; metadata: Json; created_at: string }
        Insert: { id?: string; moderator_id?: string | null; target_type: string; target_id: string; action: string; reason?: string | null; metadata?: Json; created_at?: string }
        Update: { id?: string; moderator_id?: string | null; target_type?: string; target_id?: string; action?: string; reason?: string | null; metadata?: Json; created_at?: string }
        Relationships: []
      }
      community_guidelines: {
        Row: { id: string; slug: string; title: string; content: string; category: string; is_active: boolean; sort_order: number; created_at: string; updated_at: string }
        Insert: { id?: string; slug: string; title: string; content: string; category?: string; is_active?: boolean; sort_order?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; slug?: string; title?: string; content?: string; category?: string; is_active?: boolean; sort_order?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }

      mizan_profiles: {
        Row: {
          id: string
          owner_id: string | null
          clerk_user_id: string | null
          username: string
          display_name: string
          role: string
          semester: string | null
          years_of_experience: number | null
          interests: string[]
          city: string | null
          bio: string | null
          xp: number
          credits: number
          rank: string
          badges: string[]
          streak_days: number
          placement_completed: boolean
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          clerk_user_id?: string | null
          username: string
          display_name: string
          role?: string
          semester?: string | null
          years_of_experience?: number | null
          interests?: string[]
          city?: string | null
          bio?: string | null
          xp?: number
          credits?: number
          rank?: string
          badges?: string[]
          streak_days?: number
          placement_completed?: boolean
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          owner_id: string | null
          clerk_user_id: string | null
          username: string
          display_name: string
          role: string
          semester: string | null
          years_of_experience: number | null
          interests: string[]
          city: string | null
          bio: string | null
          xp: number
          credits: number
          rank: string
          badges: string[]
          streak_days: number
          placement_completed: boolean
          is_public: boolean
          created_at: string
          updated_at: string
        }>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }

    Functions: {
      submit_quiz_attempt: { Args: { p_mode: string; p_label: string; p_tier: string; p_answers: Json; p_duration_ms: number; p_user_ref?: string | null }; Returns: { id: string; correct: number; total: number; score: number; xp_earned: number; credits_earned: number; best_streak: number }[] }
      check_quiz_answer: { Args: { p_question_id: string; p_chosen: number }; Returns: { correct: boolean; explanation: string; reference: string | null }[] }
      toggle_reaction: { Args: { p_user_ref: string; p_target_type: string; p_target_id: string; p_reaction_type: string; p_clerk_user_id?: string | null }; Returns: { action: string; count: number }[] }
      get_reaction_summary: { Args: { p_target_type: string; p_target_id: string }; Returns: { reaction_type: string; count: number }[] }
      create_report: { Args: { p_reporter_ref: string; p_target_type: string; p_target_id: string; p_reason: string; p_details?: string | null; p_reporter_clerk_id?: string | null }; Returns: string }
      complete_payment_and_grant_credits: { Args: { p_payment_id: string }; Returns: boolean }
      quiz_leaderboard: { Args: { p_limit?: number }; Returns: { user_ref: string; label: string; score: number; xp_earned: number; created_at: string }[] }
      compute_quiz_xp: { Args: { p_correct: boolean; p_difficulty: string; p_elapsed_ms: number; p_streak: number }; Returns: number }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
