import { BRAND } from "../description"

const KNOWN_BRAND_FORMS = /منصة الميزان الرقمية|منصة ميزان الرقمية|الميزان الرقمية|الميزان الرقمي|ميزان الرقمية|Mizan Digital|Mizan\.page/giu
const SHORT_BRAND_SUFFIX = /(?:^|[|—–-])\s*(ميزان|Mizan)\s*$/iu

export interface BrandConsistencyInput {
  title: string
  openGraphSiteName: string
  schemaNames: string[]
  expectedBrand?: string
}

export interface BrandConsistencyReport {
  brand: string
  titleBrandForms: string[]
  consistent: boolean
  issues: string[]
  evidence: string[]
}

function findTitleBrandForms(title: string): string[] {
  const matches = [...title.matchAll(KNOWN_BRAND_FORMS)].map((match) => match[0])
  const shortSuffix = title.match(SHORT_BRAND_SUFFIX)?.[1]
  if (shortSuffix) matches.push(shortSuffix)
  return [...new Set(matches)]
}

/**
 * Compares brand mentions in a page title with its Open Graph and schema names.
 * The title may omit the brand; when it includes one, it must use the canonical form.
 */
export function analyzeBrandConsistency({
  title,
  openGraphSiteName,
  schemaNames,
  expectedBrand = BRAND,
}: BrandConsistencyInput): BrandConsistencyReport {
  const issues: string[] = []
  const evidence: string[] = []
  const titleBrandForms = findTitleBrandForms(title || "")

  if (titleBrandForms.length === 0) {
    evidence.push("العنوان لا يتضمن اسماً للعلامة التجارية.")
  } else {
    const mismatches = titleBrandForms.filter((name) => name !== expectedBrand)
    if (mismatches.length) {
      issues.push(`صيغة العلامة في العنوان غير موحّدة: ${mismatches.map((name) => `«${name}»`).join("، ")}؛ الصيغة المعتمدة «${expectedBrand}».`)
    } else {
      evidence.push(`العنوان يستخدم الصيغة المعتمدة «${expectedBrand}».`)
    }
  }

  if (!openGraphSiteName?.trim()) {
    issues.push("وسم og:site_name مفقود.")
  } else if (openGraphSiteName !== expectedBrand) {
    issues.push(`og:site_name هو «${openGraphSiteName}»؛ يجب أن يطابق «${expectedBrand}» حرفياً.`)
  } else {
    evidence.push(`og:site_name يطابق «${expectedBrand}».`)
  }

  if (!schemaNames.length) {
    issues.push("لا توجد أسماء علامة قابلة للفحص في بيانات Schema.")
  } else {
    schemaNames.forEach((name, index) => {
      if (name !== expectedBrand) {
        issues.push(`اسم العلامة في Schema رقم ${index + 1} هو «${name || "فارغ"}»؛ يجب أن يطابق «${expectedBrand}» حرفياً.`)
      }
    })
    if (schemaNames.every((name) => name === expectedBrand)) {
      evidence.push(`أسماء Organization وWebSite وPublisher في Schema تطابق «${expectedBrand}».`)
    }
  }

  return {
    brand: expectedBrand,
    titleBrandForms,
    consistent: issues.length === 0,
    issues,
    evidence,
  }
}
