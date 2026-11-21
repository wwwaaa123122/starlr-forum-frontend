import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Category } from '@/lib/types';
import { errMsg, SITE_WIDE } from './shared';
import type { ModeratorRow, SiteWideModerator } from './shared';

export function ModeratorsTab() {
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
      <div className="surface space-y-3 p-4">
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
            className={`rounded-none border px-3 py-1.5 text-xs transition-colors ${pickedCats.includes(SITE_WIDE) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
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
                    className={`rounded-none border px-3 py-1.5 text-xs transition-colors ${picked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                );
              })}
        </div>
      </div>

      {(mods?.siteWide ?? []).length > 0 && (
        <div className="surface overflow-x-auto">
          <Table className="min-w-160">
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

      <div className="surface overflow-x-auto">
        <Table className="min-w-160">
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
