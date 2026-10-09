/**
 * هوية التحرير والمصادر المسمّاة المشتركة بين المتصفح والصفحة المُولَّدة.
 * كل رابط هنا تحقّق من أنه يعمل (200) عند كتابته.
 */
export const EDITORIAL = Object.freeze({
  byline: "إعداد فريق ميزان الرقمية",
  // تاريخ آخر مراجعة للمحتوى: يُحدَّث يدوياً عند تغيير النص، لا عند كل بناء.
  reviewedIso: "2026-10-09",
  reviewedLabel: "9 أكتوبر 2026",
});

export const SOURCES = Object.freeze({
  gazette: {
    name: "الجريدة الرسمية",
    href: "https://www.sgg.gov.ma/BulletinOfficiel.aspx",
  },
  dahir: {
    name: "بنك المعطيات القانونية",
    href: "https://bdj.mmsp.gov.ma/Ar/Document/5601-Dahir-n-1-11-91-du-27-cha%C3%A2bane-1432-29-juillet-2.aspx",
  },
  adala: {
    name: "بوابة عدالة",
    href: "https://adala.justice.gov.ma/",
  },
});
