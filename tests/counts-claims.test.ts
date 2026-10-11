// أرقام المعجم الإجمالية المعلنة في النصوص العامة تُقرأ من src/data/counts.json
// (الذي يولّده prebuild من lexicon.json) ولا تُكتب باليد.
//
// لماذا؟ بعد دمج مصطلحين مكرّرين في المعجم (325 → 323) بقي الرقم القديم في
// سبعة ملفات، وبقيت «250» في قالب index.html داخل @graph يُنسخ في كل صفحة من
// صفحات الموقع (441)، فظهرت أرقام قديمة في نصوص مفهرسة وفي البيانات المهيكلة.
// هذا الفحص يمنع تكرارها: أي رقم إجمالي (≥50) مكتوب بجانب «مصطلح» يجب أن يطابق
// العدد الحقيقي في البيانات.
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import counts from "../src/data/counts.json"

const ROOT = join(__dirname, "..")
const EXT = /\.(tsx?|jsx?|mjs)$/
const SCAN_DIRS = ["shared", "src/components", "src/content/legal", "src/pages"]
const SCAN_FILES = ["index.html"]

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (EXT.test(entry.name)) out.push(full)
  }
  return out
}

describe("الأرقام الإجمالية للمعجم في النصوص", () => {
  test("لا رقم «مصطلح» إجمالي يخالف counts.json", () => {
    const files = [
      ...SCAN_FILES.map((f) => join(ROOT, f)),
      ...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))),
    ]

    const stale: string[] = []
    for (const file of files) {
      const src = readFileSync(file, "utf8")
      for (const match of src.matchAll(/(\d+)\s*مصطلح/g)) {
        const claimed = Number(match[1])
        // الأرقام الصغيرة دعاوى محلية («8 مصطلحات في هذا المحور») لا إجمالية.
        if (claimed < 50) continue
        if (claimed !== counts.lexicon) {
          const line = src.slice(0, match.index ?? 0).split("\n").length
          stale.push(`${file.slice(ROOT.length + 1)}:${line} → ${claimed}`)
        }
      }
    }

    expect(stale).toEqual([])
  })
})
