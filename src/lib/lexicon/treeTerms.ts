/**
 * المصطلحات التي لها شجرة قانونية (مصادر وفصول مرتبطة) — وحدها تُعرض في
 * قسم القاموس بالصفحة الرئيسية. لا بطاقة بلا شجرة، فتتساوى التذييلات.
 */

export interface LexiconArticle {
  number?: string
  phrase?: string
}

export interface LexiconSource {
  code_ar?: string
  code_short?: string
  code_fr?: string
  articles?: LexiconArticle[]
}

export interface TreeTerm {
  id: string
  term_ar: string
  term_fr?: string
  definition: string
  category: string
  legal_sources: LexiconSource[]
}

/** أول n مصطلحاً لها مصادر، بترتيب البيانات (ثابت بين البناءات). */
export function pickTreeTerms(all: ReadonlyArray<Record<string, unknown>>, n: number): TreeTerm[] {
  const out: TreeTerm[] = []
  for (const raw of all) {
    const sources = Array.isArray(raw.legal_sources) ? (raw.legal_sources as LexiconSource[]) : []
    if (sources.length === 0) continue
    out.push({
      id: String(raw.id ?? ""),
      term_ar: String(raw.term_ar ?? ""),
      term_fr: raw.term_fr ? String(raw.term_fr) : undefined,
      definition: String(raw.definition ?? ""),
      category: String(raw.category ?? ""),
      legal_sources: sources,
    })
    if (out.length === n) break
  }
  return out.filter((t) => t.id && t.term_ar)
}

/** عدد الفصول الكلي عبر كل المصادر. */
export function articleTotal(term: TreeTerm): number {
  return term.legal_sources.reduce((sum, source) => sum + (source.articles?.length ?? 0), 0)
}

/**
 * لون الفئة. الألوان هنا تُستعمل مفاتيح فقط؛ الأصناف الفعلية في المكوّن
 * (كتابةً صريحة حتى يلتقطها Tailwind).
 */
export type CategoryTone = "blue" | "amber" | "purple" | "red" | "emerald" | "teal" | "slate"

const TONE_BY_CATEGORY: Record<string, CategoryTone> = {
  "قانون مدني": "blue",
  "مسطرة مدنية": "blue",
  "قانون تجاري": "amber",
  "تنظيم قضائي": "purple",
  "مهن قضائية": "purple",
  "قانون جنائي": "red",
  "مسطرة جنائية": "red",
  "مدونة الأسرة": "emerald",
  "قانون دستوري": "teal",
}

export function categoryTone(category: string): CategoryTone {
  return TONE_BY_CATEGORY[category] ?? "slate"
}
