/** use-page-title 单测：标题拼接规则与站点名联动 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { usePageTitle, ScrollToTop } from './use-page-title';

// 用真实 site-config（fetch stub 提供站点名）
let fetchHandler: (input: string, init?: RequestInit) => Response = () =>
  new Response(JSON.stringify({ siteName: '测试论坛' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
vi.stubGlobal('fetch', ((input: string, init?: RequestInit) => fetchHandler(String(input), init)) as unknown as typeof fetch);

function Page({ title }: { title?: string }) {
  usePageTitle(title);
  return null;
}

/** useSiteConfig 需要 Provider 包裹才能拿到拉取到的站点名 */
async function renderWithProvider(ui: React.ReactElement) {
  const { SiteConfigProvider } = await import('./site-config');
  return render(ui, { wrapper: ({ children }) => <SiteConfigProvider>{children}</SiteConfigProvider> });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('usePageTitle', () => {
  it('页面名 · 站点名', async () => {
    // Provider 的 /api/config 由 stub 即时响应：同步渲染链路里配置已就绪
    renderWithProvider(<Page title="账号设置" />);
    await vi.waitFor(() => expect(document.title).toBe('账号设置 · 测试论坛'));
  });

  it('无标题时只显示站点名', async () => {
    renderWithProvider(<Page />);
    await vi.waitFor(() => expect(document.title).toBe('测试论坛'));
  });

  it('空白标题视为无标题', () => {
    render(<Page title="   " />);
    expect(document.title).toBe('Starlr Forum');
  });

  it('标题变化跟随 rerender', async () => {
    const { rerender } = render(<Page title="A" />);
    rerender(<Page title="B" />);
    expect(document.title).toBe('B · Starlr Forum');
  });
});

describe('ScrollToTop', () => {
  it('路由切换后回到顶部', async () => {
    window.scrollTo = vi.fn();
    const { rerender } = render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/a" element={<ScrollToTop />} />
          <Route path="/b" element={<ScrollToTop />} />
        </Routes>
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter initialEntries={['/b']}>
        <Routes>
          <Route path="/a" element={<ScrollToTop />} />
          <Route path="/b" element={<ScrollToTop />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
