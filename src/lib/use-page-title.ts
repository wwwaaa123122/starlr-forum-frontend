import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteConfig } from '@/lib/site-config';

/**
 * 页面标题统一：`页面名 · 站点名`。
 * 改动前只有 legal.tsx 手动 set document.title，其余页面统一显示 "Starlr Forum"，
 * 多标签浏览历史/收藏时完全分不清。
 */
export function usePageTitle(title?: string | null) {
  const { siteName } = useSiteConfig();
  useEffect(() => {
    const name = title?.trim();
    document.title = name ? `${name} · ${siteName}` : siteName;
  }, [title, siteName]);
}

/** 路由切换回到顶部（原先只有首页翻页时手动 scrollTo，其他页面会保留上一页滚动位置） */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, search]);
  return null;
}
