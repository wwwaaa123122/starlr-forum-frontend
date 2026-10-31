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

let scriptLoading = false;

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    window.onTurnstileLoad = () => resolve();
    if (!scriptLoading) {
      scriptLoading = true;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
      script.async = true;
      script.onerror = () => reject(new Error('Turnstile 加载失败'));
      document.head.appendChild(script);
    }
  });
}

interface TurnstileProps {
  siteKey: string | null;
  onToken: (token: string) => void;
}

export function Turnstile({ siteKey, onToken }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        setVisible(true);
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
        });
      })
      .catch(() => {
        /* 脚本加载失败：不阻塞表单，后端会再次校验 */
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
