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

const counts = {
  lexicon: countOf("lexicon.json"),
  articles: countOf("articles.json"),
  schools: countOf("schools.json"),
  news: countOf("news.json"),
  events: countOf("events.json"),
  docs: countOf("docs.json"),
}

writeFileSync(path.join(dataDir, "counts.json"), JSON.stringify(counts), "utf-8")
console.log("[generate-counts] wrote src/data/counts.json:", counts)
