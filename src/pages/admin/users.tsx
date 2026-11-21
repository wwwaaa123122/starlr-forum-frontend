import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle, Mic, MicOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/pagination-controls';
import type { AdminUser, Category, Pagination } from '@/lib/types';
import { errMsg, SITE_WIDE } from './shared';

export function UsersTab() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('7');
  const [muteTarget, setMuteTarget] = useState<AdminUser | null>(null);
  const [muteReason, setMuteReason] = useState('');
  const [muteDuration, setMuteDuration] = useState('7');
  const [customDays, setCustomDays] = useState('3');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', query, page],
    queryFn: () =>
      api<{ users: AdminUser[]; pagination: Pagination }>(
        `/api/admin/users?page=${page}&pageSize=20${query ? `&query=${encodeURIComponent(query)}` : ''}`,
      ),
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });

  const mutation = useMutation({
    mutationFn: async ({ path, body }: { path: string; body?: unknown }) =>
      api(`/api/admin/${path}`, { method: 'POST', body }),
    onSuccess: () => {
      toast.success('操作成功');
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const muteDaysValue = (): number | null => {
    if (muteDuration === 'permanent') return null;
    if (muteDuration === 'custom') {
      const n = Number.parseInt(customDays, 10);
      return Number.isFinite(n) && n > 0 ? Math.min(n, 3650) : 1;
    }
    return Number(muteDuration);
  };

  const muteUser = async () => {
    if (!muteTarget || !muteReason.trim()) {
      toast.error('请填写禁言原因');
      return;
    }
    try {
      await api(`/api/admin/users/${muteTarget.id}/mute`, {
        method: 'POST',
        body: { reason: muteReason, days: muteDaysValue() },
      });
      toast.success('已禁言');
      setMuteTarget(null);
      setMuteReason('');
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const banUser = async () => {
    if (!banTarget || !banReason.trim()) {
      toast.error('请填写封禁原因');
      return;
    }
    try {
      await api(`/api/admin/users/${banTarget.id}/ban`, {
        method: 'POST',
        body: { reason: banReason, days: banDays === 'permanent' ? null : Number(banDays) },
      });
      toast.success('已封禁');
      setBanTarget(null);
      setBanReason('');
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const [modTarget, setModTarget] = useState<AdminUser | null>(null);
  const [pickedCats, setPickedCats] = useState<string[]>([]);
  const [granting, setGranting] = useState(false);
  const { data: catsForMod } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    enabled: Boolean(modTarget),
  });
  const toggleCat = (id: string) =>
    setPickedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const grantModerator = async () => {
    if (!modTarget) return;
    if (pickedCats.length === 0) {
      toast.error('请至少选择一个版块');
      return;
    }
    setGranting(true);
    try {
      await api(`/api/admin/users/${modTarget.id}/role`, { method: 'PATCH', body: { role: 'moderator' } });
      if (pickedCats.includes(SITE_WIDE)) {
        await api('/api/admin/moderators', { method: 'POST', body: { username: modTarget.username, siteWide: true } });
        toast.success(`已将 @${modTarget.username} 设为全站版主`);
      } else {
        for (const cid of pickedCats) {
          await api('/api/admin/moderators', { method: 'POST', body: { username: modTarget.username, categoryId: cid } });
        }
        toast.success(`已任命 @${modTarget.username} 为 ${pickedCats.length} 个版块的版主`);
      }
      setModTarget(null);
      setPickedCats([]);
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索 UID / 用户名 / 昵称 / 邮箱…"
        className="max-w-sm"
      />
      <div className="surface">
        <Table className="min-w-215">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">UID</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>发帖 / 回复</TableHead>
              <TableHead>最后登录</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Skeleton className="my-2 h-8" />
                </TableCell>
              </TableRow>
            ) : (
              (data?.users ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono whitespace-nowrap text-xs">{u.uid}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{u.username}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{u.email}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={u.role}
                        onValueChange={(role) => {
                          if (role === u.role) return;
                          if (role === 'moderator') {
                            setModTarget(u);
                            return;
                          }
                          void api<{ scopeCleared?: boolean }>(`/api/admin/users/${u.id}/role`, {
                            method: 'PATCH',
                            body: { role },
                          }).then(
                            (res) => {
                              toast.success(res.scopeCleared ? '已改为普通用户，辖区任命一并清空' : '角色已更新');
                              refresh();
                            },
                            (e) => toast.error(errMsg(e)),
                          );
                        }}
                      >
                        <SelectTrigger size="sm" className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">用户</SelectItem>
                          <SelectItem value="moderator">版主</SelectItem>
                          <SelectItem value="admin">管理员</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{u.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.status === 'banned' ? (
                      <Badge variant="destructive">已封禁</Badge>
                    ) : !u.emailVerified ? (
                      <Badge variant="warning">
                        未验证
                      </Badge>
                    ) : u.mutedUntil || u.mutedPermanent ? (
                      <Badge variant="warning">禁言中</Badge>
                    ) : !u.emailVerified ? (
                      <Badge variant="secondary">未验证</Badge>
                    ) : (
                      <Badge variant="success">正常</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {u.postCount} / {u.replyCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {u.lastLoginAt ? timeAgo(u.lastLoginAt) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <div className="flex justify-end gap-1">
                        {u.status === 'active' ? (
                          <Button variant="outline" size="sm" onClick={() => setBanTarget(u)}>
                            <Ban className="size-3.5" /> 封禁
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => mutation.mutate({ path: `users/${u.id}/unban` })}>
                            <CheckCircle className="size-3.5" /> 解封
                          </Button>
                        )}
                        {u.status !== 'banned' && u.emailVerified === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => mutation.mutate({ path: `users/${u.id}/verify` })}
                          >
                            <CheckCircle className="size-3.5" /> 激活
                          </Button>
                        )}
                        {u.mutedUntil || u.mutedPermanent ? (
                          <Button
                            variant="outline"
                            size="sm"
                            title={u.mutedPermanent ? '永久禁言' : `禁言至 ${u.mutedUntil!.replace('T', ' ').slice(0, 16)}`}
                            onClick={() => mutation.mutate({ path: `users/${u.id}/unmute` })}
                          >
                            <Mic className="size-3.5" /> 解除禁言
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setMuteTarget(u)} disabled={u.role === 'admin'}>
                            <MicOff className="size-3.5" /> 禁言
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls pagination={data?.pagination} onPageChange={(p) => setPage(p)} />

      <Dialog open={Boolean(banTarget)} onOpenChange={(v) => !v && setBanTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>封禁用户 {banTarget?.username}</DialogTitle>
            <DialogDescription>封禁后该用户将无法登录，其所有登录状态立即失效。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>原因</Label>
              <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>时长</Label>
              <Select value={banDays} onValueChange={setBanDays}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 天</SelectItem>
                  <SelectItem value="7">7 天</SelectItem>
                  <SelectItem value="30">30 天</SelectItem>
                  <SelectItem value="permanent">永久</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void banUser()}>
              封禁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(muteTarget)} onOpenChange={(v) => !v && setMuteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>禁言用户 {muteTarget?.username}</DialogTitle>
            <DialogDescription>禁言期间该用户不能发布帖子、回复或评论。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>原因</Label>
              <Textarea value={muteReason} onChange={(e) => setMuteReason(e.target.value)} rows={2} placeholder="例如：恶意灌水" />
            </div>
            <div className="space-y-1.5">
              <Label>时长</Label>
              <Select value={muteDuration} onValueChange={setMuteDuration}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 天</SelectItem>
                  <SelectItem value="3">3 天</SelectItem>
                  <SelectItem value="7">7 天</SelectItem>
                  <SelectItem value="30">30 天</SelectItem>
                  <SelectItem value="90">90 天</SelectItem>
                  <SelectItem value="custom">自定义…</SelectItem>
                  <SelectItem value="permanent">永久</SelectItem>
                </SelectContent>
              </Select>
              {muteDuration === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">天（1–3650）</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMuteTarget(null)}>
              取消
            </Button>
            <Button onClick={() => void muteUser()}>确认禁言</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(modTarget)} onOpenChange={(v) => !v && setModTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>授予 @{modTarget?.username} 版主权限</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setPickedCats((prev) => (prev.includes(SITE_WIDE) ? prev.filter((x) => x !== SITE_WIDE) : [SITE_WIDE]))
              }
              className={`rounded-none border px-3 py-1.5 text-xs transition-colors ${pickedCats.includes(SITE_WIDE) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
            >
              🌐 全站管辖
            </button>
            {pickedCats.includes(SITE_WIDE)
              ? null
              : (catsForMod?.categories ?? []).map((cat) => {
                  const picked = pickedCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCat(cat.id)}
                      className={`rounded-none border px-3 py-1.5 text-xs transition-colors ${picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  );
                })}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModTarget(null)}>
              取消
            </Button>
            <Button onClick={() => void grantModerator()} disabled={granting || pickedCats.length === 0}>
              确认授予
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- 帖子管理 ----------------
