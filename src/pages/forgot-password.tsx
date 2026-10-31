import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Send } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { usePageTitle } from '@/lib/use-page-title';
import { AuthShell } from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  usePageTitle('找回密码');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('请输入注册邮箱');
      return;
    }
    setSending(true);
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      icon={<Mail className="size-6" />}
      title="找回密码"
      description="输入注册邮箱，我们会发送重置链接（30 分钟内有效）。"
      footer={
        <>
          想起密码了？{' '}
          <Link to="/login" className="text-primary hover:underline">
            返回登录
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm">如果该邮箱已注册，重置邮件已发出，请查收（注意垃圾箱）。</p>
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
            重新发送
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">注册邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" loading={sending}>
            <Send className="size-4" /> 发送重置邮件
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
