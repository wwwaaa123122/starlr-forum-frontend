/**
 * CSP 与静态 HTML 的契约测试。
 *
 * public/_headers 里的 CSP 是 `script-src 'self' https://challenges.cloudflare.com https://umami.xc-lr.cn`，
 * 没有 'unsafe-inline' —— 任何内联 <script> 或 on* 事件属性都会被浏览器直接拦截。
 * 历史问题：app-auth.html（App 登录桥接页）与 index.html（主题初始化）都用了内联脚本，
 * 生产环境被 CSP 拦截 → 桥接页按钮全部失灵、深色模式闪白。
 *
 * 本测试固化「静态 HTML 只能引用外置脚本」这条约束，防止有人再把脚本写回 HTML。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// vitest 的 cwd 是前端仓库根目录
const publicDir = `${resolve(process.cwd(), 'public')}/`;
const htmlFiles = readdirSync(publicDir).filter((f) => f.endsWith('.html'));

describe('静态 HTML 不依赖内联脚本（CSP script-src 无 unsafe-inline）', () => {
  it('存在待检查的 HTML 文件', () => {
    expect(htmlFiles.length).toBeGreaterThan(0);
  });

  for (const file of htmlFiles) {
    it(`${file} 不含内联 <script> 与 on* 事件属性`, () => {
      const html = readFileSync(publicDir + file, 'utf8');
      const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
        .map((m) => m[1].trim())
        .filter(Boolean);
      expect(inline).toEqual([]);
      expect(html).not.toMatch(/\son[a-z]+\s*=\s*["']/i);
    });
  }

  it('_headers 的 script-src 不包含 unsafe-inline', () => {
    const headers = readFileSync(publicDir + '_headers', 'utf8');
    const scriptSrc = /script-src([^;]*)/i.exec(headers)?.[1] ?? '';
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('主题初始化脚本与 App 桥接脚本已外置', () => {
    expect(readFileSync(publicDir + 'theme-init.js', 'utf8')).toContain('xc-theme');
    expect(readFileSync(publicDir + 'app-auth.js', 'utf8')).toContain('app-login');
  });
});
