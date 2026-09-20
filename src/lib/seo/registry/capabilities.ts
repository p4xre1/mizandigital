/**
 * src/lib/seo/registry/capabilities.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * سجلّ القدرات: كل بند من متطلبات "Search & AI Optimization" بحالته الحقيقية
 * ─────────────────────────────────────────────────────────────────────────────
 * الهدف من هذا الملف الصدق قبل التغطية. كل بند يحمل:
 *   implemented       → كود حقيقي يحسبه أو ينتجه الآن، ومُختبَر
 *   partial           → مُغطّى جزئياً أو بقرينة تقريبية، والحدّ مذكور في `note`
 *   adapter-required  → يحتاج مصدراً خارجياً؛ المحوّل موجود لكنه معطّل بلا مفتاح
 *   not-applicable    → لا ينطبق على هذا الموقع (بلا تطبيق، بلا متجر، بلا فيديو)
 *   planned           → غير مُنفَّذ ولا يوجد محوّل له
 *
 * ⚠️ قاعدة: لا يُرفع بند إلى `implemented` إلا إذا كان هناك دالة حقيقية
 * مُسمّاة في `backedBy` واختبار يغطيها. يوجد اختبار في
 * tests/seo-registry.test.ts يفرض وجود `backedBy` لكل بند `implemented`.
 */

export type CapabilityStatus =
  | "implemented"
  | "partial"
  | "adapter-required"
  | "not-applicable"
  | "planned"

export type CapabilityCluster =
  | "search-ai"
  | "content"
  | "conversion"
  | "social"
  | "platform"
  | "technical-tests"
  | "generators"
  | "scoring"

export interface Capability {
  id: string
  name: string
  nameAr: string
  cluster: CapabilityCluster
  status: CapabilityStatus
  /** الدالة أو الملف الذي يُنفّذ البند — إلزامي لبند `implemented`. */
  backedBy?: string
  note?: string
}

export const CLUSTER_LABELS: Record<CapabilityCluster, string> = {
  "search-ai": "السيو ومحركات الذكاء الاصطناعي",
  content: "تحسين المحتوى",
  conversion: "التحويل والتجربة",
  social: "الاجتماعي والتوزيع",
  platform: "تحسين المنصات",
  "technical-tests": "فحوص الموقع التقنية",
  generators: "أدوات التوليد",
  scoring: "نظام التقييم",
}

export const STATUS_LABELS: Record<CapabilityStatus, string> = {
  implemented: "مُنفَّذ",
  partial: "جزئي",
  "adapter-required": "يحتاج مفتاحاً خارجياً",
  "not-applicable": "لا ينطبق",
  planned: "مخطَّط",
}

export const CAPABILITIES: Capability[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // 1) السيو ومحركات الذكاء الاصطناعي
  // ───────────────────────────────────────────────────────────────────────────
  { id: "seo", name: "SEO", nameAr: "السيو", cluster: "search-ai", status: "implemented", backedBy: "scoring/index.ts → scoreContent/scoreSite" },
  { id: "technical-seo", name: "Technical SEO", nameAr: "السيو التقني", cluster: "search-ai", status: "implemented", backedBy: "shared/seo/technical-checks.js" },
  { id: "on-page-seo", name: "On-Page SEO", nameAr: "السيو على الصفحة", cluster: "search-ai", status: "implemented", backedBy: "scoring/contentScores.ts → scoreOnPageSeo" },
  { id: "off-page-seo", name: "Off-Page SEO", nameAr: "السيو خارج الصفحة", cluster: "search-ai", status: "adapter-required", note: "الروابط الخلفية تحتاج بيانات من Search Console أو Ahrefs." },
  { id: "local-seo", name: "Local SEO", nameAr: "السيو المحلي", cluster: "search-ai", status: "partial", backedBy: "src/data/schools.json (city/mapLocation)", note: "مدن الكليات وإحداثياتها موجودة؛ لا يوجد ملف عمل Google Business." },
  { id: "semantic-seo", name: "Semantic SEO", nameAr: "السيو الدلالي", cluster: "search-ai", status: "implemented", backedBy: "analyzers/entities.ts → semanticScore" },
  { id: "programmatic-seo", name: "Programmatic SEO", nameAr: "السيو البرمجي", cluster: "search-ai", status: "implemented", backedBy: "scripts/prerender.mjs (314 مساراً)", note: "صفحات المعجم والكليات تُولَّد آلياً من البيانات." },
  { id: "international-seo", name: "International SEO", nameAr: "السيو الدولي", cluster: "search-ai", status: "not-applicable", note: "موقع بلغة واحدة (ar-MA)؛ غياب hreflang صحيح ومُختبَر." },
  { id: "image-seo", name: "Image SEO", nameAr: "سيو الصور", cluster: "search-ai", status: "implemented", backedBy: "shared/seo/technical-checks.js → checkImages" },
  { id: "video-seo", name: "Video SEO", nameAr: "سيو الفيديو", cluster: "search-ai", status: "not-applicable", note: "لا يوجد محتوى فيديو في المرجع." },
  { id: "news-seo", name: "News SEO", nameAr: "سيو الأخبار", cluster: "search-ai", status: "partial", backedBy: "src/data/news.json + schema NewsArticle", note: "لا يوجد ملف news_sitemap.xml ولا أهلية Google News مؤكدة." },
  { id: "mobile-seo", name: "Mobile SEO", nameAr: "سيو الجوال", cluster: "search-ai", status: "implemented", backedBy: "technical-checks.js → checkHtmlHead (viewport) + checkAccessibility" },
  { id: "enterprise-seo", name: "Enterprise SEO", nameAr: "سيو المؤسسات", cluster: "search-ai", status: "not-applicable", note: "موقع مستقل صغير؛ لا بنية متعددة النطاقات أو اللغات." },
  { id: "ecommerce-seo", name: "Ecommerce SEO", nameAr: "سيو التجارة", cluster: "search-ai", status: "not-applicable", note: "لا يوجد متجر أو منتجات أو أسعار." },
  { id: "voice-seo", name: "Voice SEO / VSO", nameAr: "سيو الصوت", cluster: "search-ai", status: "partial", backedBy: "scoring/aiScores.ts → scoreAeo (عناوين سؤالية)", note: "نفس إشارات AEO؛ لا قياس فعلي لأجهزة الصوت." },
  { id: "aeo", name: "AEO — Answer Engine Optimization", nameAr: "تحسين محركات الإجابة", cluster: "search-ai", status: "implemented", backedBy: "scoring/aiScores.ts → scoreAeo" },
  { id: "geo", name: "GEO — Generative Engine Optimization", nameAr: "تحسين المحركات التوليدية", cluster: "search-ai", status: "implemented", backedBy: "scoring/aiScores.ts → scoreGeo" },
  { id: "aio", name: "AIO — AI Optimization", nameAr: "تحسين الذكاء الاصطناعي", cluster: "search-ai", status: "implemented", backedBy: "scoring/aiScores.ts → scoreAiVisibility" },
  { id: "llmo", name: "LLMO", nameAr: "تحسين النماذج اللغوية", cluster: "search-ai", status: "implemented", backedBy: "scripts/generate-llms.mjs", note: "كان /llms.txt يحتوي كود JavaScript — صُحّح إلى Markdown." },
  { id: "lso", name: "LSO — LLM Search Optimization", nameAr: "تحسين بحث النماذج", cluster: "search-ai", status: "implemented", backedBy: "functions/[[path]].js (/mcp) + .well-known/ai-catalog.json" },
  { id: "keo", name: "KEO — Knowledge Engine Optimization", nameAr: "تحسين المحركات المعرفية", cluster: "search-ai", status: "implemented", backedBy: "analyzers/entities.ts + lib/seo/schema.ts" },
  { id: "sxo", name: "SXO — Search Experience Optimization", nameAr: "تحسين تجربة البحث", cluster: "search-ai", status: "implemented", backedBy: "scoring/contentScores.ts → scoreUx + scoreOnPageSeo" },
  { id: "sgeo", name: "SGEO — Search Generative Experience", nameAr: "تجربة البحث التوليدية", cluster: "search-ai", status: "implemented", backedBy: "scoring/aiScores.ts → scoreGeo + scoreCitation" },

  // ───────────────────────────────────────────────────────────────────────────
  // 2) تحسين المحتوى
  // ───────────────────────────────────────────────────────────────────────────
  { id: "content-seo", name: "Content SEO", nameAr: "سيو المحتوى", cluster: "content", status: "implemented", backedBy: "scoring/contentScores.ts → scoreContentDepth" },
  { id: "content-optimization", name: "Content Optimization", nameAr: "تحسين المحتوى", cluster: "content", status: "implemented", backedBy: "scoring/index.ts → scoreContent" },
  { id: "semantic-content", name: "Semantic Content Optimization", nameAr: "تحسين المحتوى دلالياً", cluster: "content", status: "implemented", backedBy: "scoring/contentScores.ts → scoreSemantic" },
  { id: "entity-optimization", name: "Entity Optimization", nameAr: "تحسين الكيانات", cluster: "content", status: "implemented", backedBy: "analyzers/entities.ts → extractEntities" },
  { id: "topic-optimization", name: "Topic Optimization", nameAr: "تحسين الموضوع", cluster: "content", status: "partial", backedBy: "src/data/articles.json (category)", note: "التصنيفات موجودة؛ لا تجميع عناقيد موضوعية آلي." },
  { id: "keyword-optimization", name: "Keyword Optimization", nameAr: "تحسين الكلمات المفتاحية", cluster: "content", status: "implemented", backedBy: "analyzers/text.ts → keywordDensity" },
  { id: "search-intent-optimization", name: "Search Intent Optimization", nameAr: "تحسين نية البحث", cluster: "content", status: "implemented", backedBy: "scoring/contentScores.ts → classifyIntent + scoreSearchIntent" },
  { id: "query-optimization", name: "Query Optimization", nameAr: "تحسين الاستعلامات", cluster: "content", status: "partial", backedBy: "src/lib/utils/search.ts", note: "بحث داخلي موجود؛ لا توسيع استعلامات دلالي." },
  { id: "knowledge-graph", name: "Knowledge Graph Optimization", nameAr: "تحسين المخطط المعرفي", cluster: "content", status: "implemented", backedBy: "lib/seo/schema.ts (12 نوعاً منظماً)" },
  { id: "featured-snippet", name: "Featured Snippet Optimization", nameAr: "تحسين المقتطف المميز", cluster: "content", status: "implemented", backedBy: "scoring/aiScores.ts → scoreAeo", note: "يقيس الجاهزية؛ لا يؤكد الظهور الفعلي." },
  { id: "zero-click", name: "Zero-Click Optimization", nameAr: "تحسين النقر الصفري", cluster: "content", status: "partial", backedBy: "scoring/aiScores.ts → scoreAeo", note: "نفس إشارات المقتطفات." },
  { id: "people-also-ask", name: "People Also Ask Optimization", nameAr: "تحسين «الناس يسألون أيضاً»", cluster: "content", status: "implemented", backedBy: "scoring/aiScores.ts → scoreAeo (عناوين سؤالية + FAQ)" },
  { id: "topical-authority", name: "Topical Authority", nameAr: "المرجعية الموضوعية", cluster: "content", status: "partial", backedBy: "scoring/contentScores.ts → scoreAuthority", note: "روابط داخلية/خارجية فقط؛ لا قياس مرجعية خارجي." },
  { id: "content-gap", name: "Content Gap Analysis", nameAr: "تحليل فجوات المحتوى", cluster: "content", status: "planned", note: "يتطلب مقارنة مع منافسين خارجيين." },
  { id: "content-decay", name: "Content Decay Detection", nameAr: "كشف تقادم المحتوى", cluster: "content", status: "implemented", backedBy: "scoring/contentScores.ts → scoreFreshness" },
  { id: "content-freshness", name: "Content Freshness Optimization", nameAr: "تحسين حداثة المحتوى", cluster: "content", status: "implemented", backedBy: "scoring/contentScores.ts → scoreFreshness" },
  { id: "content-brief-generator", name: "Content Brief Generator", nameAr: "مولّد موجز المحتوى", cluster: "content", status: "implemented", backedBy: "lib/seo/generators/brief.ts" },
  { id: "content-score", name: "Content Score", nameAr: "نتيجة المحتوى", cluster: "content", status: "implemented", backedBy: "scoring/contentScores.ts → scoreContentDepth" },
  { id: "readability-score-cap", name: "Readability Score", nameAr: "نتيجة القراءة", cluster: "content", status: "implemented", backedBy: "analyzers/text.ts → readabilityScore" },
  { id: "originality-score-cap", name: "Originality Score", nameAr: "نتيجة الأصالة", cluster: "content", status: "partial", backedBy: "analyzers/duplicate.ts", note: "يكشف التكرار داخلياً فقط؛ لا يقارن بمواقع خارجية." },
  { id: "eeat-analysis", name: "E-E-A-T Analysis", nameAr: "تحليل الخبرة والثقة", cluster: "content", status: "implemented", backedBy: "scoring/contentScores.ts → scoreEeat" },

  // ───────────────────────────────────────────────────────────────────────────
  // 3) التحويل والتجربة
  // ───────────────────────────────────────────────────────────────────────────
  { id: "cro", name: "CRO", nameAr: "تحسين معدل التحويل", cluster: "conversion", status: "implemented", backedBy: "scoring/contentScores.ts → scoreCro", note: "بمعايير موقع تعليمي (عمق الجلسة)، لا قمع بيع." },
  { id: "uxo", name: "UXO", nameAr: "تحسين تجربة المستخدم", cluster: "conversion", status: "implemented", backedBy: "scoring/contentScores.ts → scoreUx" },
  { id: "sxo-conversion", name: "SXO — Search Experience", nameAr: "تحسين تجربة البحث", cluster: "conversion", status: "implemented", backedBy: "scoring/contentScores.ts → scoreUx + scoreOnPageSeo" },
  { id: "landing-page", name: "Landing Page Optimization", nameAr: "تحسين صفحات الهبوط", cluster: "conversion", status: "partial", backedBy: "scoring/index.ts → scoreContent", note: "يُطبَّق على أي صفحة، بلا قالب هبوط مخصص." },
  { id: "cta-optimization", name: "CTA Optimization", nameAr: "تحسين دعوة الإجراء", cluster: "conversion", status: "implemented", backedBy: "scoring/contentScores.ts → scoreCro" },
  { id: "conversion-copywriting", name: "Conversion Copywriting", nameAr: "كتابة التحويل", cluster: "conversion", status: "partial", backedBy: "lib/seo/generators/headline.ts", note: "توليد عناوين بديلة، لا صياغة صفحات كاملة." },
  { id: "personalization", name: "Personalization Optimization", nameAr: "التخصيص", cluster: "conversion", status: "planned", note: "يتطلب ملفات تعريف وسلوك مستخدمين." },

  // ───────────────────────────────────────────────────────────────────────────
  // 4) الاجتماعي والتوزيع
  // ───────────────────────────────────────────────────────────────────────────
  { id: "smo", name: "SMO — Social Media Optimization", nameAr: "تحسين التواصل الاجتماعي", cluster: "social", status: "implemented", backedBy: "technical-checks.js → checkHtmlHead (og/twitter)" },
  { id: "smm", name: "SMM — Social Media Marketing", nameAr: "التسويق الاجتماعي", cluster: "social", status: "not-applicable", note: "نشاط تشغيلي خارج نطاق الكود." },
  { id: "social-seo", name: "Social SEO", nameAr: "سيو التواصل", cluster: "social", status: "partial", backedBy: "lib/seo/schema.ts → sameAs", note: "روابط الحسابات في بيانات المنظمة." },
  { id: "social-search", name: "Social Search Optimization", nameAr: "تحسين البحث الاجتماعي", cluster: "social", status: "partial", backedBy: "technical-checks.js → checkHtmlHead", note: "يعتمد على وسوم Open Graph." },
  { id: "orm", name: "ORM — Online Reputation Management", nameAr: "إدارة السمعة", cluster: "social", status: "adapter-required", note: "يتطلب رصد نتائج البحث ومنصات خارجية." },
  { id: "influencer", name: "Influencer Optimization", nameAr: "تحسين المؤثرين", cluster: "social", status: "not-applicable", note: "لا يوجد برنامج مؤثرين." },
  { id: "community", name: "Community Optimization", nameAr: "تحسين المجتمع", cluster: "social", status: "partial", backedBy: "functions/api/comments.js + comments table", note: "نظام تعليقات موجود؛ لا منتديات." },

  // ───────────────────────────────────────────────────────────────────────────
  // 5) تحسين المنصات
  // ───────────────────────────────────────────────────────────────────────────
  { id: "aso", name: "ASO — App Store Optimization", nameAr: "تحسين متجر التطبيقات", cluster: "platform", status: "not-applicable", note: "لا يوجد تطبيق — PWA فقط (public/manifest.json)." },
  { id: "youtube-seo", name: "YouTube SEO", nameAr: "سيو يوتيوب", cluster: "platform", status: "not-applicable", note: "لا توجد قناة فيديو مرتبطة." },
  { id: "amazon-seo", name: "Amazon SEO", nameAr: "سيو أمازون", cluster: "platform", status: "not-applicable", note: "لا توجد منتجات." },
  { id: "marketplace-seo", name: "Marketplace SEO", nameAr: "سيو الأسواق", cluster: "platform", status: "not-applicable", note: "لا يوجد سوق إلكتروني." },
  { id: "pinterest-seo", name: "Pinterest SEO", nameAr: "سيو بنترست", cluster: "platform", status: "partial", backedBy: "lib/seo/schema.ts → sameAs", note: "حساب موجود في sameAs فقط." },
  { id: "tiktok-seo", name: "TikTok SEO", nameAr: "سيو تيك توك", cluster: "platform", status: "partial", backedBy: "lib/seo/schema.ts → sameAs", note: "حساب موجود في sameAs فقط." },
  { id: "linkedin-seo", name: "LinkedIn SEO", nameAr: "سيو لينكدإن", cluster: "platform", status: "partial", backedBy: "technical-checks.js → checkHtmlHead (og)", note: "بطاقات Open Graph هي ما يظهر عند المشاركة." },
  { id: "reddit-seo", name: "Reddit SEO", nameAr: "سيو ريديت", cluster: "platform", status: "not-applicable", note: "لا نشاط مستهدف." },
  { id: "news-platform", name: "News Platform Optimization", nameAr: "تحسين منصات الأخبار", cluster: "platform", status: "planned", note: "يتطلب news_sitemap.xml وطلب إدراج في Google News." },

  // ───────────────────────────────────────────────────────────────────────────
  // 6) فحوص الموقع التقنية
  // ───────────────────────────────────────────────────────────────────────────
  { id: "test-crawlability", name: "Crawlability Test", nameAr: "فحص قابلية الزحف", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkRobots" },
  { id: "test-indexability", name: "Indexability Test", nameAr: "فحص قابلية الفهرسة", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkHtmlHead (robots meta)" },
  { id: "test-sitemap", name: "Sitemap Test", nameAr: "فحص خريطة الموقع", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkSitemap" },
  { id: "test-robots", name: "Robots.txt Test", nameAr: "فحص robots.txt", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkRobots" },
  { id: "test-canonical", name: "Canonical Test", nameAr: "فحص الرابط القانوني", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkHtmlHead" },
  { id: "test-redirect", name: "Redirect Test", nameAr: "فحص إعادة التوجيه", cluster: "technical-tests", status: "partial", backedBy: "public/_redirects", note: "القواعد موجودة؛ لا فحص حي لسلاسل إعادة التوجيه." },
  { id: "test-broken-links", name: "Broken Links Test", nameAr: "فحص الروابط المكسورة", cluster: "technical-tests", status: "implemented", backedBy: "scripts/check-links.mjs" },
  { id: "test-internal-links", name: "Internal Links Test", nameAr: "فحص الروابط الداخلية", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → extractLinks" },
  { id: "test-schema", name: "Schema Test", nameAr: "فحص المخطط", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkStructuredData" },
  { id: "test-structured-data", name: "Structured Data Test", nameAr: "فحص البيانات المنظمة", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkStructuredData" },
  { id: "test-meta-tags", name: "Meta Tags Test", nameAr: "فحص وسوم الميتا", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkHtmlHead" },
  { id: "test-open-graph", name: "Open Graph Test", nameAr: "فحص Open Graph", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkHtmlHead" },
  { id: "test-twitter-cards", name: "Twitter/X Cards Test", nameAr: "فحص بطاقات X", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkHtmlHead" },
  { id: "test-hreflang", name: "Hreflang Test", nameAr: "فحص hreflang", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkHreflang" },
  { id: "test-https", name: "HTTPS/Security Test", nameAr: "فحص الأمان", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkSecurityHeaders" },
  { id: "test-mobile", name: "Mobile-Friendly Test", nameAr: "فحص ملاءمة الجوال", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkHtmlHead (viewport)" },
  { id: "test-cwv", name: "Core Web Vitals Test", nameAr: "فحص Core Web Vitals", cluster: "technical-tests", status: "adapter-required", backedBy: "lib/seo/adapters/crux.ts", note: "يتطلب CrUX API بمفتاح. المعطّل الآن." },
  { id: "test-page-speed", name: "Page Speed Test", nameAr: "فحص سرعة الصفحة", cluster: "technical-tests", status: "adapter-required", backedBy: "lib/seo/adapters/crux.ts", note: "يتطلب PageSpeed/CrUX API." },
  { id: "test-js-seo", name: "JavaScript SEO Test", nameAr: "فحص سيو JavaScript", cluster: "technical-tests", status: "implemented", backedBy: "scripts/prerender.mjs + tests/seo-technical.test.ts", note: "يؤكد أن المحتوى موجود في HTML قبل تنفيذ JavaScript." },
  { id: "test-duplicate", name: "Duplicate Content Test", nameAr: "فحص المحتوى المكرر", cluster: "technical-tests", status: "implemented", backedBy: "analyzers/duplicate.ts → findDuplicates" },
  { id: "test-orphan-pages", name: "Orphan Pages Test", nameAr: "فحص الصفحات اليتيمة", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → findOrphanPages" },
  { id: "test-url-structure", name: "URL Structure Test", nameAr: "فحص بنية الروابط", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkUrlStructure" },
  { id: "test-image-optimization", name: "Image Optimization Test", nameAr: "فحص تحسين الصور", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkImages" },
  { id: "test-accessibility", name: "Accessibility Test", nameAr: "فحص الوصولية", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkAccessibility" },
  { id: "test-canonical-policy", name: "Canonical URL Policy Test", nameAr: "فحص الرابط القانوني", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkCanonicalPolicy", note: "وسم canonical واحد، مطلق، بلا شرطة نهاية، مطابق لمسار الصفحة، وog:url يساويه — على كل ملف في dist/." },
  { id: "test-sitemap-coverage", name: "Sitemap ↔ Built Pages Coverage", nameAr: "فحص تغطية خريطة الموقع", cluster: "technical-tests", status: "implemented", backedBy: "technical-checks.js → checkSitemapCoverage", note: "لا <loc> بلا صفحة مولَّدة، ولا صفحة فهرسَة خارج الخريطة." },
  { id: "canonical-url-policy", name: "Single Canonical URL Policy", nameAr: "سياسة رابط قانوني واحد", cluster: "technical-tests", status: "implemented", backedBy: "shared/seo/url-policy.js + tests/seo-canonical.test.ts", note: "مصدر واحد للنطاق والتطبيع ومعرّفات المحتوى: الواجهة و prerender و sitemap و feed و llms. الوثيقة: SEO-URL-POLICY.md" },

  // ───────────────────────────────────────────────────────────────────────────
  // 7) أدوات التوليد
  // ───────────────────────────────────────────────────────────────────────────
  { id: "gen-article", name: "Article Generator", nameAr: "مولّد المقالات", cluster: "generators", status: "not-applicable", note: "توليد نص قانوني آلياً خطر على الدقة؛ المنصة تحريرية." },
  { id: "gen-news", name: "News Generator", nameAr: "مولّد الأخبار", cluster: "generators", status: "not-applicable", note: "الأخبار تتطلب تحققاً بشرياً." },
  { id: "gen-seo-article", name: "SEO Article Generator", nameAr: "مولّد مقالات السيو", cluster: "generators", status: "partial", backedBy: "lib/seo/generators/brief.ts", note: "يولّد موجزاً وهيكلاً، لا نصاً جاهزاً — مقصود." },
  { id: "gen-geo-article", name: "GEO Article Generator", nameAr: "مولّد مقالات GEO", cluster: "generators", status: "partial", backedBy: "lib/seo/generators/brief.ts", note: "يولّد هيكلاً جاهزاً للاقتباس." },
  { id: "gen-aeo-answer", name: "AEO Answer Generator", nameAr: "مولّد إجابات AEO", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/faq.ts" },
  { id: "gen-citation-optimizer", name: "AI Citation Optimizer", nameAr: "محسّن الاستشهاد", cluster: "generators", status: "implemented", backedBy: "scoring/aiScores.ts → scoreCitation + generators/citation.ts" },
  { id: "gen-visibility-checker", name: "AI Visibility Checker", nameAr: "فاحص الظهور", cluster: "generators", status: "adapter-required", backedBy: "lib/seo/adapters/llmProbe.ts", note: "الجاهزية تُحسب الآن؛ الظهور الفعلي يحتاج فحص النماذج." },
  { id: "gen-visibility-score", name: "AI Search Visibility Score", nameAr: "نتيجة الظهور", cluster: "generators", status: "partial", backedBy: "scoring/aiScores.ts → scoreAiVisibility", note: "يقيس الجاهزية لا الظهور." },
  { id: "gen-mention-tracker", name: "AI Mention Tracker", nameAr: "متتبّع الإشارات", cluster: "generators", status: "adapter-required", backedBy: "lib/seo/adapters/llmProbe.ts" },
  { id: "gen-citation-tracker", name: "AI Citation Tracker", nameAr: "متتبّع الاستشهادات", cluster: "generators", status: "adapter-required", backedBy: "lib/seo/adapters/llmProbe.ts" },
  { id: "gen-recommendation-tracker", name: "AI Recommendation Tracker", nameAr: "متتبّع التوصيات", cluster: "generators", status: "adapter-required", backedBy: "lib/seo/adapters/llmProbe.ts" },
  { id: "gen-entity-authority", name: "Entity Authority Analyzer", nameAr: "محلل مرجعية الكيانات", cluster: "generators", status: "implemented", backedBy: "analyzers/entities.ts → entityScore" },
  { id: "gen-fact-checker", name: "Fact Checker", nameAr: "مدقق الحقائق", cluster: "generators", status: "partial", backedBy: "analyzers/entities.ts (استخراج الادعاءات المسنودة)", note: "يحدد الادعاءات غير المسنودة؛ لا يتحقق من صحتها." },
  { id: "gen-source-quality", name: "Source Quality Checker", nameAr: "فاحص جودة المصادر", cluster: "generators", status: "implemented", backedBy: "scoring/contentScores.ts → scoreTrust" },
  { id: "gen-citation-generator", name: "Citation Generator", nameAr: "مولّد الاستشهادات", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/citation.ts" },
  { id: "gen-citation-validator", name: "Citation Validator", nameAr: "مدقق الاستشهادات", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/citation.ts → validateCitations" },
  { id: "gen-news-freshness", name: "News Freshness Checker", nameAr: "فاحص حداثة الأخبار", cluster: "generators", status: "implemented", backedBy: "scoring/contentScores.ts → scoreFreshness" },
  { id: "gen-headline", name: "Headline Optimizer", nameAr: "محسّن العناوين", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/headline.ts" },
  { id: "gen-title", name: "Title Generator", nameAr: "مولّد العناوين", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/title.ts" },
  { id: "gen-meta-description", name: "Meta Description Generator", nameAr: "مولّد وصف الميتا", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/metaDescription.ts" },
  { id: "gen-faq", name: "FAQ Generator", nameAr: "مولّد الأسئلة الشائعة", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/faq.ts" },
  { id: "gen-schema", name: "Schema Generator", nameAr: "مولّد البيانات المنظمة", cluster: "generators", status: "implemented", backedBy: "lib/seo/schema.ts" },
  { id: "gen-internal-links", name: "Internal Link Generator", nameAr: "مولّد الروابط الداخلية", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/internalLinks.ts" },
  { id: "gen-content-refresh", name: "Content Refresh Generator", nameAr: "مولّد تحديث المحتوى", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/refresh.ts" },
  { id: "gen-content-rewrite", name: "Content Rewrite Tool", nameAr: "أداة إعادة الصياغة", cluster: "generators", status: "not-applicable", note: "إعادة صياغة نص قانوني آلياً قد تُفسد المعنى." },
  { id: "gen-content-expansion", name: "Content Expansion Tool", nameAr: "أداة توسيع المحتوى", cluster: "generators", status: "partial", backedBy: "lib/seo/generators/brief.ts", note: "يقترح محاور للتوسيع، لا يكتبها." },
  { id: "gen-brief", name: "Content Brief Generator", nameAr: "مولّد موجز المحتوى", cluster: "generators", status: "implemented", backedBy: "lib/seo/generators/brief.ts" },

  // ───────────────────────────────────────────────────────────────────────────
  // 8) نظام التقييم
  // ───────────────────────────────────────────────────────────────────────────
  { id: "score-seo", name: "SEO Score", nameAr: "نتيجة السيو", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreOnPageSeo" },
  { id: "score-technical", name: "Technical Score", nameAr: "النتيجة التقنية", cluster: "scoring", status: "implemented", backedBy: "technical-checks.js → aggregateTechnical" },
  { id: "score-content", name: "Content Score", nameAr: "نتيجة المحتوى", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreContentDepth" },
  { id: "score-readability", name: "Readability Score", nameAr: "نتيجة القراءة", cluster: "scoring", status: "implemented", backedBy: "analyzers/text.ts → readabilityScore" },
  { id: "score-eeat", name: "E-E-A-T Score", nameAr: "نتيجة E-E-A-T", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreEeat" },
  { id: "score-aeo", name: "AEO Score", nameAr: "نتيجة AEO", cluster: "scoring", status: "implemented", backedBy: "scoring/aiScores.ts → scoreAeo" },
  { id: "score-geo", name: "GEO Score", nameAr: "نتيجة GEO", cluster: "scoring", status: "implemented", backedBy: "scoring/aiScores.ts → scoreGeo" },
  { id: "score-ai-visibility", name: "AI Visibility Score", nameAr: "نتيجة الظهور", cluster: "scoring", status: "partial", backedBy: "scoring/aiScores.ts → scoreAiVisibility", note: "جاهزية، لا ظهور فعلي." },
  { id: "score-citation", name: "Citation Score", nameAr: "نتيجة الاستشهاد", cluster: "scoring", status: "implemented", backedBy: "scoring/aiScores.ts → scoreCitation" },
  { id: "score-entity", name: "Entity Score", nameAr: "نتيجة الكيانات", cluster: "scoring", status: "implemented", backedBy: "analyzers/entities.ts → entityScore" },
  { id: "score-semantic", name: "Semantic Score", nameAr: "نتيجة الدلالة", cluster: "scoring", status: "implemented", backedBy: "analyzers/entities.ts → semanticScore" },
  { id: "score-intent", name: "Search Intent Score", nameAr: "نتيجة نية البحث", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreSearchIntent" },
  { id: "score-freshness", name: "Freshness Score", nameAr: "نتيجة الحداثة", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreFreshness" },
  { id: "score-originality", name: "Originality Score", nameAr: "نتيجة الأصالة", cluster: "scoring", status: "implemented", backedBy: "analyzers/duplicate.ts → originalityScore" },
  { id: "score-trust", name: "Trust Score", nameAr: "نتيجة الثقة", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreTrust" },
  { id: "score-authority", name: "Authority Score", nameAr: "نتيجة المرجعية", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreAuthority" },
  { id: "score-ux", name: "UX Score", nameAr: "نتيجة التجربة", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreUx" },
  { id: "score-cro", name: "CRO Score", nameAr: "نتيجة التحويل", cluster: "scoring", status: "implemented", backedBy: "scoring/contentScores.ts → scoreCro" },
  { id: "score-overall", name: "Overall Content Score (0–1000)", nameAr: "النتيجة الإجمالية", cluster: "scoring", status: "implemented", backedBy: "scoring/aggregate.ts → aggregate" },
]

/** عدد البنود حسب الحالة. */
export function capabilityStats(): Record<CapabilityStatus, number> {
  const stats: Record<CapabilityStatus, number> = {
    implemented: 0,
    partial: 0,
    "adapter-required": 0,
    "not-applicable": 0,
    planned: 0,
  }
  for (const capability of CAPABILITIES) stats[capability.status]++
  return stats
}

export function capabilitiesByCluster(cluster: CapabilityCluster): Capability[] {
  return CAPABILITIES.filter((c) => c.cluster === cluster)
}

export const CLUSTERS: CapabilityCluster[] = [
  "search-ai",
  "content",
  "conversion",
  "social",
  "platform",
  "technical-tests",
  "generators",
  "scoring",
]
