/** /auth/github/done?code=... — GitHub 回跳中转：code 换 token 后跳转 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePageTitle } from '@/lib/use-page-title';
import { PageContainer, PageMessage } from '@/components/layout/page';
import { Button } from '@/components/ui/button';

export default function OAuthCallback() {
  const { oauthExchange } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  usePageTitle('GitHub 登录');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    if (!code) {
      setError('缺少授权码，请回到登录页重新操作');
      return;
    }
    void (async () => {
      try {
        await oauthExchange(code);
        const next = params.get('next');
        navigate(next && next.startsWith('/') ? next : '/', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : '登录失败，请重试');
      }
    })();
  }, [params, oauthExchange, navigate]);

  if (error) {
    return (
      <PageContainer width="md">
        <PageMessage
          icon={<Loader2 className="text-muted-foreground size-10" />}
          title="GitHub 登录未完成"
          description={error}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/login">返回登录</Link>
            </Button>
          }
          className="py-24"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="md">
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="text-primary animate-spin" size={28} />
        <p className="text-muted-foreground text-sm">正在完成 GitHub 登录…</p>
      </div>
    </PageContainer>
  );
}
