import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { errMsg } from './shared';
import type { ServiceView } from './shared';

export function ServicesTab() {
  const qc = useQueryClient();
  const [testing, setTesting] = useState<string | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testAccount, setTestAccount] = useState('');
  const [mailAccounts, setMailAccounts] = useState<{ api_key: string; from: string }[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [setup, setSetup] = useState<{ registration_enabled?: boolean; registration_email_required?: boolean; uploads_storage?: string }>({});
  const [site, setSite] = useState<{ site_name?: string; site_tagline?: string; site_description?: string; site_footer?: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => api<{ services: ServiceView[] }>('/api/admin/services'),
  });

  const { data: setupData } = useQuery({
    queryKey: ['admin', 'setup'],
    queryFn: () => api<{ setup: typeof setup }>('/api/admin/services/setup'),
  });

  const { data: siteData } = useQuery({
    queryKey: ['admin', 'site'],
    queryFn: () => api<{ site: typeof site }>('/api/admin/services/site'),
  });

  // 邮件账号池初始化
  const services = data?.services ?? [];
  const mailSvc = services.find((s) => s.key === 'mail');
  useState(() => {
    if (mailSvc?.accounts && mailAccounts.length === 0 && mailSvc.accounts.length > 0) {
      setMailAccounts(mailSvc.accounts.filter((a) => a.source !== 'env').map(() => ({ api_key: '', from: '' })));
    }
    return null;
  });
  useState(() => {
    if (setupData?.setup && setup.registration_enabled === undefined) setSetup(setupData.setup);
    if (siteData?.site && site.site_name === undefined) setSite(siteData.site);
    return null;
  });

  const saveMut = useMutation({
    mutationFn: ({ key, body }: { key: string; body: unknown }) =>
      api<{ service: ServiceView }>(`/api/admin/services/${key}`, { method: 'PUT', body }),
    onSuccess: (_res, v) => {
      toast.success('已保存');
      void qc.invalidateQueries({ queryKey: ['admin', 'services'] });
      if (v.key === 'mail') setMailAccounts((a) => a.map((x) => ({ ...x, api_key: '' })));
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (key: string) => api(`/api/admin/services/${key}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('已清空，回退到环境变量兜底');
      void qc.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const testMut = useMutation({
    mutationFn: ({ key, body }: { key: string; body?: unknown }) =>
      api<{ ok: boolean; message?: string; success?: number }>(`/api/admin/services/${key}/test`, { method: 'POST', body }),
    onSuccess: (res) => {
      setTesting(null);
      toast[res.ok === false ? 'error' : 'success'](res.message ?? `成功（推送 ${res.success ?? '—'} 条）`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const setupMut = useMutation({
    mutationFn: () => api<{ setup: typeof setup }>('/api/admin/services/setup', { method: 'PATCH', body: setup }),
    onSuccess: () => {
      toast.success('已保存');
      void qc.invalidateQueries({ queryKey: ['admin', 'setup'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const siteMut = useMutation({
    mutationFn: () => api<{ site: typeof site }>('/api/admin/services/site', { method: 'PATCH', body: site }),
    onSuccess: () => {
      toast.success('已保存');
      void qc.invalidateQueries({ queryKey: ['admin', 'site'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const setValue = (svcKey: string, field: string, v: string) =>
    setValues((s) => ({ ...s, [svcKey]: { ...s[svcKey], [field]: v } }));

  return (
    <div className="space-y-4">
      {services.map((svc) => (
        <div key={svc.key} className="surface space-y-3 p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{svc.label}</h3>
            <Badge variant={svc.configured ? 'default' : 'outline'}>{svc.configured ? '已配置' : '未配置'}</Badge>
            <span className="flex-1" />
            <Button
              size="sm" variant="outline" disabled={testMut.isPending}
              onClick={() => setTesting(testing === svc.key ? null : svc.key)}
            >
              测试连通
            </Button>
            <Button
              size="sm" variant="ghost" disabled={deleteMut.isPending}
              onClick={() => { if (confirm(`清空 ${svc.label} 的后台配置？将回退到环境变量。`)) deleteMut.mutate(svc.key); }}
            >
              清空
            </Button>
          </div>

          {/* 邮件：账号池 */}
          {svc.key === 'mail' && (
            <div className="space-y-2">
              {(svc.accounts ?? []).map((a, i) => (
                <div key={i} className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Badge variant="outline">{a.source === 'env' ? 'env 兜底' : `账号 ${i + 1}`}</Badge>
                  <span className="font-mono">{a.from}</span>
                  <span>{a.api_key_masked}</span>
                </div>
              ))}
              {mailAccounts.map((acc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="发件账号 api_key（留空 = 保持不变）"
                    value={acc.api_key}
                    onChange={(e) => setMailAccounts((a) => a.map((x, j) => (j === i ? { ...x, api_key: e.target.value } : x)))}
                    className="flex-1 font-mono text-xs"
                  />
                  <Input
                    placeholder="显示名 <no-reply@example.com>"
                    value={acc.from}
                    onChange={(e) => setMailAccounts((a) => a.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))}
                    className="flex-1 text-xs"
                  />
                  <Button size="sm" variant="ghost" onClick={() => setMailAccounts((a) => a.filter((_, j) => j !== i))}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setMailAccounts((a) => [...a, { api_key: '', from: '' }])}>
                  <Plus className="size-3.5" /> 添加账号
                </Button>
                <Button
                  size="sm" disabled={saveMut.isPending}
                  onClick={() => saveMut.mutate({ key: 'mail', body: { accounts: mailAccounts } })}
                >
                  保存账号池
                </Button>
              </div>
            </div>
          )}

          {/* 其它服务：平铺字段 */}
          {svc.key !== 'mail' && (
            <div className="space-y-2">
              {(svc.fields ?? []).map((f) => (
                <div key={f.name} className="flex items-center gap-2">
                  <Label className="w-44 shrink-0 text-xs">{f.label}</Label>
                  <Input
                    type={f.secret ? 'password' : 'text'}
                    placeholder={f.value ? `已配置（••••${f.value.slice(-4)}）` : f.placeholder}
                    value={values[svc.key]?.[f.name] ?? ''}
                    onChange={(e) => setValue(svc.key, f.name, e.target.value)}
                    className="text-xs"
                  />
                </div>
              ))}
              <Button
                size="sm" disabled={saveMut.isPending || Object.keys(values[svc.key] ?? {}).length === 0}
                onClick={() => saveMut.mutate({ key: svc.key, body: { values: values[svc.key] } })}
              >
                保存
              </Button>
            </div>
          )}

          {/* 测试面板 */}
          {testing === svc.key && (
            <div className="bg-muted/50 space-y-2 rounded-none border p-3">
              {svc.key === 'mail' && (
                <>
                  <div className="flex items-center gap-2">
                    <Input placeholder="测试收件邮箱" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="flex-1 text-xs" />
                    <Input placeholder="发件账号序号（留空轮询）" value={testAccount} onChange={(e) => setTestAccount(e.target.value)} className="w-44 text-xs" />
                  </div>
                  <Button
                    size="sm" disabled={testMut.isPending || !testTo.trim()}
                    onClick={() => testMut.mutate({ key: 'mail', body: { to: testTo.trim(), ...(testAccount.trim() ? { account: Number(testAccount) } : {}) } })}
                  >
                    发送测试邮件
                  </Button>
                </>
              )}
              {svc.key !== 'mail' && (
                <Button size="sm" disabled={testMut.isPending} onClick={() => testMut.mutate({ key: svc.key })}>
                  {svc.key === 'seo' ? '检测主域可达性' : svc.key === 'oauth-github' ? '检查凭据格式' : '测试连接'}
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* 初始化配置 */}
      <div className="surface space-y-3 p-4">
        <h3 className="text-sm font-semibold">初始化配置</h3>
        <div className="flex items-center justify-between">
          <Label className="text-xs">开放注册</Label>
          <Switch checked={setup.registration_enabled ?? true} onCheckedChange={(v) => setSetup((s) => ({ ...s, registration_enabled: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">注册必须邮箱验证</Label>
          <Switch checked={setup.registration_email_required ?? true} onCheckedChange={(v) => setSetup((s) => ({ ...s, registration_email_required: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">附件存储</Label>
          <Select value={setup.uploads_storage ?? 'r2'} onValueChange={(v) => setSetup((s) => ({ ...s, uploads_storage: v }))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="r2">R2</SelectItem>
              <SelectItem value="s3">S3 兼容</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" disabled={setupMut.isPending} onClick={() => setupMut.mutate()}>保存</Button>
      </div>

      {/* 站点信息 */}
      <div className="surface space-y-3 p-4">
        <h3 className="text-sm font-semibold">站点信息</h3>
        {([['site_name', '站点名称'], ['site_tagline', '标语'], ['site_description', '站点描述'], ['site_footer', '页脚文案']] as const).map(([k, label]) => (
          <div key={k} className="flex items-center gap-2">
            <Label className="w-24 shrink-0 text-xs">{label}</Label>
            {k === 'site_description' ? (
              <Textarea
                value={site[k] ?? ''} rows={2}
                onChange={(e) => setSite((s) => ({ ...s, [k]: e.target.value }))}
                className="text-xs"
              />
            ) : (
              <Input
                value={site[k] ?? ''}
                onChange={(e) => setSite((s) => ({ ...s, [k]: e.target.value }))}
                className="text-xs"
              />
            )}
          </div>
        ))}
        <Button size="sm" disabled={siteMut.isPending} onClick={() => siteMut.mutate()}>保存</Button>
      </div>
    </div>
  );
}

// ---------------- SSO 登录同步 ----------------
