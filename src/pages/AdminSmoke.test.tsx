/**
 * 管理后台拆分后的交互冒烟：
 * - 权限路由（未登录 403 文案 / 版主可见分区 / 管理员全部分区）
 * - Tab 切换不白屏（各 Tab 组件均能挂载渲染）
 * - api 请求以 fetch stub 承接（组件内部走真实 api()）
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, type CurrentUser } from '@/lib/auth';
import { AdminPage } from './admin';

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

const baseUser = {
  id: 'u1',
  uid: 1,
  username: 'staffer',
  nickname: 'Staffer',
  avatarUrl: null,
  bio: '',
  role: 'moderator' as CurrentUser['role'],
  postCount: 0,
  replyCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
};

function renderAdmin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <AdminPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** 设置登录态并让 /api/me 返回指定角色 */
async function loginAs(role: CurrentUser['role']) {
  storeTokens('tok', 'rtok');
  fetchHandler = (input) => {
    if (String(input).endsWith('/api/me')) {
      return jsonResponse(200, { user: { ...baseUser, role } });
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

describe('AdminPage 权限路由', () => {
  it('未登录：显示无权访问提示，不渲染任何 Tab', async () => {
    fetchHandler = () => jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: '' } });
    renderAdmin();
    await waitFor(() => expect(screen.getByText('无权访问管理后台')).toBeTruthy());
    expect(screen.queryByText('概览')).toBeNull();
  });

  it('普通用户：同样被拦截', async () => {
    await loginAs('user');
    renderAdmin();
    await waitFor(() => expect(screen.getByText('无权访问管理后台')).toBeTruthy());
  });

  it('版主：可见基础分区 + 版主权限徽章，不可见 admin 专属分区', async () => {
    await loginAs('moderator');
    renderAdmin();
    await waitFor(() => expect(screen.getByText('管理后台')).toBeTruthy());
    // 版主可见
    for (const tab of ['概览', '帖子', '分类', '举报', '浏览统计']) {
      expect(screen.getByRole('tab', { name: tab })).toBeTruthy();
    }
    // admin 专属不可见
    for (const tab of ['用户', '通知', '版主', '管理员', '服务配置', 'SSO 同步', '审计日志', '推送记录']) {
      expect(screen.queryByRole('tab', { name: tab })).toBeNull();
    }
    expect(screen.getByText('版主权限')).toBeTruthy();
  });

  it('管理员：14 个分区全部可见', async () => {
    await loginAs('admin');
    renderAdmin();
    await waitFor(() => expect(screen.getByText('管理后台')).toBeTruthy());
    const expected = ['概览', '用户', '帖子', '分类', '举报', '浏览统计', '通知', '版主', '管理员', '服务配置', 'SSO 同步', '审计日志', '推送记录'];
    for (const tab of expected) {
      expect(screen.getByRole('tab', { name: tab })).toBeTruthy();
    }
  });
});

describe('AdminPage Tab 渲染冒烟（拆分后不白屏）', () => {
  it('管理员视角：各分区内容可挂载（请求 200 空数据）', async () => {
    await loginAs('admin');
    // 所有管理接口统一返回空数据 200
    fetchHandler = (input) => {
      const url = String(input);
      if (url.endsWith('/api/me')) return jsonResponse(200, { user: { ...baseUser, role: 'admin' } });
      return jsonResponse(200, {});
    };
    renderAdmin();
    // 概览默认激活：StatCards 挂载（数字为空显示占位）
    await waitFor(() => expect(screen.getByText('管理后台')).toBeTruthy());
    // 切换每个 admin 分区验证不抛错（点击 Tab）
    const user = userEvent.setup();
    for (const tab of ['用户', '帖子', '分类', '举报', '浏览统计', '通知', '版主', '管理员', '服务配置', 'SSO 同步', '审计日志', '推送记录']) {
      await user.click(screen.getByRole('tab', { name: tab }));
      expect(screen.getByRole('tab', { name: tab }).getAttribute('data-state')).toBe('active');
    }
  });
});
