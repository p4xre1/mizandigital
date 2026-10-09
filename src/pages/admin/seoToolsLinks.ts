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
