/**
 * ثوابت النسخة والتواصل للصفحات القانونية — منفصلة عن policies.js عمداً.
 *
 * لماذا ملف منفصل؟
 * ────────────────
 * كان `src/lib/legal/consent.ts` (وهو في مسار الدخول: App ← AuthProvider ←
 * consent) يستورد `LEGAL_LAST_UPDATED` من policies.js، فيسحب معه ملف النصوص
 * القانونية كاملاً (~39KB من النص العربي) إلى حزمة الدخول الأولى.
 * القياس على البناء: entry 173.75KB (47.04KB مضغوطة) → 129.34KB (35.19KB)
 * بعد فصل الثابت وحده — أي ~12KB مضغوطة كانت تُنزَّل وتُحلَّل في أول ثانية على
 * كل صفحة من الموقع مقابل سلسلة نصية واحدة تُقرأ في نموذج الموافقة.
 *
 * النصوص الكاملة تبقى في policies.js (تُستورد عند الحاجة فقط: صفحات
 * /privacy و/cookies و/terms، وهي صفحات مُحمَّلة عند الطلب).
 *
 * policies.js يعيد تصدير كل ما هنا، فمن يستورد من policies.js لا ينكسر.
 */

/** تاريخ آخر تحديث للسياسات — يظهر في النص ويُخزَّن مع الموافقة. */
export const LEGAL_LAST_UPDATED = "10 أكتوبر 2026";

/** تاريخ إزالة شبكة الإعلانات (مذكور في إفصاح السياسة). */
export const ADSTERRA_REMOVED_ON = "15 شتنبر 2026";

/** البريد الرسمي للتواصل (يظهر في السياسة وصفحة الاتصال). */
export const CONTACT_EMAIL = "contact@mizan.page";

/** مفتاح جلسة Supabase Auth — مثبَّت في src/lib/supabase/client.ts (storageKey). */
export const AUTH_STORAGE_KEY = "sb-mizan-auth";
