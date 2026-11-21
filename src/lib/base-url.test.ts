/** lib/base-url 单测：assetUrl 的相对路径拼接与安全边界 */
import { describe, expect, it } from 'vitest';
import { assetUrl, API_BASE, isCrossOrigin } from './base-url';

describe('assetUrl', () => {
  it('falsy 输入返回 undefined', () => {
    expect(assetUrl(null)).toBeUndefined();
    expect(assetUrl(undefined)).toBeUndefined();
    expect(assetUrl('')).toBeUndefined();
  });

  it('站内相对路径拼 API 基址', () => {
    const out = assetUrl('/api/files/abc');
    // 测试环境 VITE_API_BASE 未设置 → 同源（空串），原样返回
    expect(out).toBe('/api/files/abc');
  });

  it('协议相对路径 // 原样返回（防 open redirect 类拼接）', () => {
    expect(assetUrl('//evil.com/x.png')).toBe('//evil.com/x.png');
  });

  it('完整 http(s) URL 原样返回', () => {
    expect(assetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });

  it('非 / 开头的相对路径原样返回', () => {
    expect(assetUrl('images/a.png')).toBe('images/a.png');
  });
});

describe('部署模式标记', () => {
  it('测试环境未设置 VITE_API_BASE → 同源模式', () => {
    expect(API_BASE).toBe('');
    expect(isCrossOrigin).toBe(false);
  });
});
