/**
 * 会话管理卡片：设备列表 + 吊销单会话 / 吊销其他所有会话。
 * （从 settings.tsx 提出：自带独立 query/mutations/类型，自包含）
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Laptop, LogOut, MonitorSmartphone, ShieldCheck, Smartphone, Tablet } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError, getStoredRefreshToken } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

interface SessionInfoItem {
  id: string;
  chainRoot: string;
  device: string;
  ip: string;
  location: string;
  colo: string;
  asn: number | null;
  loginAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

interface SessionItem {
  sessions: SessionInfoItem[];
  total: number;
}

function errMsg(e: unknown): string {
  return e instanceof ApiClientError ? e.message : '操作失败';
}

/** 解析 User-Agent 为设备类型与浏览器名 */
function describeDevice(ua: string): { kind: 'mobile' | 'tablet' | 'desktop'; label: string; browser: string } {
  const s = ua || '';
  const isTablet = /iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s));
  const isMobile = /iPhone|iPod|Mobile/i.test(s) || /Android/i.test(s);
  const kind = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
  const label = isTablet ? '平板设备' : isMobile ? '手机设备' : '电脑设备';
  const browser = /Edg\//.test(s)
    ? 'Edge'
    : /MicroMessenger/i.test(s)
      ? '微信内置浏览器'
      : /QQ\//i.test(s)
        ? 'QQ 内置浏览器'
        : /Chrome\//.test(s)
          ? 'Chrome'
          : /Firefox\//.test(s)
            ? 'Firefox'
            : /Safari\//.test(s)
              ? 'Safari'
              : '未知浏览器';
  return { kind, label, browser };
}

export function SessionsCard() {
  const { user } = useAuth();

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['my-sessions'],
    // 通过本机刷新令牌识别当前浏览器所在会话（旧 access token 无 sid 声明时也能正确标记）
    queryFn: async () => {
      const data = (await api<SessionItem>('/api/me/sessions')) ?? { sessions: [], total: 0 };
      const rt = getStoredRefreshToken();
      let currentChain: string | null = null;
      if (rt) {
        try {
          const identified = await api<{ chainRoot: string }>('/api/me/sessions/identify', {
            method: 'POST',
            body: { refreshToken: rt },
          });
          currentChain = identified.chainRoot;
        } catch {
          /* 识别失败则按服务端 sid 标记 */
        }
      }
      const sessions = data.sessions ?? [];
      const list = currentChain
        ? sessions.map((sess) => ({ ...sess, current: sess.chainRoot === currentChain }))
        : sessions;
      return { ...data, sessions: list };
    },
    enabled: Boolean(user),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api(`/api/me/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('会话已吊销，该设备将在下次续期时退出');
      void refetchSessions();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: () => api('/api/me/sessions/revoke-others', { method: 'POST' }),
    onSuccess: () => {
      toast.success('已吊销其他所有会话');
      void refetchSessions();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="size-4" /> 会话管理
        </CardTitle>
        <CardDescription>
          你的登录设备与活跃状态（位置来自 Cloudflare IP 库）。吊销后该设备的刷新令牌立即失效。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(sessions?.sessions ?? []).map((sess) => {
          const dev = describeDevice(sess.device);
          const Icon = dev.kind === 'mobile' ? Smartphone : dev.kind === 'tablet' ? Tablet : Laptop;
          return (
            <div key={sess.id} className="flex flex-wrap items-start justify-between gap-3 rounded-none border p-3">
              <div className="flex min-w-0 gap-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-none">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {dev.label}
                    {sess.current ? (
                      <Badge variant="success" className="gap-1 px-1.5 py-0 font-normal">
                        <ShieldCheck className="size-3" /> 当前设备
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {sess.location || '未知地区'} · IP {sess.ip || '未知'}
                    {sess.colo ? ` · 节点 ${sess.colo}` : ''}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {dev.browser} · 登录于 {timeAgo(sess.loginAt)} · 活跃 {timeAgo(sess.lastUsedAt)}
                  </p>
                </div>
              </div>
              {!sess.current && (
                <Button variant="outline" size="sm" onClick={() => revokeMutation.mutate(sess.id)} loading={revokeMutation.isPending}>
                  <LogOut className="size-3.5" /> 吊销
                </Button>
              )}
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">仅显示未过期的活跃会话</p>
          {(sessions?.total ?? 0) > 1 && (
            <Button
              variant="destructive"
              size="sm"
              loading={revokeOthersMutation.isPending}
              onClick={() => revokeOthersMutation.mutate()}
            >
              吊销其他所有会话（{(sessions?.total ?? 0) - 1}）
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
