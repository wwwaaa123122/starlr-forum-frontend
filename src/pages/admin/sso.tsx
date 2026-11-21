import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { errMsg } from './shared';

export function SsoTab() {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [origins, setOrigins] = useState('');
  const inited = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sso'],
    queryFn: () => api<{ enabled: boolean; origins: string[]; source: string; events: { id: string; detail: string; ip: string | null; createdAt: string; actorName: string | null }[] }>('/api/admin/sso/config'),
  });

  if (data && !inited.current) {
    inited.current = true;
    setEnabled(data.enabled);
    setOrigins(data.origins.join('\n'));
  }

  const saveMut = useMutation({
    mutationFn: () => api('/api/admin/sso/config', {
      method: 'PUT',
      body: { enabled, origins: origins.split('\n').map((s) => s.trim()).filter(Boolean) },
    }),
    onSuccess: () => {
      toast.success('已保存');
      void qc.invalidateQueries({ queryKey: ['admin', 'sso'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="surface space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">SSO 登录同步</h3>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div>
          <Label className="text-xs">允许的站点源（每行一个，http/https 不带路径，最多 50 个）</Label>
          <Textarea value={origins} rows={4} onChange={(e) => setOrigins(e.target.value)} className="mt-1 font-mono text-xs" />
        </div>
        <Button size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>保存</Button>
      </div>

      <div className="surface">
        <div className="text-muted-foreground border-b px-4 py-2 text-xs">最近同步（20 条）</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.events ?? []).map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{ev.createdAt}</TableCell>
                <TableCell className="text-xs">{ev.actorName ?? '—'}</TableCell>
                <TableCell className="text-xs">{(() => { try { return JSON.parse(ev.detail || '{}').origin ?? ev.detail; } catch { return ev.detail; } })()}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{ev.ip ?? '—'}</TableCell>
              </TableRow>
            ))}
            {(data?.events.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={4} className="text-muted-foreground py-6 text-center text-xs">暂无同步记录</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- 主页面 ----------------
