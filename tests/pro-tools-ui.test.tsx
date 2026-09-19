// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ user: null as { id: string } | null }));
const service = vi.hoisted(() => ({ catalog: vi.fn(), access: vi.fn(), entries: vi.fn(), notes: vi.fn(), follows: vi.fn() }));
vi.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => ({ user: state.user, initialized: true }) }));
vi.mock('@/lib/pro-tools/service', () => ({ toolsService: service }));
vi.mock('@/components/seo/AEOHead', () => ({ AEOHead: () => null }));
import ProToolsPage from '../src/pages/public/ProToolsPage';
let root: Root;
let container: HTMLDivElement;
const tool = { slug: 'cases', title: 'من الواقعة إلى الحل', description: 'تدريب', enabled: true };
async function render() {
  await act(async () => {
    root.render(<MemoryRouter initialEntries={['/pro-tools/cases']}><Routes><Route path="/pro-tools/:slug" element={<ProToolsPage />} /></Routes></MemoryRouter>);
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.user = null; vi.resetAllMocks();
  service.catalog.mockResolvedValue([tool]); service.access.mockResolvedValue(false);
  service.entries.mockResolvedValue([]); service.notes.mockResolvedValue([]);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
describe('Pro tools UI access', () => {
  it('shows a login and upgrade gate without fetching paid content for guests', async () => {
    await render(); expect(container.textContent).toContain('حصرية لمشتركي Pro');
    expect(container.querySelector('a[href^="/login"]')).not.toBeNull();
    expect(service.access).not.toHaveBeenCalled(); expect(service.entries).not.toHaveBeenCalled();
  });
  it('does not trust a forged local subscription', async () => {
    state.user = { id: 'free' }; localStorage.setItem('mizan:subscription:v1', JSON.stringify({ isPro: true }));
    await render(); expect(container.textContent).toContain('حصرية لمشتركي Pro'); expect(service.entries).not.toHaveBeenCalled();
    localStorage.clear();
  });
  it('fails closed when the access check errors', async () => {
    state.user = { id: 'pro' }; service.access.mockRejectedValue(new Error('offline'));
    await render(); expect(container.textContent).toContain('غير متاحة حالياً'); expect(service.entries).not.toHaveBeenCalled();
  });
  it('does not fetch a disabled tool even for Pro', async () => {
    state.user = { id: 'pro' }; service.access.mockResolvedValue(true); service.catalog.mockResolvedValue([{ ...tool, enabled: false }]);
    await render(); expect(container.textContent).toContain('غير مفعلة'); expect(service.entries).not.toHaveBeenCalled();
  });
  it('loads published content for verified members without fake fallback material', async () => {
    state.user = { id: 'pro' }; service.access.mockResolvedValue(true);
    await render(); expect(service.entries).toHaveBeenCalledWith('cases'); expect(container.textContent).toContain('لا توجد مواد منشورة');
  });
  it('revokes the visible tool on failed membership revalidation', async () => {
    state.user = { id: 'pro' }; service.access.mockResolvedValue(true); await render();
    service.access.mockResolvedValue(false);
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(container.textContent).toContain('حصرية لمشتركي Pro'); expect(container.querySelector('textarea')).toBeNull();
  });
});
