/** أنواع محتوى الصفحات القانونية (البيانات في policies.js). */

export type LegalBlock =
  | { kind: "para"; text: string }
  | { kind: "note"; text: string }
  | { kind: "list"; ordered?: boolean; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][]; ltrColumns?: number[] }
  | { kind: "group"; title?: string; blocks: LegalBlock[] }
  | { kind: "callout"; tone?: string; title?: string; blocks: LegalBlock[] }

export interface LegalSectionModel {
  title: string
  blocks: LegalBlock[]
}

export interface LegalFaq {
  question: string
  answer: string
}

export interface LegalPolicy {
  path: string
  heading: string
  title: string
  description: string
  directAnswer: string
  updatedNote: string
  badge?: string
  faq: LegalFaq[]
  sections: LegalSectionModel[]
}

export interface CookieEntry {
  name: string
  provider: string
  purpose: string
  duration: string
  type: string
}

export declare const CONTACT_EMAIL: string
export declare const LEGAL_LAST_UPDATED: string
export declare const ADSTERRA_REMOVED_ON: string
export declare const AUTH_STORAGE_KEY: string
export declare const DELETED_TABLES: string[]
export declare const RETAINED_TABLES: string[]
export declare const PUBLIC_PROFILE_FIELDS: string[]
export declare const PRIVATE_PROFILE_FIELDS: string[]
export declare const COOKIE_TABLE: CookieEntry[]
export declare const PRIVACY_POLICY: LegalPolicy
export declare const COOKIE_POLICY: LegalPolicy
export declare const TERMS_POLICY: LegalPolicy
export declare const LEGAL_POLICIES: LegalPolicy[]
