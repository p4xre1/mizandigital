// @vitest-environment jsdom
/**
 * اختبارات واجهة خريطة الإحالات.
 *
 * أهم ما يُختبر هنا: الأداة تعمل للزائر بلا حساب، وتعمل حين تتعطّل قاعدة
 * البيانات، لأن محتواها الأساسي نصّ رسمي عام مودع في المستودع. تعطّل الشبكة
 * يجب أن يسلبها «مواد التحرير الإضافية» لا أن يسلبها نفسها.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: null as { id: string } | null }));
const service = vi.hoisted(() => ({ catalog: vi.fn(), entries: vi.fn(), notes: vi.fn(), saveNote: vi.fn(), follows: vi.fn() }));
vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => ({ user: state.user, initialized: true }) }));
vi.mock('@/lib/pro-tools/service', () => ({ toolsService: service }));
vi.mock('@/components/seo/AEOHead', () => ({ AEOHead: () => null }));

import ProToolsPage from '../src/pages/public/ProToolsPage';

let root: Root;
let container: HTMLDivElement;

const referenceTool = { slug: 'references', title: 'خريطة الإحالات القانونية', description: 'ابحث عن الروابط بين النصوص ومصادرها.', enabled: true };

async function render(path = '/pro-tools/references') {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/pro-tools/:slug" element={<ProToolsPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

async function type(text: string) {
  const input = container.querySelector<HTMLInputElement>('input[type="search"]');
  expect(input, 'حقل البحث موجود').not.toBeNull();
  await act(async () => {
    // الضبط عبر setter الأصلي: React يتتبّع القيمة داخلياً، فإسنادها مباشرة
    // (input.value = ...) يجعل React يظنّ أن شيئاً لم يتغيّر فيُهمل الحدث.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter!.call(input!, text);
    input!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/**
 * هل هذا الرابط مسموح بعرضه؟
 *
 * قائمة سماح لا قائمة منع: `href.startsWith('javascript:')` يمنع مخططاً واحداً
 * ويترك `data:` و`vbscript:` و`JaVaScRiPt:` تمرّ. المسموح هنا صنفان فقط —
 * رابط https بلا بيانات اعتماد، ومسار داخلي نسبي — وكل ما عداه مرفوض ولو لم
 * نكن سمعنا بمخططه.
 */
function isAllowedHref(href: string): boolean {
  if (href === '' || href.startsWith('#')) return true;
  // «/login?next=...» نعم، و«//evil.com» لا: هذا بروتوكول نسبي لا مسار نسبي.
  if (/^\/[^/]/.test(href)) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** عدد الإحالات الظاهر في عنوان القائمة، لا أي عنوان آخر في الصفحة. */
const countOf = () => {
  const heading = Array.from(container.querySelectorAll('h2')).find(el => el.textContent?.includes('الإحالات'));
  return Number((heading?.textContent?.match(/\((\d+)\)/) ?? [])[1]);
};

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.user = null;
  vi.resetAllMocks();
  service.catalog.mockResolvedValue([referenceTool]);
  service.entries.mockResolvedValue([]);
  service.notes.mockResolvedValue([]);
  service.follows.mockResolvedValue([]);
  service.saveNote.mockResolvedValue({ id: 'n1' });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.clear();
});

describe('واجهة خريطة الإحالات', () => {
  it('تعرض المجموعة المنسّقة للزائر بلا حساب', async () => {
    await render();
    expect(container.textContent).toContain('خريطة الإحالات');
    expect(container.textContent).toContain('الفصل 29');
    expect(container.textContent).toContain('الإضراب');
    expect(container.textContent).not.toContain('قيد الإعداد');
  });

  it('تظل تعمل حين تتعطّل قاعدة البيانات، وتنبّه بأن مواد التحرير غير متاحة', async () => {
    service.catalog.mockRejectedValue(new Error('offline'));
    service.entries.mockRejectedValue(new Error('offline'));
    await render();
    expect(container.textContent).toContain('الفصل 29');
    expect(container.textContent).toContain('غير متاحة في هذه اللحظة');
  });

  it('تبحث في الإحالات وتفلترها بكلمة من النص', async () => {
    await render();
    const before = countOf();
    expect(before).toBeGreaterThan(10);
    await type('الإضراب');
    expect(container.textContent).toContain('القانون التنظيمي رقم 97.15');
    expect(container.textContent).not.toContain('نزع الملكية');
    const after = countOf();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  it('تتذكّر البحث في الرابط حتى يمكن مشاركته', async () => {
    await render();
    await type('المحكمة الدستورية');
    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('المحكمة الدستورية');
  });

  it('تفتح رابطاً عميقاً إلى عقدة مركَّز عليها', async () => {
    await render('/pro-tools/references?focus=' + encodeURIComponent('الدستور المغربي (2011)::الفصل 71'));
    expect(container.textContent).toContain('إحالة صادرة');
    expect(container.textContent).toContain('الفصل 71');
  });

  it('تصنّف الأنواع وتميّز الإحالة الصريحة من التخويل التشريعي', async () => {
    await render();
    expect(container.textContent).toContain('إحالة صريحة');
    expect(container.textContent).toContain('تخويل تشريعي');
    const chip = Array.from(container.querySelectorAll('button')).find(el => el.textContent?.includes('تخويل تشريعي'));
    expect(chip).toBeTruthy();
    await act(async () => { chip?.click(); });
    expect(container.textContent).toContain('يحدد القانون');
  });

  it('تحفظ الإحالة في ملف البحث الخاص بالمستخدم المسجّل', async () => {
    state.user = { id: 'member' };
    await render();
    const details = Array.from(container.querySelectorAll('button')).find(el => el.textContent?.includes('تفاصيل الإحالة'));
    expect(details).toBeTruthy();
    await act(async () => { details?.click(); });
    const save = Array.from(container.querySelectorAll('button')).find(el => el.textContent?.includes('أضف إلى ملف البحث'));
    expect(save).toBeTruthy();
    await act(async () => { save?.click(); });
    expect(service.saveNote).toHaveBeenCalledOnce();
    const note = service.saveNote.mock.calls[0][0];
    expect(note.tool_slug).toBe('workspace');
    // المرجع يحمل النص المُحيل ورابطه الرسمي: النص بلا رابط اقتباس ناقص.
    expect(String(note.citation)).toContain('https://bdj.mmsp.gov.ma');
    expect(String(note.citation)).toContain('الدستور المغربي');
    expect(container.textContent).toContain('أُضيفت الإحالة إلى ملف البحث');
  });

  it('تعرض رابط تسجيل الدخول بدل الحفظ للزائر', async () => {
    await render();
    const details = Array.from(container.querySelectorAll('button')).find(el => el.textContent?.includes('تفاصيل الإحالة'));
    await act(async () => { details?.click(); });
    expect(container.textContent).toContain('سجّل الدخول مجاناً');
    expect(service.saveNote).not.toHaveBeenCalled();
  });

  it('تضيف مواد التحرير المنشورة إلى المجموعة المنسّقة', async () => {
    service.entries.mockResolvedValue([{
      id: 'editor-1',
      tool_slug: 'references',
      title: 'إحالة محرّر',
      topic: 'موضوع التحرير',
      source_url: 'https://example.org/source',
      source_reference: 'مرجع',
      reviewed_by: 'محرّر',
      reviewed_on: '2026-09-01',
      published: true,
      payload: {
        from_text: 'مدونة تجريبية',
        from_article: 'المادة 1',
        to_text: 'مدونة تجريبية',
        to_article: 'المادة 2',
        relationship: 'إحالة أضافها المحرّر للاختبار',
        target_url: 'https://example.org/target',
        relation_type: 'explicit',
        target_verified: 'true',
      },
      updated_at: '2026-09-01T00:00:00Z',
    }]);
    await render();
    expect(container.textContent).toContain('إحالة أضافها المحرّر للاختبار');
    expect(container.textContent).toContain('الفصل 29');
  });

  it('لا ترسم كتلة خطوط غير مقروءة: تعرض نقاط بداية بدل الخريطة المزدحمة', async () => {
    await render();
    // ليست كل svg خريطة: أيقونات الواجهة svg أيضاً. الخريطة وحدها موسومة بدور img.
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(0);
    expect(container.textContent).toContain('الخريطة أوضح حين تحدد مجالاً');
    const chip = Array.from(container.querySelectorAll('button')).find(el => /^الفصل 71\s*\(\d+\)$/.test(el.textContent?.trim() ?? ''));
    expect(chip, 'أكثر العقد اتصالاً معروضة للبدء منها').toBeTruthy();
    await act(async () => { chip?.click(); });
    expect(container.textContent).toContain('إحالة صادرة');
  });

  it('ترسم الخريطة حين يطلبها المستخدم صراحةً ولو كانت مزدحمة', async () => {
    await render('/pro-tools/references?map=1');
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(1);
  });

  it('تبقى معطّلة إن عطّلها المدير، ولا تُحمّل محتواها', async () => {
    service.catalog.mockResolvedValue([{ ...referenceTool, enabled: false }]);
    await render();
    expect(container.textContent).toContain('قيد الإعداد');
    expect(service.entries).not.toHaveBeenCalled();
  });

  it('لا تعرض روابط غير آمنة ولو وردت في البيانات', async () => {
    // ثلاثة مخططات لا واحد: javascript و data و vbscript. فحص مخطط واحد يترك
    // الباقي يمرّ، وهو بالضبط ما ترصده قاعدة CodeQL باسم
    // incomplete-url-scheme-check.
    const unsafe = ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)'];
    service.entries.mockResolvedValue(unsafe.map((url, index) => ({
      id: `bad-${index}`,
      tool_slug: 'references',
      title: 'رابط خطر',
      topic: 'اختبار',
      source_url: url,
      source_reference: '',
      reviewed_by: 'محرّر',
      reviewed_on: '2026-09-01',
      published: true,
      payload: {
        from_article: 'المادة 1', to_article: `المادة ${index + 2}`, relationship: 'علاقة اختبارية للتحقق من الأمان',
        target_url: url, relation_type: 'explicit', target_verified: 'true',
      },
      updated_at: '2026-09-01T00:00:00Z',
    })));
    await render();
    const hrefs = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href') ?? '');
    // قائمة المنع تنمو بالأخطاء وقائمة السماح تنقص بها: المسموح رابط https أو
    // مسار داخلي نسبي، وما عداه مرفوض ولو لم نكن سمعنا بمخططه.
    expect(hrefs.filter(href => !isAllowedHref(href)), 'كل رابط معروض إما https أو مسار داخلي').toEqual([]);
    expect(hrefs.length, 'الصفحة تعرض روابط بالفعل، فالفحص ليس فارغاً').toBeGreaterThan(0);
    expect(container.textContent).toContain('علاقة اختبارية للتحقق من الأمان');
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).not.toContain('vbscript:');
  });
});
