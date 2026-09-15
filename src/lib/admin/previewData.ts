/**
 * Mock preview data for admin — allows testing UI with different content states
 */

export const MOCK_PREVIEW_ARTICLES = [
  { slug: "qanun-58-25", title: "صدور قانون المسطرة المدنية الجديد رقم 58.25", category: "أخبار", views: 1234 },
  { slug: "modawana-jadida", title: "مستجدات مدونة الأسرة", category: "مقالات", views: 892 },
];

export const MOCK_PREVIEW_QUIZ = {
  xp: 450,
  rank: "B",
  attempts: 23,
  accuracy: 78,
};

export function getPreviewData(type: "articles" | "quiz") {
  if (type === "articles") return MOCK_PREVIEW_ARTICLES;
  return MOCK_PREVIEW_QUIZ;
}
