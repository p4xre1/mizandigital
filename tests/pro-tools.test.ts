import { describe, expect, it } from 'vitest';
import { calculateCalendarDeadline, exportResearch, safeSource, validateEntry, type Entry } from '../src/lib/pro-tools/model';

const base = { tool_slug: 'deadlines', title: 'اختبار', topic: 'اختبار', source_url: 'https://example.org/law', source_reference: 'مرجع اختباري', reviewed_by: 'مراجع', reviewed_on: '2026-01-01', published: true, payload: { days: '10', valid_from: '2026-01-01', valid_until: '2026-12-31', assumptions: 'أيام تقويمية فقط' } } satisfies Omit<Entry, 'id' | 'updated_at'>;
describe('Pro tool content and calculations', () => {
  it('requires complete source and review metadata before publication', () => {
    expect(validateEntry(base)).toBeNull();
    for (const field of ['source_url', 'source_reference', 'reviewed_by', 'reviewed_on']) expect(validateEntry({ ...base, [field]: '' })).toBeTruthy();
    expect(validateEntry({ ...base, published: false, source_url: '', reviewed_by: '' })).toBeNull();
  });
  it('rejects unsafe links and impossible dates', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'http://example.org', 'https://user:password@example.org']) expect(safeSource(url)).toBeUndefined();
    expect(safeSource('https://example.org/law')).toBe('https://example.org/law');
    expect(validateEntry({ ...base, reviewed_on: '2026-02-30' })).toBeTruthy();
    expect(validateEntry({ ...base, reviewed_on: '2999-01-01' })).toBeTruthy();
  });
  it('rejects empty content and reversed version dates', () => {
    expect(validateEntry({ ...base, payload: {} })).toBeTruthy();
    expect(validateEntry({ ...base, tool_slug: 'versions', payload: { before: 'a', after: 'b', before_source_url: 'https://example.org/old', before_date: '2026-02-01', after_date: '2026-01-01' } })).toBeTruthy();
  });
  it('calculates in UTC excluding the trigger date across month and year boundaries', () => {
    expect(calculateCalendarDeadline('2026-01-25', base.payload)).toBe('2026-02-04');
    expect(calculateCalendarDeadline('2026-12-31', base.payload)).toBe('2027-01-10');
    expect(calculateCalendarDeadline('2024-02-28', { ...base.payload, days: '1', valid_from: '2024-01-01' })).toBe('2024-02-29');
  });
  it('fails closed for out-of-scope or invalid deadlines', () => {
    for (const date of ['2025-12-31', '2027-01-01', '2026-02-30', '']) expect(() => calculateCalendarDeadline(date, base.payload)).toThrow();
    for (const days of ['0', '-1', '1.5', '3651', 'NaN']) expect(() => calculateCalendarDeadline('2026-01-01', { ...base.payload, days })).toThrow();
  });
  it('exports notes with their citations as plain text', () => {
    const text = exportResearch([{ id: '1', tool_slug: 'workspace', title: 'بحث', body: 'ملاحظة', citation: 'قانون 1 - نسخة 2026' }]);
    expect(text).toContain('بحث'); expect(text).toContain('ملاحظة'); expect(text).toContain('قانون 1 - نسخة 2026');
  });
});
