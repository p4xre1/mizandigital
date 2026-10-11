// shared/help/knowledge-site.js
//
// معرفة الموقع للمساعد: المهن القانونية الأربع عشرة، والكليات، والفعاليات المحلية،
// وبطاقة تعريفية لكل من النصين القانونيين (الدستور ومدونة الأسرة).
// كلها مشتقة من ملفات البيانات في المستودع دون إضافة أي محتوى جديد: بيانات المهنة
// والكلية والفعالية كما هي في ملفها. كل رابط يشير إلى صفحة موجودة في AppRoutes
// (يفحصه الاختبار). نصوص المواد نفسها في knowledge-legal.js.

import constitution from "../../data/laws/constitution-2011.articles.json"
import familyCode from "../../data/laws/mudawana-70-03.articles.json"
import careers from "../../src/data/careers.json"
import schools from "../../src/data/schools.json"
import events from "../../src/data/events.json"
import { CONSTITUTION_URL, FAMILY_CODE_URL } from "./knowledge-legal.js"

/** @typedef {{ id: string, title: string, url: string, keywords: string[], body: string }} HelpEntry */

/** المهن القانونية الأربع عشرة: وصف مختصر وشهادة معتادة وطريقة الولوج. @type {HelpEntry[]} */
export const CAREER_ENTRIES = careers.map((career) => ({
  id: `career-${career.slug}`,
  title: `${career.title_ar} — المسار المهني`,
  url: `/careers/${career.slug}`,
  keywords: [career.title_ar, career.title_fr, career.category_ar].filter(Boolean),
  body: [
    career.short_description,
    career.typical_degree?.label_ar ? `الشهادة المعتادة: ${career.typical_degree.label_ar}` : "",
    career.entry_method_ar ? `طريقة الولوج: ${career.entry_method_ar}` : "",
  ]
    .filter(Boolean)
    .join(" "),
}))

/** الكليات: الاسم والجامعة والمدينة ووصف مختصر. @type {HelpEntry[]} */
export const SCHOOL_ENTRIES = schools.map((school) => ({
  id: `school-${school.slug}`,
  title: school.name,
  url: `/schools/${school.slug}`,
  keywords: [school.city, school.university, school.short_name].filter(Boolean),
  body: [
    school.name,
    school.university ? `الجامعة: ${school.university}` : "",
    school.city ? `المدينة: ${school.city}` : "",
    school.synopsis,
  ]
    .filter(Boolean)
    .join(". "),
}))

/** الفعاليات المحلية (الملخص فقط). @type {HelpEntry[]} */
export const EVENT_ENTRIES = events.map((event) => ({
  id: `event-${event.id}`,
  title: event.title,
  url: `/events/${event.id}`,
  keywords: [event.organizer, event.city].filter(Boolean),
  body: event.excerpt || event.title,
}))

/**
 * بطاقة تعريفية لكل نص: الاسم الرسمي والمصدر كما في ملف المواد، والرابط إلى صفحة النص.
 * @type {HelpEntry[]}
 */
export const LAW_OVERVIEW_ENTRIES = [
  {
    id: "law-constitution-2011",
    title: constitution.title,
    url: CONSTITUTION_URL,
    keywords: ["الدستور", "دستور", "constitution", "2011"],
    body: `${constitution.title}. المصدر: ${constitution.source}. النص مقسّم إلى ${constitution.articles.length} فصلاً، ويمكن الاطلاع على كل فصل في صفحة النص.`,
  },
  {
    id: "law-family-code-70-03",
    title: familyCode.title,
    url: FAMILY_CODE_URL,
    keywords: ["مدونة الأسرة", "الأسرة", "70.03", "مدونة"],
    body: `${familyCode.title}. المصدر: ${familyCode.source}. النص مقسّم إلى مواد، ويمكن الاطلاع على كل مادة في صفحة النص.`,
  },
]

/** كل معرفة الموقع بترتيب ثابت. @type {HelpEntry[]} */
export const SITE_ENTRIES = [...LAW_OVERVIEW_ENTRIES, ...CAREER_ENTRIES, ...SCHOOL_ENTRIES, ...EVENT_ENTRIES]
