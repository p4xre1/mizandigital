/**
 * سلامة مخطَّط AI Catalog / ARD — منع تكرار فشل التحقق.
 *
 * يتحقق المخطَّطان (public/.well-known/ai-catalog.json و public/.well-known/ard.json)
 * من متطلبات مواصفة AI Catalog Standard و ARD (agenticresourcediscovery.org):
 *  - خصائص جذرية إلزامية: specVersion (صيغة "Major.Minor") ومصفوفة entries غير فارغة
 *  - كائن host يحمل displayName
 *  - كل entry: معرف URN (urn:air:mizan.page:...)، وdisplayName، وtype،
 *    وurl حصرًا (لا url و data معًا)
 *  - 2 إلى 5 من representativeQueries لكل entry (إشارة اكتشاف ARD)
 *  - روابط entries تشير إلى ملفات موجودة فعلًا في public/ أو مسارات SPA معروفة
 */
import { describe, expect, test } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = path.join(rootDir, "public")

const MANIFESTS = [
  path.join(publicDir, ".well-known", "ai-catalog.json"),
  path.join(publicDir, ".well-known", "ard.json"),
]

// نمط المعرف القياسي (ARD Appendix C / AI Catalog Standard)
const URN_PATTERN = /^urn:air:[a-zA-Z0-9.-]+(:[a-zA-Z0-9._-]+)+$/

// مسارات يخدمها تطبيق SPA — لا توجد كملفات ثابتة داخل public/
const SPA_ROUTES = new Set([
  "/",
  "/articles",
  "/news",
  "/lexicon",
  "/schools",
  "/archive",
  "/events",
  "/search",
  "/quiz",
  "/platform",
  "/faq",
])

type Entry = {
  identifier: string
  displayName: string
  type: string
  url?: string
  data?: unknown
  representativeQueries?: string[]
}

function load(p: string) {
  return JSON.parse(readFileSync(p, "utf8"))
}

for (const file of MANIFESTS) {
  const name = path.relative(publicDir, file)

  describe(`AI Catalog manifest — ${name}`, () => {
    const doc = load(file)

    test("contains required root properties (specVersion, entries)", () => {
      expect(typeof doc.specVersion).toBe("string")
      expect(doc.specVersion).toMatch(/^\d+\.\d+$/)
      expect(Array.isArray(doc.entries)).toBe(true)
      expect(doc.entries.length).toBeGreaterThan(0)
    })

    test("has a host object with a displayName", () => {
      expect(typeof doc.host).toBe("object")
      expect(doc.host).not.toBeNull()
      expect(typeof doc.host?.displayName).toBe("string")
      expect((doc.host?.displayName as string).length).toBeGreaterThan(0)
    })

    test("each entry has a valid URN identifier, type, and exactly one of url/data", () => {
      for (const entry of doc.entries as Entry[]) {
        expect(entry.identifier, "identifier must match urn:air:<publisher>:...").toMatch(URN_PATTERN)
        expect(entry.identifier, "publisher must be mizan.page").toMatch(/^urn:air:mizan\.page:/)
        expect(typeof entry.displayName).toBe("string")
        expect(entry.displayName.length).toBeGreaterThan(0)
        expect(typeof entry.type).toBe("string")
        expect(entry.type.length).toBeGreaterThan(0)
        // قاعدة «قيمة أو مرجع»: url و data متبادلان حصرًا
        expect(Boolean(entry.url) !== Boolean(entry.data)).toBe(true)
      }
    })

    test("each entry carries 2-5 representativeQueries", () => {
      for (const entry of doc.entries as Entry[]) {
        const rq = entry.representativeQueries
        expect(Array.isArray(rq), `${entry.identifier}: representativeQueries must be an array`).toBe(true)
        expect(rq!.length, `${entry.identifier}: expected 2-5 queries, got ${rq!.length}`).toBeGreaterThanOrEqual(2)
        expect(rq!.length).toBeLessThanOrEqual(5)
        for (const q of rq!) expect(typeof q).toBe("string")
      }
    })

    test("identifiers are unique", () => {
      const ids = (doc.entries as Entry[]).map((e) => e.identifier)
      expect(new Set(ids).size).toBe(ids.length)
    })

    test("entry urls point at existing resources on mizan.page", () => {
      for (const entry of doc.entries as Entry[]) {
        const u = new URL(entry.url!)
        expect(u.origin).toBe("https://www.mizan.page")
        const p = decodeURIComponent(u.pathname)
        const isStatic = p === "/" ? false : existsSync(path.join(publicDir, p))
        const normalized = p.length > 1 ? p.replace(/\/+$/, "") : p
        const isSpa = SPA_ROUTES.has(p) || SPA_ROUTES.has(normalized)
        expect(isStatic || isSpa, `${entry.identifier} -> ${p} not found in public/ nor SPA routes`).toBe(true)
      }
    })
  })
}

test("ai-catalog.json and ard.json stay in sync (same content)", () => {
  const a = load(MANIFESTS[0])
  const b = load(MANIFESTS[1])
  expect(JSON.stringify(a)).toBe(JSON.stringify(b))
})
