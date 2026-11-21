/**
 * site-config 单测：单次请求缓存、失败兜底、字段归一化。
 * 模块级 cache/inflight 无重置钩子 → 每用例 vi.resetModules() 动态 import，
 * 同时这也验证真实生产环境的单例语义（多调用方共享同一份请求与缓存）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FetchHandler = (input: string, init?: RequestInit) => Response | Promise<Response>;
let fetchHandler: FetchHandler = () => new Response('{}', { status: 200 });
vi.stubGlobal('fetch', ((input: string, init?: RequestInit) => fetchHandler(String(input), init)) as typeof fetch);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const MOD = '@/lib/site-config';

async function load() {
  return import(MOD);
}

beforeEach(() => {
  vi.resetModules();
  fetchHandler = () => jsonResponse(200, {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSiteConfig', () => {
  it('成功拉取：字段原样透传', async () => {
    const { loadSiteConfig } = await load();
    fetchHandler = () =>
      jsonResponse(200, {
        siteName: '测试站',
        siteTagline: '标语',
        siteDescription: '描述',
        siteFooter: '页脚',
        turnstileSiteKey: '0xabc',
        registrationEnabled: false,
        emailRequired: false,
      });
    const cfg = await loadSiteConfig();
    expect(cfg.siteName).toBe('测试站');
    expect(cfg.turnstileSiteKey).toBe('0xabc');
    expect(cfg.registrationEnabled).toBe(false);
    expect(cfg.emailRequired).toBe(false);
  });

  it('并发调用共享同一次请求（inflight 去重）', async () => {
    const { loadSiteConfig } = await load();
    let calls = 0;
    fetchHandler = () => {
      calls++;
      return jsonResponse(200, { siteName: 'x' });
    };
    const [a, b, c] = await Promise.all([loadSiteConfig(), loadSiteConfig(), loadSiteConfig()]);
    expect(calls).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c); // 同一对象引用
  });

  it('模块级缓存：第二次调用不再发请求', async () => {
    const { loadSiteConfig } = await load();
    let calls = 0;
    fetchHandler = () => {
      calls++;
      return jsonResponse(200, { siteName: 'x' });
    };
    await loadSiteConfig();
    await loadSiteConfig();
    expect(calls).toBe(1);
  });

  it('接口失败 → 兜底 FALLBACK（注册默认开放）', async () => {
    const { loadSiteConfig } = await load();
    fetchHandler = () => jsonResponse(500, {});
    const cfg = await loadSiteConfig();
    expect(cfg.siteName).toBe('Starlr Forum');
    expect(cfg.registrationEnabled).toBe(true);
    expect(cfg.turnstileSiteKey).toBeNull();
  });

  it('字段归一化：空串站点名回退默认；缺字段补默认', async () => {
    const { loadSiteConfig } = await load();
    fetchHandler = () => jsonResponse(200, { siteName: '   ', registrationEnabled: undefined });
    const cfg = await loadSiteConfig();
    expect(cfg.siteName).toBe('Starlr Forum');
    expect(cfg.registrationEnabled).toBe(true);
  });

  it('registrationEnabled: false 保留（显式关闭注册）', async () => {
    const { loadSiteConfig } = await load();
    fetchHandler = () => jsonResponse(200, { registrationEnabled: false });
    const cfg = await loadSiteConfig();
    expect(cfg.registrationEnabled).toBe(false);
  });

  it('emailRequired: false 保留', async () => {
    const { loadSiteConfig } = await load();
    fetchHandler = () => jsonResponse(200, { emailRequired: false });
    const cfg = await loadSiteConfig();
    expect(cfg.emailRequired).toBe(false);
  });
});

describe('SiteConfigProvider', () => {
  it('初始渲染 FALLBACK → 拉取完成后更新', async () => {
    const { SiteConfigProvider, useSiteConfig } = await load();
    fetchHandler = () => jsonResponse(200, { siteName: '更新后的站名' });
    let shown = '';
    function Probe() {
      shown = useSiteConfig().siteName;
      return null;
    }
    const { render } = await import('@testing-library/react');
    render(
      <SiteConfigProvider>
        <Probe />
      </SiteConfigProvider>,
    );
    // 初始为兜底值，随后异步更新
    expect(shown).toBe('Starlr Forum');
    await vi.waitFor(() => expect(shown).toBe('更新后的站名'));
  });
});

describe('feedUrl', () => {
  it('拼接 API 基址', async () => {
    const { feedUrl } = await load();
    expect(feedUrl()).toBe('/feed.xml'); // 同源模式
  });
});
