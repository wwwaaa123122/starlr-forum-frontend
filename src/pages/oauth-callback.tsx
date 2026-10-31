/** /auth/github/done?code=... — GitHub 回跳中转：code 换 token 后跳转 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function OAuthCallback() {
  const { oauthExchange } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">GitHub 登录未完成</h1>
        <p className="text-muted-foreground max-w-sm text-sm">{error}</p>
        <Link to="/login" className="text-primary text-sm underline-offset-4 hover:underline">
          返回登录
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="text-primary animate-spin" size={28} />
      <p className="text-muted-foreground text-sm">正在完成 GitHub 登录…</p>
    </div>
  );
}
