import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCcw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminPost, Pagination } from '@/lib/types';
import { errMsg } from './shared';

export function PostsTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('normal');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'posts', status],
    queryFn: () =>
      api<{ posts: AdminPost[]; pagination: Pagination }>(`/api/admin/posts?page=1&pageSize=30&status=${status}`),
  });

  // 分类列表（移动分类下拉的数据源）
  const { data: catsData } = useQuery({
    queryKey: ['admin', 'categories-for-move'],
    queryFn: () => api<{ categories: { id: string; name: string }[] }>('/api/categories'),
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

  const moveMutation = useMutation({
    mutationFn: ({ postId, categoryId }: { postId: string; categoryId: string }) =>
      api(`/api/admin/posts/${postId}/category`, { method: 'PATCH', body: { categoryId } }),
    onSuccess: () => {
      toast.success('分类已移动');
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

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

      <div className="surface">
        <Table className="min-w-160">
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
                  <TableCell className="whitespace-nowrap text-xs">
                    {p.isDeleted ? (
                      p.categoryName
                    ) : (
                      <Select
                        value={p.categoryId}
                        onValueChange={(v) => {
                          if (v !== p.categoryId) moveMutation.mutate({ postId: p.id, categoryId: v });
                        }}
                        disabled={moveMutation.isPending}
                      >
                        {/* 触发器文字自算（不依赖 Radix SelectValue：value 命中但
                            SelectContent 未挂载时 SelectValue 渲染为空——即
                            「未展开时框空白」的根因）。展开后由 SelectItem 接管高亮 */}
                        <SelectTrigger size="sm" className="h-7 w-32 text-xs" aria-label="移动分类" title={p.categoryName}>
                          <span className="truncate">
                            {(catsData?.categories ?? []).find((c) => c.id === p.categoryId)?.name ?? p.categoryName}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {(catsData?.categories ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
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
