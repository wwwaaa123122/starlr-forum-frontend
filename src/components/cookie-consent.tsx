import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getConsent, setConsent, openCookieSettings, type CookieConsent } from '@/lib/consent';

/**
 * Cookie 同意横幅 + 设置对话框。
 * 首次访问在底部展示；页脚「Cookie 设置」可随时重新打开调整。
 * 必要类（登录会话、安全）始终开启；统计类（Umami 匿名统计）可自由开关。
 */
export function CookieConsent() {
  const [consent, setConsentState] = useState<CookieConsent | null>(() => getConsent());
  const [bannerOpen, setBannerOpen] = useState(() => getConsent() === null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analytics, setAnalytics] = useState(() => getConsent()?.analytics ?? true);

  useEffect(() => {
    const onOpen = () => {
      setAnalytics(getConsent()?.analytics ?? true);
      setDialogOpen(true);
    };
    const onChanged = (e: Event) => setConsentState((e as CustomEvent<CookieConsent>).detail);
    window.addEventListener('xc:cookie-settings', onOpen);
    window.addEventListener('xc:consent-changed', onChanged);
    return () => {
      window.removeEventListener('xc:cookie-settings', onOpen);
      window.removeEventListener('xc:consent-changed', onChanged);
    };
  }, []);

  const accept = (allowAnalytics: boolean) => {
    setConsent(allowAnalytics);
    setConsentState({ analytics: allowAnalytics, ts: Date.now() });
    setBannerOpen(false);
    setDialogOpen(false);
    toast.success('已保存');
  };

  return (
    <>
      {bannerOpen && consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="surface mx-auto max-w-3xl p-4 shadow-sm">
            <div className="flex gap-3">
              <Cookie className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">我们使用 Cookie 与本地存储</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => accept(true)}>
                    全部接受
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                    自定义
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => accept(false)}>
                    仅必要
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie 设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm">必要（始终开启）</Label>
              </div>
              <Switch checked disabled aria-label="必要 Cookie 始终开启" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="consent-analytics" className="text-sm">统计分析</Label>
              </div>
              <Switch id="consent-analytics" checked={analytics} onCheckedChange={setAnalytics} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => accept(false)}>
              仅必要
            </Button>
            <Button size="sm" onClick={() => accept(analytics)}>
              保存选择
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { openCookieSettings };
