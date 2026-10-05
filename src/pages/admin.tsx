import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle, FileText, Flag, Pencil, Plus, RotateCcw, ScrollText, ShieldCheck, Trash2, Users } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { AdminPost, AdminStaff, AdminUser, AuditLogItem, Category, Pagination, ReportItem } from '@/lib/types';

function errMsg(e: unknown): string {
  return e instanceof ApiClientError ? e.message : '操作失败';
}

interface AdminStats {
  users: number;
  posts: number;
  replies: number;
  pendingReports: number;
  bannedUsers: number;
}

function StatCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<AdminStats>('/api/admin/stats'),
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="grid gap-3 sm:grid-cols-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;

  const items = [
    { label: '用户', value: data?.users ?? 0, icon: Users },
    { label: '帖子', value: data?.posts ?? 0, icon: FileText },
    { label: '待处理举报', value: data?.pendingReports ?? 0, icon: Flag },
    { label: '封禁用户', value: data?.bannedUsers ?? 0, icon: Ban },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="bg-card flex items-center gap-3 rounded-xl border p-4">
          <div className="bg-primary/10 text-primary rounded-lg p-2">
            <Icon className="size-4" />
          </div>
          <div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-muted-foreground text-xs">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- 用户管理 ----------------
function UsersTab() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('7');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () =>
      api<{ users: AdminUser[]; pagination: Pagination }>(
        `/api/admin/users?page=1&pageSize=30${query ? `&query=${encodeURIComponent(query)}` : ''}`,
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

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索 UID / 用户名 / 昵称 / 邮箱…"
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border">
        <Table>
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
                  <TableCell className="font-mono text-xs">{u.uid}</TableCell>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={u.role}
                        onValueChange={(role) => {
                          if (role === u.role) return;
                          void api(`/api/admin/users/${u.id}/role`, { method: 'PATCH', body: { role } }).then(
                            () => {
                              toast.success('角色已更新');
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
                    {u.status === 'banned' ? <Badge variant="destructive">已封禁</Badge> : <Badge variant="success">正常</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.postCount} / {u.replyCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const reason = window.prompt('禁言原因：');
                            if (!reason) return;
                            void api(`/api/admin/users/${u.id}/mute`, { method: 'POST', body: { reason, days: 7 } }).then(
                              () => {
                                toast.success('已禁言 7 天');
                                refresh();
                              },
                              (e) => toast.error(errMsg(e)),
                            );
                          }}
                        >
                          禁言
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void api(`/api/admin/users/${u.id}/unmute`, { method: 'POST' }).then(() => {
                              toast.success('已解除禁言');
                              refresh();
                            }, (e) => toast.error(errMsg(e)))
                          }
                        >
                          解禁言
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
}

// ---------------- 帖子管理 ----------------
function PostsTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('normal');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'posts', status],
    queryFn: () =>
      api<{ posts: AdminPost[]; pagination: Pagination }>(`/api/admin/posts?page=1&pageSize=30&status=${status}`),
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });

  const act = async (id: string, action: string, method: 'POST' | 'DELETE' = 'POST') => {
    try {
      await api(`/api/admin/${action.startsWith('posts/') ? action : `posts/${id}/${action}`}`, { method });
      toast.success('操作成功');
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-3">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="normal">正常帖子</SelectItem>
          <SelectItem value="deleted">已删除</SelectItem>
          <SelectItem value="all">全部</SelectItem>
        </SelectContent>
      </Select>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>作者</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="my-2 h-8" />
                </TableCell>
              </TableRow>
            ) : (
              (data?.posts ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-64">
                    <Link to={`/posts/${p.id}`} className="hover:text-primary line-clamp-1 font-medium">
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{p.authorName}</TableCell>
                  <TableCell className="text-xs">{p.categoryName}</TableCell>
                  <TableCell>
                    {p.isDeleted ? (
                      <Badge variant="destructive">已删除</Badge>
                    ) : (
                      <>
                        {Boolean(p.isPinned) && <Badge variant="secondary" className="mr-1">置顶</Badge>}
                        {Boolean(p.isFeatured) && <Badge variant="warning">精华</Badge>}
                        {!p.isPinned && !p.isFeatured && <Badge variant="outline">正常</Badge>}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.isDeleted ? (
                        <Button variant="outline" size="sm" onClick={() => void act(p.id, 'restore')}>
                          <RotateCcw className="size-3.5" /> 恢复
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => void act(p.id, p.isPinned ? 'unpin' : 'pin')}>
                            {p.isPinned ? '取消置顶' : '置顶'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void act(p.id, p.isFeatured ? 'unfeature' : 'feature')}>
                            {p.isFeatured ? '取消精华' : '加精'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void act(p.id, `posts/${p.id}`, 'DELETE')}>
                            <Trash2 className="size-3.5" /> 删除
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- 分类管理 ----------------
function CategoriesTab() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const create = async () => {
    try {
      if (editId) {
        await api(`/api/admin/categories/${editId}`, {
          method: 'PATCH',
          body: { name, slug, description, icon },
        });
        toast.success('分类已更新');
      } else {
        await api('/api/admin/categories', { method: 'POST', body: { name, slug, description, icon } });
        toast.success('分类已创建');
      }
      setName('');
      setSlug('');
      setDescription('');
      setIcon('');
      setEditId(null);
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
      toast.success('分类已删除');
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-[80px_1fr_1fr_1fr_auto]">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="图标" maxLength={4} />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" maxLength={24} />
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug（小写字母数字）" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述" maxLength={200} />
          <Button onClick={() => void create()} disabled={!name.trim() || !slug.trim()}>
            {editId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {editId ? '保存' : '创建'}
          </Button>
        </div>
      )}

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>分类</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>帖子数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="my-2 h-8" />
                </TableCell>
              </TableRow>
            ) : (
              (data?.categories ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.icon} {c.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.slug}</TableCell>
                  <TableCell className="text-xs">{c.postCount}</TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditId(c.id);
                            setName(c.name);
                            setSlug(c.slug);
                            setDescription(c.description);
                            setIcon(c.icon);
                          }}
                        >
                          <Pencil className="size-3.5" /> 编辑
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void remove(c.id)}>
                          <Trash2 className="size-3.5" /> 删除
                        </Button>
                      </div>
                    </TableCell>
                  ) : (
                    <TableCell />
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- 举报管理 ----------------
function ReportsTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', status],
    queryFn: () =>
      api<{ reports: ReportItem[]; pagination: Pagination }>(`/api/admin/reports?page=1&pageSize=30&status=${status}`),
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });

  const handle = async (id: string, action: 'resolve' | 'dismiss') => {
    try {
      await api(`/api/admin/reports/${id}/${action}`, { method: 'POST', body: { note: '' } });
      toast.success(action === 'resolve' ? '已处理' : '已关闭');
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-3">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">待处理</SelectItem>
          <SelectItem value="resolved">已处理</SelectItem>
          <SelectItem value="dismissed">已关闭</SelectItem>
        </SelectContent>
      </Select>

      <div className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (data?.reports.length ?? 0) === 0 ? (
          <p className="text-muted-foreground bg-card rounded-xl border px-4 py-10 text-center text-sm">没有举报记录</p>
        ) : (
          data!.reports.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{r.targetType === 'post' ? '帖子' : r.targetType === 'reply' ? '回复' : '用户'}</Badge>
                <Badge variant={r.reason === 'spam' ? 'secondary' : 'destructive'}>
                  {{ spam: '垃圾广告', abuse: '辱骂', porn: '色情', illegal: '违法', other: '其他' }[r.reason] ?? r.reason}
                </Badge>
                <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'resolved' ? 'success' : 'outline'}>
                  {{ pending: '待处理', resolved: '已处理', dismissed: '已关闭' }[r.status] ?? r.status}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  举报人 {r.reporterName} · {timeAgo(r.createdAt)}
                </span>
              </div>
              {r.detail && <p className="text-muted-foreground mt-2 text-sm">{r.detail}</p>}
              {r.targetType === 'post' && (
                <Link to={`/posts/${r.targetId}`} className="text-primary mt-2 inline-block text-xs hover:underline">
                  查看目标 →
                </Link>
              )}
              {r.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => void handle(r.id, 'resolve')}>
                    处理
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void handle(r.id, 'dismiss')}>
                    关闭
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------- 管理员配置（按 UID 授权，支持多管理员） ----------------
function AdminsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uid, setUid] = useState('');
  const [role, setRole] = useState<'admin' | 'moderator'>('admin');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'admins'],
    queryFn: () => api<{ admins: AdminStaff[]; adminEmail: string | null }>('/api/admin/admins'),
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });

  const grant = async () => {
    const uidNum = Number.parseInt(uid, 10);
    if (!Number.isInteger(uidNum) || uidNum <= 0) {
      toast.error('请输入有效的 UID（正整数）');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ unchanged?: boolean; user: { uid: number; username: string; role: string } }>(
        '/api/admin/admins',
        { method: 'POST', body: { uid: uidNum, role } },
      );
      toast.success(
        res.unchanged
          ? `UID ${uidNum} 已经是该角色`
          : `已将 UID ${uidNum}（@${res.user.username}）设为${role === 'admin' ? '管理员' : '版主'}`,
      );
      setUid('');
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (staff: AdminStaff) => {
    if (!window.confirm(`确认撤销 UID ${staff.uid}（@${staff.username}）的管理权限？`)) return;
    try {
      await api(`/api/admin/admins/${staff.uid}`, { method: 'DELETE' });
      toast.success(`已撤销 UID ${staff.uid} 的管理权限`);
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border p-4">
        <h2 className="mb-1 text-sm font-semibold">授权新管理员</h2>
        <p className="text-muted-foreground mb-3 text-xs">
          输入目标用户的 UID（注册时自动分配，管理员为 UID 1），即可授予管理员或版主权限。告警邮箱：
          {data?.adminEmail ?? '未配置'}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="grant-uid">UID</Label>
            <Input
              id="grant-uid"
              value={uid}
              onChange={(e) => setUid(e.target.value.replace(/\D/g, ''))}
              placeholder="例如 2"
              inputMode="numeric"
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label>角色</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'moderator')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="moderator">版主</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void grant()} disabled={submitting || !uid}>
            <ShieldCheck className="size-4" /> {submitting ? '授权中…' : '授权'}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">UID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>昵称</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>最后登录</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="my-2 h-8" />
                </TableCell>
              </TableRow>
            ) : (
              (data?.admins ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.uid}</TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/users/${a.username}`} className="hover:text-primary">
                      {a.username}
                    </Link>
                    {a.id === user?.id && <Badge variant="secondary" className="ml-2">我</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{a.nickname}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{a.email}</TableCell>
                  <TableCell>
                    <Badge variant={a.role === 'admin' ? 'default' : 'secondary'}>
                      {a.role === 'admin' ? '管理员' : '版主'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {a.lastLoginAt ? timeAgo(a.lastLoginAt) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={a.id === user?.id}
                      onClick={() => void revoke(a)}
                    >
                      <Trash2 className="size-3.5" /> 撤销
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- 审计日志 ----------------
function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => api<{ logs: AuditLogItem[]; pagination: Pagination }>('/api/admin/audit-logs?page=1&pageSize=50'),
  });

  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>操作者</TableHead>
            <TableHead>动作</TableHead>
            <TableHead>目标</TableHead>
            <TableHead>详情</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Skeleton className="my-2 h-8" />
              </TableCell>
            </TableRow>
          ) : (
            (data?.logs ?? []).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground text-xs">{log.createdAt}</TableCell>
                <TableCell className="text-xs">{log.actorName ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {log.targetType}/{(log.targetId ?? '').slice(0, 10)}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-52 truncate text-xs">{log.detail}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------- 主页面 ----------------
export function AdminPage() {
  const { user, isModerator, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!user || !isModerator) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <ShieldCheck className="text-muted-foreground mx-auto size-10" />
        <p className="text-muted-foreground mt-3">只有管理员和版主可以访问后台</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <ShieldCheck className="text-primary size-5" /> 管理后台
        {!isAdmin && <Badge variant="secondary">版主权限</Badge>}
      </h1>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="users">用户</TabsTrigger>
          <TabsTrigger value="posts">帖子</TabsTrigger>
          <TabsTrigger value="categories">分类</TabsTrigger>
          <TabsTrigger value="reports">举报</TabsTrigger>
          {isAdmin && <TabsTrigger value="admins">管理员</TabsTrigger>}
          {isAdmin && <TabsTrigger value="audit">审计日志</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview">
          <StatCards />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="posts">
          <PostsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="admins">
            <AdminsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="audit">
            <AuditTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
