// @vitest-environment jsdom
/**
 * تعميق أدوات Pro: سلوك الواجهات الست داخل بوابة الاشتراك.
 *
 * الاختبار يشغّل الصفحة كما يشغّلها العضو المشترك (بوابة الخدمة موكّة كي لا
 * يعتمد على الشبكة)، ويتحقق من الميزات العميقة: عرض الفروق، خريطة الإحالات
 * وترشيحها، ترتيب المتنبّهات ومؤشر «جديد»، الاتجاه المعاكس في حاسبة الآجال،
 * وبحث ملف البحث. الرسائل نفسها هي ما يراه المستخدم، فهي المقيس هنا.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: { id: 'pro' } as { id: string } | null }));
const service = vi.hoisted(() => ({
  catalog: vi.fn(),
  access: vi.fn(),
  entries: vi.fn(),
  notes: vi.fn(),
  follows: vi.fn(),
  saveNote: vi.fn(),
  deleteNote: vi.fn(),
  follow: vi.fn(),
  unfollow: vi.fn(),
}));

vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => ({ user: state.user, initialized: true }) }));
vi.mock('@/lib/pro-tools/service', () => ({ toolsService: service }));
vi.mock('@/components/seo/AEOHead', () => ({ AEOHead: () => null }));

import ProToolsPage from '../src/pages/public/ProToolsPage';
import { CoveragePreview, DiffPreview } from '../src/components/pro-tools/ToolViews';
import type { Entry, Tool } from '../src/lib/pro-tools/model';

let root: Root;
let container: HTMLDivElement;
const NOW = '2026-09-20';

function tool(slug: string, enabled = true): Tool {
  return { slug: slug as Tool['slug'], title: 'أداة', description: 'وصف', enabled };
}

function entry(slug: Entry['tool_slug'], payload: Record<string, string>, overrides: Partial<Entry> = {}): Entry {
  return {
    id: `${slug}-${Object.keys(payload).length}-${overrides.title || 'a'}`,
    tool_slug: slug,
    title: overrides.title || 'مادة منشورة',
    topic: overrides.topic || 'الالتزامات والعقود',
    source_url: 'https://example.org/law',
    source_reference: 'الجريدة الرسمية عدد 1',
    reviewed_by: 'مراجع',
    reviewed_on: '2026-08-01',
    published: true,
    payload,
    updated_at: overrides.updated_at || '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

/** عرض مكوّن مستقل (بلا موجّه) في حاوية معزولة، على الخيط نفسه. */
function renderSync(node: HTMLDivElement, element: Parameters<Root['render']>[0]): Root {
  document.body.append(node);
  const local = createRoot(node);
  act(() => { local.render(element); });
  return local;
}

function cleanup(node: HTMLDivElement, local: Root) {
  act(() => { local.unmount(); });
  node.remove();
}

async function render(slug: string) {
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[`/pro-tools/${slug}`]}><Routes><Route path="/pro-tools/:slug" element={<ProToolsPage />} /></Routes></MemoryRouter>);
  });
}

const click = async (element: Element | null) => {
  expect(element, 'العنصر المطلوب للنقر').not.toBeNull();
  await act(async () => { (element as HTMLElement).click(); });
};

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(`${NOW}T09:00:00.000Z`));
  vi.resetAllMocks();
  localStorage.clear();
  state.user = { id: 'pro' };
  service.access.mockResolvedValue(true);
  service.follows.mockResolvedValue([]);
  service.notes.mockResolvedValue([]);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('قانون عبر الزمن — عرض الفروق', () => {
  const versions = entry('versions', {
    before: 'يُحدَّد الأجل في ثلاثين يوماً من التبليغ.',
    after: 'يُحدَّد الأجل في ستين يوماً من التبليغ.',
    before_date: '2025-01-01',
    after_date: '2026-01-01',
    before_source_url: 'https://example.org/old',
  });

  it('يفتح على عرض الفروق ويسمّي الكلمة المستبدلة مع الإحصاء', async () => {
    service.catalog.mockResolvedValue([tool('versions')]);
    service.entries.mockResolvedValue([versions]);
    await render('versions');

    expect(container.textContent).toContain('عرض الفروق');
    expect(container.textContent).toContain('أُضيفت 1 كلمة، وحُذفت 1 كلمة');
    const removed = [...container.querySelectorAll('span')].filter(span => span.className.includes('line-through')).map(span => span.textContent?.trim());
    expect(removed).toContain('ثلاثين');
    const added = [...container.querySelectorAll('span')].filter(span => span.className.includes('bg-[#dcfce7]')).map(span => span.textContent?.trim());
    expect(added).toContain('ستين');
  });

  it('يبدّل إلى العرض المتجاور دون تكرار كتلة الفروق', async () => {
    service.catalog.mockResolvedValue([tool('versions')]);
    service.entries.mockResolvedValue([versions]);
    await render('versions');
    const sideButton = [...container.querySelectorAll('button')].find(button => button.textContent === 'جنباً إلى جنب');
    await click(sideButton || null);
    expect(container.textContent).toContain('مصدر النسخة السابقة');
    expect(container.textContent).toContain('مصدر النسخة الجديدة');
  });
});

describe('خريطة الإحالات — الفهرسة والترشيح', () => {
  const relations = [
    entry('references', { from_article: 'المادة 387', to_article: 'المادة 230', relationship: 'إحالة', target_url: 'https://example.org/230' }, { title: 'من 387 إلى 230' }),
    entry('references', { from_article: 'المادة 387', to_article: 'المادة 231', relationship: 'إحالة', target_url: 'https://example.org/231' }, { title: 'من 387 إلى 231' }),
    entry('references', { from_article: 'المادة 106', to_article: 'المادة 230', relationship: 'تفسير', target_url: 'https://example.org/106' }, { title: 'من 106 إلى 230' }),
  ];

  it('يعرض عدد العلاقات لكل نص ويرشّح عند الاختيار', async () => {
    service.catalog.mockResolvedValue([tool('references')]);
    service.entries.mockResolvedValue(relations);
    await render('references');

    // أربعة نصوص مختلفة تظهر في العلاقات (106، 230، 231، 387) لا ثلاثة
    expect(container.textContent).toContain('3 علاقة موثقة بين 4 نصّاً');
    const chip = [...container.querySelectorAll('button')].find(button => button.textContent?.startsWith('المادة 230'));
    // «المادة 230» هدف لإحالتين ولا تصدر عن أحد نص.
    expect(chip?.textContent).toContain('0 صادرة، 2 واردة');

    await click(chip || null);
    expect(container.textContent).toContain('للنص المحدد «المادة 230»');
    expect(container.textContent).toContain('2 نتيجة');
    expect(container.textContent).toContain('اتجاه العلاقة: واردة إلى النص المحدد');
    expect(container.textContent).toContain('سلسلة الإحالات');
  });
});

describe('راقب النص — الترتيب والنافذة والمؤشر الجديد', () => {
  const alerts = [
    entry('alerts', { summary: 'تعديل بعيد', effective_date: '2027-03-01' }, { title: 'تعديل بعيد', updated_at: '2026-08-01T00:00:00.000Z' }),
    entry('alerts', { summary: 'تعديل قريب', effective_date: '2026-09-25' }, { title: 'تعديل قريب', updated_at: '2026-09-19T00:00:00.000Z' }),
    entry('alerts', { summary: 'تعديل نافذ', effective_date: '2026-10-15' }, { title: 'تعديل نافذ', updated_at: '2026-09-10T00:00:00.000Z' }),
  ];

  it('يرتّب الأقرب نفاذاً ويعرض النافذة القادمة', async () => {
    service.catalog.mockResolvedValue([tool('alerts')]);
    service.entries.mockResolvedValue(alerts);
    await render('alerts');

    expect(container.textContent).toContain('تنفذ خلال 30 يوماً (2)');
    const headings = [...container.querySelectorAll('h3')].map(node => node.textContent || '');
    expect(headings[0]).toContain('تعديل قريب');
    expect(headings[1]).toContain('تعديل نافذ');
    expect(headings[2]).toContain('تعديل بعيد');
    expect(container.textContent).toContain('بعد 5 أيام');
  });

  it('يميّز ما تغيّر منذ آخر زيارة ويمسح المؤشر بالتعليم كمقروء', async () => {
    service.catalog.mockResolvedValue([tool('alerts')]);
    service.entries.mockResolvedValue(alerts);
    localStorage.setItem('mizan:pro-tools:seen:alerts', '2026-09-15T00:00:00.000Z');
    await render('alerts');

    const marked = [...container.querySelectorAll('h3')].filter(node => node.textContent?.includes('جديد'));
    expect(marked.map(node => node.textContent)).toEqual(['تعديل قريبجديد']);

    const clear = [...container.querySelectorAll('button')].find(button => button.textContent === 'تعليم الكل كمقروء');
    await click(clear || null);
    expect([...container.querySelectorAll('h3')].some(node => node.textContent?.includes('جديد'))).toBe(false);
    expect(localStorage.getItem('mizan:pro-tools:seen:alerts')).toBeTruthy();
  });
});

describe('حاسبة الآجال — الاتجاه المعاكس', () => {
  const deadline = entry('deadlines', {
    days: '30',
    valid_from: '2026-01-01',
    valid_until: '2026-12-31',
    assumptions: 'أيام تقويمية فقط',
  });

  it('يحسب من آخر أجل إلى آخر تاريخ حدث داخل صلاحية القاعدة', async () => {
    service.catalog.mockResolvedValue([tool('deadlines')]);
    service.entries.mockResolvedValue([deadline]);
    await render('deadlines');

    const backwards = [...container.querySelectorAll('button')].find(button => button.textContent === 'من آخر أجل إلى آخر تاريخ حدث');
    await click(backwards || null);

    const input = container.querySelector('input[type="date"]') as HTMLInputElement;
    await act(async () => {
      // React يتتبع قيمة الحقل عبر الواضع الأصلي؛ الإسناد المباشر لا يُحدِث onChange.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, '2026-05-31');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await click(checkbox);
    const compute = [...container.querySelectorAll('button')].find(button => button.textContent === 'حساب أولي');
    await click(compute || null);

    expect(container.textContent).toContain('آخر تاريخ حدث يسمح به الأجل: 2026-05-01');
    // النسخ يحمل حدود الحساب لا الرقم وحده، فلا يُقتبس الرقم مجرّداً من شروطه.
    const copy = [...container.querySelectorAll('button')].find(button => button.textContent === 'نسخ النتيجة مع حدودها');
    expect(copy).toBeTruthy();
    expect(container.textContent).toContain('الجمعة'); // 2026-05-01
  });

  it('يفشل مغلقاً عندما يخرج الأجل عن صلاحية القاعدة المراجعة', async () => {
    service.catalog.mockResolvedValue([tool('deadlines')]);
    service.entries.mockResolvedValue([deadline]);
    await render('deadlines');
    await click([...container.querySelectorAll('button')].find(button => button.textContent === 'من آخر أجل إلى آخر تاريخ حدث') || null);
    const input = container.querySelector('input[type="date"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, '2026-01-10');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(container.querySelector('input[type="checkbox"]'));
    await click([...container.querySelectorAll('button')].find(button => button.textContent === 'حساب أولي') || null);
    expect(container.textContent).toContain('أقدم تاريخ حدث تقبله القاعدة لا يبلغ هذا الأجل.');
    expect([...container.querySelectorAll('button')].some(button => button.textContent === 'نسخ النتيجة مع حدودها')).toBe(false);
  });
});

describe('لوحة الإدارة — معاينة قبل النشر', () => {
  it('تعرض الفرق الذي سيراه المشترك وتحذّر حين لا يوجد فرق', () => {
    const identical = document.createElement('div');
    const identicalRoot = renderSync(identical, <DiffPreview before="يُحدَّد الأجل في ثلاثين يوماً." after="يُحدَّد الأجل في ثلاثين يوماً." />);
    expect(identical.textContent).toContain('لا فرق بين النصين: التعديل لن يظهر.');

    const changed = document.createElement('div');
    const changedRoot = renderSync(changed, <DiffPreview before="يُحدَّد الأجل في ثلاثين يوماً." after="يُحدَّد الأجل في ستين يوماً." />);
    expect(changed.textContent).toContain('أُضيفت 1 كلمة، وحُذفت 1 كلمة');

    cleanup(identical, identicalRoot);
    cleanup(changed, changedRoot);
  });

  it('تكشف العنصر الذي لا تذكره الإجابة النموذجية', () => {
    const node = document.createElement('div');
    const local = renderSync(node, <CoveragePreview answer="الطبيعة القانونية للعلاقة عقدية." checklist={'الطبيعة القانونية للعلاقة\nالأجل المطبق ومرجعه'} />);
    expect(node.textContent).toContain('عناصر التحليل في الإجابة النموذجية: 1 من 2');
    expect(node.textContent).toContain('× الأجل المطبق ومرجعه');
    cleanup(node, local);
  });
});

describe('ملف البحث — البحث والعدّ', () => {
  const notes = [
    { id: '1', tool_slug: 'workspace' as const, title: 'التقادم', body: 'مدة المسطرة المدنية', citation: 'ق.ل.ع 387' },
    { id: '2', tool_slug: 'workspace' as const, title: 'التسجيل', body: 'رسوم التسجيل', citation: 'مدونة التسجيل' },
  ];

  it('يرشّح الملاحظات بالتطبيع ويعدّ الكلمات', async () => {
    service.catalog.mockResolvedValue([tool('workspace')]);
    service.notes.mockResolvedValue(notes);
    await render('workspace');

    expect(container.textContent).toContain('2 ملاحظة محفوظة');
    const search = container.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(search, 'تقادم');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).toContain('1 من 2 ملاحظة تطابق');
    expect(container.textContent).toContain('التقادم');
    expect(container.textContent).not.toContain('مدونة التسجيل');
  });
});
