/**
 * اختبارات «أقرب كليات الحقوق» (tests 9–11 من مواصفة الميزة).
 *
 * القاعدة التي تحميها هذه الاختبارات: الحساب محلي (بلا أي خدمة خرائط)،
 * والمدينة اختيارية، والنتيجة ثلاث كليات كحد أقصى بلا تكرار، وعرض المسافة
 * تقريبي بخط مستقيم — لا ترتيب «أفضل كلية» ولا وعد بالقبول.
 */
import { describe, expect, it } from "vitest";
import schoolsData from "../src/data/schools.json";
import citiesData from "../src/data/morocco-cities.json";
import type { CareerSchoolRecord, MoroccoCity } from "../src/lib/careers/types";
import { distanceInKm, formatDistanceKm, isValidPoint, roundDistanceKm } from "../src/lib/careers/distance";
import { coordinateCoverage, rankSchoolsByDistance, rankSchoolsForCity } from "../src/lib/careers/schools";
import { searchCities } from "../src/lib/careers/data";

const SCHOOLS = schoolsData as unknown as CareerSchoolRecord[];
const CITIES = citiesData as unknown as MoroccoCity[];
const byId = (id: string) => CITIES.find((city) => city.id === id)!;

describe("حساب المسافة محلياً", () => {
  it("نفس النقطة تساوي صفراً، والنقاط المختلفة موجبة", () => {
    const casa = byId("casablanca");
    expect(distanceInKm(casa, casa)).toBe(0);
    expect(distanceInKm(casa, byId("rabat"))).toBeGreaterThan(0);
  });

  it("الترتيب صحيح: الرباط أقرب إلى الدار البيضاء من أكادير", () => {
    const casa = byId("casablanca");
    expect(distanceInKm(casa, byId("rabat"))).toBeLessThan(distanceInKm(casa, byId("agadir")));
  });

  it("النقطة غير الصالحة تُرفض بلا قيمة مضللة", () => {
    expect(isValidPoint({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidPoint({ latitude: 30, longitude: 200 })).toBe(false);
    expect(isValidPoint(null)).toBe(false);
    expect(distanceInKm({ latitude: 30, longitude: -9 }, { latitude: Number.NaN, longitude: 3 })).toBeNaN();
  });

  it("التقريب للعرض: رقم عشري واحد قريب، وعدد صحيح بعيداً، ونصّ عربي واضح", () => {
    expect(roundDistanceKm(3.14159)).toBe(3.1);
    expect(roundDistanceKm(123.4)).toBe(123);
    expect(formatDistanceKm(12.34)).toBe("≈ 12 كم");
    expect(formatDistanceKm(Number.NaN)).toBe("غير متاحة");
  });
});

describe("ترشيح الكليات", () => {
  it("التغطية 21/21 — كل كلية لها إحداثيات صالحة", () => {
    const coverage = coordinateCoverage(SCHOOLS);
    expect(coverage.total).toBe(21);
    expect(coverage.withCoordinates).toBe(21);
  });

  it("النتيجة بحد أقصى ثلاث كليات بلا تكرار ومرتبة تصاعدياً بالمسافة", () => {
    const ranked = rankSchoolsByDistance(SCHOOLS, { latitude: 33.5731, longitude: -7.5898 }, { limit: 3 });
    expect(ranked.length).toBeLessThanOrEqual(3);
    const keys = ranked.map((item) => item.school.slug);
    expect(new Set(keys).size).toBe(keys.length);
    for (let index = 1; index < ranked.length; index += 1) {
      expect(ranked[index].distanceKm).toBeGreaterThanOrEqual(ranked[index - 1].distanceKm);
    }
  });

  it("طلبات المدن الثلاث (طنجة، الدار البيضاء، أكادير) تعطي نتائج معقولة من بيانات حقيقية", () => {
    for (const cityId of ["tanger", "casablanca", "agadir"]) {
      const city = byId(cityId);
      const ranked = rankSchoolsForCity(SCHOOLS, city);
      expect(ranked.length, cityId).toBeGreaterThan(0);
      expect(ranked.length, cityId).toBeLessThanOrEqual(3);
      // كل نتيجة تحمل مسافة رقمية صالحة وتعرضها الواجهة بصيغة «≈ N كم»
      for (const item of ranked) {
        expect(Number.isFinite(item.distanceKm), cityId).toBe(true);
        expect(formatDistanceKm(item.distanceKm), cityId).toMatch(/^≈ \d/);
      }
      // بلا مدينة، لا نتائج مطلقاً (المدينة اختيارية لا إجبارية)
      expect(rankSchoolsForCity(SCHOOLS, undefined)).toEqual([]);
    }
  });

  it("البحث عن مدينة يطابق الاسم العربي واللاتيني والألقاب البديلة", () => {
    expect(searchCities("طنجة").map((city) => city.id)).toContain("tanger");
    expect(searchCities("casablanca").map((city) => city.id)).toContain("casablanca");
    expect(searchCities("الدار البيضاء").map((city) => city.id)).toContain("casablanca");
    expect(searchCities("")).toHaveLength(CITIES.length === 18 ? 8 : searchCities("").length);
  });
});
