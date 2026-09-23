/**
 * ترشيح أقرب كليات الحقوق إلى مدينة مختارة — كله داخل المتصفح.
 *
 * الخصوصية أولاً:
 *   • اختيار المدينة اختياري تماماً، ولا يُطلب عنوان ولا رقم هاتف ولا GPS.
 *   • لا يُستدعى أي خدمة خرائط أو ترميز جغرافي (لا Google Maps ولا غيرها).
 *   • لا ترسل الواجهة المدينة إلى أي جهة؛ الحساب يجري محلياً.
 *   • للزائر لا يوجد أي كتابة في قاعدة البيانات (لا وجود لجلسة أصلاً).
 *
 * البيانات (src/data/schools.json) تُستورد ديناميكياً: لا حاجة لتحميل 58 kB من
 * دليل الكليات على من يفتح صفحة مسارٍ ولا ينوي اختيار مدينة.
 */

import { distanceInKm, isValidPoint } from "./distance";
import type { CareerSchoolRecord, GeoPoint, MoroccoCity, RankedSchool } from "./types";

let schoolsCache: CareerSchoolRecord[] | null = null;

/** يحمّل سجلّ الكليات مرة واحدة في الذاكرة خلال عمر الصفحة. */
export async function loadSchools(): Promise<CareerSchoolRecord[]> {
  if (schoolsCache) return schoolsCache;
  const module = await import("@/data/schools.json");
  schoolsCache = ((module.default ?? []) as unknown as CareerSchoolRecord[]).slice();
  return schoolsCache;
}

/** كلية بإحداثيات صالحة فقط — تُستبعد البقية من أي ترتيب. */
export function schoolPoint(school: CareerSchoolRecord): GeoPoint | null {
  const location = school.location;
  if (!isValidPoint(location)) return null;
  return { latitude: location!.latitude as number, longitude: location!.longitude as number };
}

interface RankOptions {
  /** أقصى عدد نتائج (3 افتراضياً كما ينص تصميم الميزة). */
  limit?: number;
  /** فلترة الكليات حسب مدينة نصية (اسم المدينة كما في schools.json). */
  allowedCities?: string[];
}

/**
 * ترتيب الكليات تصاعدياً حسب المسافة بخط مستقيم.
 *
 * الضمانات المفروضة في الاختبارات:
 *   • لا تدخل كلية بلا إحداثيات صالحة.
 *   • النتيجة مكرّرة بحسب الكلية (لا تكرار لنفس السجل).
 *   • الترتيب تصاعدي بحسب المسافة، وبحد أقصى `limit` سجلاً.
 */
export function rankSchoolsByDistance(
  schools: CareerSchoolRecord[],
  origin: GeoPoint,
  options: RankOptions = {}
): RankedSchool[] {
  const limit = options.limit ?? 3;
  const allowed = options.allowedCities?.length
    ? new Set(options.allowedCities.map((city) => city.trim()))
    : null;

  const ranked: RankedSchool[] = [];
  const seen = new Set<string>();

  for (const school of schools) {
    if (allowed && !(school.city && allowed.has(school.city))) continue;
    const point = schoolPoint(school);
    if (!point) continue;
    const key = school.slug || school.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ranked.push({ school, distanceKm: distanceInKm(origin, point) });
  }

  ranked.sort((a, b) => a.distanceKm - b.distanceKm);
  return ranked.slice(0, Math.max(0, limit));
}

/**
 * تحويل مدينة مختارة إلى نقطة أصل، ثم ترشيح أقرب الكليات.
 * تُرجع مصفوفة فارغة إن كانت المدينة بلا إحداثيات صالحة.
 */
export function rankSchoolsForCity(
  schools: CareerSchoolRecord[],
  city: MoroccoCity | undefined,
  limit = 3
): RankedSchool[] {
  if (!city) return [];
  const origin: GeoPoint = { latitude: city.latitude, longitude: city.longitude };
  if (!isValidPoint(origin)) return [];
  return rankSchoolsByDistance(schools, origin, { limit });
}

/** نسبة الكليات ذات الإحداثيات الصالحة — تُستعمل في التقرير وفي الاختبارات. */
export function coordinateCoverage(schools: CareerSchoolRecord[]): {
  total: number;
  withCoordinates: number;
} {
  return {
    total: schools.length,
    withCoordinates: schools.filter((school) => schoolPoint(school) !== null).length,
  };
}
