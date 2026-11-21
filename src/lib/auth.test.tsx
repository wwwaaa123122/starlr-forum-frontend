/**
 * AuthProvider 单元测试：登出清理、token 存取、轮换定时器。
 * api 请求以 mock 拦截（AuthProvider 内部走真实 api()，由 fetch stub 承接）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act, waitFor } from '@testing-library/react';
import { useMemo } from 'react';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => void storage.clear(),
});

const { getStoredAccessToken, getStoredRefreshToken, clearStoredTokens, storeTokens, jwtExp } = await import('./api');
const { AuthProvider, useAuth } = await import('./auth');

type FetchHandler = (input: string, init?: RequestInit) => Response | Promise<Response>;
let fetchHandler: FetchHandler = () => new Response('{}', { status: 500 });
vi.stubGlobal('fetch', ((input: string, init?: RequestInit) => fetchHandler(String(input), init)) as typeof fetch);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.sig`;
}

const testUser = {
  id: 'u1',
  uid: 1,
  username: 'alice',
  nickname: 'Alice',
  avatarUrl: null,
  bio: '',
  role: 'user' as const,
  postCount: 0,
  replyCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
};

/** 探针组件：把 AuthState 摘要渲染出来供断言 */
function Probe() {
  const auth = useAuth();
  const summary = useMemo(
    () =>
      JSON.stringify({
        user: auth.user?.username ?? null,
        loading: auth.loading,
        isAdmin: auth.isAdmin,
        isModerator: auth.isModerator,
      }),
    [auth],
  );
  return (
    <div>
      <span data-testid="state">{summary}</span>
      <button onClick={() => void auth.logout()}>logout</button>
      <button onClick={() => void auth.refreshUser()}>refresh</button>
    </div>
  );
}

beforeEach(() => {
  storage.clear();
  fetchHandler = () => jsonResponse(500, { error: { code: 'X', message: 'x' } });
});

afterEach(() => {
  cleanup();
  clearStoredTokens();
  vi.restoreAllMocks();
});

describe('AuthProvider 初始化', () => {
  it('无任何 token：loading=false，user=null', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    await waitFor(() => expect(state.loading).toBe(false));
    expect(state.user).toBeNull();
  });

  it('有 refresh token：调 /api/me 加载用户', async () => {
    storeTokens('a', 'r');
    fetchHandler = () => jsonResponse(200, { user: testUser });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.user).toBe('alice');
    });
  });

  it('角色映射：admin → isAdmin/isModerator 都为 true；moderator → 仅 isModerator', async () => {
    storeTokens('a', 'r');
    fetchHandler = () => jsonResponse(200, { user: { ...testUser, role: 'admin' } });
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.isAdmin).toBe(true);
      expect(state.isModerator).toBe(true);
    });
    unmount();

    storage.clear();
    storeTokens('a', 'r');
    fetchHandler = () => jsonResponse(200, { user: { ...testUser, role: 'moderator' } });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.isAdmin).toBe(false);
      expect(state.isModerator).toBe(true);
    });
  });
});

describe('登出', () => {
  it('登出调后端、清空本地 token 与用户态', async () => {
    storeTokens('a', 'refresh-xyz');
    fetchHandler = () => jsonResponse(200, { user: testUser });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!).user).toBe('alice'));

    let logoutBody: unknown = null;
    fetchHandler = (input, init) => {
      if (String(input).endsWith('/api/auth/logout')) {
        logoutBody = JSON.parse(String(init?.body));
        return jsonResponse(200, {});
      }
      return jsonResponse(500, { error: { code: 'X', message: '' } });
    };
    await act(async () => {
      screen.getByText('logout').click();
    });
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.user).toBeNull();
    });
    expect(logoutBody).toEqual({ refreshToken: 'refresh-xyz' });
    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('后端登出失败也照样清理本地状态', async () => {
    storeTokens('a', 'r');
    fetchHandler = () => jsonResponse(200, { user: testUser });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!).user).toBe('alice'));

    fetchHandler = () => jsonResponse(500, { error: { code: 'X', message: '' } });
    await act(async () => {
      screen.getByText('logout').click();
    });
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.user).toBeNull();
    });
    expect(getStoredRefreshToken()).toBeNull();
  });
});

describe('401 → 自动刷新（集成：真实 refreshHandler 注册链路）', () => {
  it('/api/me 401 后用 refresh token 换新并重试成功', async () => {
    storeTokens('stale', 'refresh-1');
    let meCalls = 0;
    let refreshCalls = 0;
    fetchHandler = (input) => {
      if (String(input).endsWith('/api/me')) {
        meCalls++;
        if (meCalls === 1) return jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: '' } });
        return jsonResponse(200, { user: testUser });
      }
      if (String(input).endsWith('/api/auth/refresh')) {
        refreshCalls++;
        return jsonResponse(200, {
          user: testUser,
          accessToken: 'fresh-a',
          refreshToken: 'fresh-r',
          tokenType: 'Bearer',
        });
      }
      return jsonResponse(500, { error: { code: 'X', message: '' } });
    };
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!).user).toBe('alice'));
    expect(meCalls).toBe(2);
    expect(refreshCalls).toBe(1);
    expect(getStoredAccessToken()).toBe('fresh-a');
    expect(getStoredRefreshToken()).toBe('fresh-r');
  });

  it('refresh token 失效（重放）→ 清空状态回到未登录', async () => {
    storeTokens('stale', 'bad-refresh');
    fetchHandler = (input) => {
      if (String(input).endsWith('/api/me')) {
        return jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: '' } });
      }
      if (String(input).endsWith('/api/auth/refresh')) {
        return jsonResponse(401, { error: { code: 'TOKEN_REPLAY', message: '已撤销' } });
      }
      return jsonResponse(500, { error: { code: 'X', message: '' } });
    };
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent!);
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
    });
    expect(getStoredRefreshToken()).toBeNull();
  });
});

describe('jwtExp', () => {
  it('解析 exp 字段', () => {
    expect(jwtExp(fakeJwt({ exp: 1700000000 }))).toBe(1700000000);
  });
  it('畸形 token 返回 null 不抛错', () => {
    expect(jwtExp('not-a-jwt')).toBeNull();
    expect(jwtExp('')).toBeNull();
    expect(jwtExp('a.b.c')).toBeNull();
  });
});
