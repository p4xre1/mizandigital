// scripts/generate-counts.mjs
//
// P1-3: HomePage كان يستورد lexicon.json كاملاً (~151KB) فقط للحصول على
// lexiconData.length (عدّاد رقمي). هذا السكربت يُنفَّذ فـ prebuild ويحسب
// الأعداد مرة واحدة عند البناء، ويكتبها فـ ملف صغير جداً (src/data/counts.json)
// يستورده HomePage بدل الملف الكامل. ملفات JSON الأصلية تبقى كما هي —
// prerender.mjs ما زال يستخدمها كاملة كما هي.

import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dataDir = path.join(rootDir, "src", "data")

function countOf(fileName) {
  const raw = readFileSync(path.join(dataDir, fileName), "utf-8")
  return JSON.parse(raw).length
}

// المصطلحات التي لها شجرة قانونية (legal_sources غير فارغ) — تعرضها الصفحة الرئيسية.
function lexiconTreeCount() {
  const raw = readFileSync(path.join(dataDir, "lexicon.json"), "utf-8")
  return JSON.parse(raw).filter((t) => Array.isArray(t.legal_sources) && t.legal_sources.length > 0).length
}

const counts = {
  lexicon: countOf("lexicon.json"),
  lexiconTree: lexiconTreeCount(),
  articles: countOf("articles.json"),
  schools: countOf("schools.json"),
  news: countOf("news.json"),
  events: countOf("events.json"),
  docs: countOf("docs.json"),
}

writeFileSync(path.join(dataDir, "counts.json"), JSON.stringify(counts), "utf-8")
console.log("[generate-counts] wrote src/data/counts.json:", counts)
