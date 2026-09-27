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
async function render(path = '/pro-tools/cases') {
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/pro-tools/:slug" element={<ProToolsPage />} /></Routes></MemoryRouter>);
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.user = null; vi.resetAllMocks();
  service.catalog.mockResolvedValue([tool]); service.access.mockResolvedValue(false);
  service.entries.mockResolvedValue([]); service.notes.mockResolvedValue([]); service.follows.mockResolvedValue([]);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); });
describe('free legal tools UI', () => {
  it('shows published tools to guests without a subscription check', async () => {
    await render();
    expect(container.textContent).toContain('مجانية للجميع');
    expect(container.textContent).toContain('لا توجد مواد منشورة');
    expect(service.access).not.toHaveBeenCalled();
    expect(service.entries).toHaveBeenCalledWith('cases');
  });
  it('does not gate published content on a local subscription flag', async () => {
    localStorage.setItem('mizan:subscription:v1', JSON.stringify({ isPro: false }));
    await render();
    expect(service.entries).toHaveBeenCalledWith('cases');
    expect(container.textContent).toContain('مجانية للجميع');
  });
  it('keeps personal notes attached to a signed-in account', async () => {
    state.user = { id: 'member' };
    await render();
    expect(service.entries).toHaveBeenCalledWith('cases');
    expect(container.textContent).toContain('ملاحظات خاصة بحسابك');
    expect(container.querySelector('textarea')).not.toBeNull();
  });
  it('downloads saved notes and references from the sixth catalog tool, workspace', async () => {
    const orderedTools = ['alerts', 'cases', 'deadlines', 'references', 'versions', 'workspace'].map(slug => ({
      slug, title: slug, description: '', enabled: true,
    }));
    expect(orderedTools[5].slug).toBe('workspace');
    service.catalog.mockResolvedValue(orderedTools);
    const note = { id: 'n1', title: 'بحث تجريبي', body: 'ملاحظة محفوظة', citation: 'مرجع رسمي', tool_slug: 'workspace' as const };
    service.notes.mockResolvedValue([note]);
    state.user = { id: 'member' };
    const createObjectURL = vi.fn((blob: Blob) => { void blob; return 'blob:mizan-export'; });
    const revokeObjectURL = vi.fn();
    const oldCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const oldRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const canvasContext = {
      fillStyle: '', font: '', direction: 'ltr', textAlign: 'left', lineWidth: 1, strokeStyle: '',
      fillRect: vi.fn(), fillText: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 16 })),
    } as unknown as CanvasRenderingContext2D;
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,/9j/2Q==');
    const downloadNames: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadNames.push(this.download);
    });
    try {
      await render('/pro-tools/workspace');
      expect(service.notes).toHaveBeenCalledWith('workspace');
      const button = Array.from(container.querySelectorAll('button')).find(el => el.textContent?.includes('تصدير جميع الملاحظات'));
      expect(button).toBeTruthy();
      expect(button?.hasAttribute('disabled')).toBe(false);
      await act(async () => { button?.click(); });
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(createObjectURL.mock.calls[0][0].type).toBe('text/plain;charset=utf-8');
      expect(downloadNames).toEqual(['mizan-research.txt']);
      const pdfButton = Array.from(container.querySelectorAll('button')).find(el => el.textContent?.includes('PDF'));
      expect(pdfButton).toBeTruthy();
      await act(async () => { pdfButton?.click(); });
      expect(createObjectURL).toHaveBeenCalledTimes(2);
      expect(createObjectURL.mock.calls[1][0].type).toBe('application/pdf');
      expect(downloadNames).toEqual(['mizan-research.txt', 'mizan-research.pdf']);
      expect(click).toHaveBeenCalledTimes(2);
      expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.88);
      expect(canvasContext.fillText).toHaveBeenCalledWith('بحث تجريبي', 1148, expect.any(Number), 1056);
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 1050)); });
      expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    } finally {
      getContext.mockRestore();
      toDataURL.mockRestore();
      click.mockRestore();
      if (oldCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', oldCreateObjectURL);
      else delete (URL as any).createObjectURL;
      if (oldRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', oldRevokeObjectURL);
      else delete (URL as any).revokeObjectURL;
    }
  });
  it('does not fetch content for a tool that is disabled in the catalog', async () => {
    service.catalog.mockResolvedValue([{ ...tool, enabled: false }]);
    await render();
    expect(container.textContent).toContain('قيد الإعداد');
    expect(service.entries).not.toHaveBeenCalled();
  });
});
