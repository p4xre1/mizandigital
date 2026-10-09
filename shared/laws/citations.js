// shared/laws/citations.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Law citation and staleness auditor (pure functions)
// ─────────────────────────────────────────────────────────────────────────────
// The site quotes Moroccan laws in articles, quiz explanations, and the
// lexicon ("القانون رقم 52.05"). Laws get amended and repealed, so a citation
// can go stale. This module finds the citations and classifies them against
// what we know. It does not decide what is true in law: it reports what our
// own data says, and a human decides.
//
// Severity levels:
//   error   — a cited law is marked repealed or abrogated
//   warning — a cited law is missing from a non-empty archive, a status record
//             is older than the review window, or a legal source was not
//             re-verified recently
//   info    — the archive is empty, so the citation cannot be verified (this
//             is the normal state of the snapshot in some builds, so it is not
//             a failure)
//
// No network access and no clock: the caller passes `today`.

/** Days after which a manual status check or source verification is stale. */
export const STALE_AFTER_DAYS = 180;

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** Converts Arabic-Indic and Persian digits to ASCII. */
export function toAsciiDigits(text = "") {
  return String(text).replace(/[٠-٩۰-۹]/g, (d) => {
    const code = ARABIC_INDIC.indexOf(d);
    return code >= 0 ? String(code) : String(d.charCodeAt(0) - 0x06f0);
  });
}

/**
 * Law references: a keyword (قانون / القانون / loi), an optional number marker,
 * and a number of the form NN.YY or NN-YY (Moroccan law numbers have a two-digit
 * year suffix). A number followed by another ".ddd" or "-ddd" is a dahir
 * (e.g. 1.02.297) and is rejected. Keyword matching avoids false hits on prices.
 */
const CITATION_RE =
  /(?:القانون|قانون|loi)\s*(?:رقم|n\s*°|n°|n\.|no\.?)?\s*:?\s*(\d{1,3})\s*[.\-]\s*(\d{2})(?!\d|[.\-]\d)/giu;

/**
 * Finds law citations in text.
 * @param {string} text
 * @returns {Array<{ number: string, index: number, raw: string }>}
 */
export function extractLawCitations(text = "") {
  const source = toAsciiDigits(text);
  const out = [];
  for (const match of source.matchAll(CITATION_RE)) {
    out.push({
      number: `${match[1]}.${match[2]}`,
      index: match.index ?? 0,
      raw: match[0],
    });
  }
  return out;
}

/** Days between two ISO dates (b − a). Returns NaN when either date is invalid. */
export function daysBetween(isoA, isoB) {
  const a = Date.parse(`${isoA}T00:00:00Z`);
  const b = Date.parse(`${isoB}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

const REPEALED_STATUSES = new Set(["repealed", "abrogated", "ملغى", "ملغي"]);

function isRepealedRow(row) {
  if (!row) return false;
  if (row.repealed_by) return true;
  return REPEALED_STATUSES.has(String(row.status ?? "").toLowerCase());
}

/**
 * Classifies every cited law and returns findings.
 *
 * @param {object} input
 * @param {Array<{ number: string, source: string }>} input.citations
 * @param {Array<{ law_number?: string|null, title?: string|null, status?: string|null, repealed_by?: string|null }>} [input.archive]
 * @param {Record<string, { status?: string, checked_at?: string, note?: string }>} [input.statuses]
 * @param {Array<{ code: string, last_verified?: string|null, source: string }>} [input.sources]
 * @param {string} input.today  YYYY-MM-DD
 * @param {number} [input.staleAfterDays]
 * @returns {{ findings: Array<object>, summary: object }}
 */
export function auditCitations({
  citations = [],
  archive = [],
  statuses = {},
  sources = [],
  today,
  staleAfterDays = STALE_AFTER_DAYS,
}) {
  const findings = [];
  const archiveHasRows = archive.length > 0;

  // Group by law number so each law is reported once, with all its sources.
  const byNumber = new Map();
  for (const c of citations) {
    if (!byNumber.has(c.number)) byNumber.set(c.number, []);
    byNumber.get(c.number).push(c.source);
  }

  for (const [number, sourceList] of byNumber) {
    const uniqueSources = [...new Set(sourceList)];
    const status = statuses[number];
    const row = archive.find((r) => r && toAsciiDigits(r.law_number ?? "") === number);

    if (isRepealedRow(row) || (status && REPEALED_STATUSES.has(String(status.status ?? "").toLowerCase()))) {
      findings.push({ number, severity: "error", code: "repealed_cited", sources: uniqueSources });
      continue;
    }

    if (status?.checked_at && Number.isFinite(daysBetween(status.checked_at, today))) {
      const age = daysBetween(status.checked_at, today);
      if (age > staleAfterDays) {
        findings.push({ number, severity: "warning", code: "status_stale", ageDays: age, sources: uniqueSources });
      }
    }

    if (!row && !status) {
      if (archiveHasRows) {
        findings.push({ number, severity: "warning", code: "not_in_archive", sources: uniqueSources });
      } else {
        findings.push({ number, severity: "info", code: "unverifiable_no_archive", sources: uniqueSources });
      }
    }
  }

  for (const s of sources) {
    if (!s?.last_verified) continue;
    const age = daysBetween(s.last_verified, today);
    if (Number.isFinite(age) && age > staleAfterDays) {
      findings.push({ number: s.code ?? "source", severity: "warning", code: "source_not_verified_recently", ageDays: age, sources: [s.source] });
    }
  }

  const summary = {
    citations: citations.length,
    uniqueLaws: byNumber.size,
    archiveRows: archive.length,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    infos: findings.filter((f) => f.severity === "info").length,
  };
  return { findings, summary };
}
