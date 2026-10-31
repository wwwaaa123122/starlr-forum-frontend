import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Github, Sparkles } from 'lucide-react';
import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSiteConfig } from '@/lib/site-config';
import { usePageTitle } from '@/lib/use-page-title';
import { AuthShell } from '@/components/layout/auth-shell';
import { Turnstile, fetchSiteConfig } from '@/components/turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** GitHub 授权入口：跟随当前访问域名回跳（后端 state 校验白名单） */
const githubOAuthStartUrl = () =>
  `${import.meta.env.VITE_API_BASE ?? ''}/oauth/start/github?redirect=${encodeURIComponent(window.location.origin)}`;

export function LoginPage() {
  const { login, user } = useAuth();
  const { siteName, registrationEnabled } = useSiteConfig();
  const navigate = useNavigate();
  usePageTitle('登录');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchSiteConfig().then((cfg) => setSiteKey(cfg.turnstileSiteKey));
  }, []);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    try {
      await login(identifier.trim(), password, turnstileToken || undefined);
      toast.success('登录成功');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      icon={<Sparkles className="size-6" />}
      title="登录"
      description={`使用你的 ${siteName} 账号`}
      footer={
        registrationEnabled ? (
          <>
            还没有账号？{' '}
            <Link to="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </>
        ) : (
          '本站当前未开放注册'
        )
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="identifier">用户名或邮箱</Label>
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Turnstile siteKey={siteKey} onToken={setTurnstileToken} />
        <Button type="submit" className="w-full" loading={submitting}>
          登录
        </Button>
        <p className="text-center">
          <Link to="/forgot-password" className="text-muted-foreground text-sm hover:underline">
            忘记密码？
          </Link>
        </p>
      </form>

      <div className="flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">或</span>
        <div className="bg-border h-px flex-1" />
      </div>
      {/* 与全站按钮同尺寸同边框，不再手写一套 */}
      <Button asChild variant="outline" className="w-full">
        <a href={githubOAuthStartUrl()}>
          <Github className="size-4" />
          使用 GitHub 登录
        </a>
      </Button>
    </AuthShell>
  );
}
