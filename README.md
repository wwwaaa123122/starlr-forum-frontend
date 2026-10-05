# 星辰旅人论坛 — 前端（React + shadcn/ui）

> React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + shadcn/ui（new-york 风格）
> 对应后端仓库：`starlr-forum-backend`（Cloudflare Workers + D1 + KV + R2 + Resend）

**线上地址：** https://i.182030.xyz

## 页面

| 路由 | 说明 |
| --- | --- |
| `/` | 首页（排序 Tabs + 分类侧栏/移动端分类滑块） |
| `/categories` `/categories/:slug` | 分类 |
| `/posts/:id` | 帖子详情（回复楼中楼、点赞、收藏、分享、举报） |
| `/new` `/edit/:id` | 发帖 / 编辑（Markdown 预览、标签、图片上传） |
| `/search` | 搜索（帖子/用户，支持按 UID） |
| `/users/:username` | 用户主页 |
| `/notifications` | 通知（未读数、全部已读） |
| `/settings` | 设置（资料、头像上传、**修改密码**、收藏、登出所有设备） |
| `/login` `/register` | 登录 / 注册（**昵称**可选、Turnstile 人机校验） |
| `/forgot-password` `/reset-password` | 忘记密码 / 重置密码 |
| `/admin` | 管理后台（概览/用户/帖子/分类/举报/**管理员配置**/审计日志） |

## 快速开始

```bash
pnpm install
pnpm dev        # Vite @ :5173（/api、/oauth、/.well-known 代理到 127.0.0.1:8787）
pnpm build      # 产出 dist/（后端部署时作为静态资源）
pnpm typecheck  # tsc -b
```

> 后端仓库请克隆为同级目录（后端 `wrangler.jsonc` 的 assets 指向 `../frontend/dist`）：
> `git clone git@github.com:wwwaaa123122/starlr-forum-backend.git backend`

## 架构要点

- **API 客户端**（`src/lib/api.ts`）：自动携带 Bearer Token；401 时单飞刷新并重试；到期前 10 分钟主动轮换
- **认证状态**（`src/lib/auth.tsx`）：登录/注册/登出；Token 存 localStorage（`xc.access` / `xc.refresh`）
- **Markdown**（`src/components/markdown.tsx`）：react-markdown + remark-gfm + rehype-highlight，**rehype-sanitize 白名单**（原始 HTML 永不渲染；`a` 仅 http/https/mailto，`img` 仅 http/https）
- **shadcn/ui**：`src/components/ui/` 手写组件（stone 基色，indigo 品牌色），`cn()` 工具
- **主题**：next-themes 深色模式 + `sonner` 提示 + TanStack Query v5 数据层
- **安全头**：`public/_headers`（CSP 禁内联脚本，允许 challenges.cloudflare.com；/assets/* 一年不可变缓存）
- **图片上传**：编辑器/回复框的「图片」按钮 → `/api/upload`（purpose=post/reply）→ 光标处插入 Markdown

## 构建与部署

前端只产出静态 `dist/`，部署由后端仓库的 `wrangler deploy` 完成（单 Worker 承载 API + 静态资源）：

```bash
pnpm build   # 在本仓库
cd ../backend && pnpm deploy
```
