import type { AuditRecord } from "../types";

export function sortAuditNewestFirst(entries: AuditRecord[]) {
  return [...entries].sort((left, right) => right.created_at.localeCompare(left.created_at));
}
