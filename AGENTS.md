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
npm run build        # tsc -b npm run build        # tsc -b && vite build → dist/（仅供本地 wrangler dev）npm run build        # tsc -b && vite build → dist/（仅供本地 wrangler dev） vite build → dist/（本地 dev 用）
VITE_API_BASE=https://i.182030.xyz npm run build:frontend   # → dist-f/（frontend.182030.xyz 部署产物）
npm run typecheck
```

## 代码地图

```
src/
  lib/api.ts         # api<T>()：Bearer 注入 + 401 刷新重试（refreshToken 存 localStorage）
  lib/auth.tsx       # AuthProvider（与 frontend-x 思路相同，实现较老）
  lib/image-compress.ts   # 上传压缩的最初实现（X 前端同款逻辑）
  lib/consent.ts     # Cookie 同意 + Umami 统计
  components/        # category-icon / cookie-consent / image-upload-button /
                     # markdown / mention-textarea / layout …
  pages/admin.tsx    # 1787 行单文件管理后台（X 前端已拆分为 pages/admin/*）
  pages/             # home categories post-detail post-editor login register
                     # forgot-password reset-password settings user notifications
                     # search my-lists legal not-found
```

## 改动注意

- 后端加字段/改行为时，本目录**不强制跟进**；但若改了共享 API 语义，检查这里会不会编译报错（`npm run typecheck`）。
- `api.ts` 的 401 刷新与 X 前端逻辑同源；若在后端改了刷新接口形状，两处都要过一遍。
- 文案中文、图片相对路径等约定与 X 前端一致。
- 本目录在本地 pnpm workspace 里（根 `pnpm-workspace.yaml`），`pnpm --filter frontend …` 可用。

## Git

独立仓库 `github.com/wwwaaa123122/starlr-forum-frontend`（main，**中文提交信息**）。
