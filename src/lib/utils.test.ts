/** lib/utils 单元测试：cn / timeAgo / formatNumber / stripMarkdown */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cn, formatNumber, stripMarkdown, timeAgo } from './utils';

afterEach(() => {
  vi.useRealTimers();
});

describe('cn（className 合并）', () => {
  it('合并多段并去重冲突类', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
  it('falsy 值被忽略', () => {
    expect(cn('flex', false && 'hidden', undefined, 'items-center')).toBe('flex items-center');
  });
});

describe('timeAgo（相对时间）', () => {
  it('空值返回空串', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
    expect(timeAgo('')).toBe('');
  });

  it('各时间档位', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));
    expect(timeAgo('2026-01-10T12:00:30Z')).toBe('刚刚'); // 未来 30s → diff<0 → 分钟 0
    expect(timeAgo('2026-01-10T11:59:30Z')).toBe('刚刚'); // 30s
    expect(timeAgo('2026-01-10T11:31:00Z')).toBe('29 分钟前');
    expect(timeAgo('2026-01-10T10:00:00Z')).toBe('2 小时前');
    expect(timeAgo('2026-01-08T12:00:00Z')).toBe('2 天前');
    expect(timeAgo('2025-12-15T12:00:00Z')).toBe('26 天前');
    expect(timeAgo('2025-11-15T12:00:00Z')).toBe('1 个月前');
    expect(timeAgo('2024-01-01T12:00:00Z')).toBe('2 年前');
  });

  it('兼容 "YYYY-MM-DD HH:MM:SS"（无 T、无 Z，按 UTC）', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));
    expect(timeAgo('2026-01-10 11:00:00')).toBe('1 小时前');
  });
});

describe('formatNumber（中文计数习惯）', () => {
  it('万位缩写 w', () => {
    expect(formatNumber(10000)).toBe('1.0w');
    expect(formatNumber(23456)).toBe('2.3w');
  });
  it('千位缩写 k', () => {
    expect(formatNumber(1000)).toBe('1.0k');
    expect(formatNumber(1500)).toBe('1.5k');
  });
  it('小于千直接返回', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(0)).toBe('0');
  });
  it('null/undefined 兜底 0', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });
});

describe('stripMarkdown（摘要纯文本）', () => {
  it('代码块被移除', () => {
    expect(stripMarkdown('前文\n```js\nconst x = 1;\n```\n后文')).toBe('前文 后文');
  });
  it('行内代码只留内容', () => {
    expect(stripMarkdown('用 `npm run dev` 启动')).toBe('用 npm run dev 启动');
  });
  it('图片转 alt、链接转文本', () => {
    expect(stripMarkdown('![头像](https://x/y.png)')).toBe('头像');
    expect(stripMarkdown('[官网](https://example.com)')).toBe('官网');
  });
  it('标题/引用/列表/强调/删除线', () => {
    const out = stripMarkdown('## 标题\n> 引用\n- 列表项\n**粗体** *斜体* ~~删除~~');
    expect(out).not.toContain('#');
    expect(out).not.toContain('>');
    expect(out).not.toContain('- 列表');
    expect(out).not.toContain('**');
    expect(out).not.toContain('~~');
    expect(out).toContain('标题');
    expect(out).toContain('粗体');
  });
  it('表格分隔符 | 被清除，多余空白折叠', () => {
    const out = stripMarkdown('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(out).not.toContain('|');
    expect(out).not.toMatch(/ {2,}/);
  });
  it('未闭合代码块也整体移除（防摘要泄露源码）', () => {
    const out = stripMarkdown('正常文字\n```js\nconst secret = 1;');
    expect(out).not.toContain('secret');
  });
});
