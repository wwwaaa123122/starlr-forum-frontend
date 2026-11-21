import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCcw, SearchCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/pagination-controls';
import type { Pagination } from '@/lib/types';
import { errMsg, SEO_EVENT_LABEL, SEO_HTTP_HINT } from './shared';
import type { SeoPushLog } from './shared';

export function SeoPushesTab() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<'' | 'baidu' | 'indexnow'>('');
  const [status, setStatus] = useState<'' | 'ok' | 'failed'>('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<SeoPushLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'seo-pushes', channel, status, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), pageSize: '30' });
      if (channel) p.set('channel', channel);
      if (status) p.set('status', status);
      return api<{
        logs: SeoPushLog[];
        pagination: Pagination;
        stats: { channel: string; status: string; n: number }[];
      }>(`/api/admin/seo-pushes?${p}`);
    },
    refetchInterval: 30_000,
  });

  const retryMut = useMutation({
    mutationFn: (postId: string) => api(`/api/admin/seo-pushes/${postId}/retry`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('已重新推送');
      void qc.invalidateQueries({ queryKey: ['admin', 'seo-pushes'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const validateMut = useMutation({
    mutationFn: () => api<{ pushed: number }>('/api/admin/seo-pushes/validate-all', { method: 'POST' }),
    onSuccess: (res) => {
      toast.success(`全量校验完成：重推 ${res.pushed} 篇`);
      void qc.invalidateQueries({ queryKey: ['admin', 'seo-pushes'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const stat = (ch: string, st: string) =>
    data?.stats.find((s) => s.channel === ch && s.status === st)?.n ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['', 'baidu', 'indexnow'] as const).map((ch) => (
          <button
            key={ch || 'all'}
            onClick={() => { setChannel(ch); setPage(1); }}
            className={`rounded-none border px-3 py-1.5 text-xs transition ${
              channel === ch ? 'border-primary bg-primary/10 font-bold text-primary' : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {ch === '' ? '全部渠道' : ch === 'baidu' ? '百度' : 'IndexNow'}
          </button>
        ))}
        {(['', 'ok', 'failed'] as const).map((st) => (
          <button
            key={st || 'all'}
            onClick={() => { setStatus(st); setPage(1); }}
            className={`rounded-none border px-3 py-1.5 text-xs transition ${
              status === st ? 'border-primary bg-primary/10 font-bold text-primary' : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {st === '' ? '全部状态' : st === 'ok' ? '成功' : '失败'}
          </button>
        ))}
        <span className="flex-1" />
        <span className="text-muted-foreground text-xs">
          24h：百度 成功 {stat('baidu', 'ok')} / 失败 {stat('baidu', 'failed')} · IndexNow 成功 {stat('indexnow', 'ok')} / 失败 {stat('indexnow', 'failed')}
        </span>
        <Button size="sm" variant="outline" disabled={validateMut.isPending} onClick={() => validateMut.mutate()}>
          <SearchCheck className="size-3.5" /> 全量校验
        </Button>
      </div>

      <div className="surface overflow-x-auto">
        <Table className="min-w-215">
          <TableHeader>
            <TableRow>
              <TableHead>帖子</TableHead>
              <TableHead>渠道</TableHead>
              <TableHead>事件</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">HTTP</TableHead>
              <TableHead className="text-right">重试</TableHead>
              <TableHead>时间</TableHead>
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
              (data?.logs ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="max-w-56 truncate text-xs font-medium">
                    {l.title ? (
                      <a href={l.url} target="_blank" rel="noreferrer" className="hover:underline">{l.title}</a>
                    ) : (
                      <span className="text-muted-foreground">{l.url}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{l.channel === 'baidu' ? '百度' : 'IndexNow'}</TableCell>
                  <TableCell className="text-xs">{SEO_EVENT_LABEL[l.event] ?? l.event}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => (l.message || l.httpCode) && setDetail(l)}
                      className={`rounded-none px-2 py-0.5 text-xs font-bold ${
                        l.status === 'ok' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      } ${(l.message || l.httpCode) ? 'cursor-pointer underline-offset-2 hover:underline' : 'cursor-default'}`}
                    >
                      {l.status === 'ok' ? '成功' : '失败'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right text-xs">{l.httpCode ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs">{l.attempts > 1 ? `${l.attempts} 次` : '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{l.createdAt}</TableCell>
                  <TableCell className="text-right">
                    {l.status === 'failed' && (
                      <Button
                        size="sm" variant="ghost"
                        disabled={retryMut.isPending}
                        onClick={() => retryMut.mutate(l.postId)}
                      >
                        <RotateCcw className="size-3" /> 重试
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(data?.pagination.totalPages ?? 1) > 1 && (
        <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
      )}

      {/* 失败详情弹窗 */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>推送详情</DialogTitle>
            <DialogDescription>
              {detail?.channel === 'baidu' ? '百度主动推送' : 'IndexNow（Bing/Yandex）'}
              {' · '}{detail ? SEO_EVENT_LABEL[detail.event] ?? detail.event : ''}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              {detail.httpCode !== null && (
                <p>
                  <span className="text-muted-foreground">HTTP {detail.httpCode}</span>
                  {SEO_HTTP_HINT[detail.httpCode] && (
                    <span className="text-muted-foreground">：{SEO_HTTP_HINT[detail.httpCode]}</span>
                  )}
                </p>
              )}
              {detail.attempts > 1 && (
                <p className="text-muted-foreground">尝试 {detail.attempts} 次后失败</p>
              )}
              {detail.message && <p className="text-muted-foreground break-all">{detail.message}</p>}
              <p className="text-muted-foreground break-all text-xs">{detail.url}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
