import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "dist-f/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { shadcn, "react-hooks": reactHooks },
    settings: {
      shadcn: {
        themeImports: ["./src/index.css"],
        componentImports: ["^\\./components/ui/", "^\\.\\./ui/", "^\\./ui/"],
      },
    },
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "shadcn/no-restyle": [
        "error",
        {
          allow: [
            "layout",
            // 全站直角（--radius: 0）下 rounded-none 是刻意归一化
            "rounded-none",
            // 密集数据表 / 紧凑徽章的既定排版（AGENTS.md 设计系统约定，非临时覆写）
            "text-xs", "text-sm", "text-base", "text-xl", "text-[10px]",
            "text-muted-foreground", "font-normal", "font-medium", "font-mono", "leading-none",
            "gap-1", "gap-1.5", "gap-2", "gap-3", "space-y-3", "space-y-4", "space-y-5",
            "px-1", "px-1.5", "px-2", "px-3", "py-0", "py-1", "py-6",
            "pl-8", "pl-9", "truncate", "hover:bg-muted",
            // 头像描边（post-card / site-header / 详情页作者行统一装饰）
            "border",
          ],
        },
      ],
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": [
        "error",
        {
          allow: [
            // shadcn/ui 原始组件内部的定位/过渡实现（更新组件时跟随上游，不逐个改写）
            "focus-visible:ring-[3px]",
            "transition-[color,box-shadow]",
            "min-w-[8rem]",
            "top-[50%]",
            "left-[50%]",
            "max-w-[calc(100%-2rem)]",
            "translate-x-[-50%]",
            "translate-y-[-50%]",
            "h-[var(--radix-select-trigger-height)]",
            "min-w-[var(--radix-select-trigger-width)]",
            "h-[1.15rem]",
            "data-[state=checked]:translate-x-[calc(100%-2px)]",
            "p-[3px]",
            "h-[calc(100%-1px)]",
            "translate-y-[calc(-50%_-_2px)]",
            // Radix/sonner 绑定的尺寸与安全区（无等值 scale token）
            "size-[1.2rem]",
            "size-[1.15rem]",
            "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
            "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]",
            "grid-cols-[0_1fr]",
            // 结构性网格布局（内容列 + 固定栏），无 scale 等值
            "md:grid-cols-[minmax(0,1fr)_240px]",
            "sm:grid-cols-[1fr_auto]",
            // CSS 厂商前缀属性（隐藏滚动条），Tailwind 无对应 utility
            "[-ms-overflow-style:none]",
            "[scrollbar-width:none]",
            // 紧凑徽章的既定字号（全站统一，介于 xs 与更小之间的刻意设计）
            "text-[10px]",
          ],
        },
      ],
      "shadcn/no-inline-styles": [
        "error",
        {
          // 日活跃柱状图高度由数据动态计算（百分比），无法用静态类表达
          allowDynamicIdentifiers: ["style"],
          allow: ["height"],
        },
      ],
      "shadcn/no-unknown-classes": [
        "error",
        {
          // sonner Toaster 的约定类名，由 sonner 自身样式消费
          allow: ["toaster"],
        },
      ],
      "shadcn/require-static-classes": "error",
    },
  },
]);
