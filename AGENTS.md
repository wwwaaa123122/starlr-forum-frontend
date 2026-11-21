# AGENTS.md — frontend（经典版前端，frontend.182030.xyz）

React 19 + Vite 7 + TypeScript + Tailwind v4 + shadcn/ui（Radix）+ TanStack Query v5 的原始 Web 前端。

## 状态：已重启上线（2026-10-30）

- Worker `forum-frontend-classic`（`../backend/wrangler.frontend-classic.jsonc`）托管 `dist-f/`，域名 **frontend.182030.xyz**（custom_domain）。
- 零数据绑定，浏览器跨域直连 `forum-backend`（i.182030.xyz）；CORS/OAuth 白名单已在 backend 放行本域名。
- 全站 UI 直角（--radius: 0 + rounded-none）；管理后台含「推送记录」Tab（SEO 推送接口配置界面）。
- 构建跨域产物：`VITE_API_BASE=https://i.182030.xyz npm run build:frontend` → dist-f/（勿提交，已 gitignore）。

## 命令

```bash
npm run dev          # Vite @ :5173（API 代理 :8787）
npm run build        # tsc -b && vite build → dist/（本地 dev 用）
VITE_API_BASE=https://i.182030.xyz npm run build:frontend   # → dist-f/（frontend.182030.xyz 部署产物）
npm run typecheck
npm test             # vitest（91 用例）
```

## 代码地图

```
src/
  lib/api.ts         # api<T>()：Bearer 注入 + 401 刷新重试（refreshToken 存 localStorage）
  lib/auth.tsx       # AuthProvider（与 frontend-x 思路相同，实现较老）
  lib/site-config.tsx    # /api/config 单次拉取 + 全站共享（站点名/页脚/注册开关/Turnstile key）
  lib/use-page-title.ts  # usePageTitle（`页面 · 站点名`）+ ScrollToTop
  lib/image-compress.ts   # 上传压缩的最初实现（X 前端同款逻辑）
  lib/consent.ts     # Cookie 同意 + Umami 统计
  components/layout/page.tsx      # PageContainer / PageHeader / PageSection / PageMessage（全站页面骨架）
  components/layout/auth-shell.tsx# 登录注册类页面外壳
  components/ui/list-skeleton.tsx # 列表骨架屏
  components/        # category-icon / cookie-consent / image-upload-button /
                     # markdown / mention-textarea / layout …
  pages/admin/       # 管理后台模块（index.tsx 路由壳 + 14 个 Tab 各自独立文件
                     #   + icon-picker + shared.ts 共享类型，原 2372 行单文件已拆分）
  pages/settings/    # 设置页子组件（sessions-card / password-card / security-card）
  pages/             # home categories post-detail post-editor login register
                     # forgot-password reset-password settings user notifications
                     # search my-lists legal not-found
```

## 设计系统（2026-10-31 统一改造）

- **卡片只有一个入口**：`.surface`（`index.css` 的 `@layer components`，= `border + bg-card`）。
  页面里不要再手写 `bg-card rounded-none border`；交互卡片用 `.surface-interactive`，列表行用 `.row-interactive`。
- **页面骨架只有一套**：`PageContainer`（四档宽度 `wide/default/narrow/md/auth` + 统一 `px-4 py-6`）+ `PageHeader`。
  新增页面不要再写 `mx-auto max-w-* px-4 py-*`。
- **状态三件套**：`PageMessage`（空/错误/无权限，带可选操作）、`ListSkeleton`（列表骨架）、`Button loading`（提交态）。
- **语义色**：`success` / `warning` 走 CSS 变量（`--success` / `--warning`），不要再写 `emerald-*` / `amber-*`。
  点赞用 `rose-500`（中文语境「红=赞」），保持 post-card 与回复一致。
- **交互反馈**：`Button` 自带 `active:translate-y-px` 与 `loading`（转圈 + 禁用 + `aria-busy`）；
  顶栏 `NavLink` 有激活态；全站 `:focus-visible` 统一 ring；尊重 `prefers-reduced-motion`。
- **页面标题**：每个路由页面调一次 `usePageTitle('xxx')`，浏览器标题自动拼站点名。

## 改动注意

- 后端加字段/改行为时，本目录**不强制跟进**；但若改了共享 API 语义，检查这里会不会编译报错（`npm run typecheck`）。
- `api.ts` 的 401 刷新与 X 前端逻辑同源；若在后端改了刷新接口形状，两处都要过一遍。
- 文案中文、图片相对路径等约定与 X 前端一致。
- 本目录在本地 pnpm workspace 里（根 `pnpm-workspace.yaml`），`pnpm --filter frontend …` 可用。
- 依赖安装：`package-lock.json` 里锁的是腾讯云镜像地址，换网络环境时若 `npm install` 失败，
  可临时移走 lock 用 `--registry https://registry.npmmirror.com` 安装后再恢复 lock（不要提交改动后的 lock）。

## Git

独立仓库 `github.com/wwwaaa123122/starlr-forum-frontend`（main，**中文提交信息**）。

## 测试与 CI（2026-11-21 起）

- **命令**：`npm test`（vitest，jsdom 环境，**91 用例 / 11 文件**）、CI 四门禁 = typecheck + eslint + test + build。
- **测试清单**：
  - `lib/api.test.ts`：401 刷新重试 / NO_RETRY_CODES / 刷新失败不重试 / 并发单飞 / 错误解析
  - `lib/auth.test.tsx`：初始化态、角色映射、登出清理（含后端失败）、401→刷新→重试集成、重放清空、jwtExp
  - `lib/utils.test.ts`、`lib/consent.test.ts`、`lib/image-compress.test.ts`、`lib/base-url.test.ts`、`lib/site-config.test.tsx`、`lib/use-page-title.test.tsx`
  - `pages/AdminSmoke.test.tsx` + `pages/admin/AdminTabs*.test.tsx`：权限路由 + 14 个 Tab 冒烟
    （接口返回 `{}` 最严苛形状，防整树崩溃；ReportsTab 兼作历史修复的回归哨兵）
- **已知踩坑**（写组件时预防，写测试时参考）：
  - 接口数据链式访问必须防御：`data?.x?.y ?? 默认`。历史上有 6 处 `data.x.y` 在空数据下整树卸载
    （tsc/eslint 均无法发现，只有冒烟能抓）。新增 Tab/页面照此模式。
  - Radix Tabs 在 jsdom 不响应原生 `.click()`，用 `@testing-library/user-event` 的 `user.click`。
  - `SiteConfigProvider` 是 `useSiteConfig()` 拿到真实站点名的前提，未包裹时永远是 FALLBACK。
  - vitest 统一 `environment: 'jsdom'`（localStorage stub 与 React 组件都需要）；组件测试后记得 `cleanup()`。
  - `shadcn/no-unknown-classes` lint 会检查**测试文件里的字符串类名**，测试里也要写真实 Tailwind 类。
