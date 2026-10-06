import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle, Eye, FileText, Flag, ImagePlus, Mic, MicOff, Pencil, Plus, RotateCcw, ScrollText, Send, ShieldCheck, Trash2, TrendingUp, User, Users, X } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatNumber, timeAgo } from '@/lib/utils';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryIcon } from '@/components/category-icon';
import { PaginationControls } from '@/components/pagination-controls';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  totalViews: number;
  avgViews: number;
  topPosts: { id: string; title: string; viewCount: number; replyCount: number; likeCount: number; authorName: string }[];
}

function StatCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<AdminStats>('/api/admin/stats'),
    refetchInterval: 30_000,
  });

  if (isLoading)
    return (
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );

  const items = [
    { label: '用户', value: data?.users ?? 0, icon: Users },
    { label: '帖子', value: data?.posts ?? 0, icon: FileText },
    { label: '总浏览量', value: data?.totalViews ?? 0, icon: Eye },
    { label: '篇均浏览', value: data?.avgViews ?? 0, icon: TrendingUp },
    { label: '待处理举报', value: data?.pendingReports ?? 0, icon: Flag },
    { label: '封禁用户', value: data?.bannedUsers ?? 0, icon: Ban },
  ];

  return (
    <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="bg-card flex items-center gap-3 rounded-xl border p-4">
          <div className="bg-primary/10 text-primary rounded-lg p-2">
            <Icon className="size-4" />
          </div>
          <div>
            <div className="text-xl font-bold">{formatNumber(value)}</div>
            <div className="text-muted-foreground text-xs">{label}</div>
          </div>
        </div>
      ))}
      </div>

      {/* 浏览量排行 */}
      <div className="bg-card rounded-xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">浏览量排行</h3>
          <span className="text-muted-foreground text-xs">Top 10</span>
        </div>
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>标题</TableHead>
              <TableHead className="text-right">浏览</TableHead>
              <TableHead className="text-right">回复</TableHead>
              <TableHead className="text-right">点赞</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.topPosts ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center text-xs">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              (data?.topPosts ?? []).map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell className="max-w-64 truncate text-xs font-medium">
                    <Link to={`/posts/${p.id}`} className="hover:underline">
                      {p.title}
                    </Link>
                    <span className="text-muted-foreground ml-1">· {p.authorName}</span>
                  </TableCell>
                  <TableCell className="text-right text-xs">{formatNumber(p.viewCount)}</TableCell>
                  <TableCell className="text-right text-xs">{formatNumber(p.replyCount)}</TableCell>
                  <TableCell className="text-right text-xs">{formatNumber(p.likeCount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- 用户管理 ----------------
function UsersTab() {
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
      <div className="bg-card rounded-xl border">
        <Table className="min-w-[860px]">
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
                      <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400">
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
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${pickedCats.includes(SITE_WIDE) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
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
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
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
        <Table className="min-w-[640px]">
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
                  <TableCell className="max-w-64 truncate">
                    <Link to={`/posts/${p.id}`} className="hover:text-primary line-clamp-1 font-medium">
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{p.authorName}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{p.categoryName}</TableCell>
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
/** 分类常用图标（点击即选） */
const CATEGORY_EMOJIS = [
  '📢','💻','💬','❓','🎨','🎮','📚','🎬','🎵','⚽','🍜','✈️','🌱','🔧','📷','🧠','🚀','⭐','🔥','💡','🏆','🐾','💼','🛒','📝','🎓','🏠','❤️','🌈','☕',
];

function IconPicker({ icon, onChange }: { icon: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', 'category');
      const res = await api<{ url: string }>('/api/upload', { method: 'POST', body: form });
      onChange(res.url);
      toast.success('图片已上传，点击「创建/保存」生效');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border">
          <CategoryIcon icon={icon} className="size-6 text-xl" />
        </span>
        <Input
          value={/^(https?:\/\/|\/api\/)/.test(icon) ? '' : icon}
          onChange={(e) => onChange(e.target.value.slice(0, 4))}
          placeholder="emoji"
          className="h-10 w-20 text-center"
          maxLength={4}
        />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" /> {uploading ? '上传中…' : '图片'}
        </Button>
        {icon && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            <X className="size-4" />
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {CATEGORY_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`rounded px-1.5 py-0.5 text-base leading-none transition-colors hover:bg-accent ${
              icon === e ? 'bg-accent ring-1 ring-primary' : ''
            }`}
            aria-label={`选择图标 ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

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

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('分类已删除');
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const [restoring, setRestoring] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border">
        <div className="flex justify-end px-4 pt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={restoring}
            onClick={async () => {
              setRestoring(true);
              try {
                const res = await api<{ restored: string[] }>('/api/admin/categories/restore-defaults', { method: 'POST' });
                toast.success(res.restored.length ? `已恢复：${res.restored.join('、')}` : '默认分类完整，无需恢复');
                refresh();
              } catch (e) {
                toast.error(errMsg(e));
              } finally {
                setRestoring(false);
              }
            }}
          >
            <RotateCcw className="size-3.5" /> 恢复默认分类
          </Button>
        </div>
        <Table className="min-w-[520px]">
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
                    <span className="flex items-center gap-2">
                      <CategoryIcon icon={c.icon} className="size-5" />
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{c.slug}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{c.postCount}</TableCell>
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
                        <Button variant="outline" size="sm" onClick={() => setDeleteTarget(c)}>
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
      {isAdmin && (
        <div className="bg-card space-y-3 rounded-xl border p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" maxLength={24} />
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug（小写字母数字）" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述" maxLength={200} />
          </div>
          <div>
            <Label className="text-muted-foreground mb-1.5 block text-xs">分类图标（emoji 或上传图片）</Label>
            <IconPicker icon={icon} onChange={setIcon} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void create()} disabled={!name.trim() || !slug.trim()}>
              {editId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {editId ? '保存' : '创建'}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类「{deleteTarget?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              该分类下有 {deleteTarget?.postCount ?? 0} 篇帖子。删除后帖子不会被删除，但需要重新选择分类才能编辑。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  const [handleTarget, setHandleTarget] = useState<ReportItem | null>(null);
  const [handleAction, setHandleAction] = useState('dismiss');
  const [handleDays, setHandleDays] = useState('7');
  const [handleNote, setHandleNote] = useState('');

  const handle = async () => {
    if (!handleTarget) return;
    if (handleAction !== 'dismiss' && handleAction !== 'delete_content' && !handleNote.trim()) {
      toast.error('请填写处理原因');
      return;
    }
    try {
      await api(`/api/admin/reports/${handleTarget.id}/resolve`, {
        method: 'POST',
        body: {
          action: handleAction,
          note: handleNote,
          days: handleAction === 'mute' || handleAction === 'ban' ? (handleDays === 'permanent' ? null : Number(handleDays)) : undefined,
        },
      });
      toast.success(handleAction === 'dismiss' ? '已按无违规关闭' : '已处理');
      setHandleTarget(null);
      setHandleNote('');
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
              {r.detail && <p className="text-muted-foreground mt-2 text-sm">举报说明：{r.detail}</p>}
              <div className="bg-muted/40 mt-2 rounded-lg border p-3">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    被举报{r.targetType === 'post' ? '帖子' : r.targetType === 'reply' ? '回复' : '用户'}：
                  </span>
                  {r.targetAuthorName && <span className="font-medium">@{r.targetAuthorName}</span>}
                  {r.targetDeleted ? <Badge variant="destructive" className="px-1 py-0 text-[10px]">内容已删除</Badge> : null}
                </p>
                {r.targetTitle && <p className="mt-1 line-clamp-2 text-sm font-medium">{r.targetTitle}</p>}
                {r.targetContent && <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">{r.targetContent}</p>}
              </div>
              {r.resolutionNote && r.status !== 'pending' && (
                <p className="text-muted-foreground mt-2 text-xs">处理结果：{r.resolutionNote}</p>
              )}
              {r.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setHandleTarget(r);
                      setHandleAction('dismiss');
                    }}
                  >
                    处理
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <Dialog open={Boolean(handleTarget)} onOpenChange={(v) => !v && setHandleTarget(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>处理举报</DialogTitle>
          <DialogDescription>选择处理方式。被举报内容由系统留存，处理后仍可在此回溯查看。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>处理方式</Label>
            <Select value={handleAction} onValueChange={setHandleAction}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dismiss">无违规（仅关闭举报）</SelectItem>
                <SelectItem value="mute">禁言作者</SelectItem>
                <SelectItem value="ban">封禁作者</SelectItem>
                <SelectItem value="delete_content">删除被举报内容</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(handleAction === 'mute' || handleAction === 'ban') && (
            <div className="space-y-1.5">
              <Label>时长</Label>
              <Select value={handleDays} onValueChange={setHandleDays}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 天</SelectItem>
                  <SelectItem value="3">3 天</SelectItem>
                  <SelectItem value="7">7 天</SelectItem>
                  <SelectItem value="30">30 天</SelectItem>
                  <SelectItem value="permanent">永久</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>处理备注{handleAction !== 'dismiss' && handleAction !== 'delete_content' ? '（必填，会通知对方）' : ''}</Label>
            <Textarea value={handleNote} onChange={(e) => setHandleNote(e.target.value)} rows={2} placeholder={handleAction === 'dismiss' ? '可留空' : '例如：垃圾广告'} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setHandleTarget(null)}>
            取消
          </Button>
          <Button variant={handleAction === 'dismiss' ? 'default' : 'destructive'} onClick={() => void handle()}>
            确认处理
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}


// ---------------- 版主管理（按版块授权） ----------------
interface ModeratorRow {
  userId: string;
  categoryId: string;
  createdAt: string;
  uid: number;
  username: string;
  nickname: string;
  categoryName: string;
  categorySlug: string;
}

interface SiteWideModerator {
  userId: string;
  uid: number;
  username: string;
  nickname: string;
  createdAt: string;
}

/** 全站管辖的特殊标记值（不与真实版块 id 冲突） */
const SITE_WIDE = '__site_wide__';

function ModeratorsTab() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [pickedCats, setPickedCats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data: mods } = useQuery({
    queryKey: ['admin', 'moderators'],
    queryFn: () => api<{ moderators: ModeratorRow[]; siteWide: SiteWideModerator[] }>('/api/admin/moderators'),
  });
  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
  });
  const categories = catsData?.categories ?? [];

  const toggleCat = (id: string) =>
    setPickedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const assign = async () => {
    if (!username.trim() || pickedCats.length === 0) {
      toast.error('请填写用户名并选择版块');
      return;
    }
    setBusy(true);
    try {
      let upgraded = false;
      if (pickedCats.includes(SITE_WIDE)) {
        const res = await api<{ upgraded?: boolean }>('/api/admin/moderators', {
          method: 'POST',
          body: { username: username.trim(), siteWide: true },
        });
        upgraded = Boolean(res.upgraded);
        toast.success(upgraded ? '已任命为全站版主（角色已升级）' : '已设为全站版主');
      } else {
        for (const cid of pickedCats) {
          const res = await api<{ upgraded?: boolean }>('/api/admin/moderators', {
            method: 'POST',
            body: { username: username.trim(), categoryId: cid },
          });
          upgraded = upgraded || Boolean(res.upgraded);
        }
        toast.success(upgraded ? `已任命为 ${pickedCats.length} 个版块的版主（角色已升级）` : `已添加 ${pickedCats.length} 个版块的版主任命`);
      }
      setUsername('');
      setPickedCats([]);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: ModeratorRow) => {
    try {
      await api(`/api/admin/moderators/${row.userId}/${row.categoryId}`, { method: 'DELETE' });
      toast.success('已移除该版块的版主任命');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card space-y-3 rounded-xl border p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名或 UID" />
          <Button onClick={() => void assign()} disabled={busy || pickedCats.length === 0}>
            任命（{pickedCats.includes(SITE_WIDE) ? '全站' : pickedCats.length}）
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPickedCats((prev) => (prev.includes(SITE_WIDE) ? prev.filter((x) => x !== SITE_WIDE) : [SITE_WIDE]))}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${pickedCats.includes(SITE_WIDE) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >
            🌐 全站管辖
          </button>
          {pickedCats.includes(SITE_WIDE)
            ? null
            : categories.map((cat) => {
                const picked = pickedCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCat(cat.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                );
              })}
        </div>
      </div>

      {(mods?.siteWide ?? []).length > 0 && (
        <div className="bg-card overflow-x-auto rounded-xl border">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">全站版主</TableHead>
                <TableHead>UID</TableHead>
                <TableHead className="whitespace-nowrap">任命时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(mods?.siteWide ?? []).map((sw) => (
                <TableRow key={sw.userId}>
                  <TableCell className="whitespace-nowrap">
                    <Link to={`/users/${sw.username}`} className="hover:underline">
                      {sw.nickname || sw.username}
                    </Link>
                    <span className="text-muted-foreground ml-2 text-xs">@{sw.username}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{sw.uid}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{sw.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await api(`/api/admin/moderators/${sw.userId}`, { method: 'DELETE' });
                          toast.success('已撤销该用户全部版主权限');
                          void queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : '操作失败');
                        }
                      }}
                    >
                      撤销全部
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="bg-card overflow-x-auto rounded-xl border">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">版主</TableHead>
              <TableHead>UID</TableHead>
              <TableHead>版块</TableHead>
              <TableHead className="whitespace-nowrap">任命时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(mods?.moderators ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center text-xs">
                  暂无版主任命
                </TableCell>
              </TableRow>
            ) : (
              (mods?.moderators ?? []).map((row) => (
                <TableRow key={`${row.userId}-${row.categoryId}`}>
                  <TableCell className="whitespace-nowrap">
                    <Link to={`/users/${row.username}`} className="hover:underline">
                      {row.nickname || row.username}
                    </Link>
                    <span className="text-muted-foreground ml-2 text-xs">@{row.username}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.uid}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.categoryName}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{row.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => void remove(row)}>
                      移除
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

// ---------------- 管理员配置（按 UID 授权，支持多管理员） ----------------
function AdminsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uid, setUid] = useState('');
  const [role, setRole] = useState<'admin' | 'moderator'>('admin');
  const [submitting, setSubmitting] = useState(false);
  const [adminPickedCats, setAdminPickedCats] = useState<string[]>([]);
  const { data: catsForAdmin } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
  });
  const toggleAdminCat = (id: string) =>
    setAdminPickedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'admins'],
    queryFn: () => api<{ admins: AdminStaff[]; ownerEmail: string | null }>('/api/admin/admins'),
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
          输入目标用户的 UID（注册时自动分配，管理员为 UID 1），即可授予管理员或版主权限。
          管理告警发送至 UID 1 邮箱：{data?.ownerEmail ?? '（UID 1 未设置邮箱）'}
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
                    {role === 'moderator' && (
                      <div className="flex w-full flex-wrap gap-2">
                        {(catsForAdmin?.categories ?? []).map((cat) => {
                          const picked = adminPickedCats.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleAdminCat(cat.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                            >
                              {cat.icon} {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
          <Button onClick={() => void grant()} disabled={submitting || !uid}>
            <ShieldCheck className="size-4" /> {submitting ? '授权中…' : '授权'}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <Table className="min-w-[860px]">
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
                  <TableCell className="font-mono whitespace-nowrap text-xs">{a.uid}</TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/users/${a.username}`} className="hover:text-primary">
                      {a.username}
                    </Link>
                    {a.id === user?.id && <Badge variant="secondary" className="ml-2">我</Badge>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{a.nickname}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{a.email}</TableCell>
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

// ---------------- 浏览统计 ----------------
interface ViewStats {
  totals: { today: number; yesterday: number; week: number; month: number; allTime: number };
  daily: { date: string; views: number }[];
  top: { postId: string; title: string; views: number }[];
  recent: {
    id: string;
    postId: string;
    title: string;
    country: string;
    city: string;
    colo: string;
    device: string;
    userId: string | null;
    userName: string | null;
    createdAt: string;
  }[];
}

const DEVICE_LABEL: Record<string, string> = { mobile: '手机', tablet: '平板', desktop: '电脑' };

function ViewsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'views'],
    queryFn: () => api<ViewStats>('/api/admin/views'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;

  const t = data?.totals;
  const maxDaily = Math.max(1, ...(data?.daily ?? []).map((d) => d.views));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: '今日浏览', value: t?.today ?? 0 },
          { label: '昨日浏览', value: t?.yesterday ?? 0 },
          { label: '近 7 天', value: t?.week ?? 0 },
          { label: '近 30 天', value: t?.month ?? 0 },
          { label: '累计浏览（帖子）', value: t?.allTime ?? 0 },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl border p-3">
            <div className="text-muted-foreground text-xs">{item.label}</div>
            <div className="mt-1 text-xl font-semibold">{formatNumber(item.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h3 className="text-sm font-semibold">近 14 天趋势</h3>
        <div className="mt-3 flex h-32 items-end gap-1.5">
          {(data?.daily ?? []).map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${d.date}：${d.views} 次`}>
              <span className="text-muted-foreground text-[10px] opacity-0 transition-opacity group-hover:opacity-100">{d.views}</span>
              <div
                className="bg-primary/70 group-hover:bg-primary w-full rounded-t-sm transition-colors"
                style={{ height: `${Math.max(2, (d.views / maxDaily) * 100)}%` }}
              />
              <span className="text-muted-foreground text-[9px]">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h3 className="text-sm font-semibold">近 7 天热门帖子</h3>
        {(data?.top ?? []).length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">暂无数据</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(data?.top ?? []).map((row, i) => (
              <li key={row.postId} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-5 text-xs">{i + 1}</span>
                <Link to={`/posts/${row.postId}`} className="line-clamp-1 hover:underline">
                  {row.title}
                </Link>
                <span className="text-muted-foreground ml-auto shrink-0 text-xs">{formatNumber(row.views)} 次</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">最近浏览记录（最近 50 条）</h3>
        <div className="bg-card overflow-x-auto rounded-xl border">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">时间</TableHead>
                <TableHead>帖子</TableHead>
                <TableHead className="whitespace-nowrap">访客</TableHead>
                <TableHead className="whitespace-nowrap">位置</TableHead>
                <TableHead className="whitespace-nowrap">节点</TableHead>
                <TableHead className="whitespace-nowrap">设备</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recent ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center text-xs">
                    暂无浏览记录
                  </TableCell>
                </TableRow>
              ) : (
                (data?.recent ?? []).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{v.createdAt}</TableCell>
                    <TableCell className="max-w-56 truncate text-xs">
                      <Link to={`/posts/${v.postId}`} className="hover:underline">
                        {v.title}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{v.userName ? `@${v.userName}` : '游客'}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {[v.city, v.country].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{v.colo || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{DEVICE_LABEL[v.device] ?? v.device}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ---------------- 审计日志 ----------------
function NotificationsTab() {
  const [mode, setMode] = useState<'all' | 'uid'>('all');
  const [uid, setUid] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const target: 'all' | number = mode === 'all' ? 'all' : Number(uid);
    if (mode === 'uid' && (!uid || !Number.isInteger(target as number) || (target as number) <= 0)) {
      toast.error('请输入有效的 UID');
      return;
    }
    setSending(true);
    try {
      const res = await api<{ created: number }>('/api/admin/notifications', {
        method: 'POST',
        body: { title: title.trim(), body: body.trim(), link: link.trim(), target },
      });
      toast.success(`通知已发送给 ${res.created} 位用户`);
      setTitle('');
      setBody('');
      setLink('');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card space-y-4 rounded-xl border p-4">
      <div>
        <h3 className="text-sm font-semibold">发送系统通知</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          通知会出现在用户的通知中心（系统通知）。可群发全部用户，或按 UID 定向发送。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={mode === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setMode('all')}>
          <Users className="size-4" /> 全部用户
        </Button>
        <Button variant={mode === 'uid' ? 'default' : 'outline'} size="sm" onClick={() => setMode('uid')}>
          <User className="size-4" /> 指定 UID
        </Button>
        {mode === 'uid' && (
          <Input
            value={uid}
            onChange={(e) => setUid(e.target.value.replace(/\D/g, ''))}
            placeholder="用户 UID，如 1"
            className="h-8 w-36"
            inputMode="numeric"
          />
        )}
      </div>

      <div className="space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="通知标题" maxLength={100} />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="通知正文（可选）"
          maxLength={500}
          rows={3}
        />
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="跳转链接（可选）：/posts/xxx 或 https://…"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">发送频率限制：每小时 10 次</span>
        <Button onClick={() => void send()} disabled={sending || !title.trim()}>
          <Send className="size-4" /> {sending ? '发送中…' : '发送通知'}
        </Button>
      </div>
    </div>
  );
}

function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => api<{ logs: AuditLogItem[]; pagination: Pagination }>('/api/admin/audit-logs?page=1&pageSize=50'),
  });

  return (
    <div className="bg-card rounded-xl border">
      {/* 移动端横向滑动查看，避免列内容被挤成多行 */}
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">时间</TableHead>
            <TableHead className="whitespace-nowrap">操作者</TableHead>
            <TableHead className="whitespace-nowrap">动作</TableHead>
            <TableHead className="whitespace-nowrap">目标</TableHead>
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
                <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{log.createdAt}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{log.actorName ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {log.targetType}/{(log.targetId ?? '').slice(0, 10)}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{log.detail ?? '—'}</TableCell>
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
        <TabsList className="mb-4 w-full max-w-full flex-nowrap justify-start overflow-x-auto [&>[role=tab]]:flex-none">
          <TabsTrigger value="overview">概览</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">用户</TabsTrigger>}
          <TabsTrigger value="posts">帖子</TabsTrigger>
          <TabsTrigger value="categories">分类</TabsTrigger>
          <TabsTrigger value="reports">举报</TabsTrigger>
          <TabsTrigger value="views">浏览统计</TabsTrigger>
          {isAdmin && <TabsTrigger value="notify">通知</TabsTrigger>}
          {isAdmin && <TabsTrigger value="moderators">版主</TabsTrigger>}
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
          <TabsContent value="notify">
            <NotificationsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="moderators">
            <ModeratorsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="admins">
            <AdminsTab />
          </TabsContent>
        )}
        {isModerator && (
          <TabsContent value="views">
            <ViewsTab />
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
