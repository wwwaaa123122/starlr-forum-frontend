# AGENTS.md — frontend（经典版前端，已下线）

React 19 + Vite 7 + TypeScript + Tailwind v4 + shadcn/ui（Radix）+ TanStack Query v5 的原始 Web 前端。

## ⚠️ 状态：已从生产下线（2026-10-07）

- 曾经的 Worker `xingchen-forum`（i.182030.xyz 同时服务前端+API）**已删除**，i.182030.xyz 现在是纯 API（`forum-backend`）。
- 生产入口只剩 **Starlr X**（`../frontend-x`，x.182030.xyz）与纯前端 f 站（f.182030.xyz）。
- 本目录现在仅剩两个用途：
  1. **本地开发资源**：`../backend/wrangler dev` 的 assets 指向 `frontend/dist`（`npx wrangler dev` 时会用到）；
  2. 历史对照/文档。

**默认不要在这里开发新功能**——用户要网页新特性时一律落在 `../frontend-x`；仅当用户明确点名「经典版」才动这里，且改动先在本地 dev 验证（无法部署生产）。

## 命令

```bash
npm run dev          # Vite @ :5173（API 代理 :8787）
npm run build        # tsc -b && vite build → dist/（仅供本地 wrangler dev）
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

独立仓库 `github.com/wwwaaa123122/starlr-forum-frontend`（main，**中文提交信息**）。虽已下线，仍正常提交推送，保持仓库与本地一致。
