// @vitest-environment jsdom
/**
 * بطاقة الإنفوغرافيك لخريطة الإحالات: الأرقام تُحسب من البيانات، والمصدر لا يُعرض
 * إلا إن كان https، والنقر على مادة يركّز الخريطة عليها.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferenceInfographicCard } from '../src/components/pro-tools/ReferenceInfographicCard';
import { curatedReferences, type Reference } from '../src/lib/pro-tools/referenceMap';

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const sample: Reference[] = [
  { id: 'a', fromText: 'الدستور', fromArticle: 'الفصل 1', toText: 'الدستور', toArticle: 'الفصل 2', type: 'explicit', topic: 't', relationship: 'r', excerpt: 'e', sourceUrl: 'https://example.com/s', targetVerified: true, reviewedBy: 'x', reviewedOn: '2026-01-01' },
  { id: 'b', fromText: 'الدستور', fromArticle: 'الفصل 3', toText: 'الدستور', toArticle: 'الفصل 2', type: 'explicit', topic: 't', relationship: 'r', excerpt: 'e', sourceUrl: 'https://example.com/s', targetVerified: true, reviewedBy: 'x', reviewedOn: '2026-01-01' },
  { id: 'c', fromText: 'الدستور', fromArticle: 'الفصل 4', toText: 'القانون', toArticle: 'القانون التنظيمي', type: 'delegation', topic: 't', relationship: 'r', excerpt: 'e', sourceUrl: 'http://insecure.example', targetVerified: false, reviewedBy: 'x', reviewedOn: '2026-01-01' },
];

describe('ReferenceInfographicCard', () => {
  it('shows counts computed from the data', async () => {
    await act(async () => root.render(<ReferenceInfographicCard references={sample} />));
    const text = container.textContent ?? '';
    expect(text).toContain('الخريطة في أرقام');
    const figures = Array.from(container.querySelectorAll('dd')).map((dd) => dd.textContent);
    expect(figures[0]).toBe('3');
    expect(figures[3]).toBe('2');
  });

  it('hub list ranks the most connected article first', async () => {
    await act(async () => root.render(<ReferenceInfographicCard references={sample} />));
    const first = container.querySelector('ol li')?.textContent ?? '';
    expect(first).toContain('الفصل 2');
    expect(first).toContain('2 رابط');
  });

  it('does not link an insecure source', async () => {
    await act(async () => root.render(<ReferenceInfographicCard references={sample} sourceUrl="http://insecure.example" />));
    expect(container.querySelector('a[href^="http://"]')).toBeNull();
  });

  it('calls onFocusNode with the node key when a hub is clicked', async () => {
    const onFocus = vi.fn();
    await act(async () => root.render(<ReferenceInfographicCard references={sample} onFocusNode={onFocus} />));
    const button = container.querySelector('ol button') as HTMLButtonElement;
    await act(async () => button.click());
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(String(onFocus.mock.calls[0][0])).toContain('الفصل 2');
  });

  it('renders on the real curated set without crashing', async () => {
    await act(async () => root.render(<ReferenceInfographicCard references={curatedReferences} />));
    expect(container.querySelectorAll('dd').length).toBe(4);
  });
});
