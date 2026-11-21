import { useQuery } from '@tanstack/react-query';
import { Ban, Eye, FileText, Flag, Link, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { errMsg } from './shared';
import type { AdminStats } from './shared';

export function StatCards() {
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
        <div key={label} className="surface flex items-center gap-3 p-4">
          <div className="bg-primary/10 text-primary rounded-none p-2">
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
      <div className="surface">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">浏览量排行</h3>
          <span className="text-muted-foreground text-xs">Top 10</span>
        </div>
        <Table className="min-w-130">
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
