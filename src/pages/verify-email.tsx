import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** 邮箱激活页：/verify-email?token=xxx（一次性令牌，24 小时有效） */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '正在验证你的邮箱…' : '链接无效：缺少验证令牌');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await api('/api/auth/verify-email', { method: 'POST', body: { token } });
        if (cancelled) return;
        setState('ok');
        setMessage('邮箱验证成功，账号已激活！');
        await refreshUser();
      } catch (e) {
        if (cancelled) return;
        setState('error');
        setMessage(e instanceof Error ? e.message : '验证失败，链接可能已过期');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            {state === 'ok' ? (
              <CheckCircle2 className="size-12 text-emerald-500" />
            ) : state === 'loading' ? (
              <div className="border-primary size-10 animate-spin rounded-full border-2 border-t-transparent" />
            ) : (
              <XCircle className="text-destructive size-12" />
            )}
          </div>
          <CardTitle>{state === 'ok' ? '激活成功' : state === 'loading' ? '验证中' : '激活失败'}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {state === 'ok' ? (
            <Button asChild>
              <Link to="/new">去发布第一篇帖子 →</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline">
                <Link to="/settings">到设置页重新发送验证邮件</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/">返回首页</Link>
              </Button>
            </>
          )}
          {!user && state !== 'ok' && (
            <p className="text-muted-foreground text-center text-xs">
              还没有登录？<Link to="/login" className="text-primary hover:underline">登录</Link>后可重新获取验证邮件。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** 未验证账号横幅（站内提示 + 重发按钮） */
export function UnverifiedBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  if (!user || user.accountStatus !== 'unverified') return null;

  const resend = async () => {
    setSending(true);
    try {
      const res = await api<{ sent: boolean; alreadyVerified?: boolean }>('/api/auth/resend-verification', {
        method: 'POST',
      });
      if (res.alreadyVerified) toast.success('账号已验证');
      else toast.success('验证邮件已发送，请查收（注意垃圾箱）');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发送失败，请稍后再试');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>
          <strong>邮箱未验证</strong>：你可以浏览内容，但发帖、回复与上传需要先激活账号。
        </span>
        <Button size="sm" variant="outline" disabled={sending} onClick={() => void resend()}>
          {sending ? '发送中…' : '重新发送验证邮件'}
        </Button>
      </div>
    </div>
  );
}
