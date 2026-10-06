import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Turnstile, fetchSiteConfig } from '@/components/turnstile';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
    if (!agreed) {
      toast.error('请先阅读并同意《用户协议》与《隐私政策》');
      return;
    }
    if (password !== confirm) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        username: username.trim(),
        nickname: nickname.trim() || undefined,
        email: email.trim(),
        password,
        turnstileToken: turnstileToken || undefined,
      });
      toast.success('注册成功！请到邮箱点击激活链接完成验证');
      navigate('/');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.details && Array.isArray(err.details)) {
          const first = err.details[0] as { message?: string } | undefined;
          toast.error(first?.message ?? err.message);
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error('注册失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>注册</CardTitle>
          <CardDescription>创建你的 Starlr Forum 账号</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-24 位，中文/字母/数字/下划线"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nickname">昵称</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="昵称"
                maxLength={24}
                autoComplete="nickname"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位，包含字母、数字或符号"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">确认密码</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Turnstile siteKey={siteKey} onToken={setTurnstileToken} />
              <label className="flex items-center gap-3 text-xs leading-relaxed">
                <Switch checked={agreed} onCheckedChange={setAgreed} aria-label="同意用户协议与隐私政策" />
                <span className="text-muted-foreground">
                  我已阅读并同意
                  <a href="/terms" target="_blank" className="text-primary hover:underline">《用户协议》</a>
                  与
                  <a href="/privacy" target="_blank" className="text-primary hover:underline">《隐私政策》</a>
                </span>
              </label>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '注册中…' : '注册'}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            已有账号？{' '}
            <Link to="/login" className="text-primary hover:underline">
              直接登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
