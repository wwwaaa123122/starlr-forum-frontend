/**
 * 注册页同意条款：必须是原生 checkbox（label 点击可切换）。
 * 历史实现用 Radix Switch 包在 <label> 里：点击文字不会切换（label 只关联表单控件），
 * 用户以为勾了却仍未勾选，提交时只看到一句 toast 提示。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ register: vi.fn(async () => undefined) }));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ register: mocks.register, user: null }),
}));

vi.mock('@/lib/site-config', () => ({
  useSiteConfig: () => ({ siteName: '测试站', registrationEnabled: true, emailRequired: true }),
}));

vi.mock('@/components/turnstile', () => ({
  Turnstile: () => null,
  fetchSiteConfig: async () => ({ turnstileSiteKey: null }),
}));

import { RegisterPage } from './register';

afterEach(() => {
  cleanup();
  mocks.register.mockClear();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

describe('注册页同意条款', () => {
  it('是原生 checkbox，点击文字即可勾选', async () => {
    const user = userEvent.setup();
    renderPage();
    const box = screen.getByRole('checkbox', { name: /同意用户协议与隐私政策/ }) as HTMLInputElement;
    expect(box.checked).toBe(false);

    await user.click(screen.getByText(/我已阅读并同意/));
    expect(box.checked).toBe(true);
  });

  it('未勾选同意时不发起注册请求', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('用户名'), 'tester');
    await user.type(screen.getByLabelText('邮箱'), 'tester@example.com');
    await user.type(screen.getByLabelText('密码'), 'TestPass2026!');
    await user.type(screen.getByLabelText('确认密码'), 'TestPass2026!');
    await user.click(screen.getByRole('button', { name: '注册' }));
    expect(mocks.register).not.toHaveBeenCalled();
  });
});
