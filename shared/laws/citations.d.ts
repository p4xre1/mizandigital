// Types for shared/laws/citations.js (law citation and staleness auditor).

export const STALE_AFTER_DAYS: number

export function toAsciiDigits(text?: string): string

export interface LawCitation {
  number: string
  index: number
  raw: string
}

export function extractLawCitations(text?: string): LawCitation[]

export function daysBetween(isoA: string, isoB: string): number

export interface ArchiveLawRow {
  law_number?: string | null
  title?: string | null
  status?: string | null
  repealed_by?: string | null
}

export interface StatusRecord {
  status?: string
  checked_at?: string
  note?: string
}

export interface SourceRecord {
  code?: string
  last_verified?: string | null
  source: string
}

export type Severity = "error" | "warning" | "info"

export interface AuditFinding {
  number: string
  severity: Severity
  code: "repealed_cited" | "status_stale" | "not_in_archive" | "unverifiable_no_archive" | "source_not_verified_recently"
  sources: string[]
  ageDays?: number
}

export interface AuditSummary {
  citations: number
  uniqueLaws: number
  archiveRows: number
  errors: number
  warnings: number
  infos: number
}

export function auditCitations(input: {
  citations?: Array<{ number: string; source: string }>
  archive?: ArchiveLawRow[]
  statuses?: Record<string, StatusRecord>
  sources?: SourceRecord[]
  today: string
  staleAfterDays?: number
}): { findings: AuditFinding[]; summary: AuditSummary }
