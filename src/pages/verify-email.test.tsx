/**
 * 未验证账号横幅：hooks 顺序回归。
 * 历史实现把 `if (!user || accountStatus !== 'unverified') return null` 放在 useEffect 之前，
 * 登录态从 null 变为「未验证」时 hook 数量变化，React 直接抛
 * "Rendered more hooks than during the previous render" → 整站白屏。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({ user: null as null | { id: string; accountStatus?: string } }));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: state.user, refreshUser: vi.fn() }),
}));

import { UnverifiedBanner } from './verify-email';

afterEach(() => {
  cleanup();
  state.user = null;
});

describe('UnverifiedBanner', () => {
  it('从未登录切到未验证账号不会触发 Hooks 顺序错误', () => {
    state.user = null;
    const { rerender } = render(<UnverifiedBanner />);
    expect(screen.queryByText(/邮箱未验证/)).toBeNull();

    state.user = { id: 'u1', accountStatus: 'unverified' };
    expect(() => rerender(<UnverifiedBanner />)).not.toThrow();
    expect(screen.getByText(/邮箱未验证/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '重新发送验证邮件' })).toBeTruthy();
  });

  it('已验证账号不渲染横幅', () => {
    state.user = { id: 'u2', accountStatus: 'active' };
    const { container } = render(<UnverifiedBanner />);
    expect(container.innerHTML).toBe('');
  });
});
