// 1. Strict Architecture Contract for Blog Posts
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: "قانون" | "تقنية" | "تطوير" | "Droit" | "Tech" | "Law";
  readingTime: number;
  coverImage?: string;
  author?: {
    name: string;
    role?: string;
  };
}

// 2. In-Memory Database
const BLOG_POSTS_DATABASE: BlogPost[] = [
  {
    slug: "smart-contracts-legal-status",
    title: "الحجية القانونية للعقود الذكية في الأنظمة العربية",
    excerpt: "دراسة تحليلية حول مدى اعتراف المحاكم العربية بالعقود المشفرة القائمة على تقنية البلوكشين.",
    date: "2026-07-15",
    category: "قانون",
    readingTime: 5,
    author: {
      name: "منصة ميزان الرقمية",
      role: "القسم القانوني",
    },
    content: `
تعتبر العقود الذكية (Smart Contracts) من أبرز تجليات التداخل بين التقنية والقانون. 
فهي برمجيات ذاتية التنفيذ تعتمد على معادلة منطقية صارمة:

إذا تحقق الشرط X، يتم تنفيذ الأثر القانوني Y تلقائياً دون تدخل بشري.

وفي الأنظمة القضائية الحديثة، يثور التساؤل حول مدى مطابقة هذه العقود لتعريف "الكتابة الإلكترونية الرسمية". 
تشير القوانين الرقمية الحديثة إلى أن العقد المشفر يعد ملزماً في حال توفرت فيه أركان الرضا، والمحل، والسبب الشكلي المقبول قانوناً.
    `.trim(),
  },
  {
    slug: "optimizing-nextjs-cloudflare",
    title: "كيف ترفع سرعة مدونتك على كلاود فلير إلى أقصى حد؟",
    excerpt: "دليلك الهندسي لتقليص زمن استجابة السيرفر وتفعيل كاش الحافة لمدونات Next.js.",
    date: "2026-07-10",
    category: "تقنية",
    readingTime: 4,
    author: {
      name: "منصة ميزان الرقمية",
      role: "الفريق التقني",
    },
    content: `
السرعة هي الروح المغذية لمدونتك. عند استضافة المدونة على Cloudflare Pages، 
فإنك تحصل تلقائياً على ميزة التوزيع العالمي. 

لتحقيق أفضل أداء، احرص على تصدير المدونة كملفات ثابتة (Static HTML) 
بحيث يتم معالجتها بالكامل على الـ Edge Network، مما يحمي خادمك من الانهيار 
ويضمن تجربة تصفح فائقة النعومة للمستخدم النهائي.
    `.trim(),
  },
];

// 3. Data Access Layer (DAL) Utilities

/**
 * Fetch all posts sorted chronologically from newest to oldest
 */
export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS_DATABASE].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Fetch a single blog post by its unique URL slug
 */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS_DATABASE.find((post) => post.slug === slug);
}

/**
 * Fetch all blog posts belonging to a specific category
 */
export function getPostsByCategory(category: BlogPost["category"]): BlogPost[] {
  return getAllPosts().filter((post) => post.category === category);
}

/**
 * Search posts by query string matching title, excerpt, or content
 */
export function searchPosts(query: string): BlogPost[] {
  const q = query.trim().toLowerCase();
  if (!q) return getAllPosts();

  return getAllPosts().filter(
    (post) =>
      post.title.toLowerCase().includes(q) ||
      post.excerpt.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q)
  );
}