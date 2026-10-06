/**
 * Cookie / 本地存储同意管理。
 *
 * 本站认证令牌存于 localStorage（xc.access / xc.refresh），属"必要"类，
 * 不需要同意；需要用户同意的是 Umami 匿名统计（自托管 umami.xc-lr.cn）。
 * 用户拒绝后不注入统计脚本，并清除 Umami 已写入的本地数据。
 */
const CONSENT_KEY = 'xc.cookie-consent';
const UMAMI_SRC = 'https://umami.xc-lr.cn/script.js';
const UMAMI_SITE_ID = '2ef1e1b4-fad2-49c2-988a-07d174c7c642';

export interface CookieConsent {
  /** 是否允许匿名统计分析（Umami） */
  analytics: boolean;
  /** 同意/变更时间 */
  ts: number;
}

export function getConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (typeof parsed.analytics !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setConsent(analytics: boolean): CookieConsent {
  const consent: CookieConsent = { analytics, ts: Date.now() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  if (analytics) loadUmami();
  else unloadUmami();
  window.dispatchEvent(new CustomEvent('xc:consent-changed', { detail: consent }));
  return consent;
}

/** 打开 Cookie 设置对话框（页脚入口用） */
export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent('xc:cookie-settings'));
}

/** 注入 Umami 统计脚本（幂等） */
export function loadUmami(): void {
  if (document.querySelector(`script[src="${UMAMI_SRC}"]`)) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = UMAMI_SRC;
  s.dataset.websiteId = UMAMI_SITE_ID;
  document.head.appendChild(s);
}

/** 移除 Umami 并清除其本地数据（撤回同意） */
export function unloadUmami(): void {
  document.querySelector(`script[src="${UMAMI_SRC}"]`)?.remove();
  const w = window as typeof window & { umami?: unknown };
  delete w.umami;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('umami.')) localStorage.removeItem(key);
  }
}

/** 应用启动时：已同意统计则注入脚本 */
export function initConsent(): void {
  const consent = getConsent();
  if (consent?.analytics) loadUmami();
}
