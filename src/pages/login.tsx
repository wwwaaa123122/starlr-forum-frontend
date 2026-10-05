import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Turnstile, fetchSiteConfig } from '@/components/turnstile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
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
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-12">
      <div className="text-primary mb-4 flex size-12 items-center justify-center rounded-full border">
        <Sparkles className="size-6" />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>登录</CardTitle>
          <CardDescription>使用你的星辰旅人账号</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '登录中…' : '登录'}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            还没有账号？{' '}
            <Link to="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
