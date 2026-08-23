// utils/recommend.ts
//
// خوارزمية اقتراح محتوى بسيطة وخفيفة (بدون خدمة خارجية أو نموذج تعلّم آلي):
// تُرتّب لائحة من العناصر المرشّحة حسب مدى صلتها بعنصر أساسي (المقال/المصطلح
// الذي يقرؤه الزائر حالياً)، اعتماداً على ثلاثة معايير:
//   1) تطابق التصنيف (الوزن الأكبر)
//   2) تداخل الكلمات المفتاحية بين النصّين (تشابه Jaccard مبسّط بعد تطبيع عربي)
//   3) الحداثة (ترجيح خفيف جداً للعناصر الأحدث عند تساوي التشابه)
//
// تُستخدم هذه الدالة من ArticlePage (مقالات ذات صلة) وTermPage (مصطلحات ذات
// صلة)، ويمكن إعادة استخدامها لأي محتوى آخر مستقبلاً (أخبار، ندوات...).

import { normalizeArabic } from "./search"

export interface RecommendableItem {
  id: string
  slug: string
  title: string
  text?: string | null // نص إضافي يُستخدم لحساب التشابه (تعريف/ملخص/محتوى)
  category?: string | null
  date?: string | null
}

// كلمات وظيفية عربية شائعة لا تحمل دلالة موضوعية، تُستبعد من حساب التشابه
const ARABIC_STOPWORDS = new Set([
  "من", "الى", "إلى", "في", "على", "عن", "مع", "هذا", "هذه", "ذلك", "التي",
  "الذي", "و", "أو", "او", "ثم", "كما", "قد", "لا", "لم", "لن", "ما", "هو",
  "هي", "كل", "بين", "عند", "بعد", "قبل", "غير", "دون", "إذا", "اذا", "كان",
  "كانت", "يكون", "أن", "ان", "إن",
])

function extractKeywords(text: string): Set<string> {
  const normalized = normalizeArabic(text)
  const words = normalized
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !ARABIC_STOPWORDS.has(w))
  return new Set(words)
}

// تشابه Jaccard بسيط: حجم التقاطع مقسوماً على حجم الاتحاد
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  a.forEach((w) => {
    if (b.has(w)) intersection += 1
  })
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function daysAgo(dateStr?: string | null): number {
  if (!dateStr) return 9999
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, diff / (1000 * 60 * 60 * 24))
}

/**
 * يرتّب `candidates` تنازلياً حسب مدى صلتها بـ `base`، ويعيد أفضل `limit` عنصر.
 * يستبعد العنصر نفسه تلقائياً (بمطابقة الـ slug).
 */
export function rankRelatedItems<T extends RecommendableItem>(
  base: RecommendableItem,
  candidates: T[],
  limit: number = 3
): T[] {
  const baseKeywords = extractKeywords(`${base.title} ${base.text || ""}`)

  const scored = candidates
    .filter((item) => item.slug !== base.slug)
    .map((item) => {
      const categoryScore = base.category && item.category === base.category ? 1 : 0
      const textScore = jaccardSimilarity(
        baseKeywords,
        extractKeywords(`${item.title} ${item.text || ""}`)
      )
      // ترجيح الحداثة: عنصر نُشر خلال آخر 30 يوماً يحصل على دفعة صغيرة جداً
      const recencyScore = daysAgo(item.date) <= 30 ? 0.05 : 0

      const score = categoryScore * 0.6 + textScore * 0.35 + recencyScore
      return { item, score }
    })
    // نتجاهل التطابقات الضعيفة جداً (لا تصنيف مشترك ولا كلمات مشتركة) إلا إذا
    // لم يكن هناك عدد كافٍ من النتائج الأفضل
    .sort((a, b) => b.score - a.score)

  const strong = scored.filter((s) => s.score > 0)
  const pool = strong.length >= limit ? strong : scored

  return pool.slice(0, limit).map((s) => s.item)
}
