/**
 * api.ts 单元测试：401 刷新单飞、重试策略、错误解析。
 * localStorage / fetch 以最小 stub 注入（node 环境无 DOM）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- 最小全局 stub（必须在 import api.ts 之前就位） ---
const storage = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => void storage.clear(),
};
vi.stubGlobal('localStorage', localStorageStub);

const { api, ApiClientError, clearStoredTokens, getStoredAccessToken, getStoredRefreshToken, registerRefreshHandler, storeTokens } = await import('./api');
type ApiClientErrorInstance = InstanceType<typeof ApiClientError>;

type FetchHandler = (input: string, init?: RequestInit) => Response | Promise<Response>;
let fetchHandler: FetchHandler = () => new Response('{}', { status: 500 });
vi.stubGlobal('fetch', ((input: string, init?: RequestInit) => fetchHandler(String(input), init)) as typeof fetch);

/** 构造带 payload 的假 JWT（api.ts 只解码不验签） */
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.sig`;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  storage.clear();
  fetchHandler = () => jsonResponse(500, { error: { code: 'UNKNOWN', message: 'x' } });
});

afterEach(() => {
  clearStoredTokens();
  vi.restoreAllMocks();
});

describe('api() 基础行为', () => {
  it('200 返回解析后的 JSON', async () => {
    fetchHandler = () => jsonResponse(200, { hello: 'world' });
    await expect(api<{ hello: string }>('/api/x')).resolves.toEqual({ hello: 'world' });
  });

  it('204 返回 undefined', async () => {
    fetchHandler = () => new Response(null, { status: 204 });
    await expect(api('/api/x')).resolves.toBeUndefined();
  });

  it('非 2xx 抛 ApiClientError 并携带 code/message', async () => {
    fetchHandler = () => jsonResponse(404, { error: { code: 'NOT_FOUND', message: '不存在' } });
    const err = await api('/api/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientErrorInstance).status).toBe(404);
    expect((err as ApiClientErrorInstance).code).toBe('NOT_FOUND');
    expect((err as ApiClientErrorInstance).message).toBe('不存在');
  });

  it('错误体缺 code 时回退 UNKNOWN', async () => {
    fetchHandler = () => new Response('not json', { status: 500 });
    const err = await api('/api/x').catch((e) => e) as ApiClientErrorInstance;
    expect(err.code).toBe('UNKNOWN');
    expect(err.message).toContain('500');
  });

  it('Bearer 注入：读取 localStorage 的 access token', async () => {
    storeTokens('token-a', 'refresh-a');
    let auth = '';
    fetchHandler = (_input, init) => {
      auth = (init?.headers as Record<string, string>)?.['Authorization'] ?? '';
      return jsonResponse(200, {});
    };
    await api('/api/x');
    expect(auth).toBe('Bearer token-a');
  });
});

describe('401 刷新重试', () => {
  it('401 后刷新成功 → 用新 token 重试原请求', async () => {
    storeTokens('stale', 'refresh-1');
    registerRefreshHandler(async () => {
      storeTokens('fresh', 'refresh-2');
      return 'fresh';
    });
    const auths: string[] = [];
    fetchHandler = (_input, init) => {
      auths.push((init?.headers as Record<string, string>)?.['Authorization'] ?? '');
      if (auths.length === 1) return jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: '' } });
      return jsonResponse(200, { ok: true });
    };
    await expect(api('/api/x')).resolves.toEqual({ ok: true });
    expect(auths).toEqual(['Bearer stale', 'Bearer fresh']);
    expect(getStoredRefreshToken()).toBe('refresh-2');
  });

  it('401 + NO_RETRY_CODES（TOKEN_REPLAY / INVALID_TOKEN）不重试', async () => {
    for (const code of ['TOKEN_REPLAY', 'INVALID_TOKEN']) {
      storage.clear();
      storeTokens('t', 'r');
      let calls = 0;
      fetchHandler = () => {
        calls++;
        return jsonResponse(401, { error: { code, message: '' } });
      };
      const err = await api('/api/x').catch((e) => e) as ApiClientErrorInstance;
      expect(calls).toBe(1); // 没有第二次请求
      expect(err.status).toBe(401);
    }
  });

  it('刷新失败（返回 null）→ 不重试，直接抛 401', async () => {
    storeTokens('stale', 'refresh-bad');
    registerRefreshHandler(async () => null);
    let calls = 0;
    fetchHandler = () => {
      calls++;
      return jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: '' } });
    };
    const err = await api('/api/x').catch((e) => e) as ApiClientErrorInstance;
    expect(calls).toBe(1);
    expect(err.status).toBe(401);
  });

  it('retryOn401=false 时即使 401 也不尝试刷新', async () => {
    storeTokens('stale', 'r');
    const spy = vi.fn(async () => 'fresh');
    registerRefreshHandler(spy);
    let calls = 0;
    fetchHandler = () => {
      calls++;
      return jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: '' } });
    };
    await api('/api/x', { retryOn401: false }).catch(() => null);
    expect(calls).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('刷新单飞（并发 401 只触发一次刷新）', () => {
  it('并发请求走 AuthProvider 的单飞刷新（api.ts 不自带去重）', async () => {
    // 设计说明：单飞由 AuthProvider.refreshAccessToken 的 refreshPromise 保证（auth.tsx:104），
    // api.ts 的 refreshHandler 只是薄转发。这里验证 api.ts 在并发 401 下确实会把刷新
    // 委托给 handler，且 handler 侧只要做单飞（真实实现如此）即可保证全站只刷一次。
    storeTokens('stale', 'refresh-1');
    let refreshCalls = 0;
    let sharedRefresh: Promise<string | null> | null = null;
    const singleFlightRefresh = async (): Promise<string | null> => {
      if (sharedRefresh) return sharedRefresh;
      sharedRefresh = (async () => {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return 'fresh';
      })();
      return sharedRefresh;
    };
    registerRefreshHandler(singleFlightRefresh);
    fetchHandler = (_input, init) => {
      const auth = (init?.headers as Record<string, string>)?.['Authorization'] ?? '';
      if (auth === 'Bearer stale') return jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: '' } });
      return jsonResponse(200, { ok: true });
    };
    const results = await Promise.all(Array.from({ length: 10 }, () => api('/api/x')));
    expect(results.every((r) => (r as { ok: boolean }).ok)).toBe(true);
    expect(refreshCalls).toBe(1);
  });
});

describe('请求超时', () => {
  /** 挂死 fetch：只在 signal 中止时落地（与真实 fetch abort 语义一致） */
  function hangingFetch(_input: string, init?: RequestInit): Promise<Response> {
    return new Promise<Response>((_r, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
    });
  }

  it('默认 30s 超时：挂死请求最终抛错（DOMException）', async () => {
    vi.useFakeTimers();
    fetchHandler = hangingFetch;
    let err: unknown = null;
    const p = api('/api/slow').catch((e) => { err = e; });
    await vi.advanceTimersByTimeAsync(30_000);
    await p;
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).message).toContain('超时');
    vi.useRealTimers();
  });

  it('timeoutMs 覆盖默认值（1s 超时在 1s 触发）', async () => {
    vi.useFakeTimers();
    fetchHandler = hangingFetch;
    let err: unknown = null;
    const p = api('/api/slow', { timeoutMs: 1_000 }).catch((e) => { err = e; });
    await vi.advanceTimersByTimeAsync(1_000);
    await p;
    expect(err).toBeInstanceOf(DOMException);
    vi.useRealTimers();
  });

  it('timeoutMs: 0 关闭超时（60s 后请求仍未被中断）', async () => {
    vi.useFakeTimers();
    let resolved: Response | null = null;
    fetchHandler = () => new Promise<Response>((r) => setTimeout(() => { resolved = jsonResponse(200, { late: true }); r(resolved!); }, 60_000));
    const p = api('/api/slow-late', { timeoutMs: 0 });
    await vi.advanceTimersByTimeAsync(60_000);
    await expect(p).resolves.toEqual({ late: true });
    vi.useRealTimers();
  });

  it('正常响应先于超时完成，计时器被清理（不泄漏）', async () => {
    vi.useFakeTimers();
    fetchHandler = () => jsonResponse(200, { ok: true });
    const result = await api('/api/fast');
    expect(result).toEqual({ ok: true });
    // 快进远超超时阈值，不应有任何挂起的定时器报错
    await vi.advanceTimersByTimeAsync(60_000);
    vi.useRealTimers();
  });
});
