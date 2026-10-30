import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      toast.error('两次输入的密码不一致');
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
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-12">
      <div className="text-primary mb-4 flex size-12 items-center justify-center rounded-none border">
        <KeyRound className="size-6" />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>设置新密码</CardTitle>
          <CardDescription>重置成功后，所有已登录设备都需要重新登录</CardDescription>
        </CardHeader>
        <CardContent>
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
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? '提交中…' : '重置密码'}
              </Button>
            </form>
          )}
          <p className="text-muted-foreground mt-4 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              返回登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
