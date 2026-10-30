# Starlr Forum 前端（经典版）

React 19 + Vite 7 + TypeScript + Tailwind v4 + shadcn/ui（Radix）+ TanStack Query v5 的传统论坛风格 Web 前端。

**已重启上线**：[frontend.182030.xyz](https://frontend.182030.xyz)（2026-10-30）

- Worker `forum-frontend-classic` 托管 `dist-f/` 静态产物，零数据绑定；
- 浏览器跨域直连独立后端 [starlr-forum-backend](https://github.com/wwwaaa123122/starlr-forum-backend)（i.182030.xyz）；
- 全站 UI 直角风格；管理后台含「推送记录」（SEO 推送日志 / 失败重试 / 全量校验）。

> 另有 X/Twitter 风格三栏时间线前端 [starlr-forum-frontend-x](https://github.com/wwwaaa123122/starlr-forum-frontend-x)（starlr.tech 主站），两套前端共用同一后端。

## 命令

```bash
npm install
npm run dev          # Vite @ :5173（API 代理本地 :8787）
npm run build        # → dist/（本地同源构建）
npm run typecheck    # tsc -b --noEmit

# 跨域部署产物（frontend.182030.xyz 用，勿提交）
VITE_API_BASE=https://i.182030.xyz npm run build:frontend   # → dist-f/
```

## 自部署

1. 部署后端（见 backend 仓库 README），拿到 API 域名；
2. `VITE_API_BASE=https://<你的API域名> npm run build:frontend`；
3. `npx wrangler deploy`（参考 backend 仓库的 `wrangler.frontend-classic.jsonc` 模板，改域名与产物目录）；
4. 后端 `ALLOWED_ORIGINS` / `OAUTH_REDIRECT_ORIGINS` 加入你的前端域名。

## 许可

本项目基于 [GPL-3.0-or-later](./LICENSE) 开源。
