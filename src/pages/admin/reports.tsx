import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PaginationControls } from '@/components/pagination-controls';
import type { Pagination, ReportItem } from '@/lib/types';
import { errMsg } from './shared';

export function ReportsTab() {
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
        ) : ((data?.reports?.length ?? 0)) === 0 ? (
          <p className="text-muted-foreground surface px-4 py-10 text-center text-sm">没有举报记录</p>
        ) : (
          (data!.reports ?? []).map((r) => (
            <div key={r.id} className="surface p-4">
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
              <div className="bg-muted/40 mt-2 rounded-none border p-3">
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
