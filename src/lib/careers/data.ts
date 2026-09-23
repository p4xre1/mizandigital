/**
 * طبقة الوصول إلى بيانات المسارات المهنية (public editorial content).
 *
 * المصدر هو ملفات JSON تحت src/data — لا قاعدة بيانات في هذه النسخة، حتى
 * تبقى الصفحات العامة قابلة للرندر والتوليد الثابت (prerender) بلا اعتماد على
 * الشبكة، تماماً كما يفعل بنك الأسئلة المحلي في محور الاختبارات.
 *
 * كل الدوال هنا نقية وقابلة للاستدعاء من الاختبارات الآلية
 * (tests/careers-data.test.ts) ومن سكربتات البناء (scripts/lib/career-pages.mjs
 * يقرأ الملفات نفسها بقيمها الخام).
 */

import careersJson from "@/data/careers.json";
import categoriesJson from "@/data/career-categories.json";
import citiesJson from "@/data/morocco-cities.json";
import competitionsJson from "@/data/career-competitions.json";
import careerLexiconJson from "@/data/career-lexicon.json";
import { CAREERS_REQUIRED_LINKS } from "../../../shared/careers/copy.js";
import type {
  CareerCategory,
  CareerCompetition,
  CareerLexiconTerm,
  CareerRecord,
  MoroccoCity,
} from "./types";

export const CAREERS = careersJson as unknown as CareerRecord[];
export const CAREER_CATEGORIES = categoriesJson as unknown as CareerCategory[];
export const MOROCCO_CITIES = citiesJson as unknown as MoroccoCity[];
export const CAREER_COMPETITIONS = competitionsJson as unknown as CareerCompetition[];
export const CAREER_LEXICON_TERMS = careerLexiconJson as unknown as CareerLexiconTerm[];

export { CAREERS_REQUIRED_LINKS };

const CAREER_BY_SLUG = new Map(CAREERS.map((career) => [career.slug, career]));
const CATEGORY_BY_ID = new Map(CAREER_CATEGORIES.map((category) => [category.id, category]));
const CITY_BY_ID = new Map(MOROCCO_CITIES.map((city) => [city.id, city]));
const TERM_BY_ID = new Map(CAREER_LEXICON_TERMS.map((term) => [term.id, term]));
const COMPETITION_BY_ID = new Map(CAREER_COMPETITIONS.map((record) => [record.id, record]));

/** المسار حسب المعرّف النصي (slug) أو undefined إن لم يوجد. */
export function getCareerBySlug(slug: string | undefined | null): CareerRecord | undefined {
  if (!slug) return undefined;
  return CAREER_BY_SLUG.get(slug);
}

export function getCareerById(id: string | undefined | null): CareerRecord | undefined {
  if (!id) return undefined;
  return CAREER_BY_SLUG.get(id);
}

/** عائلة المسار (مجال مهني) من ملف التصنيفات. */
export function getCategoryById(id: string | undefined | null): CareerCategory | undefined {
  if (!id) return undefined;
  return CATEGORY_BY_ID.get(id);
}

export function getCityById(id: string | undefined | null): MoroccoCity | undefined {
  if (!id) return undefined;
  return CITY_BY_ID.get(id);
}

/** البحث عن مدينة بالاسم العربي كما هو مخزَّن في schools.json. */
export function getCityByName(name: string | undefined | null): MoroccoCity | undefined {
  if (!name) return undefined;
  const normalized = name.trim();
  return MOROCCO_CITIES.find((city) => city.name_ar === normalized || city.name === normalized);
}

export function getCareerTerm(termId: string): CareerLexiconTerm | undefined {
  return TERM_BY_ID.get(termId);
}

/**
 * مصطلحات المسار مُحلّلة مقابل قاموس ميزان: المعرّف غير الموجود يُسقَط بصوت
 * عالٍ في التطوير، ولا يُنتج أي رابط مكسور للمستخدم.
 */
export function getCareerTerms(career: CareerRecord): CareerLexiconTerm[] {
  const resolved: CareerLexiconTerm[] = [];
  for (const termId of career.lexicon_term_ids) {
    const term = TERM_BY_ID.get(termId);
    if (!term) {
      if (import.meta.env?.DEV) {
        console.warn(`[careers] معرّف مصطلح غير موجود في المعجم: ${termId} (المسار: ${career.slug})`);
      }
      continue;
    }
    resolved.push(term);
  }
  return resolved;
}

/** المسارات القريبة (3 افتراضياً) — تُسقَط المعرّفات غير الموجودة. */
export function getRelatedCareers(career: CareerRecord, limit = 3): CareerRecord[] {
  const unique = new Set<string>();
  const related: CareerRecord[] = [];
  for (const id of career.related_career_ids) {
    if (unique.has(id) || id === career.id) continue;
    const record = CAREER_BY_SLUG.get(id);
    if (!record) continue;
    unique.add(id);
    related.push(record);
    if (related.length >= limit) break;
  }
  return related;
}

/** سجلات المباريات المرتبطة بمسار. */
export function getCompetitionsForCareer(careerId: string): CareerCompetition[] {
  return CAREER_COMPETITIONS.filter((record) => record.career_id === careerId);
}

export function getCompetitionById(id: string | undefined | null): CareerCompetition | undefined {
  if (!id) return undefined;
  return COMPETITION_BY_ID.get(id);
}

/**
 * هل السجل «متحقق منه» بمعنى أنه يحمل إعلاناً رسمياً مؤرخاً؟
 *
 * هذا هو الحاكم الوحيد لعرض تمارين المباريات: `open`/`upcoming` بلا رابط رسمي
 * وتاريخ تحقق تُعدّ غير متحققة، ويُعرض للطالب النصّ الآمن بدل أي تمرين يوهمه
 * بأن هناك مباراة قائمة.
 */
export function isCompetitionVerified(record: CareerCompetition | undefined): boolean {
  if (!record) return false;
  if (!record.official_notice_url) return false;
  if (!record.source_verified_at) return false;
  if (!record.last_reviewed) return false;
  if ((record.status === "open" || record.status === "upcoming") && !record.official_notice_date) {
    return false;
  }
  return true;
}

/** نصّ بحث لمدينة: الاسم العربي والاسم اللاتيني وكل الألقاب البديلة. */
export function cityMatchesQuery(city: MoroccoCity, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [city.name_ar, city.name, city.id, city.region_ar, ...(city.aliases ?? [])]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return haystack.some((value) => value.includes(q) || q.includes(value));
}

/** المدن المطابقة لاستعلام البحث (مرتبة أبجدياً عربياً بترتيب الملف). */
export function searchCities(query: string, limit = 8): MoroccoCity[] {
  return MOROCCO_CITIES.filter((city) => cityMatchesQuery(city, query)).slice(0, limit);
}

/** نسبة إتمام المحتوى التعليمي في المنصة لمسار معيّن (0..100). */
export function careerProgressPercent(attempted: number, total: number): number {
  if (!total || total <= 0) return 0;
  const value = Math.round((Math.max(0, attempted) / total) * 100);
  return Math.min(100, Math.max(0, value));
}

/** مراجع التحقق الإلزامية — تُستعمل في الاختبارات وفي لوحة الصيانة. */
export const CAREERS_DATA_FILES = {
  careers: "careers.json",
  categories: "career-categories.json",
  cities: "morocco-cities.json",
  competitions: "career-competitions.json",
  lexicon: "career-lexicon.json",
} as const;
