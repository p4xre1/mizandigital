// shared/laws/drop-publish.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Algorithm 2 — "drop a law PDF in the archive → publish it on the landing page"
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions only (no network, no DOM, no database). The admin Laws page
// calls planLawDrop() the moment a PDF is dropped. The result pre-fills the
// empty form fields and shows whether the law will reach the landing page.
// Saving the record is what publishes it: the landing page's law section reads
// the newest laws (with a PDF link) from the archive table.
//
// Rules (in order):
//   1. Read the file name and the first-page text (if the caller extracted it).
//   2. Law number: "قانون رقم 46.21" / "Loi n° 46-21" in the text first, then
//      a 2-digit-year pattern like 46.21 or 46-21 in the file name.
//   3. Gazette number: "الجريدة الرسمية عدد 7123" / "B.O. n° 7123".
//   4. Publication date: the first valid calendar date in the text, then in the
//      file name. Numeric (ISO, D/M/Y) and month-name forms in Arabic, Moroccan
//      Arabic and French are accepted. Hijri dates are ignored because their
//      month names are not in the list.
//   5. Title: the file name without the number, the date, and separators.
//      Falls back to the first "قانون…/الظهير…/loi…" line of the text.
//   6. Duplicate check against existing rows, by law number, then normalized
//      title, then file name. A duplicate is never published as a new row.
//   7. Readiness. ready = PDF + title + date (not in the future) + not a
//      duplicate. A missing date is NEVER invented, because the archive and the
//      landing page sort by date. Such a drop becomes needs_review.
//   8. Landing: a ready law shows on the home page only if it ranks within
//      LANDING_CARD_LIMIT among the existing laws, using the same order as
//      compareNewestFirst in src/lib/laws/showcase.ts.
//
// The file is intentionally plain JS so the same code runs in the browser,
// in Node scripts, and in tests. Keep it free of imports.

/** Must equal MAX_CARDS in src/components/home/HomeLawArchive.tsx. */
export const LANDING_CARD_LIMIT = 6;

/**
 * Earliest year we accept for a publication date. There is no upper cap here:
 * a date in the future is a review item (date_not_future), not an invalid date.
 */
const MIN_YEAR = 1950;

/** Normalizes a word for matching: drops diacritics/accents, unifies letter forms, lowercases. */
export function normalizeWord(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // Arabic harakat and French accents
    .replace(/[\u0640]/g, "") // tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/** Key for comparing titles: letters and digits only, after normalizing. */
export function normalizeTitleKey(value) {
  return normalizeWord(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Converts Arabic-Indic and Persian digits to ASCII. */
export function toAsciiDigits(value) {
  return String(value ?? "").replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

// Month names → month number. Keys are normalized with normalizeWord.
const MONTH_NAMES = {
  1: ["يناير", "janvier", "january"],
  2: ["فبراير", "فيفري", "fevrier", "february"],
  3: ["مارس", "mars", "march"],
  4: ["ابريل", "avril", "april"],
  5: ["ماي", "مايو", "mai", "may"],
  6: ["يونيو", "يونيه", "juin", "june"],
  7: ["يوليوز", "يوليو", "juillet", "july"],
  8: ["غشت", "اغسطس", "aout", "august"],
  9: ["شتنبر", "سبتمبر", "septembre", "september"],
  10: ["اكتوبر", "octobre", "october"],
  11: ["نونبر", "نوفمبر", "novembre", "november"],
  12: ["دجنبر", "ديسمبر", "decembre", "december"],
};
const MONTH_BY_WORD = new Map();
for (const [month, words] of Object.entries(MONTH_NAMES)) {
  for (const word of words) MONTH_BY_WORD.set(normalizeWord(word), Number(month));
}

/** Validates a calendar date and returns ISO YYYY-MM-DD, or null. */
export function toIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < MIN_YEAR) return null;
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Date patterns. Each yields { index, length, iso }.
const DATE_PATTERNS = [
  // 2024-03-05, 2024/3/5, 2024.03.05
  { re: /(?<!\d)((?:19|20)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/g, pick: (m) => toIsoDate(m[1], m[2], m[3]) },
  // 05/03/2024, 5-3-2024, 5.3.2024 (day first, as used in Morocco)
  { re: /(?<!\d)(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20)\d{2})(?!\d)/g, pick: (m) => toIsoDate(m[3], m[2], m[1]) },
  // 5 mars 2024, 1er mars 2024, 5 مارس 2024
  {
    re: /(?<!\d)(\d{1,2})(?:er)?\s+([\p{L}\p{M}]+)\.?,?\s+((?:19|20)\d{2})(?!\d)/gu,
    pick: (m) => {
      const month = MONTH_BY_WORD.get(normalizeWord(m[2]));
      return month ? toIsoDate(m[3], month, m[1]) : null;
    },
  },
];

/**
 * Finds every date-like span in a string, in order of appearance.
 * Invalid calendar dates are still reported (iso: null) so they can be masked.
 * @returns {Array<{ index: number, length: number, iso: string|null }>}
 */
function findDateSpans(input) {
  const spans = [];
  for (const { re, pick } of DATE_PATTERNS) {
    for (const match of input.matchAll(re)) {
      spans.push({ index: match.index, length: match[0].length, iso: pick(match) });
    }
  }
  return spans.sort((a, b) => a.index - b.index);
}

/** Returns the first valid publication date in a string, or null. */
export function extractDate(input) {
  const text = toAsciiDigits(input);
  const valid = findDateSpans(text).find((span) => span.iso);
  return valid ? valid.iso : null;
}

/**
 * Replaces every VALID date span with spaces, so a date is never read as a law
 * number. Invalid spans are left alone: "46-21-2024" is not a date, and masking
 * it would erase the law number 46.21.
 */
function maskDates(input) {
  let out = input;
  const valid = findDateSpans(input).filter((span) => span.iso);
  for (const span of valid.sort((a, b) => b.index - a.index)) {
    out = out.slice(0, span.index) + " ".repeat(span.length) + out.slice(span.index + span.length);
  }
  return out;
}

// Law number: 1–3 digits, a separator, then a 2–4 digit year suffix. The
// negative lookahead rejects longer dotted codes such as 1.24.01 (dahir numbers).
const NUM = String.raw`(\d{1,3}\s*[.\-/]\s*\d{2,4})(?![.\-/]\s*\d)`;
const LAW_NUMBER_TEXT_AR = new RegExp(String.raw`(?:القانون|قانون|الظهير|ظهير)[^\n\d]{0,30}?رقم\s*` + NUM, "u");
const LAW_NUMBER_TEXT_FR = new RegExp(String.raw`(?:loi|dahir)[^\n\d]{0,30}?n\s*[°º.o]?\s*` + NUM, "iu");
const LAW_NUMBER_FILE = /(?<![\d])(\d{1,3})[.\-](\d{2,4})(?![\d])/;

/** Turns a raw match into a canonical "46.21" form, or null. */
function canonicalLawNumber(raw) {
  if (!raw) return null;
  const value = toAsciiDigits(raw).replace(/\s+/g, "").replace(/[\-/]/g, ".");
  return /^\d{1,3}\.\d{2,4}$/.test(value) ? value : null;
}

/** Law number from text (labelled forms first), then from the file name. */
export function extractLawNumber({ text = "", fileName = "" } = {}) {
  const fromText = maskDates(toAsciiDigits(String(text)));
  const labelled = fromText.match(LAW_NUMBER_TEXT_AR) || fromText.match(LAW_NUMBER_TEXT_FR);
  if (labelled) {
    const value = canonicalLawNumber(labelled[1]);
    if (value) return value;
  }
  const fromName = maskDates(toAsciiDigits(String(fileName)));
  const bare = fromName.match(LAW_NUMBER_FILE);
  return bare ? canonicalLawNumber(`${bare[1]}.${bare[2]}`) : null;
}

const GAZETTE_RE = /(?:الجريدة\s+الرسمية|bulletin\s+officiel|\bB\.?\s?O\.?)[^\n\d]{0,30}?(?:عدد|n\s*[°º.o]?|numéro|no\.?)\s*(\d{2,6})/iu;

/** Official gazette issue number from the text, or null. */
export function extractGazetteNumber(text = "") {
  const match = toAsciiDigits(String(text)).match(GAZETTE_RE);
  return match ? match[1] : null;
}

/** Default names from scanners, cameras and office suites: not titles. */
const JUNK_TITLE_RE = /^(?:scan|img|image|dsc|doc|document|file|untitled|new|nouveau|sans titre|copie|copy)\b/i;
/** Bare type words. */
const GENERIC_TITLE_KEYS = new Set(["قانون", "القانون", "ظهير", "الظهير", "loi", "dahir"].map(normalizeTitleKey));

/** Hex-like or purely numeric names are upload IDs, not titles. */
function looksLikeIdentifier(value) {
  return /^[a-f0-9_-]{12,}$/i.test(value) || /^\d[\d\s_-]*$/.test(value);
}

/**
 * Title from the file name: date and number removed, separators turned into
 * spaces. Returns null when nothing meaningful is left.
 */
export function titleFromFileName(fileName = "", { year = null } = {}) {
  const withoutExt = String(fileName).replace(/\.[a-z0-9]{2,5}$/i, "");
  let text = maskDates(toAsciiDigits(withoutExt));
  text = text.replace(/\((\d+)\)\s*$/, " "); // "(1)" copy suffix
  text = text.replace(/\b(?:copy|copie)\b/gi, " ");
  text = text.replace(/(?<![\d])\d{1,3}[.\-]\d{2,4}(?![\d])/g, " "); // law number
  // A bare publication year left in the name ("46-21-2024") is metadata, not title.
  if (year) text = text.replace(new RegExp(`(?<!\\d)${year}(?!\\d)`, "g"), " ");
  text = text.replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").replace(/^[\s\-–—:،,]+|[\s\-–—:،,]+$/g, "");
  if (!text) return null;
  if (looksLikeIdentifier(text)) return null;
  if (JUNK_TITLE_RE.test(text)) return null;
  if (!/\p{L}{3,}/u.test(text)) return null;
  // A bare type word ("قانون", "loi") is not a title: the text fallback is better.
  if (GENERIC_TITLE_KEYS.has(normalizeTitleKey(text))) return null;
  return text.slice(0, 200);
}

/** Fallback title: the first line of the text that starts like a law title. */
export function titleFromText(text = "") {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const raw of lines) {
    if (!/^(?:القانون|قانون|الظهير|loi|dahir)/iu.test(raw)) continue;
    // Dates and the "رقم N" label are metadata, not part of the title.
    const cleaned = maskDates(toAsciiDigits(raw))
      .replace(/رقم\s*\d{1,3}(?:\s*[.\-/]\s*\d{1,4})+/gu, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s\-–—:،,]+|[\s\-–—:،,]+$/g, "");
    if (cleaned.length >= 6 && cleaned.length <= 200 && !GENERIC_TITLE_KEYS.has(normalizeTitleKey(cleaned))) {
      return cleaned;
    }
  }
  return null;
}

/** Type as the archive shows it: «قانون-إطار» for framework laws, else «قانون». */
export function lawTypeOf(title = "") {
  return /^\s*(?:ال)?قانون[\s-]+(?:ال)?إطار/u.test(title) || /^\s*loi[\s-]+cadre/i.test(title)
    ? "قانون-إطار"
    : "قانون";
}

/** Keeps only the YYYY-MM-DD part of a date-like value. */
function isoDayOf(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Finds an existing row that is the same law. Returns { id, slug, title, reason } or null. */
export function findDuplicate({ fields, fileName, existing = [] }) {
  const pick = (row, reason) => ({ id: row.id ?? null, slug: row.slug ?? null, title: row.title ?? "", reason });

  for (const row of existing) {
    if (fields.law_number && row.law_number && canonicalLawNumber(row.law_number) === fields.law_number) {
      return pick(row, "same_law_number");
    }
  }
  const key = normalizeTitleKey(fields.title);
  if (key) {
    for (const row of existing) {
      if (normalizeTitleKey(row.title) === key) return pick(row, "same_title");
    }
  }
  const name = String(fileName || "").trim().toLowerCase();
  if (name) {
    for (const row of existing) {
      const fileOfRow = typeof row.pdf_url === "string" ? safeDecode(row.pdf_url.split(/[?#]/)[0].split("/").pop() || "") : "";
      if (fileOfRow && fileOfRow.toLowerCase() === name) return pick(row, "same_file_name");
    }
  }
  return null;
}

/**
 * Position on the landing page. Mirrors compareNewestFirst: newer date first,
 * then title (Arabic collation) for equal dates. Rows with no date sort last.
 */
export function landingRankOf({ date, title }, existing = []) {
  let ahead = 0;
  for (const row of existing) {
    const rowDate = isoDayOf(row.publication_date) ?? "";
    const rowTitle = String(row.title ?? "");
    const rowFirst =
      rowDate !== date ? rowDate > date : rowTitle.localeCompare(title, "ar") < 0;
    if (rowFirst) ahead += 1;
  }
  return ahead;
}

/**
 * Plans what happens to a dropped law PDF.
 *
 * @param {object} input
 * @param {string} input.fileName              original file name, e.g. "قانون-46.21-التنظيم.pdf"
 * @param {string} [input.text]                first-page text if extracted, else ""
 * @param {Array<object>} [input.existing]     current archive rows (id, title, slug, law_number, publication_date, pdf_url)
 * @param {string} [input.today]               YYYY-MM-DD; defaults to the current UTC day
 * @returns {{
 *   status: "ready"|"needs_review"|"duplicate",
 *   message: string,
 *   fields: { title: string|null, law_number: string|null, official_gazette_number: string|null, publication_date: string|null, type: string|null },
 *   checks: Array<{ code: string, ok: boolean, blocking: boolean, message: string }>,
 *   duplicateOf: { id: string|null, slug: string|null, title: string, reason: string } | null,
 *   landing: { eligible: boolean, rank: number|null, willShowOnHome: boolean }
 * }}
 */
export function planLawDrop({ fileName = "", text = "", existing = [], today = null } = {}) {
  const name = String(fileName ?? "").trim();
  const body = String(text ?? "");
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
  const todayIso = isoDayOf(today) ?? new Date().toISOString().slice(0, 10);

  const dateFromText = extractDate(body);
  const publication_date = dateFromText ?? extractDate(name);
  const law_number = extractLawNumber({ text: body, fileName: name });
  const official_gazette_number = extractGazetteNumber(body);
  const title = titleFromFileName(name, { year: publication_date ? publication_date.slice(0, 4) : null }) ?? titleFromText(body);
  const fields = {
    title: title || null,
    law_number,
    official_gazette_number,
    publication_date,
    type: title ? lawTypeOf(title) : null,
  };

  const duplicateOf = findDuplicate({ fields, fileName: name, existing: Array.isArray(existing) ? existing : [] });

  const checks = [
    {
      code: "pdf_file",
      ok: ext === "pdf",
      blocking: true,
      message: "الملف ليس PDF. الصفحة الرئيسية تعرض ملفات PDF فقط.",
    },
    {
      code: "title",
      ok: Boolean(fields.title),
      blocking: true,
      message: "تعذّر استخراج عنوان من اسم الملف أو نصه. أدخل العنوان يدوياً.",
    },
    {
      code: "publication_date",
      ok: Boolean(publication_date),
      blocking: true,
      message: "لم نجد تاريخ نشر في النص ولا في اسم الملف. أدخله يدوياً (لا نخمّن التواريخ).",
    },
    {
      code: "date_not_future",
      ok: !publication_date || publication_date <= todayIso,
      blocking: true,
      message: "تاريخ النشر بعد اليوم. تحقق منه.",
    },
    {
      code: "law_number",
      ok: Boolean(law_number),
      blocking: false,
      message: "لم نجد رقم القانون. سينشر النص بلا رقم.",
    },
    {
      code: "gazette_number",
      ok: Boolean(official_gazette_number),
      blocking: false,
      message: "لم نجد رقم عدد الجريدة الرسمية.",
    },
    {
      code: "not_duplicate",
      ok: !duplicateOf,
      blocking: true,
      message: duplicateOf ? `هذا النص موجود مسبقاً: «${duplicateOf.title}».` : "",
    },
  ];

  const blockingFailures = checks.filter((c) => c.blocking && !c.ok);
  const status = duplicateOf ? "duplicate" : blockingFailures.length ? "needs_review" : "ready";

  const eligible = status === "ready";
  const rank = eligible ? landingRankOf({ date: publication_date, title: fields.title }, existing) : null;
  const willShowOnHome = eligible && rank < LANDING_CARD_LIMIT;

  let message;
  if (status === "duplicate") {
    message = `هذا النص موجود مسبقاً: «${duplicateOf.title}». عدّل السجل الحالي بدل إضافة نسخة جديدة.`;
  } else if (status === "needs_review") {
    message = `يحتاج مراجعة قبل النشر: ${blockingFailures.map((c) => c.message).join(" ")}`;
  } else if (willShowOnHome) {
    message = "جاهز للنشر. سيظهر في الصفحة الرئيسية بعد الحفظ.";
  } else {
    message = `جاهز للنشر، لكنه لن يظهر في الصفحة الرئيسية الآن لأن ${LANDING_CARD_LIMIT} نصوص أحدث منه.`;
  }

  return { status, message, fields, checks, duplicateOf, landing: { eligible, rank, willShowOnHome } };
}
