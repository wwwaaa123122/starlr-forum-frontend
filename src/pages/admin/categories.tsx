import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryIcon } from '@/components/category-icon';
import type { Category } from '@/lib/types';
import { errMsg } from './shared';
import { IconPicker } from './icon-picker';

export function CategoriesTab() {
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
      <div className="surface">
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
        <Table className="min-w-130">
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
        <div className="surface space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
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
