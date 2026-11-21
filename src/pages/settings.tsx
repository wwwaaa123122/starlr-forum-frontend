import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Eye, Github, KeyRound, Laptop, Link2, LogOut, MonitorSmartphone, ShieldCheck, Smartphone, Tablet, Unlink, Upload } from 'lucide-react';
import { api, ApiClientError, getStoredRefreshToken } from '@/lib/api';
import { compressImage } from '@/lib/image-compress';
import { useAuth } from '@/lib/auth';
import { usePageTitle } from '@/lib/use-page-title';
import { timeAgo } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/layout/page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { CurrentUser } from '@/lib/auth';
import type { Pagination, PostSummary } from '@/lib/types';
import { assetUrl } from '@/lib/base-url';
import { SessionsCard } from './settings/sessions-card';
import { PasswordCard } from './settings/password-card';
import { SecurityCard } from './settings/security-card';

export function SettingsPage() {
  const { user, loading, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  usePageTitle('账号设置');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [likesPublic, setLikesPublic] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // GitHub 账号绑定 / 解绑
  const [unbindOpen, setUnbindOpen] = useState(false);
  const [unbindPassword, setUnbindPassword] = useState('');
  const bind = useMutation({
    mutationFn: async () => {
      const { bindToken } = await api<{ bindToken: string }>('/api/auth/oauth/bind-intent', { method: 'POST' });
      window.location.href = `${(import.meta.env.VITE_API_BASE ?? '')}/oauth/start/github?redirect=${encodeURIComponent(window.location.origin)}&bind=${bindToken}`;
    },
    onError: () => toast.error('发起绑定失败，请重试'),
  });
  const unbind = useMutation({
    mutationFn: () => api('/api/auth/oauth/github/unbind', { method: 'POST', body: JSON.stringify({ password: unbindPassword }) }),
    onSuccess: () => {
      setUnbindOpen(false);
      setUnbindPassword('');
      void refreshUser();
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('已解绑 GitHub');
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : '解绑失败'),
  });

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: CurrentUser & { email: string } }>('/api/me'),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (profile?.user) {
      setNickname(profile.user.nickname);
      setBio(profile.user.bio ?? '');
      setLikesPublic(Boolean(profile.user.likesPublic));
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

  /** 隐私偏好：喜欢列表是否公开（后端 PATCH /api/me 的 likesPublic） */
  const savePrivacy = async (next: boolean) => {
    setLikesPublic(next);
    setSavingPrivacy(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { likesPublic: next } });
      toast.success(next ? '点赞列表已公开' : '点赞列表已隐藏');
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      await refreshUser();
    } catch (e) {
      setLikesPublic(!next);
      toast.error(e instanceof ApiClientError ? e.message : '保存失败');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const uploadAvatar = async (raw: File) => {    setUploading(true);
    try {
      const { file } = await compressImage(raw);
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', 'avatar');
      // 用 api()（Bearer 注入 + 401 刷新 + 120s 超时），替代裸 fetch（无超时、401 不刷新）
      const res = await api<{ url: string }>('/api/upload', { method: 'POST', body: form, timeoutMs: 120_000 });
      void res;
      toast.success('头像已更新');
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !user) {
    return (
      <PageContainer width="narrow">
        <Skeleton className="h-72 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow" className="space-y-6">
      <PageHeader title="账号设置" description="资料、登录方式与设备管理。" className="mb-0" />

      <Card>
        <CardHeader>
          <CardTitle>公开资料</CardTitle>
          <CardDescription>这些信息会展示在你的主页和帖子旁边</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border">
              <AvatarImage src={assetUrl(user.avatarUrl)} alt={user.nickname} />
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
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
                <Camera className="size-4" /> 更换头像
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
            <Button onClick={() => void save()} loading={saving}>
              保存资料
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-4" /> 隐私
          </CardTitle>
          <CardDescription>控制其他访客能看到什么。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="likes-public">公开我的点赞列表</Label>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                关闭后，主页的「喜欢」标签页只有你自己可见；其他人访问时不会显示。
              </p>
            </div>
            <Switch
              id="likes-public"
              checked={likesPublic}
              disabled={savingPrivacy}
              onCheckedChange={(v) => void savePrivacy(v)}
              aria-label="公开我的点赞列表"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-4" /> GitHub 账号绑定
          </CardTitle>
          <CardDescription>
            绑定后可以使用 GitHub 一键登录本站。解绑需要输入密码确认。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {user.hasGithub ? (
            <>
              <Badge variant="success" className="gap-1.5 font-normal">
                <Github className="size-3.5" /> 已绑定
              </Badge>
              <Dialog open={unbindOpen} onOpenChange={setUnbindOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Unlink className="size-3.5" /> 解绑
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-none sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>确认解绑 GitHub</DialogTitle>
                    <DialogDescription>输入密码以确认解绑。解绑后将无法使用 GitHub 登录。</DialogDescription>
                  </DialogHeader>
                  <Input
                    type="password"
                    placeholder="登录密码"
                    value={unbindPassword}
                    onChange={(e) => setUnbindPassword(e.target.value)}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUnbindOpen(false)}>
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      loading={unbind.isPending}
                      disabled={!unbindPassword}
                      onClick={() => unbind.mutate()}
                    >
                      确认解绑
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <>
              <span className="text-muted-foreground text-xs">未绑定</span>
              <Button
                size="sm"
                loading={bind.isPending}
                onClick={() => bind.mutate()}
              >
                <Github className="size-3.5" /> 绑定 GitHub
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <SessionsCard />
      <PasswordCard />
      <SecurityCard />
    </PageContainer>
  );
}

