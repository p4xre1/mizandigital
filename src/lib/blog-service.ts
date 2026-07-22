// 1. التحديد النوعي الصارم لبنية المقال (Strict Architecture Contract)
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: "قانون" | "تقنية" | "تطوير";
  readingTime: number;
}

// 2. مخزن البيانات الداخلي المحصن (In-Memory Database)
const BLOG_POSTS_DATABASE: BlogPost[] = [
  {
    slug: "smart-contracts-legal-status",
    title: "الحجية القانونية للعقود الذكية في الأنظمة العربية",
    excerpt: "دراسة تحليلية حول مدى اعتراف المحاكم العربية بالعقود المشفرة القائمة على تقنية البلوكشين.",
    date: "2026-07-15",
    category: "قانون",
    readingTime: 5,
    content: `
      تعتبر العقود الذكية (Smart Contracts) من أبرز تجليات التداخل بين التقنية والقانون. 
      فهي برمجيات ذاتية التنفيذ تعتمد على معادلة منطقية صارمة:
      
      إذا تحقق الشرط X، يتم تنفيذ الأثر القانوني Y تلقائياً دون تدخل بشري.
      
      وفي الأنظمة القضائية الحديثة، يثور التساؤل حول مدى مطابقة هذه العقود لتعريف "الكتابة الإلكترونية الرسمية". 
      تشير القوانين الرقمية الحديثة إلى أن العقد المشفر يعد ملزماً في حال توفرت فيه أركان الرضا، والمحل، والسبب الشكلي المقبول قانوناً.
    `
  },
  {
    slug: "optimizing-nextjs-cloudflare",
    title: "كيف ترفع سرعة مدونتك على كلاود فلير إلى أقصى حد؟",
    excerpt: "دليلك الهندسي لتقليص زمن استجابة السيرفر وتفعيل كاش الحافة لمدونات Next.js.",
    date: "2026-07-10",
    category: "تقنية",
    readingTime: 4,
    content: `
      السرعة هي الروح المغذية لمدونتك. عند استضافة المدونة على Cloudflare Pages، 
      فإنك تحصل تلقائياً على ميزة التوزيع العالمي. 
      
      لتحقيق أفضل أداء، احرص على تصدير المدونة كملفات ثابتة (Static HTML) 
      بحيث يتم معالجتها بالكامل على الـ Edge Network، مما يحمي خادمك من الانهيار 
      ويضمن تجربة تصفح فائقة النعومة للمستخدم النهائي.
    `
  }
];

// 3. المحرك البرمجي الصارم للاستعلام وجلب البيانات (Data Access Layer)

/**
 * جلب جميع المقالات مرتبة من الأحدث إلى الأقدم
 */
export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS_DATABASE].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * جلب مقال واحد محدد باستخدام الـ Slug الخاص به
 * يعيد المقال أو undefined في حال عدم وجوده
 */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS_DATABASE.find((post) => post.slug === slug);
}

/**
 * جلب المقالات التابعة لتصنيف معين فقط
 */
export function getPostsByCategory(category: BlogPost["category"]): BlogPost[] {
  return BLOG_POSTS_DATABASE.filter((post) => post.category === category);
}