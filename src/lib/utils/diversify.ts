// utils/diversify.ts
//
// خوارزمية تنويع بسيطة (Round-robin diversification): تُستخدم في عرض "أحدث
// المستجدات" بالصفحة الرئيسية حتى لا تُهيمن فئة واحدة على اللائحة المعروضة.
// الفكرة: نرتّب العناصر داخل كل تصنيف حسب الأحدث، ثم نأخذ عنصراً واحداً من
// كل تصنيف بالتناوب إلى أن نصل إلى العدد المطلوب — بذلك تبقى القائمة حديثة
// زمنياً ومتنوعة موضوعياً في آن واحد.

export interface DiversifiableItem {
  category?: string | null
  date?: string | null
}

export function diversifyByCategory<T extends DiversifiableItem>(items: T[], limit: number): T[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  )

  const buckets = new Map<string, T[]>()
  sorted.forEach((item) => {
    const key = item.category || "عام"
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(item)
  })

  const categories = Array.from(buckets.keys())
  const result: T[] = []
  let cursor = 0
  let safety = 0
  const maxSafety = sorted.length * 2 + 10

  while (result.length < limit && categories.length > 0 && safety < maxSafety) {
    const cat = categories[cursor % categories.length]
    const bucket = buckets.get(cat)!
    if (bucket.length > 0) {
      result.push(bucket.shift()!)
    }
    cursor++
    safety++
    // إذا استُنفدت كل الفئات نتوقف حتى لو لم نبلغ limit
    if (categories.every((c) => buckets.get(c)!.length === 0)) break
  }

  return result
}
