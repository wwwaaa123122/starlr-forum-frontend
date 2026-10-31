/**
 * 认证状态管理：
 * - Access Token 存内存 + localStorage（XSS 风险由严格 Markdown sanitize 缓解，文档见 README 安全章节）
 * - 401 自动刷新（单飞），Token 到期前 10 分钟主动轮换
 * - Refresh Token Rotation：每次刷新获得全新 Token 对
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  api,
  ApiClientError,
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  jwtExp,
  registerRefreshHandler,
  storeTokens,
} from './api';

export interface CurrentUser {
  id: string;
  uid: number | null;
  username: string;
  nickname: string;
  email?: string;
  avatarUrl: string | null;
  bio: string;
  role: 'user' | 'moderator' | 'admin';
  emailVerified?: boolean;
  accountStatus?: 'active' | 'unverified' | 'banned';
  postCount: number;
  replyCount: number;
  createdAt: string;
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  login: (identifier: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  /** GitHub OAuth：一次性 code 换 token 并登录 */
  oauthExchange: (code: string) => Promise<void>;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  turnstileToken?: string;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthResponse {
  user: CurrentUser & { username: string };
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshPromise = useRef<Promise<string | null> | null>(null);
  const accessTokenRef = useRef<string | null>(getStoredAccessToken());

  const applyAuthResponse = (data: AuthResponse) => {
    accessTokenRef.current = data.accessToken;
    storeTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const loadUser = useCallback(async () => {
    if (!accessTokenRef.current && !getStoredRefreshToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ user: CurrentUser }>('/api/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化：有 Token 则加载用户信息
  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  /** 刷新 Token（单飞：并发 401 只触发一次刷新） */
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshPromise.current) return refreshPromise.current;

    const doRefresh = async (): Promise<string | null> => {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) return null;
      try {
        const data = await api<AuthResponse>('/api/auth/refresh', {
          method: 'POST',
          body: { refreshToken },
          retryOn401: false,
        });
        accessTokenRef.current = data.accessToken;
        storeTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch (e) {
        // Refresh Token 失效/重放：清除本地状态，回到未登录
        accessTokenRef.current = null;
        clearStoredTokens();
        setUser(null);
        if (e instanceof ApiClientError && e.code === 'TOKEN_REPLAY') {
          console.warn('检测到 Refresh Token 重放，已全部撤销');
        }
        return null;
      }
    };

    refreshPromise.current = doRefresh().finally(() => {
      refreshPromise.current = null;
    });
    return refreshPromise.current;
  }, []);

  useEffect(() => {
    registerRefreshHandler(refreshAccessToken);
  }, [refreshAccessToken]);

  // Token 到期前 10 分钟主动轮换
  useEffect(() => {
    const timer = setInterval(() => {
      const token = accessTokenRef.current ?? getStoredAccessToken();
      if (!token || !getStoredRefreshToken()) return;
      const exp = jwtExp(token);
      if (exp && exp - Date.now() / 1000 < 600) {
        void refreshAccessToken();
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [refreshAccessToken]);

  const login = useCallback(
    async (identifier: string, password: string, turnstileToken?: string) => {
      const data = await api<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password, turnstileToken },
        retryOn401: false,
      });
      applyAuthResponse(data);
    },
    [],
  );

  const register = useCallback(async (input: RegisterInput) => {
    const data = await api<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: input,
      retryOn401: false,
    });
    applyAuthResponse(data);
  }, []);

  /** GitHub OAuth：一次性 code 换本 Worker 签发 token（POST /api/auth/oauth/exchange） */
  const oauthExchange = useCallback(async (code: string) => {
    const data = await api<AuthResponse>('/api/auth/oauth/exchange', {
      method: 'POST',
      body: { code },
      retryOn401: false,
    });
    applyAuthResponse(data);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    try {
      if (refreshToken) {
        await api('/api/auth/logout', { method: 'POST', body: { refreshToken }, retryOn401: false });
      }
      accessTokenRef.current = null;
      clearStoredTokens();
      setUser(null);
    } catch {
      // 即使服务端登出失败也清理本地状态
      accessTokenRef.current = null;
      clearStoredTokens();
      setUser(null);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return accessTokenRef.current ?? getStoredAccessToken();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      isModerator: user?.role === 'admin' || user?.role === 'moderator',
      login,
      register,
      logout,
      refreshUser: loadUser,
      getAccessToken,
      oauthExchange,
    }),
    [user, loading, login, register, logout, loadUser, getAccessToken, oauthExchange],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
