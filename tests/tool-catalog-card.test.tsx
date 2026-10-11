// @vitest-environment jsdom
/**
 * بطاقة الأداة في الكتالوج: تعرض الحالة الصحيحة، وتحمل تأخير الظهور المتدرّج،
 * وتقرأ حالة الأداة من بيانات الكتالوج لا من النص الثابت.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ToolCatalogCard, TOOL_THEME } from '../src/components/pro-tools/ToolCard';
import type { Tool, ToolSlug } from '../src/lib/pro-tools/model';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function render(tool: Tool, index: number) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<MemoryRouter><ToolCatalogCard tool={tool} index={index} /></MemoryRouter>);
  });
  return container;
}

describe('ToolCatalogCard', () => {
  it('shows the live badge for an enabled tool and links to it', async () => {
    const el = await render({ slug: 'cases', title: 'من الواقعة إلى الحل', description: 'وصف', enabled: true }, 1);
    expect(el.textContent).toContain('مجانية');
    expect(el.textContent).toContain('أداة 02');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/pro-tools/cases');
  });

  it('shows the coming-soon badge for a disabled tool', async () => {
    const el = await render({ slug: 'deadlines', title: 'المواعيد', description: 'وصف', enabled: false }, 0);
    expect(el.textContent).toContain('قريباً');
    expect(el.textContent).toContain('تفاصيل الأداة');
  });

  it('staggers the entrance by index', async () => {
    const el = await render({ slug: 'alerts', title: 'تنبيهات', description: 'وصف', enabled: true }, 3);
    const link = el.querySelector('a') as HTMLAnchorElement;
    expect(link.style.getPropertyValue('--pt-delay')).toBe('270ms');
  });

  it('gives every tool slug its own icon colours', () => {
    const slugs: ToolSlug[] = ['references', 'cases', 'versions', 'workspace', 'alerts', 'deadlines'];
    const pairs = new Set(slugs.map((slug) => `${TOOL_THEME[slug].from}|${TOOL_THEME[slug].to}`));
    expect(pairs.size).toBe(slugs.length);
  });
});
