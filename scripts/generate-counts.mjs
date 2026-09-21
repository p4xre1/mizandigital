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

const readData = (fileName) =>
  JSON.parse(readFileSync(path.join(dataDir, fileName), "utf-8"))

const counts = {
  lexicon: countOf("lexicon.json"),
  articles: countOf("articles.json"),
  schools: countOf("schools.json"),
  news: countOf("news.json"),
  events: countOf("events.json"),
  docs: countOf("docs.json"),
}

/*
 * أعداد مشتقّة تُحسب هنا مرة واحدة عند البناء، فلا يُثبَّت رقم في نصّ الصفحة
 * الرئيسية ويمكن أن يتخلّف عن البيانات: توزيع المصطلحات على فروع القانون،
 * وعدد المصطلحات المسندة إلى نصّ ومادة، وتوزيع ملفات الأرشيف على الفصول،
 * وعدد المدن والجامعات في دليل الكليات.
 */
const lexicon = readData("lexicon.json")
const byBranch = new Map()
let withSources = 0
for (const term of lexicon) {
  const branch = term.category || "غير مصنّف"
  byBranch.set(branch, (byBranch.get(branch) || 0) + 1)
  if (Array.isArray(term.legal_sources) && term.legal_sources.length > 0) withSources += 1
}
counts.lexiconBranches = [...byBranch.entries()]
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count)
counts.lexiconWithSources = withSources

const bySemester = new Map()
for (const doc of readData("docs.json")) {
  const semester = doc.semester || "غير محدّد"
  if (!bySemester.has(semester)) bySemester.set(semester, [])
  bySemester.get(semester).push(doc.module || doc.title)
}
counts.docsBySemester = [...bySemester.entries()]
  .map(([semester, modules]) => ({ semester, modules }))
  .sort((a, b) => a.semester.localeCompare(b.semester))

const schools = readData("schools.json")
counts.schoolCities = new Set(schools.map((s) => s.city).filter(Boolean)).size
counts.schoolUniversities = new Set(schools.map((s) => s.university).filter(Boolean)).size

writeFileSync(path.join(dataDir, "counts.json"), JSON.stringify(counts), "utf-8")
console.log("[generate-counts] wrote src/data/counts.json:", counts)
