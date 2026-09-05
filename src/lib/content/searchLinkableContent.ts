import { supabase } from "../supabase/client"

export interface LinkableResult {
  title: string
  path: string // رابط داخلي جاهز، مثال: /articles/my-slug
  type: "article" | "news"
}

/**
 * يبحث فـ المقالات والأخبار المنشورة (بالعنوان) لأجل ميزة "الروابط الداخلية"
 * فـ محرر النصوص، حتى يقدر المحرر يربط مقال بمقال/خبر آخر داخل المنصة
 * بسهولة بلا ما يكتب الرابط يدوياً.
 */
export async function searchLinkableContent(query: string): Promise<LinkableResult[]> {
  const q = query.trim()
  if (!q) return []

  const [articlesRes, newsRes] = await Promise.all([
    supabase
      .from("articles")
      .select("title, slug")
      .eq("status", "published")
      .ilike("title", `%${q}%`)
      .limit(6),
    supabase
      .from("news")
      .select("title, slug")
      .eq("is_published", true)
      .ilike("title", `%${q}%`)
      .limit(6),
  ])

  const articles: LinkableResult[] = (articlesRes.data || []).map((a: any) => ({
    title: a.title,
    path: `/articles/${a.slug}`,
    type: "article",
  }))

  const news: LinkableResult[] = (newsRes.data || []).map((n: any) => ({
    title: n.title,
    path: `/news/${n.slug}`,
    type: "news",
  }))

  return [...articles, ...news]
}
