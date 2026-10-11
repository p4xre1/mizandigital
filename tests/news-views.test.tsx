// @vitest-environment jsdom
/**
 * طرق عرض الأخبار: بطاقات (الافتراضي)، قائمة، وحسب الشهر.
 * الأخبار بلا تاريخ تُجمع في مجموعة خاصة ولا تسقط من العرض.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
    }),
  },
}));
vi.mock('../src/components/seo/AEOHead', () => ({ AEOHead: () => null }));

import { NewsPage } from '../src/pages/public/NewsPage';
import { groupNewsByMonth } from '../src/components/news/NewsViews';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function render(path = '/news') {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<MemoryRouter initialEntries={[path]}><NewsPage /></MemoryRouter>);
  });
  return container;
}

const clickButton = async (label: string) => {
  const button = Array.from(container!.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
  await act(async () => { button.click(); });
};

describe('groupNewsByMonth', () => {
  it('يجمع الأخبار حسب الشهر ويضع الأخبار بلا تاريخ في مجموعة خاصة', () => {
    const groups = groupNewsByMonth([
      { id: 'a', published_at: '2026-09-10' },
      { id: 'b', published_at: '2026-09-02' },
      { id: 'c', published_at: '2026-07-01' },
      { id: 'd', published_at: null },
      { id: 'e', published_at: 'not a date' },
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1, 2]);
    expect(groups[2].label).toBe('بدون تاريخ');
  });
});

describe('طرق عرض الأخبار', () => {
  it('تعرض البطاقات افتراضياً', async () => {
    await render();
    expect(container!.querySelector('ul')).toBeNull();
    expect(container!.querySelectorAll('[aria-pressed="true"]').length).toBe(1);
  });

  it('تعرض قائمة حين يُختار زر القائمة', async () => {
    await render();
    await clickButton('قائمة');
    expect(container!.querySelector('ul')).not.toBeNull();
    expect(container!.querySelector('ul')!.querySelectorAll('li').length).toBeGreaterThan(0);
  });

  it('تعرض الأخبار مجمعة حسب الشهر', async () => {
    await render('/news?view=timeline');
    const headings = container!.querySelectorAll('section h2');
    expect(headings.length).toBeGreaterThan(0);
    expect(container!.textContent).toContain('خبر');
  });
});
