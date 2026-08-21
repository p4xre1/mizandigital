import { useEffect, useState } from "react"
import { Eye } from "lucide-react"
import { supabase } from "../../lib/supabase/client"

interface ViewCounterProps {
  /** أي قسم ينتمي إليه هذا المحتوى: مقال أم خبر */
  table: "articles" | "news"
  /** السلاق كما يظهر في رابط الصفحة — يعمل مع المحتوى المحلي (JSON) والمحتوى من Supabase على حدّ سواء */
  slug?: string | null
}

/**
 * يعرض عدد المشاهدات الحقيقي، ويزيده مرة واحدة فقط لكل جلسة متصفح
 * (عبر sessionStorage) لتفادي تضخيم العدد عند إعادة تحميل نفس الصفحة.
 * لا يعتمد على وجود صفّ حقيقي في جدول articles/news — يعمل بالسلاق فقط.
 */
export function ViewCounter({ table, slug }: ViewCounterProps) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    const run = async () => {
      const storageKey = `mizan:viewed:${table}:${slug}`
      const alreadyViewedThisSession = window.sessionStorage.getItem(storageKey) === "1"

      if (alreadyViewedThisSession) {
        const { data } = await supabase
          .from("content_stats")
          .select("views_count")
          .eq("source_type", table)
          .eq("source_slug", slug)
          .maybeSingle()
        if (!cancelled) setCount((data as any)?.views_count ?? 0)
        return
      }

      const { data, error } = await (supabase as any).rpc("increment_content_views", {
        p_type: table,
        p_slug: slug,
      })

      if (!cancelled) {
        if (!error && typeof data === "number") {
          setCount(data)
          window.sessionStorage.setItem(storageKey, "1")
        } else {
          setCount(0)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [table, slug])

  if (!slug || count === null) return null

  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground" title="عدد المشاهدات">
      <Eye size={12} />
      {count.toLocaleString("ar-MA")} مشاهدة
    </span>
  )
}