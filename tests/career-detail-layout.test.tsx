// @vitest-environment jsdom
/**
 * صفحة المسار المهني: تُعرض للمهن الأربع عشرة كلها بالتخطيط نفسه،
 * وكل قسم أساسي موجود، وعنوان الصفحة يحمل اسم المهنة.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import careers from '../src/data/careers.json';

vi.mock('../src/components/seo/SEOHead', () => ({ SEOHead: () => null }));
vi.mock('../src/components/seo/AEOHead', () => ({ AEOHead: () => null }));

import { CareerDetailPage } from '../src/pages/public/careers/CareerDetailPage';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function render(slug: string) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={[`/careers/${slug}`]}>
        <Routes>
          <Route path="/careers/:slug" element={<CareerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return container;
}

describe('صفحة المسار المهني لكل المهن الأربع عشرة', () => {
  it('عدد المهن 14', () => {
    expect(careers).toHaveLength(14);
  });

  for (const career of careers as Array<{ slug: string; title_ar: string }>) {
    it(`تعرض ${career.slug} بعنوانها وأقسامها الأساسية`, async () => {
      const el = await render(career.slug);
      const main = el.querySelector('main[data-page="career-detail"]');
      expect(main).not.toBeNull();
      expect(el.querySelector('h1')?.textContent).toContain(career.title_ar);
      expect(el.querySelector('#career-facts-title')).not.toBeNull();
      expect(el.querySelector('#career-requirements-title')).not.toBeNull();
      expect(el.querySelector('#career-quiz-title')).not.toBeNull();
      // كل قفزة في شريط الأقسام تشير إلى قسم موجود فعلاً
      for (const link of Array.from(el.querySelectorAll('nav[aria-label="أقسام الصفحة"] a'))) {
        const target = link.getAttribute('href')!.slice(1);
        expect(el.querySelector(`#${target}`), target).not.toBeNull();
      }
      // القوانين تأتي قبل بطاقة المسار إن وُجدت
      const laws = el.querySelector('#career-laws-title');
      const facts = el.querySelector('#career-facts-title');
      if (laws) {
        expect(laws.compareDocumentPosition(facts!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });
  }
});
