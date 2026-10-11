// @vitest-environment jsdom
/**
 * طرق عرض الندوات والفعاليات: بطاقات (الافتراضي)، قائمة، وحسب الشهر.
 * الروابط تبقى تحت /events، والعدّ يقول «فعالية».
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const seminars = [
  { id: 's1', title: 'ندوة الاختبار الأولى', status: 'published', event_date: '2026-03-10', agenda: 'جدول أول' },
  { id: 's2', title: 'ندوة الاختبار الثانية', status: 'published', event_date: '2026-03-20', agenda: 'جدول ثان' },
];

vi.mock('../src/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: seminars, error: null }) }),
      }),
    }),
  },
}));
vi.mock('../src/components/seo/AEOHead', () => ({ AEOHead: () => null }));

import { EventsPage } from '../src/pages/public/EventsPage';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function render(path = '/events') {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<MemoryRouter initialEntries={[path]}><EventsPage /></MemoryRouter>);
  });
  // ننتظر جلب الندوات من الجدول (وهمي) قبل الفحص.
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return container;
}

const clickButton = async (label: string) => {
  const button = Array.from(container!.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
  await act(async () => { button.click(); });
};

describe('طرق عرض الندوات والفعاليات', () => {
  it('تعرض البطاقات افتراضياً', async () => {
    await render();
    expect(container!.querySelector('ul a[href^="/events/"]')).toBeNull();
    expect(container!.querySelectorAll('article').length).toBeGreaterThan(0);
  });

  it('تعرض قائمة بروابط /events حين يُختار زر القائمة', async () => {
    await render();
    await clickButton('قائمة');
    const links = Array.from(container!.querySelectorAll('ul a')).map((a) => a.getAttribute('href') ?? '');
    expect(links).toContain('/events/seminar-s1');
    expect(links.every((href) => href.startsWith('/events/'))).toBe(true);
  });

  it('تعرض الفعاليات مجمعة حسب الشهر، وتقول «فعالية»', async () => {
    await render('/events?view=timeline');
    expect(container!.querySelectorAll('section h2').length).toBeGreaterThan(0);
    expect(container!.textContent).toMatch(/\d+ فعالية/);
  });
});
