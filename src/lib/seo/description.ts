// lib/seo/description.ts
//
// واجهة مُنمَّطة على shared/seo/meta-copy.js — لا منطق هنا. التطبيق (هذه
// الواجهة) والبناء (scripts/lib/meta-description.mjs) وفاحص seo-audit يقرأون
// كلهم نفس الدالة، فلا ينحرف وصف صفحة في المتصفح عن وصفها في الملف الثابت.

export {
  DESC_TAIL,
  UTILITY_ROUTES,
  utilityMeta,
  BRAND,
  BRAND_SUFFIX,
  HARD_MAX_TITLE,
  MAX_DESC,
  MAX_TITLE,
  MIN_DESC,
  MIN_TITLE,
  abbreviateFaculty,
  buildMetaDescription,
  fitTitle,
  joinClauses,
} from "../../../shared/seo/meta-copy.js";
