/**
 * 管理后台「服务配置 / SSO 同步」Tab 空数据冒烟：
 * 与后端 admin-services/admin-sso 用例配对，验证两个 Tab 组件在
 * 接口返回空对象/异常形状时不崩溃（第 9/15 轮发现过同类缺陷）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { ServicesTab } from './services';
import { SsoTab } from './sso';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => void storage.clear(),
});

const { storeTokens, clearStoredTokens } = await import('@/lib/api');

type FetchHandler = (input: string, init?: RequestInit) => Response | Promise<Response>;
let fetchHandler: FetchHandler = () => new Response('{}', { status: 200 });
vi.stubGlobal('fetch', ((input: string, init?: RequestInit) => fetchHandler(String(input), init)) as typeof fetch);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const adminUser = {
  id: 'u1', uid: 1, username: 'adminx', nickname: 'AdminX', avatarUrl: null, bio: '',
  role: 'admin' as const, postCount: 0, replyCount: 0, createdAt: '2026-01-01T00:00:00Z',
};

function renderWith(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** admin 登录态 + 其余接口按路径返回 */
function loginAdmin(routes: Record<string, unknown>) {
  storeTokens('tok', 'rtok');
  fetchHandler = (input) => {
    const url = String(input);
    if (url.endsWith('/api/me')) return jsonResponse(200, { user: adminUser });
    for (const [path, body] of Object.entries(routes)) {
      if (url.includes(path)) return jsonResponse(200, body);
    }
    return jsonResponse(200, {});
  };
}

beforeEach(() => {
  storage.clear();
});

afterEach(() => {
  cleanup();
  clearStoredTokens();
  vi.restoreAllMocks();
});

describe('ServicesTab 空数据冒烟', () => {
  it('所有接口返回 {} 不崩溃', async () => {
    loginAdmin({
      '/api/admin/services/site': {},
      '/api/admin/services': {},
    });
    renderWith(<ServicesTab />);
    await waitFor(() => expect(screen.getByText('站点信息')).toBeTruthy());
    // 平铺字段输入框仍渲染（各服务区块由 services 列表驱动，空列表 = 只有站点区块）
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
  });

  it('接口返回缺字段形状（services 缺 accounts/fields）不崩溃', async () => {
    loginAdmin({
      '/api/admin/services/site': {},
      '/api/admin/services': {
        services: [{ key: 'seo', label: 'SEO', configured: false }], // 无 fields 无 accounts
      },
    });
    renderWith(<ServicesTab />);
    await waitFor(() => expect(screen.getByText('站点信息')).toBeTruthy());
    expect(screen.getByText('SEO')).toBeTruthy();
  });
});

describe('SsoTab 空数据冒烟', () => {
  it('接口返回 {} 不崩溃（origins/events 缺失）', async () => {
    loginAdmin({ '/api/admin/sso/config': {} });
    renderWith(<SsoTab />);
    await waitFor(() => expect(screen.getByText('SSO 登录同步')).toBeTruthy());
    // 开关与 origins 输入可交互（textarea 渲染）
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
  });

  it('空 origins/空 events 列表正常渲染', async () => {
    loginAdmin({
      '/api/admin/sso/config': { enabled: true, origins: [], events: [] },
    });
    renderWith(<SsoTab />);
    await waitFor(() => expect(screen.getByText('SSO 登录同步')).toBeTruthy());
    // 无同步事件时的空态文案存在
    await waitFor(() => expect(screen.queryByText('暂无同步记录')).toBeTruthy(), { timeout: 3000 });
  });
});
