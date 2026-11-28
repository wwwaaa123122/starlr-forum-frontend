/**
 * Cloudflare Turnstile 组件（反机器人）。
 * 按需加载脚本，渲染在容器内；site key 未配置时自动隐藏（本地开发）。
 */
import { useEffect, useRef, useState } from 'react';
import { loadSiteConfig } from '@/lib/site-config';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

let scriptLoading: Promise<void> | null = null;

/** 脚本只加载一次；失败时清空缓存，让下一次调用可以重试（历史实现失败后永久挂起） */
function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise<void>((resolve, reject) => {
    window.onTurnstileLoad = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
    script.async = true;
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error('Turnstile 加载失败'));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

interface TurnstileProps {
  siteKey: string | null;
  onToken: (token: string) => void;
}

export function Turnstile({ siteKey, onToken }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        setVisible(true);
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          language: 'zh-cn',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
        });
      })
      .catch(() => {
        // 脚本加载失败（广告拦截/网络）：给出可见提示，否则用户只会看到「人机校验失败」
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  if (failed) {
    return (
      <p className="text-destructive text-xs" role="alert">
        人机验证组件加载失败，请检查网络/广告拦截后刷新页面重试。
      </p>
    );
  }

  return (
    <div className={visible ? '' : 'hidden'}>
      <div ref={containerRef} />
    </div>
  );
}

/** 获取站点 Turnstile site key（复用 lib/site-config 的 /api/config 缓存） */
export async function fetchSiteConfig(): Promise<{ turnstileSiteKey: string | null }> {
  const { turnstileSiteKey } = await loadSiteConfig();
  return { turnstileSiteKey };
}
