import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminStaff, Category } from '@/lib/types';
import { errMsg } from './shared';

export function AdminsTab() {
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
      <div className="surface p-4">
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
                              className={`rounded-none border px-3 py-1.5 text-xs transition-colors ${picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
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

      <div className="surface">
        <Table className="min-w-215">
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
