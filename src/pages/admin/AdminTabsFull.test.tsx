/**
 * 管理后台剩余 Tab 空数据冒烟（用户/帖子/举报/浏览统计/版主/管理员/审计/分类/通知/概览）。
 * 第 9/15/18 轮冒烟共抓出 6 个运行时崩溃，此文件把余下 Tab 全部纳入同一保护。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';
import { UsersTab } from './users';
import { PostsTab } from './posts';
import { ReportsTab } from './reports';
import { ViewsTab } from './views';
import { ModeratorsTab } from './moderators';
import { AdminsTab } from './admins';
import { AuditTab } from './audit';
import { CategoriesTab } from './categories';
import { NotificationsTab } from './notifications';
import { StatCards } from './overview';

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

function renderTab(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  storage.clear();
  storeTokens('tok', 'rtok');
  fetchHandler = (input) => {
    if (String(input).endsWith('/api/me')) return jsonResponse(200, { user: adminUser });
    return jsonResponse(200, {}); // 一律空对象：最严苛的形状
  };
});

afterEach(() => {
  cleanup();
  clearStoredTokens();
  vi.restoreAllMocks();
});

describe('剩余管理 Tab 空数据冒烟（接口一律返回 {}）', () => {
  it('UsersTab 不崩溃且渲染搜索区', async () => {
    renderTab(<UsersTab />);
    await waitFor(() => expect(screen.getByPlaceholderText(/用户名|昵称|UID|邮箱/i) ?? screen.queryByText('用户')).toBeTruthy(), { timeout: 3000 });
  });

  it('PostsTab 不崩溃', async () => {
    renderTab(<PostsTab />);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('ReportsTab 不崩溃（第 9 轮修复的回归哨兵）', async () => {
    renderTab(<ReportsTab />);
    await waitFor(() => expect(screen.queryByText('没有举报记录')).toBeTruthy(), { timeout: 3000 });
  });

  it('ViewsTab 不崩溃（daily/top/recent 空列表）', async () => {
    renderTab(<ViewsTab />);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('ModeratorsTab 不崩溃', async () => {
    renderTab(<ModeratorsTab />);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('AdminsTab 不崩溃', async () => {
    renderTab(<AdminsTab />);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('AuditTab 不崩溃', async () => {
    renderTab(<AuditTab />);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('CategoriesTab 不崩溃', async () => {
    renderTab(<CategoriesTab />);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('NotificationsTab 不崩溃', async () => {
    renderTab(<NotificationsTab />);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('StatCards（概览）不崩溃', async () => {
    renderTab(<StatCards />);
    await waitFor(() => expect(document.body.textContent!.length).toBeGreaterThan(0), { timeout: 3000 });
  });
});
