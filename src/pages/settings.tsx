import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, KeyRound, Laptop, LogOut, MonitorSmartphone, ShieldCheck, Smartphone, Tablet, Upload } from 'lucide-react';
import { api, ApiClientError, getStoredRefreshToken } from '@/lib/api';
import { compressImage } from '@/lib/image-compress';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { CurrentUser } from '@/lib/auth';
import type { Pagination, PostSummary } from '@/lib/types';

export function SettingsPage() {
  const { user, loading, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: CurrentUser & { email: string } }>('/api/me'),
    enabled: Boolean(user),
  });

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['my-sessions'],
    // 通过本机刷新令牌识别当前浏览器所在会话（旧 access token 无 sid 声明时也能正确标记）
    queryFn: async () => {
      const data = await api<SessionItem>('/api/me/sessions');
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
      const list = currentChain
        ? data.sessions.map((sess) => ({ ...sess, current: sess.chainRoot === currentChain }))
        : data.sessions;
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

  useEffect(() => {
    if (profile?.user) {
      setNickname(profile.user.nickname);
      setBio(profile.user.bio ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  const save = async () => {
    setSaving(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { nickname, bio } });
      toast.success('资料已更新');
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (raw: File) => {
    setUploading(true);
    try {
      const { file } = await compressImage(raw);
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', 'avatar');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('xc.access') ?? ''}` },
        body: form,
      });
      const data = (await res.json()) as { error?: { message: string }; url?: string };
      if (!res.ok) throw new Error(data.error?.message ?? '上传失败');
      toast.success('头像已更新');
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-bold">账号设置</h1>

      <Card>
        <CardHeader>
          <CardTitle>公开资料</CardTitle>
          <CardDescription>这些信息会展示在你的主页和帖子旁边</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.nickname} />
              <AvatarFallback className="text-xl">{user.nickname.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">
                UID {user.uid ?? '—'} · @{user.username}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Camera className="size-4" /> {uploading ? '上传中…' : '更换头像'}
              </Button>
              <p className="text-muted-foreground mt-1.5 flex items-center gap-1 text-xs">
                <Upload className="size-3" /> JPG/PNG/GIF/WEBP，最大 5MB
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="nickname">昵称</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">个性签名（支持 Markdown）</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} />
            <p className="text-muted-foreground text-right text-xs">{bio.length} / 200</p>
          </div>

          <div className="space-y-1.5">
            <Label>用户名</Label>
            <Input value={user.username} disabled />
            <p className="text-muted-foreground text-xs">用户名用于登录与 @ 提及，暂不支持修改</p>
          </div>

          {profile?.user.email && (
            <div className="space-y-1.5">
              <Label>邮箱</Label>
              <Input value={profile.user.email} disabled />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? '保存中…' : '保存资料'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <div key={sess.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
                <div className="flex min-w-0 gap-3">
                  <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {dev.label}
                      {sess.current ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="size-3" /> 当前设备
                        </span>
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
                  <Button variant="outline" size="sm" onClick={() => revokeMutation.mutate(sess.id)} disabled={revokeMutation.isPending}>
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
                disabled={revokeOthersMutation.isPending}
                onClick={() => revokeOthersMutation.mutate()}
              >
                吊销其他所有会话（{(sessions?.total ?? 0) - 1}）
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>修改成功后，所有设备需要重新登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="max-w-sm space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (newPassword.length < 8) {
                toast.error('新密码至少 8 位');
                return;
              }
              if (newPassword !== confirmPassword) {
                toast.error('两次输入的新密码不一致');
                return;
              }
              setChangingPw(true);
              try {
                await api('/api/me/password', {
                  method: 'PATCH',
                  body: { currentPassword: currentPassword, newPassword },
                });
                toast.success('密码已修改，请重新登录');
                await logout();
                navigate('/login');
              } catch (err) {
                toast.error(err instanceof ApiClientError ? err.message : '修改失败');
              } finally {
                setChangingPw(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="current-password">当前密码</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">新密码（至少 8 位）</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={changingPw}>
              <KeyRound className="size-4" /> {changingPw ? '提交中…' : '修改密码'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>账号安全</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await api('/api/auth/logout-all', { method: 'POST' });
              await logout();
              toast.success('已退出所有设备');
              navigate('/');
            }}
          >
            <LogOut className="size-4" /> 退出所有设备
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

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
