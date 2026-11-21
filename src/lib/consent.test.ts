/**
 * consent.ts 单测：同意存储、Umami 注入/撤回、事件通知。
 * jsdom 环境下 script 标签注入可真实执行。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConsent, setConsent, initConsent, loadUmami, unloadUmami, openCookieSettings } from './consent';

const UMAMI_SRC = 'https://umami.xc-lr.cn/script.js';

beforeEach(() => {
  localStorage.clear();
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  delete (window as unknown as { umami?: unknown }).umami;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getConsent', () => {
  it('无存储记录返回 null', () => {
    expect(getConsent()).toBeNull();
  });
  it('损坏 JSON 返回 null（不抛错）', () => {
    localStorage.setItem('xc.cookie-consent', '{not json');
    expect(getConsent()).toBeNull();
  });
  it('analytics 非布尔返回 null（防脏数据）', () => {
    localStorage.setItem('xc.cookie-consent', JSON.stringify({ analytics: 'yes', ts: 1 }));
    expect(getConsent()).toBeNull();
  });
  it('合法记录正常读回', () => {
    localStorage.setItem('xc.cookie-consent', JSON.stringify({ analytics: true, ts: 123 }));
    expect(getConsent()).toEqual({ analytics: true, ts: 123 });
  });
});

describe('setConsent', () => {
  it('写入并派发 xc:consent-changed 事件', () => {
    const listener = vi.fn();
    window.addEventListener('xc:consent-changed', listener);
    const c = setConsent(true);
    expect(c.analytics).toBe(true);
    expect(getConsent()?.analytics).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail.analytics).toBe(true);
  });

  it('同意 = 注入 Umami 脚本（幂等）', () => {
    setConsent(true);
    expect(document.head.querySelectorAll(`script[src="${UMAMI_SRC}"]`).length).toBe(1);
    loadUmami(); // 再次调用不重复注入
    expect(document.head.querySelectorAll(`script[src="${UMAMI_SRC}"]`).length).toBe(1);
    expect(document.querySelector(`script[src="${UMAMI_SRC}"]`)?.getAttribute('data-website-id')).toBeTruthy();
  });

  it('拒绝 = 移除脚本并清理 umami 本地数据', () => {
    setConsent(true);
    (window as unknown as { umami?: unknown }).umami = { track: () => {} };
    localStorage.setItem('umami.session', 'x');
    localStorage.setItem('unrelated', 'keep-me');
    setConsent(false);
    expect(document.querySelector(`script[src="${UMAMI_SRC}"]`)).toBeNull();
    expect((window as unknown as { umami?: unknown }).umami).toBeUndefined();
    expect(localStorage.getItem('umami.session')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep-me'); // 非统计数据不误删
  });
});

describe('initConsent', () => {
  it('已同意统计时自动注入', () => {
    localStorage.setItem('xc.cookie-consent', JSON.stringify({ analytics: true, ts: 1 }));
    initConsent();
    expect(document.querySelector(`script[src="${UMAMI_SRC}"]`)).toBeTruthy();
  });
  it('未同意/拒绝时不注入', () => {
    initConsent();
    expect(document.querySelector(`script[src="${UMAMI_SRC}"]`)).toBeNull();
    localStorage.setItem('xc.cookie-consent', JSON.stringify({ analytics: false, ts: 1 }));
    initConsent();
    expect(document.querySelector(`script[src="${UMAMI_SRC}"]`)).toBeNull();
  });
});

describe('openCookieSettings', () => {
  it('派发 xc:cookie-settings 事件', () => {
    const listener = vi.fn();
    window.addEventListener('xc:cookie-settings', listener);
    openCookieSettings();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
