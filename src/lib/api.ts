/** 统一 API 客户端：错误格式解析、Bearer 注入、401 刷新重试 */

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

type ErrorHandler = () => Promise<string | null>;

let refreshHandler: ErrorHandler | null = null;
/** 由 AuthProvider 注册：401 时尝试刷新 Token，返回新 Access Token 或 null */
export function registerRefreshHandler(handler: ErrorHandler) {
  refreshHandler = handler;
}

const NO_RETRY_CODES = new Set(['TOKEN_REPLAY', 'INVALID_TOKEN']);

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** 额外 Authorization 覆盖（一般不用） */
  token?: string;
  signal?: AbortSignal;
  /** 401 时是否尝试刷新后重试（默认 true） */
  retryOn401?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal, retryOn401 = true } = options;

  const doFetch = async (accessToken: string | undefined) => {
    const headers: Record<string, string> = {};
    // FormData（multipart 上传）不能 JSON 序列化，Content-Type 由浏览器自动附带边界
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    // 跨域部署（VITE_API_BASE 指向独立 API 域）时拼接完整地址；同源开发为空串
    const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}${path}`, {
      method,
      headers,
      body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
    return res;
  };

  let accessToken = token ?? getStoredAccessToken() ?? undefined;
  let res = await doFetch(accessToken);

  // 401 → 尝试刷新 Token 后重试一次
  if (res.status === 401 && retryOn401 && refreshHandler) {
    let errBody: ApiErrorBody | null = null;
    try {
      errBody = (await res.clone().json()) as ApiErrorBody;
    } catch {
      /* ignore */
    }
    const code = errBody?.error.code;
    if (!code || !NO_RETRY_CODES.has(code)) {
      const newToken = await refreshHandler();
      if (newToken) {
        accessToken = newToken;
        res = await doFetch(accessToken);
      }
    }
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errBody = data as ApiErrorBody | null;
    throw new ApiClientError(
      res.status,
      errBody?.error?.code ?? 'UNKNOWN',
      errBody?.error?.message ?? `请求失败（${res.status}）`,
      errBody?.error?.details,
    );
  }
  return data as T;
}

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem('xc.access');
  } catch {
    return null;
  }
}

export function storeTokens(access: string, refresh: string) {
  try {
    localStorage.setItem('xc.access', access);
    localStorage.setItem('xc.refresh', refresh);
  } catch {
    /* storage 不可用时静默降级为内存态 */
  }
}

export function clearStoredTokens() {
  try {
    localStorage.removeItem('xc.access');
    localStorage.removeItem('xc.refresh');
  } catch {
    /* ignore */
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem('xc.refresh');
  } catch {
    return null;
  }
}

/** 解析 JWT exp（不验证签名——客户端仅用于主动刷新） */
export function jwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}
