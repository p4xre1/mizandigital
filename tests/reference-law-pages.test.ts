/**
 * صفحات النصوص في خريطة الإحالات: كل إحالة تنتمي إلى صفحة واحدة بالضبط،
 * فلا تضيع إحالة بين الصفحات ولا تظهر في صفحتين.
 */
import { describe, expect, it } from 'vitest';
import {
  OTHER_REFERENCES_LAW,
  REFERENCE_LAWS,
  curatedReferences,
  lawsWithReferences,
  referencesForLaw,
  type Reference,
} from '../src/lib/pro-tools/referenceMap';

const pageSlugs = [...REFERENCE_LAWS, OTHER_REFERENCES_LAW].map((law) => law.slug);

describe('صفحات النصوص', () => {
  it('كل إحالة منسّقة تنتمي إلى صفحة واحدة بالضبط', () => {
    const counted = pageSlugs.flatMap((slug) => referencesForLaw(curatedReferences, slug).map((r) => r.id));
    expect(counted.length).toBe(curatedReferences.length);
    expect(new Set(counted).size).toBe(curatedReferences.length);
  });

  it('لا تُعرض صفحة «نصوص أخرى» إن لم تكن فيها إحالات', () => {
    expect(lawsWithReferences(curatedReferences).map((law) => law.slug)).not.toContain('other');
  });

  it('الإحالة بلا نص مُحيل معروف تذهب إلى «نصوص أخرى»', () => {
    const orphan = { ...curatedReferences[0], id: 'orphan', fromText: 'نص غير مسمّى' } as Reference;
    const refs = [...curatedReferences, orphan];
    expect(referencesForLaw(refs, 'other').map((r) => r.id)).toEqual(['orphan']);
    expect(lawsWithReferences(refs).map((law) => law.slug)).toContain('other');
  });

  it('الصفحة المجهولة فارغة', () => {
    expect(referencesForLaw(curatedReferences, 'unknown')).toEqual([]);
  });
});
