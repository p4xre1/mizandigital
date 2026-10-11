/**
 * هوية المدن في دليل الكليات: كل مدينة معروفة تأخذ لوحتها الخاصة، والنجمة
 * تحمل عدد الرؤوس المطلوب، والمدينة المجهولة لها لوحة ثابتة لا تتغير بين الزيارات.
 */
import { describe, expect, it } from 'vitest';
import schools from '../src/data/schools.json';
import { cityTheme, starPolygon } from '../src/lib/schools/cityTheme';

const cities = Array.from(new Set((schools as { city: string }[]).map((s) => s.city)));

describe('cityTheme', () => {
  it('gives every city in the guide a distinct palette', () => {
    const keys = cities.map((city) => {
      const t = cityTheme(city);
      return `${t.from}|${t.to}|${t.points}`;
    });
    expect(new Set(keys).size).toBe(cities.length);
  });

  it('is stable for unknown cities', () => {
    expect(cityTheme('مدينة غير معروفة')).toEqual(cityTheme('مدينة غير معروفة'));
  });

  it('handles empty input without throwing', () => {
    expect(() => cityTheme(undefined)).not.toThrow();
    expect(() => cityTheme('')).not.toThrow();
  });
});

describe('starPolygon', () => {
  it('produces 2 vertices per point', () => {
    expect(starPolygon(8, 0.5).split(' ')).toHaveLength(16);
    expect(starPolygon(12, 0.6).split(' ')).toHaveLength(24);
  });
});
