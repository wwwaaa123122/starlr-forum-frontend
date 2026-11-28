/**
 * CSP 与静态资源的契约测试。
 *
 * public/_headers 里的 CSP 是 `script-src 'self' https://challenges.cloudflare.com https://umami.xc-lr.cn`，
 * 没有 'unsafe-inline' —— 任何内联 <script> 或 on* 事件属性都会被浏览器直接拦截。
 * 历史问题：app-auth.html（App 登录桥接页）与 index.html（主题初始化）都用了内联脚本，
 * 生产环境被 CSP 拦截 → 桥接页按钮全部失灵、深色模式闪白。
 *
 * 现在 App 登录桥接页已迁移为 React 路由（src/pages/app-auth.tsx），不再有静态 app-auth.html/js；
 * 本测试继续固化「public 下静态 HTML 只能引用外置脚本」以及「主题初始化脚本必须外置」。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// vitest 的 cwd 是前端仓库根目录
const publicDir = `${resolve(process.cwd(), 'public')}/`;
const htmlFiles = readdirSync(publicDir).filter((f) => f.endsWith('.html'));

describe('静态 HTML 不依赖内联脚本（CSP script-src 无 unsafe-inline）', () => {
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

  it('主题初始化脚本已外置', () => {
    expect(readFileSync(publicDir + 'theme-init.js', 'utf8')).toContain('xc-theme');
  });

  it('App 登录桥接页已迁移为 React 路由，不再有静态 app-auth.html/js', () => {
    expect(existsSync(publicDir + 'app-auth.html')).toBe(false);
    expect(existsSync(publicDir + 'app-auth.js')).toBe(false);
  });
});
