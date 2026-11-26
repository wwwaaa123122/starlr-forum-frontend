import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSiteConfig } from '@/lib/site-config';
import { usePageTitle } from '@/lib/use-page-title';
import { AuthShell } from '@/components/layout/auth-shell';
import { Turnstile, fetchSiteConfig } from '@/components/turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterPage() {
  const { register, user } = useAuth();
  const { siteName, registrationEnabled, emailRequired } = useSiteConfig();
  const navigate = useNavigate();
  usePageTitle('注册');
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
      toast.success(emailRequired ? '注册成功！请到邮箱点击激活链接完成验证' : '注册成功！');
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

  if (!registrationEnabled) {
    return (
      <AuthShell
        icon={<img src="/icon-192.png" alt="Starlr" className="size-8" />}
        title="注册暂未开放"
        description={`${siteName} 目前仅限邀请或已关闭注册。`}
        footer={
          <Link to="/login" className="text-primary hover:underline">
            返回登录
          </Link>
        }
      >
        <p className="text-muted-foreground text-center text-sm">如有需要，请联系站务管理员开通账号。</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={<UserPlus className="size-6" />}
      title="注册"
      description={`创建你的 ${siteName} 账号`}
      footer={
        <>
          已有账号？{' '}
          <Link to="/login" className="text-primary hover:underline">
            直接登录
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            required
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
            placeholder="展示用的名字，可留空"
            maxLength={24}
            autoComplete="nickname"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">邮箱{emailRequired ? '' : '（可选）'}</Label>
          <Input
            id="email"
            type="email"
            required={emailRequired}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            required
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
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Turnstile siteKey={siteKey} onToken={setTurnstileToken} />
        {/* 同意条款用原生 checkbox：Switch 语义是「开关设置」，且 Radix Switch 放在 label 里
            点击文字不会切换（label 只关联表单控件）→ 用户以为点了却仍未勾选。 */}
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="accent-primary mt-0.5 size-4 shrink-0 cursor-pointer"
            aria-label="同意用户协议与隐私政策"
          />
          <span className="text-muted-foreground">
            我已阅读并同意
            <Link to="/terms" target="_blank" className="text-primary hover:underline">
              《用户协议》
            </Link>
            与
            <Link to="/privacy" target="_blank" className="text-primary hover:underline">
              《隐私政策》
            </Link>
          </span>
        </label>
        <Button type="submit" className="w-full" loading={submitting}>
          注册
        </Button>
      </form>
    </AuthShell>
  );
}
