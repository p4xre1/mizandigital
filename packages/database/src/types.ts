export interface ArticleRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  language: "ar" | "fr" | "en" | "es";
  created_at: string;
  updated_at: string;
}

export interface SchoolRecord {
  id: string;
  slug: string;
  name: string;
  city: string;
}

export interface AuthorityLinkRecord {
  source_slug: string;
  target_slug: string;
  relation: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  created_at: string;
}
