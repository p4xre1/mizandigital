#!/usr/bin/env node
/**
 * تقرير مراجعة الاستشهادات القانونية (report only by default)
 *
 *   node scripts/check-law-citations.mjs            → تقرير، رمز الخروج 0
 *   node scripts/check-law-citations.mjs --strict   → رمز الخروج 1 عند وجود أخطاء أو تحذيرات
 *   node scripts/check-law-citations.mjs --today=2026-10-09
 *
 * المصادر: المقالات، الأخبار، أسئلة الاختبارات، المعجم (النصوص + legal_sources)،
 * أرشيف القوانين (laws.client.json)، وملف الحالات الاختياري (law-status.json).
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditCitations, extractLawCitations } from "../shared/laws/citations.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data");
const strict = process.argv.includes("--strict");
const todayArg = process.argv.find((a) => a.startsWith("--today="))?.slice("--today=".length);
const today =
  todayArg ?? new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });

/** Keys whose values are identifiers or URLs, not prose, so they are skipped. */
const SKIP_KEYS = new Set(["id", "slug", "url", "canonical_url", "source_url", "pdf_url", "image", "href", "last_verified", "last_reviewed"]);

/** Collects every string value in a JSON tree with its path, for citation search. */
function collectStrings(node, where, out = []) {
  if (typeof node === "string") {
    out.push({ where, text: node });
  } else if (Array.isArray(node)) {
    node.forEach((item, i) => collectStrings(item, `${where}[${i}]`, out));
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (SKIP_KEYS.has(key)) continue;
      collectStrings(value, where ? `${where}.${key}` : key, out);
    }
  }
  return out;
}

async function readJson(file, fallback) {
  const full = path.join(dataDir, file);
  if (!existsSync(full)) return fallback;
  try {
    return JSON.parse(await readFile(full, "utf8"));
  } catch (err) {
    console.warn(`تعذّر قراءة ${file}: ${err.message}`);
    return fallback;
  }
}

const contentFiles = ["articles.json", "news.json", "quiz-questions.json", "lexicon.json"];

const citations = [];
for (const file of contentFiles) {
  const data = await readJson(file, null);
  if (data === null) continue;
  for (const { where, text } of collectStrings(data, file)) {
    for (const c of extractLawCitations(text)) citations.push({ number: c.number, source: where });
  }
}

// مصادر المعجم القانونية: تاريخ آخر تحقق لكل مصدر
const lexicon = await readJson("lexicon.json", []);
const sources = [];
if (Array.isArray(lexicon)) {
  lexicon.forEach((entry, i) => {
    for (const [j, src] of (entry?.legal_sources ?? []).entries()) {
      if (src?.last_verified) {
        sources.push({
          code: src.code_short || src.code_ar || "source",
          last_verified: src.last_verified,
          source: `lexicon.json[${i}].legal_sources[${j}]`,
        });
      }
    }
  });
}

const archiveFile = await readJson("laws.client.json", {});
const archive = Array.isArray(archiveFile?.laws) ? archiveFile.laws : [];

const statusFile = await readJson("law-status.json", null);
const statuses = statusFile ? (statusFile.statuses ?? statusFile) : {};

const { findings, summary } = auditCitations({ citations, archive, statuses, sources, today });

console.log(`مراجعة الاستشهادات القانونية — ${today}`);
console.log(
  `الاستشهادات: ${summary.citations} | قوانين مختلفة: ${summary.uniqueLaws} | صفوف الأرشيف: ${summary.archiveRows}`,
);
if (summary.archiveRows === 0) {
  console.log("ملاحظة: الأرشيف فارغ في هذه النسخة، لذلك لا يمكن التحقق من وجود القوانين المذكورة.");
}
console.log(`أخطاء: ${summary.errors} | تحذيرات: ${summary.warnings} | معلومات: ${summary.infos}`);

const order = { error: 0, warning: 1, info: 2 };
for (const f of [...findings].sort((a, b) => order[a.severity] - order[b.severity] || String(a.number).localeCompare(String(b.number)))) {
  const age = f.ageDays !== undefined ? ` (${f.ageDays} يوماً)` : "";
  console.log(`[${f.severity}] ${f.code} — ${f.number}${age}`);
  for (const s of f.sources.slice(0, 5)) console.log(`    · ${s}`);
  if (f.sources.length > 5) console.log(`    · … و${f.sources.length - 5} مواضع أخرى`);
}

if (strict && (summary.errors > 0 || summary.warnings > 0)) {
  console.error("فشل --strict: توجد أخطاء أو تحذيرات.");
  process.exit(1);
}
