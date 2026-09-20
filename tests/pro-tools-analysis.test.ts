/**
 * تعميق أدوات Pro: الطبقة التحليلية الخالصة.
 *
 * ما يحميه هذا الملف:
 *   • الفرق النصّي بين نسختين يجب أن يبقى على مستوى الكلمة (لا يعرض الجملة
 *     كاملة كأنها تغيّرت) وأن يظل محكوماً بحدود تحمي الخيط الرئيسي.
 *   • مطابقة التغطية لفظية وقابلة للتفسير: التجريد من التشكيل والهمزات، ولا
 *     ادّعاء تقييم قانوني آلي.
 *   • حساب الآجال المعاكس يظل مطابقاً لاتجاهه الطبيعي (ذهاباً وإياباً) ويفشل
 *     مغلقاً خارج صلاحية القاعدة المراجعة.
 *   • البحث وترتيب المتابعة والتصدير لا تعتمد على ترتيب قادم من الشبكة.
 */
import { describe, expect, it } from 'vitest';
import {
  buildReferenceIndex,
  calculateCalendarDeadline,
  coverageCheck,
  daysUntil,
  deadlineSummary,
  diffText,
  exportResearchMarkdown,
  isWeekend,
  matchesQuery,
  noteWordCount,
  normalizeArabic,
  relatedReferences,
  relativeDayLabel,
  reverseCalendarDeadline,
  searchNotes,
  sortAlerts,
  splitSentences,
  stemArabic,
  upcomingAmendments,
  weekdayLabel,
  type Entry,
  type Note,
} from '@/lib/pro-tools/model';

let counter = 0;
function entry(tool: Entry['tool_slug'], payload: Record<string, string>, overrides: Partial<Entry> = {}): Entry {
  counter += 1;
  return {
    id: `e${counter}`,
    tool_slug: tool,
    title: `مادة ${counter}`,
    topic: 'موضوع',
    source_url: 'https://example.org/law',
    source_reference: 'مرجع',
    reviewed_by: 'مراجع',
    reviewed_on: '2026-01-01',
    published: true,
    payload,
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('التطبيع العربي والبحث', () => {
  it('يتجاهل التشكيل والتطويل وصيغ الهمزة والتاء المربوطة', () => {
    expect(normalizeArabic('التَّقــادُم')).toBe('التقادم');
    expect(normalizeArabic('إلى')).toBe('الي');
    expect(normalizeArabic('مصطلحاتٌ قانونيّة')).toBe(normalizeArabic('مصطلحات قانونية'));
  });

  it('يطابق الكلمة داخل كلمات أطول دون حساسية لعلامات الترقيم', () => {
    expect(matchesQuery('الفصل 106 من قانون الالتزامات والعقود', '106')).toBe(true);
    expect(matchesQuery('قانون الالتزامات والعقود', 'الالتزامات')).toBe(true);
    expect(matchesQuery('قانون الالتزامات والعقود', 'التحفيظ العقاري')).toBe(false);
    expect(matchesQuery('أي نصّ', '')).toBe(true);
  });

  it('يبحث في ملف البحث بالعنوان والمتن والمرجع', () => {
    const notes: Note[] = [
      { id: '1', tool_slug: 'workspace', title: 'التقادم', body: 'مدة المسطرة', citation: 'ق.ل.ع 387' },
      { id: '2', tool_slug: 'workspace', title: 'التسجيل', body: 'رسوم', citation: 'مدونة التسجيل' },
    ];
    expect(searchNotes(notes, 'تقادم').map(note => note.id)).toEqual(['1']);
    expect(searchNotes(notes, 'قانون الالتزامات والعقود 387')).toEqual([]);
    expect(searchNotes(notes, '387').map(note => note.id)).toEqual(['1']);
    expect(searchNotes(notes, '   ')).toHaveLength(2);
  });
});

describe('قانون عبر الزمن: الفرق النصّي', () => {
  it('يقسم النص إلى جمل على علامات عربية وأسطر', () => {
    expect(splitSentences('المادة الأولى.\nالمادة الثانية؟ المادة الثالثة')).toEqual([
      'المادة الأولى.',
      'المادة الثانية؟',
      'المادة الثالثة',
    ]);
  });

  it('لا يعلن تغييراً عندما يتطابق النصان بعد التجريد', () => {
    const result = diffText('الفصل 106: الالتزامات.', 'الفصل 106: الالتزامات.');
    expect(result.changeRatio).toBe(0);
    expect(result.addedWords).toBe(0);
    expect(result.removedWords).toBe(0);
    expect(result.segments.every(segment => segment.kind === 'same')).toBe(true);
  });

  it('يكشف الكلمة المستبدلة وحدها بدل الجملة كاملة', () => {
    const result = diffText('يُحدَّد الأجل في ثلاثين يوماً من التبليغ.', 'يُحدَّد الأجل في ستين يوماً من التبليغ.');
    const changed = result.segments.filter(segment => segment.kind !== 'same').map(segment => segment.text.trim());
    expect(changed).toContain('ثلاثين');
    expect(changed).toContain('ستين');
    expect(result.addedWords).toBe(1);
    expect(result.removedWords).toBe(1);
    expect(result.unchangedWords).toBeGreaterThan(4);
    expect(result.changeRatio).toBeGreaterThan(0);
    expect(result.changeRatio).toBeLessThan(30);
  });

  it('يفصل الجملة المضافة والمحذوفة ككتلتين', () => {
    const result = diffText('المادة الأولى.\nالمادة الثانية.', 'المادة الأولى.\nالمادة الثانية.\nالمادة الثالثة.');
    expect(result.segments.filter(segment => segment.kind === 'added')).toHaveLength(1);
    expect(result.segments.filter(segment => segment.kind === 'removed')).toHaveLength(0);
    expect(result.addedWords).toBe(2);
  });

  it('يفشل مغلقاً على النصوص الضخمة بلا مطابقة كلمة بكلمة', () => {
    const big = Array.from({ length: 700 }, (_, index) => `جملة رقم ${index} في نص تجريبي طويل.`).join('\n');
    const result = diffText(big, `${big}\nجملة زائدة.`);
    expect(result.truncated).toBe(true);
    expect(result.segments.length).toBeGreaterThan(0);
  });
});

describe('من الواقعة إلى الحل: تغطية عناصر التحليل', () => {
  const checklist = 'تحديد الطبيعة القانونية للعلاقة\nبيان الأجل المطبق ومرجعه\nالأساس القانوني للحل';

  it('يطابق الكلمات مع لواصق العطف وأداة التعريف', () => {
    // «والأجل» يجب أن تطابق «الأجل»، و«للعلاقة» يجب أن تطابق «العلاقة».
    // التجريد يعمل على النص المُطبَّع (نفس ما تفعله coverageCheck في الداخل).
    expect(stemArabic(normalizeArabic('والأجل'))).toBe('اجل');
    expect(stemArabic(normalizeArabic('للعلاقة'))).toBe('علاقه');
    expect(stemArabic(normalizeArabic('القانون'))).toBe('قانون');
    expect(stemArabic(normalizeArabic('من'))).toBe('من');
  });

  it('يحسب العناصر المذكورة ويسمّي المفقود', () => {
    const answer = 'الطبيعة القانونية للعلاقة عقدية، وبيان الأجل المطبق ومرجعه في القانون المدني، والأساس القانوني للحل في النص الرسمي.';
    const result = coverageCheck(answer, checklist);
    expect(result.total).toBe(3);
    expect(result.covered).toBe(3);
    expect(result.ratio).toBe(100);
    expect(result.items.every(item => item.matched)).toBe(true);
  });

  it('يكشف العنصر الغائب ولا يمنح نقاطاً مجانية', () => {
    const result = coverageCheck('الطبيعة القانونية للعلاقة عقدية فقط.', checklist);
    expect(result.covered).toBeLessThan(result.total);
    expect(result.items.some(item => !item.matched && item.missing.length > 0)).toBe(true);
  });

  it('يتجاهل الجواب الفارغ ويترك العناصر بلا كلمات دلالية للتقويم الذاتي', () => {
    const result = coverageCheck('', 'في\nمن');
    expect(result.items.every(item => !item.matched)).toBe(true);
    expect(result.total).toBe(0);
    expect(result.ratio).toBe(0);
  });
});

describe('خريطة الإحالات: الفهرسة والسلاسل', () => {
  const entries = [
    entry('references', { from_article: 'المادة 387', to_article: 'المادة 230', relationship: 'إحالة عامة', target_url: 'https://example.org/230' }),
    entry('references', { from_article: 'المادة 387', to_article: 'المادة 231', relationship: 'إحالة', target_url: 'https://example.org/231' }),
    entry('references', { from_article: 'المادة 106', to_article: 'المادة 230', relationship: 'تفسير', target_url: 'https://example.org/106' }),
    entry('versions', { before: 'أ', after: 'ب' }),
  ];

  it('يفصل الإحالات الصادرة من الواردة ويتجاهل غير أداة الإحالات', () => {
    const index = buildReferenceIndex(entries);
    expect(index.relationCount).toBe(3);
    expect(index.articles).toEqual(['المادة 106', 'المادة 230', 'المادة 231', 'المادة 387']);
    expect(index.outgoing['المادة 387']).toEqual(['المادة 230', 'المادة 231']);
    expect(index.incoming['المادة 230']).toEqual(['المادة 106', 'المادة 387']);
    expect(index.incoming['المادة 106']).toBeUndefined();
  });

  it('يجمع كل علاقات نصّ واحد في الاتجاهين', () => {
    expect(relatedReferences(entries, 'المادة 230').map(item => item.payload.from_article)).toEqual(['المادة 387', 'المادة 106']);
    expect(relatedReferences(entries, 'المادة 387')).toHaveLength(2);
    expect(relatedReferences(entries, '')).toEqual([]);
    expect(relatedReferences(entries, 'المادة 999')).toEqual([]);
  });
});

describe('راقب النص: المواعيد والترتيب', () => {
  const entries = [
    entry('alerts', { summary: 'ب', effective_date: '2026-10-15' }, { updated_at: '2026-09-10T00:00:00.000Z' }),
    entry('alerts', { summary: 'أ', effective_date: '2026-09-25' }, { updated_at: '2026-09-20T00:00:00.000Z' }),
    entry('alerts', { summary: 'ج', effective_date: '2027-03-01' }, { updated_at: '2026-09-01T00:00:00.000Z' }),
    entry('alerts', { summary: 'د', effective_date: 'غير صالح' }),
  ];

  it('يرشّح النافذة الزمنية ويرتّب تصاعدياً بتاريخ النفاذ', () => {
    expect(upcomingAmendments(entries, '2026-09-20', 30).map(item => item.payload.effective_date)).toEqual(['2026-09-25', '2026-10-15']);
    expect(upcomingAmendments(entries, '2026-09-26', 30)).toHaveLength(1);
    expect(upcomingAmendments(entries, '2026-09-20', 0)).toEqual([]);
    expect(upcomingAmendments(entries, '20-09-2026', 30)).toEqual([]);
  });

  it('يرتّب حسب الأحدث تحديثاً عند الطلب', () => {
    expect(sortAlerts(entries, 'recent')[0].updated_at).toBe('2026-09-20T00:00:00.000Z');
    expect(sortAlerts(entries, 'effective').map(item => item.payload.effective_date)).toEqual(['2026-09-25', '2026-10-15', '2027-03-01', 'غير صالح']);
  });
});

describe('حاسبة الآجال: الاتجاه المعاكس والسياق', () => {
  const payload = { days: '30', valid_from: '2026-01-01', valid_until: '2026-12-31', assumptions: 'أيام تقويمية فقط' };

  it('يرجع من الأجل إلى آخر تاريخ حدث، ويطابق الحساب الطبيعي', () => {
    expect(reverseCalendarDeadline('2026-05-31', payload)).toBe('2026-05-01');
    expect(calculateCalendarDeadline('2026-05-01', payload)).toBe('2026-05-31');
    expect(reverseCalendarDeadline('2026-03-01', payload)).toBe('2026-01-30');
  });

  it('يفشل مغلقاً خارج صلاحية القاعدة المراجعة أو عند قاعدة غير صالحة', () => {
    for (const deadline of ['2027-01-01', '2025-12-31', '2026-02-30', '']) {
      expect(() => reverseCalendarDeadline(deadline, payload)).toThrow();
    }
    expect(() => reverseCalendarDeadline('2026-05-31', { ...payload, days: '0' })).toThrow();
    expect(() => reverseCalendarDeadline('2026-01-10', payload)).toThrow();
  });

  it('يسمّي يوم الأسبوع ويعلّم العطلة الأسبوعية بلا تعديل للحساب', () => {
    expect(weekdayLabel('2026-09-19')).toBe('السبت');
    expect(weekdayLabel('2026-09-21')).toBe('الاثنين');
    expect(weekdayLabel('خطأ')).toBe('');
    expect(isWeekend('2026-09-19')).toBe(true);
    expect(isWeekend('2026-09-20')).toBe(true);
    expect(isWeekend('2026-09-21')).toBe(false);
  });

  it('يلخّص النتيجة مع حدودها للنسخ', () => {
    const summary = deadlineSummary('2026-05-01', '2026-05-31', payload);
    expect(summary).toContain('2026-05-01');
    expect(summary).toContain('2026-05-31');
    expect(summary).toContain('30');
    expect(summary).toContain('أيام تقويمية فقط');
    expect(summary).toContain('لا يشمل تمديد العطل أو أيام العمل');
  });
});

describe('الفروق الزمنية المعروضة', () => {
  it('يحسب الأيام ويصوغها بالعربية كما تُقرأ لا كما تُترجم حرفياً', () => {
    expect(daysUntil('2026-10-01', '2026-09-21')).toBe(10);
    expect(relativeDayLabel('2026-09-21', '2026-09-21')).toBe('اليوم');
    expect(relativeDayLabel('2026-09-22', '2026-09-21')).toBe('غداً');
    expect(relativeDayLabel('2026-09-23', '2026-09-21')).toBe('بعد يومين');
    expect(relativeDayLabel('2026-09-26', '2026-09-21')).toBe('بعد 5 أيام');
    expect(relativeDayLabel('2026-10-11', '2026-09-21')).toBe('بعد 20 يوماً');
    expect(relativeDayLabel('2026-09-20', '2026-09-21')).toBe('منذ يوم');
    expect(relativeDayLabel('خطأ', '2026-09-21')).toBe('');
    expect(daysUntil('خطأ', '2026-09-21')).toBeNull();
  });
});

describe('ملف البحث: التصدير والعدّ', () => {
  const notes: Note[] = [
    { id: '1', tool_slug: 'workspace', title: 'بحث', body: 'ملاحظة أولى', citation: 'قانون 1' },
    { id: '2', tool_slug: 'cases', title: 'تمرين', body: 'إجابة', citation: '' },
  ];

  it('يصدّر Markdown بعنوان واقتباس للمرجع', () => {
    const text = exportResearchMarkdown(notes);
    expect(text).toContain('# ملف البحث القانوني');
    expect(text).toContain('## بحث');
    expect(text).toContain('> المرجع: قانون 1');
    expect(text).toContain('> المرجع: غير محدد');
    expect(text).toContain('---');
  });

  it('يعدّ الكلمات بعدّ محايد', () => {
    expect(noteWordCount('كلمة اثنتان   ثلاث')).toBe(3);
    expect(noteWordCount('')).toBe(0);
  });
});
