import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { analyzeBrandConsistency } from "../src/lib/seo/analyzers/brandConsistency"
import { BRAND, fitTitle } from "../src/lib/seo/description"
import {
  generateArticleSchema as generateArticleEntitySchema,
  generateOrganizationSchema as generateEntityOrganizationSchema,
  generateWebSiteSchema as generateEntityWebsiteSchema,
  SITE_CONFIG,
} from "../src/lib/seo/schema"
import {
  generateArticleSchema as generateHeadArticleSchema,
  generateOrganizationSchema as generateHeadOrganizationSchema,
  generateWebsiteSchema as generateHeadWebsiteSchema,
} from "../src/components/seo/SchemaOrg"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

describe("brand consistency", () => {
  test("uses the canonical Arabic brand when a page title includes the brand", () => {
    const result = analyzeBrandConsistency({
      title: fitTitle("دليل الطالب | ميزان الرقمية"),
      openGraphSiteName: BRAND,
      schemaNames: [BRAND, BRAND, BRAND],
    })

    expect(BRAND).toBe("ميزان الرقمية")
    expect(result.consistent).toBe(true)
    expect(result.titleBrandForms).toEqual([BRAND])
  })

  test("flags alternate spellings in titles and inconsistent Open Graph or schema names", () => {
    const result = analyzeBrandConsistency({
      title: "دليل الطالب | منصة الميزان الرقمية",
      openGraphSiteName: "Mizan Digital",
      schemaNames: ["منصة الميزان الرقمية", BRAND],
    })

    expect(result.consistent).toBe(false)
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("منصة الميزان الرقمية"),
      expect.stringContaining("og:site_name"),
      expect.stringContaining("Schema"),
    ]))
  })

  test("treats a title without a brand mention as neutral, not a mismatch", () => {
    const result = analyzeBrandConsistency({
      title: "شرح قانوني مفصل",
      openGraphSiteName: BRAND,
      schemaNames: [BRAND],
    })

    expect(result.consistent).toBe(true)
    expect(result.evidence).toContain("العنوان لا يتضمن اسماً للعلامة التجارية.")
  })

  test("runtime organization, website, and article publishers share one exact name", () => {
    const entityOrganization = generateEntityOrganizationSchema()
    const entityWebsite = generateEntityWebsiteSchema()
    const headOrganization = generateHeadOrganizationSchema()
    const headWebsite = generateHeadWebsiteSchema()
    const entityArticle = generateArticleEntitySchema({
      title: "عنوان مقال",
      description: "وصف المقال",
      url: "https://www.mizan.page/articles/test",
      datePublished: "2026-10-09",
    })
    const headArticle = generateHeadArticleSchema({
      title: "عنوان مقال",
      description: "وصف المقال",
      url: "https://www.mizan.page/articles/test",
    })

    expect(SITE_CONFIG.name).toBe(BRAND)
    expect(entityOrganization.name).toBe(BRAND)
    expect(entityWebsite.name).toBe(BRAND)
    expect(headOrganization.name).toBe(BRAND)
    expect(headWebsite.name).toBe(BRAND)
    expect(entityArticle.publisher.name).toBe(BRAND)
    expect(headArticle.publisher.name).toBe(BRAND)
    expect(headWebsite.publisher.name).toBe(BRAND)
  })

  test("the document shell and runtime metadata use the shared brand constant", () => {
    const index = read("index.html")
    const seoHead = read("src/components/seo/SEOHead.tsx")
    const prerender = read("scripts/prerender.mjs")

    expect(index).toContain(`<meta property="og:site_name" content="${BRAND}">`)
    expect(index).toContain(`"name":"${BRAND}"`)
    expect(seoHead).toContain('setMeta("og:site_name", BRAND, "property")')
    expect(prerender).toContain("name: BRAND")
  })
})
