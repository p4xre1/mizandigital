/**
 * src/lib/seo/generators/refresh.ts
 *
 * Content Refresh Generator + News Freshness Checker.
 *
 * يرتّب المحتوى حسب أولوية التحديث بناءً على قياسات فعلية (العمر، حجم
 * التقادم، ضعف البنية) — لا يخمّن.
 */

import { analyzeBodyStructure, analyzeText } from "../analyzers/text"
import { extractEntities } from "../analyzers/entities"

export interface RefreshCandidate {
  slug: string
  title: string
  /** أولوية التحديث 0-100 (الأعلى = أكثر إلحاحاً). */
  priority: number
  updatedAt: string | null
  daysSinceUpdate: number
  reasons: string[]
  actions: string[]
}

/**
 * حساب أولوية تحديث محتوى واحد.
 *
 * العوامل: عمر المحتوى، ذكر سنوات قد تكون تقادمت، ضعف البنية، قلة الكيانات.
 */
export function evaluateRefresh(input: {
  slug: string
  title: string
  body: string
  updatedAt?: string
  publishedAt?: string
  now?: Date
}): RefreshCandidate {
  const now = input.now ?? new Date()
  const reasons: string[] = []
  const actions: string[] = []

  const reference = input.updatedAt || input.publishedAt
  let daysSinceUpdate = -1
  if (reference) {
    const then = new Date(reference)
    if (!Number.isNaN(then.getTime())) {
      daysSinceUpdate = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
    }
  }

  const ageScore = daysSinceUpdate < 0 ? 40 : Math.min(100, (daysSinceUpdate / 540) * 100)
  if (daysSinceUpdate > 365) reasons.push(`لم يُحدَّث منذ ${daysSinceUpdate} يوماً`)
  if (daysSinceUpdate < 0) reasons.push("لا يوجد تاريخ تحديث معلوم")

  // سنوات مذكورة في النص = خطر تقادم الأرقام
  const years = [...new Set((input.body.match(/20\d{2}/g) || []))]
  const staleYears = years.filter((y) => Number(y) < now.getFullYear() - 1)
  if (staleYears.length) {
    reasons.push(`يذكر سنوات قديمة: ${staleYears.slice(0, 4).join("، ")}`)
    actions.push("تحقق من صحة الأرقام والتواريخ المذكورة وحدّثها.")
  }

  const structure = analyzeBodyStructure(input.body)
  const metrics = analyzeText(structure.proseText)
  const entityReport = extractEntities(input.body, metrics.words)

  if (structure.h2Count < 3) {
    reasons.push(`بنية ضعيفة (${structure.h2Count} عنوان H2)`)
    actions.push("قسّم المحتوى إلى 3 عناوين H2 على الأقل.")
  }
  if (!structure.hasLists) {
    reasons.push("بلا قوائم")
    actions.push("أضف قائمة نقطية لتحسين الالتقاط كمقتطف.")
  }
  if (entityReport.byKind["legal-article"] === 0) {
    reasons.push("بلا إحالات تشريعية محددة")
    actions.push("أضف فصولاً/مواد محددة مع رابط المصدر الرسمي.")
  }
  if (metrics.words < 400) {
    reasons.push(`محتوى قصير (${metrics.words} كلمة)`)
    actions.push("وسّع المحتوى إلى 600+ كلمة.")
  }

  const structureScore = 100 - Math.min(100, structure.h2Count * 15 + (structure.hasLists ? 20 : 0) + (entityReport.byKind["legal-article"] > 0 ? 20 : 0))
  const priority = Math.round(ageScore * 0.5 + structureScore * 0.35 + (staleYears.length ? 15 : 0))

  if (actions.length === 0) actions.push("راجع الإحالات التشريعية ثم حدّث تاريخ التحديث.")

  return {
    slug: input.slug,
    title: input.title,
    priority: Math.min(100, priority),
    updatedAt: input.updatedAt || null,
    daysSinceUpdate,
    reasons,
    actions,
  }
}

/** ترتيب قائمة محتوى حسب أولوية التحديث. */
export function rankForRefresh(candidates: RefreshCandidate[]): RefreshCandidate[] {
  return [...candidates].sort((a, b) => b.priority - a.priority)
}

/**
 * News Freshness Checker: يحدد الأخبار التي تجاوزت صلاحيتها الإخبارية.
 * الأخبار تفقد قيمتها أسرع من المقالات المرجعية.
 */
export function checkNewsFreshness(
  news: { id: string; title: string; date?: string }[],
  options: { maxAgeDays?: number; now?: Date } = {}
): { id: string; title: string; daysOld: number; stale: boolean }[] {
  const maxAge = options.maxAgeDays ?? 120
  const now = options.now ?? new Date()

  return news.map((item) => {
    const then = item.date ? new Date(item.date) : null
    const daysOld = then && !Number.isNaN(then.getTime())
      ? Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
      : -1
    return {
      id: item.id,
      title: item.title,
      daysOld,
      stale: daysOld < 0 || daysOld > maxAge,
    }
  })
}
