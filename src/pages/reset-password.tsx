import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { usePageTitle } from '@/lib/use-page-title';
import { AuthShell } from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  usePageTitle('设置新密码');

  useEffect(() => {
    const t = params.get('token') ?? '';
    if (t) setToken(t);
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('重置链接无效：缺少令牌');
      return;
    }
    if (password.length < 8) {
      toast.error('新密码至少 8 位');
      return;
    }
    if (password !== confirm) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
      toast.success('密码已重置，请使用新密码登录');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '重置失败，请重新申请');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      icon={<KeyRound className="size-6" />}
      title="设置新密码"
      description="重置成功后，所有已登录设备都需要重新登录。"
      footer={
        <Link to="/login" className="text-primary hover:underline">
          返回登录
        </Link>
      }
    >
      {done ? (
        <p className="text-center text-sm">密码已更新，正在跳转到登录页…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">新密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">确认新密码</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" loading={submitting}>
            重置密码
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
