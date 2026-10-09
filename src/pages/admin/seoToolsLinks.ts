/**
 * روابط أدوات SEMrush لفريق المحتوى والـSEO، مُجمّعة كما في قائمة SEMrush.
 * الروابط خارجية تُفتح في تبويب جديد؛ لا يوجد هنا أي مفتاح API.
 */

export interface SeoToolLink {
  label: string
  href: string
}

export interface SeoToolGroup {
  title: string
  links: SeoToolLink[]
}

const DOMAIN_QUERY = "&q=www.mizan.page&searchType=domain"

export const SEO_TOOL_GROUPS: SeoToolGroup[] = [
  {
    title: "لوحة SEO",
    links: [
      { label: "Dashboard", href: "https://www.semrush.com/seo/?fid=13520703" },
    ],
  },
  {
    title: "أداء الموقع",
    links: [
      { label: "Site Audit", href: "https://www.semrush.com/siteaudit/?fid=13520703" },
      { label: "Position Tracking", href: "https://www.semrush.com/position-tracking/?fid=13520703" },
    ],
  },
  {
    title: "التحليل التنافسي",
    links: [
      { label: "Domain Overview", href: `https://www.semrush.com/analytics/overview/?db=ma&fid=13520703${DOMAIN_QUERY}` },
      { label: "Organic Rankings", href: `https://www.semrush.com/analytics/organic/overview?db=ma&fid=13520703${DOMAIN_QUERY}` },
      { label: "Top Pages", href: `https://www.semrush.com/analytics/toppages/?db=ma&fid=13520703${DOMAIN_QUERY}` },
      { label: "Compare Domains", href: `https://www.semrush.com/analytics/comparedomains/?db=ma&fid=13520703${DOMAIN_QUERY}` },
      { label: "Keyword Gap", href: `https://www.semrush.com/analytics/keywordgap/?db=ma&fid=13520703${DOMAIN_QUERY}` },
      { label: "Backlink Gap", href: `https://www.semrush.com/analytics/gap/backlinks/?fid=13520703${DOMAIN_QUERY}` },
    ],
  },
  {
    title: "بحث الكلمات المفتاحية",
    links: [
      { label: "Keyword Overview", href: "https://www.semrush.com/analytics/keywordoverview/?db=ma&fid=13520703" },
      { label: "Keyword Magic Tool", href: "https://www.semrush.com/analytics/keywordmagic/?db=ma&fid=13520703" },
      { label: "Keyword Strategy Builder", href: "https://www.semrush.com/analytics/keywordmanager/?db=ma&fid=13520703" },
    ],
  },
  {
    title: "أفكار المحتوى",
    links: [
      { label: "SEO Writing Assistant", href: "https://www.semrush.com/swa/?fid=13520703" },
      { label: "Topic Research", href: "https://www.semrush.com/topic-research/?fid=13520703" },
    ],
  },
  {
    title: "بناء الروابط",
    links: [
      { label: "Backlinks", href: `https://www.semrush.com/analytics/backlinks/overview/?fid=13520703${DOMAIN_QUERY}` },
      { label: "Referring Domains", href: `https://www.semrush.com/analytics/refdomains/report/?fid=13520703${DOMAIN_QUERY}` },
      { label: "Backlink Audit", href: "https://www.semrush.com/backlink_audit/?fid=13520703" },
    ],
  },
]

const TRAFFIC_QUERY = "?fid=13520703"
const trafficLink = (label: string, path: string): SeoToolLink => ({
  label,
  href: `https://www.semrush.com/analytics/traffic/${path}/${TRAFFIC_QUERY}`,
})

/** قائمة «Traffic & Market» من SEMrush (روابط مرتبطة بحساب الموقع نفسه). */
export const TRAFFIC_TOOL_GROUPS: SeoToolGroup[] = [
  {
    title: "الحركة والسوق",
    links: [
      { label: "Get Started", href: `https://www.semrush.com/analytics/traffic/${TRAFFIC_QUERY}` },
      trafficLink("Traffic Analytics", "traffic-overview"),
      trafficLink("Market Overview", "market-overview"),
      trafficLink("Top Pages", "top-pages"),
      trafficLink("Competitor Monitoring", "competitor-monitoring"),
    ],
  },
  {
    title: "توزيع الحركة",
    links: [
      trafficLink("AI Traffic", "ai-traffic"),
      trafficLink("Referral", "referral"),
      trafficLink("Organic Search", "organic-search"),
      trafficLink("Paid Search", "paid-search"),
      trafficLink("Organic Social", "organic-social"),
      trafficLink("Paid Social", "paid-social"),
      trafficLink("Email", "email"),
      trafficLink("Display Ads", "display-ads"),
      trafficLink("Sources & Destinations", "sources-destinations"),
    ],
  },
  {
    title: "الصفحات والفئات",
    links: [
      trafficLink("Subfolders & Subdomains", "subfolders-subdomains"),
      trafficLink("Page Groups (beta)", "page-groups"),
    ],
  },
  {
    title: "الاتجاهات الإقليمية",
    links: [
      trafficLink("USA", "usa"),
      trafficLink("Countries", "countries"),
      trafficLink("Business Regions", "business-regions"),
      trafficLink("Geographical Regions", "geographical-regions"),
    ],
  },
  {
    title: "ملف الجمهور",
    links: [
      trafficLink("Demographics", "demographics"),
      trafficLink("Audience Overlap", "audience-overlap"),
      trafficLink("Socioeconomics", "socioeconomics"),
      trafficLink("Behavior", "behavior"),
    ],
  },
  {
    title: "متقدم",
    links: [
      trafficLink("Daily Trends", "daily-trends"),
      trafficLink("Industry & Bulk Analysis", "industry-and-bulk-analysis"),
    ],
  },
]

const GETCITO_REPO = "https://github.com/ai-search-guru/getcito-worlds-first-open-source-aio-aeo-or-geo-tool"

/**
 * GetCito: أداة مفتوحة المصدر (MIT) لتتبع ظهور العلامة في إجابات محركات الذكاء الاصطناعي.
 * الأداة تعمل كخدمة مستقلة (Docker + قاعدة بيانات + عامل خلفي)، لذلك نربط بها فقط،
 * ولا ننسخ شيفرتها. الحقوق: Blue Whale Software, LLC و GetCito، رخصة MIT.
 */
export const AI_VISIBILITY_TOOL_GROUPS: SeoToolGroup[] = [
  {
    title: "المشروع",
    links: [
      { label: "المستودع (MIT)", href: GETCITO_REPO },
      { label: "الموقع الرسمي", href: "https://www.getcito.com/" },
    ],
  },
  {
    title: "التجربة والتشغيل",
    links: [
      { label: "العرض التجريبي", href: "https://demo.getcito.com" },
      {
        label: "دليل التشغيل الذاتي (Docker)",
        href: `${GETCITO_REPO}#option-a--docker-compose-recommended`,
      },
    ],
  },
]

const AKII_REPO = "https://github.com/akii-technologies-ltd/akii-seo-ai-search-optimizer"
const akiiSkill = (name: string): SeoToolLink => ({
  label: name,
  href: `${AKII_REPO}/tree/main/skills/${name}`,
})

/**
 * Akii: إضافة Claude Code مفتوحة المصدر (MIT) للـSEO وAEO وGEO.
 * تعمل داخل Claude Code لا داخل هذه الـCMS، فنربط بمهاراتها فقط ولا ننسخ شيئاً.
 * ملاحظة الخصوصية: مهارة ai-visibility تُرسل النطاق/العلامة إلى الخادم الخلفي لـAkii.
 */
export const AKII_PLUGIN_GROUPS: SeoToolGroup[] = [
  {
    title: "التثبيت والمستودع",
    links: [
      { label: "المستودع (MIT)", href: AKII_REPO },
      { label: "الموقع الرسمي", href: "https://akii.com" },
    ],
  },
  {
    title: "التدقيق والتحليل",
    links: [akiiSkill("seo-audit"), akiiSkill("broken-links"), akiiSkill("ai-visibility"), akiiSkill("competitor-intel")],
  },
  {
    title: "المحتوى والصفحات",
    links: [
      akiiSkill("content-strategy"),
      akiiSkill("content-brief"),
      akiiSkill("optimize-page"),
      akiiSkill("keyword-clustering"),
      akiiSkill("content-translation"),
    ],
  },
  {
    title: "البنية والبيانات المنظمة",
    links: [akiiSkill("schema-markup"), akiiSkill("internal-linking"), akiiSkill("llms-txt")],
  },
]
