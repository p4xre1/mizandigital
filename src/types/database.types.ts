export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "root" | "security_admin" | "admin" | "marketer" | "writer" | "member" | "guest";
export type ContentStatus = "draft" | "published" | "archived";
export type QuestionStatus = "pending" | "answered" | "closed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          role: UserRole;
          bonus_credits: number;
          referred_by: string | null;
          created_at: string;
          updated_at: string;
          referral_code: string | null;
          referral_count: number;
          daily_credits: number;
          full_name: string | null;
          progress: Json | null;
          bio: string | null;
          avatar_url: string | null;
          admin_god_mode: boolean;
          last_updated_at: string | null;
          is_frozen: boolean;
          ads_exempt: boolean;
          preferred_lang: "ar" | "fr" | "en" | "es" | null;
          last_ip_address: string | null;
          ban_reason: string | null;
          banned_at: string | null;
          banned_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          title: string;
          title_fr: string | null;
          slug: string;
          content: string;
          excerpt: string | null;
          category_id: string | null;
          school_id: string | null;
          semester: string | null;
          author_id: string | null;
          pdf_url: string | null;
          views: number;
          is_featured: boolean;
          status: ContentStatus;
          created_at: string;
          updated_at: string;
          editor_id: string | null;
          tenant_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["articles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["articles"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          name_fr: string | null;
          slug: string;
          description: string | null;
          icon: string | null;
          count: number;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      ui_translations: {
        Row: {
          key: string;
          domain: string;
          ar: string | null;
          fr: string | null;
          en: string | null;
          es: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ui_translations"]["Row"]> & { key: string; domain: string };
        Update: Partial<Database["public"]["Tables"]["ui_translations"]["Row"]>;
        Relationships: [];
      };
            audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          action: string;
          table_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };

      security_logs: {
        Row: {
          id: string;
          severity: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["security_logs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["security_logs"]["Row"]>;
        Relationships: [];
      };
      legal_texts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          domain: string;
          content: string | null;
          status: ContentStatus;
          access_tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["legal_texts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["legal_texts"]["Row"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          article_id: string;
          author_name: string;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
        Relationships: [];
      };
      user_interactions: {
        Row: {
          id: string;
          user_id: string | null;
          article_id: string | null;
          interaction_type: "like" | "save";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_interactions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["user_interactions"]["Row"]>;
        Relationships: [];
      };
      documents_library: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          file_url: string;
          file_size_bytes: number | null;
          category_id: string | null;
          school_id: string | null;
          download_count: number;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents_library"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["documents_library"]["Row"]>;
        Relationships: [];
      };
      schools: {
        Row: {
          id: string;
          name: string;
          city: string;
          slug: string;
          logo_url: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["schools"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["schools"]["Row"]>;
        Relationships: [];
      };
      news: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string;
          cover_image: string | null;
          views: number;
          status: ContentStatus;
          author_id: string | null;
          published_at: string;
          created_at: string;
          editor_id: string | null;
          tenant_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["news"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["news"]["Row"]>;
        Relationships: [];
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          domain_wildcard: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tenants"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["tenants"]["Row"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string | null;
          message: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          event_type: string;
          path: string;
          query: string | null;
          article_id: string | null;
          school_id: string | null;
          category_id: string | null;
          metadata: Json;
          user_agent: string | null;
          created_at: string;
          ip_address: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["analytics_events"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["analytics_events"]["Row"]>;
        Relationships: [];
      };
      site_legal_documents: {
        Row: {
          id: string;
          node: string;
          ar_title: string | null;
          fr_title: string | null;
          en_title: string | null;
          es_title: string | null;
          ar_content_html: string | null;
          fr_content_html: string | null;
          en_content_html: string | null;
          es_content_html: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["site_legal_documents"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["site_legal_documents"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      content_status: ContentStatus;
      question_status: QuestionStatus;
    };
     CompositeTypes: {};
  };
}