import type { ArticleRecord } from "../types";

export function selectFeaturedArticles(articles: ArticleRecord[]) {
  return articles.filter((article) => article.title.length > 0).slice(0, 5);
}
