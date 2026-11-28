/**
 * /app-auth — Android 登录桥接页（React + shadcn 版）。
 *
 * 与旧的静态 app-auth.html 不同：本页是 starlr.tech 经典前端的正式路由，
 * 沿用全站方正的 shadcn 组件（Card/Input/Button）与明暗主题；脚本由 Vite 打包，
 * 不再受站点 CSP 对内联脚本的限制。
 *
 * 流程：
 *  - 普通登录/注册：POST /api/auth/login|register（带 Turnstile token）
 *    → POST /api/auth/site-login/issue 换一次性 ticket → starlr://auth 深链回 App
 *  - 旧 APK 的 preauth：POST /api/auth/app-login/confirm → ticket → 深链
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ApiClientError, api } from '@/lib/api';
import { useSiteConfig } from '@/lib/site-config';
import { usePageTitle } from '@/lib/use-page-title';
import { AuthShell } from '@/components/layout/auth-shell';
import { Turnstile, fetchSiteConfig } from '@/components/turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
}

interface TicketResponse {
  ticket: string;
}

function randomHex(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 复用当前网页（starlr.tech 第一方）的登录状态：
 * 读取 xc.access / xc.refresh → 校验 /api/me → 必要时续期 → 返回可用的 access token。
 * 这样已登录网页的用户打开桥接页时无需再输一次账号密码。
 */
async function readWebSession(): Promise<{ access: string } | null> {
  const access = localStorage.getItem('xc.access');
  const refresh = localStorage.getItem('xc.refresh');
  if (!access && !refresh) return null;
  let token = access || '';
  let me = token ? await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null) : null;
  if ((!me || !me.ok) && refresh) {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => null);
    if (res && res.ok) {
      const tokens = (await res.json().catch(() => null)) as { accessToken?: string; refreshToken?: string } | null;
      if (tokens?.accessToken) {
        token = tokens.accessToken;
        localStorage.setItem('xc.access', token);
        if (tokens.refreshToken) localStorage.setItem('xc.refresh', tokens.refreshToken);
        me = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      }
    }
  }
  return me && me.ok && token ? { access: token } : null;
}

export function AppAuthPage() {
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const preauth = params.get('preauth');
  const preauthName = params.get('name') || '';
  const { siteName, registrationEnabled, emailRequired } = useSiteConfig();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [token, setToken] = useState('');
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [siteKeyLoaded, setSiteKeyLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ appUrl: string } | null>(null);
  // 已登录网页时自动复用登录态；注册/preauth/显式 switch=1 时直接走表单
  const [checkingSession, setCheckingSession] = useState(
    !preauth && mode !== 'register' && params.get('switch') !== '1',
  );

  const title = done || checkingSession ? '正在返回应用' : preauth ? '安全验证' : mode === 'register' ? '应用注册' : '应用登录';
  usePageTitle(title);

  useEffect(() => {
    let alive = true;
    void fetchSiteConfig().then((cfg) => {
      if (!alive) return;
      setSiteKey(cfg.turnstileSiteKey);
      setSiteKeyLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const returnToApp = (ticket: string, challenge: string) => {
    const appUrl = `starlr://auth?ticket=${encodeURIComponent(ticket)}&challenge=${encodeURIComponent(challenge)}`;
    const intentUrl =
      `intent://auth?ticket=${encodeURIComponent(ticket)}&challenge=${encodeURIComponent(challenge)}` +
      '#Intent;scheme=starlr;package=com.starlr.app;end';
    setDone({ appUrl });
    // Chrome 需 intent:// 协议从网页拉起应用；同时保留手动按钮兜底
    window.setTimeout(() => window.location.replace(intentUrl), 300);
  };

  useEffect(() => {
    if (!checkingSession) return;
    let alive = true;
    void (async () => {
      const session = await readWebSession();
      if (!alive) return;
      if (!session) {
        setCheckingSession(false);
        return;
      }
      try {
        const challenge = randomHex(16);
        const issued = await api<TicketResponse>('/api/auth/site-login/issue', {
          method: 'POST',
          body: { origin: window.location.origin, challenge },
          token: session.access,
          retryOn401: false,
        });
        if (!alive) return;
        if (!issued.ticket) throw new Error('服务器未返回登录凭证');
        returnToApp(issued.ticket, challenge);
      } catch {
        if (alive) setCheckingSession(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [checkingSession]);

  const fail = (err: unknown) => {
    const message = err instanceof ApiClientError ? err.message : '操作失败，请稍后重试';
    setError(message);
    if (message.includes('预授权')) {
      // preauth 过期：退回网页表单模式
      window.setTimeout(() => {
        window.location.href = `/app-auth${mode === 'register' ? '?mode=register' : ''}`;
      }, 1200);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const challenge = randomHex(16);
    setSubmitting(true);
    try {
      if (preauth) {
        const res = await api<TicketResponse>('/api/auth/app-login/confirm', {
          method: 'POST',
          body: {
            preauth,
            challenge,
            origin: window.location.origin,
            turnstileToken: token || undefined,
          },
          retryOn401: false,
        });
        returnToApp(res.ticket, challenge);
        return;
      }

      if (!identifier.trim() || !password) {
        setError('请输入用户名和密码');
        return;
      }

      const auth = await api<TokenResponse>(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body:
          mode === 'register'
            ? {
                username: identifier.trim(),
                email: email.trim(),
                password,
                nickname: nickname.trim() || undefined,
                turnstileToken: token || undefined,
              }
            : {
                identifier: identifier.trim(),
                password,
                turnstileToken: token || undefined,
              },
        retryOn401: false,
      });
      const issued = await api<TicketResponse>('/api/auth/site-login/issue', {
        method: 'POST',
        body: { origin: window.location.origin, challenge },
        token: auth.accessToken,
        retryOn401: false,
      });
      returnToApp(issued.ticket, challenge);
    } catch (err) {
      fail(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell
        icon={<img src="/icon-192.png" alt="" className="size-8" />}
        title="验证通过"
        description="正在返回应用…"
        footer="如果没有自动跳转，请点击下方按钮"
      >
        <Button asChild className="w-full">
          <a href={done.appUrl}>返回应用</a>
        </Button>
      </AuthShell>
    );
  }

  if (checkingSession) {
    return (
      <AuthShell
        icon={<Loader2 className="text-primary size-6 animate-spin" />}
        title="正在读取登录状态"
        description="如果网页已登录，将自动返回应用…"
      >
        <p className="text-muted-foreground text-center text-sm">正在检查网页登录状态…</p>
      </AuthShell>
    );
  }

  if (mode === 'register' && !registrationEnabled) {
    return (
      <AuthShell
        icon={<img src="/icon-192.png" alt="" className="size-8" />}
        title="注册暂未开放"
        description={`${siteName} 当前未开放注册`}
        footer={
          <Link to="/app-auth?mode=login" className="text-primary hover:underline">
            返回登录
          </Link>
        }
      >
        <p className="text-muted-foreground text-center text-sm">如需账号，请联系站点管理员。</p>
      </AuthShell>
    );
  }

  const requiresTurnstile = siteKey !== null;
  const buttonDisabled = submitting || !siteKeyLoaded || (requiresTurnstile && !token);

  return (
    <AuthShell
      icon={<img src="/icon-192.png" alt="" className="size-8" />}
      title={preauth ? '安全验证' : mode === 'register' ? '应用注册' : '应用登录'}
      description={
        preauth
          ? `以账号「${preauthName || '已验证用户'}」继续，完成人机验证后自动返回应用（无需再次输入密码）`
          : '在浏览器完成登录后自动返回应用'
      }
      footer={
        preauth ? (
          <span>此页面仅用于将登录状态安全返回 App</span>
        ) : mode === 'register' ? (
          <Link to="/app-auth?mode=login" className="text-primary hover:underline">
            已有账号？去登录
          </Link>
        ) : registrationEnabled ? (
          <Link to="/app-auth?mode=register" className="text-primary hover:underline">
            注册新账号
          </Link>
        ) : null
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {!preauth && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="identifier">{mode === 'register' ? '用户名' : '用户名或邮箱'}</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="nickname">昵称（可选）</Label>
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoComplete="nickname"
                    maxLength={24}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">邮箱{emailRequired ? '' : '（可选）'}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>
          </>
        )}

        <Turnstile siteKey={siteKey} onToken={setToken} />

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" loading={submitting} disabled={buttonDisabled}>
          {preauth ? '完成人机验证并返回应用' : mode === 'register' ? '注册' : '登录'}
        </Button>
      </form>
    </AuthShell>
  );
}
