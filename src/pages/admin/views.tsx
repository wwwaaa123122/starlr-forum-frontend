import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DEVICE_LABEL } from './shared';
import type { ViewStats } from './shared';

export function ViewsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'views'],
    queryFn: () => api<ViewStats>('/api/admin/views'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-72 w-full rounded-none" />;

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
          <div key={item.label} className="surface p-3">
            <div className="text-muted-foreground text-xs">{item.label}</div>
            <div className="mt-1 text-xl font-semibold">{formatNumber(item.value)}</div>
          </div>
        ))}
      </div>

      <div className="surface p-4">
        <h3 className="text-sm font-semibold">近 14 天趋势</h3>
        <div className="mt-3 flex h-32 items-end gap-1.5">
          {(data?.daily ?? []).map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${d.date}：${d.views} 次`}>
              <span className="text-muted-foreground text-[10px] opacity-0 transition-opacity group-hover:opacity-100">{d.views}</span>
              <div
                className="bg-primary/70 group-hover:bg-primary w-full rounded-none transition-colors"
                style={{ height: `${Math.max(2, (d.views / maxDaily) * 100)}%` }}
              />
              <span className="text-muted-foreground text-xs">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="surface p-4">
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
        <div className="surface overflow-x-auto">
          <Table className="min-w-190">
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
