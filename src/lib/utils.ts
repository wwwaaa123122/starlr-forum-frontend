import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  // 兼容 "YYYY-MM-DD HH:MM:SS"（UTC）
  const date = iso.includes('T') ? new Date(iso + (iso.endsWith('Z') ? '' : 'Z')) : new Date(iso.replace(' ', 'T') + 'Z');
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

export function formatNumber(n: number | undefined | null): string {
  const v = n ?? 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}w`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

/** 去除 Markdown 语法，得到适合摘要的纯文本（列表/标题/代码/链接/图片/强调等） */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?(```|$)/g, ' ') // 代码块
    .replace(/`([^`]*)`/g, '$1') // 行内代码
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片 → alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 文本
    .replace(/^#{1,6}\s+/gm, '') // 标题
    .replace(/^\s*>\s?/gm, '') // 引用
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, '') // 列表标记
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // 粗体
    .replace(/(\*|_)(.*?)\1/g, '$2') // 斜体
    .replace(/~~(.*?)~~/g, '$1') // 删除线
    .replace(/\|/g, ' ') // 表格分隔符
    .replace(/\s*\n\s*/g, ' ') // 换行 → 空格
    .replace(/\s{2,}/g, ' ')
    .trim();
}
