import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Send } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-12">
      <div className="text-primary mb-4 flex size-12 items-center justify-center rounded-none border">
        <Mail className="size-6" />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>找回密码</CardTitle>
          <CardDescription>输入注册邮箱，我们会发送重置链接（30 分钟内有效）</CardDescription>
        </CardHeader>
        <CardContent>
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
              <Button type="submit" className="w-full" disabled={sending}>
                <Send className="size-4" /> {sending ? '发送中…' : '发送重置邮件'}
              </Button>
            </form>
          )}
          <p className="text-muted-foreground mt-4 text-center text-sm">
            想起密码了？{' '}
            <Link to="/login" className="text-primary hover:underline">
              返回登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
