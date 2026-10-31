import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { API_BASE } from '@/lib/base-url';

/**
 * 站点运行时配置（GET /api/config）。
 *
 * 此前只有登录/注册页为了拿 Turnstile site key 调过一次，其余字段
 * （站点名、标语、描述、页脚、注册开关、邮箱必填）后端一直在下发但前端全部写死，
 * 导致运营在后台「服务配置 → 站点」改了也不生效。这里统一取一次，全站共享。
 */
export interface SiteConfig {
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  siteFooter: string;
  turnstileSiteKey: string | null;
  /** 是否开放注册（关闭后隐藏注册入口与注册页表单） */
  registrationEnabled: boolean;
  /** 注册是否要求邮箱 */
  emailRequired: boolean;
}

const FALLBACK: SiteConfig = {
  siteName: 'Starlr Forum',
  siteTagline: '',
  siteDescription: '运行在 Cloudflare 边缘的现代化中文社区',
  siteFooter: '',
  turnstileSiteKey: null,
  registrationEnabled: true,
  emailRequired: true,
};

let cache: SiteConfig | null = null;
let inflight: Promise<SiteConfig> | null = null;

function normalize(raw: Partial<SiteConfig> | null): SiteConfig {
  if (!raw) return FALLBACK;
  return {
    siteName: raw.siteName?.trim() || FALLBACK.siteName,
    siteTagline: raw.siteTagline?.trim() ?? '',
    siteDescription: raw.siteDescription?.trim() || FALLBACK.siteDescription,
    siteFooter: raw.siteFooter?.trim() ?? '',
    turnstileSiteKey: raw.turnstileSiteKey ?? null,
    registrationEnabled: raw.registrationEnabled !== false,
    emailRequired: raw.emailRequired !== false,
  };
}

/** 单次请求 + 模块级缓存：登录页、注册页、顶栏共用同一份配置 */
export async function loadSiteConfig(): Promise<SiteConfig> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      if (!res.ok) throw new Error(`config ${res.status}`);
      cache = normalize((await res.json()) as Partial<SiteConfig>);
    } catch {
      cache = FALLBACK;
    }
    return cache;
  })();
  return inflight;
}

const SiteConfigContext = createContext<SiteConfig>(FALLBACK);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(cache ?? FALLBACK);

  useEffect(() => {
    let alive = true;
    void loadSiteConfig().then((next) => {
      if (alive) setConfig(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext);
}

/** 站点 RSS/Atom 订阅地址（后端 /feed.xml，跨域部署时指向 API 域） */
export function feedUrl(): string {
  return `${API_BASE}/feed.xml`;
}
