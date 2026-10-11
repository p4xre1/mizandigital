// @vitest-environment jsdom
/**
 * ترقيم المعجم القانوني: 10 أو 20 أو 50 في الصفحة، والتنقل بين الصفحات،
 * والعودة إلى الصفحة الأولى عند تغيير البحث.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) },
}));
vi.mock('../src/components/seo/AEOHead', () => ({ AEOHead: () => null }));
vi.mock('../src/lib/webmcp/useWebMCPTool', () => ({ useWebMCPTool: () => undefined }));

import { LexiconPage } from '../src/pages/public/LexiconPage';
import { pageWindow } from '../src/components/ui/Pager';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function render() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<MemoryRouter><LexiconPage /></MemoryRouter>);
  });
  return container;
}

const cards = () => Array.from(container!.querySelectorAll('article'));
const button = (label: string) => Array.from(container!.querySelectorAll('button')).find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label) as HTMLButtonElement | undefined;

describe('pageWindow', () => {
  it('يعرض كل الصفحات إن كانت سبعاً أو أقل', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('يختصر الباقي بفواصل ويبقي الأولى والأخيرة والجوار', () => {
    expect(pageWindow(1, 30)).toEqual([1, 2, '…', 30]);
    expect(pageWindow(15, 30)).toEqual([1, '…', 14, 15, 16, '…', 30]);
    expect(pageWindow(30, 30)).toEqual([1, '…', 29, 30]);
  });
});

describe('ترقيم المعجم', () => {
  it('تعرض عشرة مصطلحات في الصفحة الأولى', async () => {
    await render();
    expect(cards()).toHaveLength(10);
    expect(container!.textContent).toContain('صفحة 1 من');
  });

  it('تغيّر العدد إلى 20 ثم 50', async () => {
    await render();
    await act(async () => { button('20')!.click(); });
    expect(cards()).toHaveLength(20);
    await act(async () => { button('50')!.click(); });
    expect(cards()).toHaveLength(50);
    await act(async () => { button('10')!.click(); });
    expect(cards()).toHaveLength(10);
  });

  it('تنتقل إلى الصفحة الثانية بالرقم وتعرض مصطلحات مختلفة', async () => {
    await render();
    const first = cards()[0].textContent;
    await act(async () => { button('صفحة 2')!.click(); });
    expect(cards()).toHaveLength(10);
    expect(cards()[0].textContent).not.toBe(first);
    expect(container!.textContent).toContain('صفحة 2 من');
  });

  it('يعود إلى الصفحة الأولى حين يتغيّر البحث', async () => {
    await render();
    await act(async () => { button('صفحة 2')!.click(); });
    const input = container!.querySelector('input[type="text"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'عقد');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container!.textContent).toContain('صفحة 1 من');
  });
});
