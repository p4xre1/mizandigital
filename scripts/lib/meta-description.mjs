// scripts/lib/meta-description.mjs
//
// كان هذا الملف «نسخة طبق الأصل» من src/lib/seo/description.ts، والانحراف
// بينهما (120 مقابل 140 حداً أدنى، شرطة مقابل نقطة) هو ما يجعل الوصف differs
// بين ما يُسلَّم للزاحفة وما يبنيه المتصفح. صار المصدر واحداً هنا:
// shared/seo/meta-copy.js، ولا يُعدَّل الحد إلا فيه.

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
} from "../../shared/seo/meta-copy.js";
