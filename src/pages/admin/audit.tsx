import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/pagination-controls';
import type { AuditLogItem, Pagination } from '@/lib/types';
import { errMsg } from './shared';

export function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => api<{ logs: AuditLogItem[]; pagination: Pagination }>('/api/admin/audit-logs?page=1&pageSize=50'),
  });

  return (
    <div className="surface">
      {/* 移动端横向滑动查看，避免列内容被挤成多行 */}
      <Table className="min-w-225">
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
