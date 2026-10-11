// @vitest-environment jsdom
/**
 * طرق عرض المقالات: بطاقات (الافتراضي)، قائمة، وحسب الشهر.
 * الروابط تبقى تحت /articles، والعدّ يقول «مقال» لا «خبر».
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    }),
  },
}));
vi.mock('../src/components/seo/AEOHead', () => ({ AEOHead: () => null }));

import { ArticlesPage } from '../src/pages/public/ArticlesPage';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function render(path = '/articles') {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<MemoryRouter initialEntries={[path]}><ArticlesPage /></MemoryRouter>);
  });
  return container;
}

const clickButton = async (label: string) => {
  const button = Array.from(container!.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
  await act(async () => { button.click(); });
};

describe('طرق عرض المقالات', () => {
  it('تعرض البطاقات افتراضياً', async () => {
    await render();
    expect(container!.querySelector('ul')).toBeNull();
    expect(container!.querySelectorAll('[aria-pressed="true"]').length).toBe(1);
  });

  it('تعرض قائمة بروابط /articles حين يُختار زر القائمة', async () => {
    await render();
    await clickButton('قائمة');
    const links = Array.from(container!.querySelectorAll('ul a')).map((a) => a.getAttribute('href') ?? '');
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((href) => href.startsWith('/articles/'))).toBe(true);
  });

  it('تعرض المقالات مجمعة حسب الشهر، وتقول «مقال» في العنوان', async () => {
    await render('/articles?view=timeline');
    expect(container!.querySelectorAll('section h2').length).toBeGreaterThan(0);
    expect(container!.textContent).toMatch(/\d+ مقال/);
  });
});
