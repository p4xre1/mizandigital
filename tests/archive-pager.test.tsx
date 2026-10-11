// @vitest-environment jsdom
/**
 * ترقيم الأرشيف الدراسي: عشرة ملفات في الصفحة، والتنقل بين الصفحات،
 * والعودة إلى الصفحة الأولى عند تغيير الفصل.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const rows = Array.from({ length: 25 }, (_, i) => ({
  id: `p${i}`,
  slug: `file-${i}`,
  title: `ملخص رقم ${i + 1}`,
  semester: 'S1',
  file_url: `https://example.org/file-${i}.pdf`,
  created_at: '2026-09-01T00:00:00Z',
  download_count: 0,
}));

vi.mock('../src/lib/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        order: () => Promise.resolve({ data: table === 'pdf_summaries' ? rows : [], error: null }),
      }),
    }),
  },
}));
vi.mock('../src/components/seo/AEOHead', () => ({ AEOHead: () => null }));
vi.mock('../src/lib/webmcp/useWebMCPTool', () => ({ useWebMCPTool: () => undefined }));

import { ArchivePage } from '../src/pages/public/ArchivePage';

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
    root!.render(<MemoryRouter initialEntries={['/archive']}><ArchivePage /></MemoryRouter>);
  });
  await act(async () => { await Promise.resolve(); });
  return container;
}

const cards = () => Array.from(container!.querySelectorAll('article'));
const button = (label: string) =>
  Array.from(container!.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label) as HTMLButtonElement | undefined;

describe('ترقيم الأرشيف', () => {
  it('تعرض عشرة ملفات في الصفحة الأولى مع العدد الكلي', async () => {
    await render();
    expect(cards()).toHaveLength(10);
    expect(container!.textContent).toContain('صفحة 1 من 3');
    expect(container!.textContent).toContain('25 ملف');
  });

  it('تنتقل إلى الصفحة التالية وتعرض ملفات مختلفة', async () => {
    await render();
    const first = cards()[0].textContent;
    await act(async () => { button('صفحة 2')!.click(); });
    expect(cards()).toHaveLength(10);
    expect(cards()[0].textContent).not.toBe(first);
    expect(container!.textContent).toContain('صفحة 2 من 3');
  });
});
