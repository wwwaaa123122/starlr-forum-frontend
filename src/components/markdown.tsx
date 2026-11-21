/**
 * Markdown 渲染（严格 HTML Sanitization）
 *
 * 安全设计：
 * 1. 不引入 rehype-raw —— Markdown 中的原始 HTML 永远以纯文本展示，不会被执行
 * 2. rehype-sanitize 按 allowlist 白名单过滤（链接协议限 http/https/mailto，
 *    javascript: / data: URL 一律移除，防御 XSS 与 javascript URL 注入）
 * 3. 图片仅允许 http/https 与站内相对路径
 */
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { createLowlight, type LanguageFn } from 'lowlight';
import { cn } from '@/lib/utils';

// highlight.js 语言子集：只注册论坛常见语言，替代 lowlight 默认的 37 种 common
// 全量注册，明显减小 vendor-markdown 产物体积（未覆盖语言回退为无高亮纯文本）。
// 注意 rehype-highlight 的 `languages` 选项不会替换它默认静态 import 的 common，
// 故此处内联一个精简版高亮插件（逻辑与 rehype-highlight 一致：仅处理 pre>code）。
const highlightLanguages = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  json: () => import('highlight.js/lib/languages/json'),
  bash: () => import('highlight.js/lib/languages/bash'),
  shell: () => import('highlight.js/lib/languages/shell'),
  sql: () => import('highlight.js/lib/languages/sql'),
  css: () => import('highlight.js/lib/languages/css'),
  xml: () => import('highlight.js/lib/languages/xml'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  python: () => import('highlight.js/lib/languages/python'),
  go: () => import('highlight.js/lib/languages/go'),
  rust: () => import('highlight.js/lib/languages/rust'),
  java: () => import('highlight.js/lib/languages/java'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  diff: () => import('highlight.js/lib/languages/diff'),
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
};

const lowlight = createLowlight(
  Object.fromEntries(
    Object.entries(highlightLanguages).map(([name, load]) => [name, () => load().then((m) => m.default)]),
  ) as unknown as Record<string, LanguageFn>,
);

/** code 块 language-* class → lowlight 语言名（不认识的返回 undefined，跳过高亮） */
function codeLanguage(node: { properties?: { className?: unknown } }): string | undefined {
  const list = node.properties?.className;
  if (!Array.isArray(list)) return undefined;
  for (const value of list) {
    const match = typeof value === 'string' && value.match(/^language-(.+)$/);
    if (match) return match[1];
    if (value === 'no-highlight' || value === 'nohighlight') return undefined;
  }
  return undefined;
}

/** 精简版 rehype-highlight：只高亮已注册语言，detect=false 语义 */
function rehypeHighlightSubset() {
  type HastNode = {
    tagName?: string;
    properties?: { className?: unknown };
    children?: Array<{ type: string; value?: string; children?: HastNode['children'] }>;
  };
  const walk = (node: unknown, parentTag?: string): void => {
    const n = node as HastNode;
    if (n.tagName === 'code' && parentTag === 'pre') {
      const lang = codeLanguage(n);
      if (lang) {
        const className = Array.isArray(n.properties!.className) ? (n.properties!.className as string[]) : [];
        if (!className.includes('hljs')) n.properties!.className = ['hljs', ...className];
        const text = (n.children ?? [])
          .map((child) => (child.type === 'text' ? String(child.value ?? '') : ''))
          .join('');
        let result;
        try {
          result = lowlight.highlight(lang, text, { prefix: 'hljs-' });
        } catch {
          return; // 未注册语言 / 高亮失败 → 保留纯文本
        }
        if (result.children.length > 0) n.children = result.children as HastNode['children'];
        return;
      }
    }
    if (Array.isArray(n.children)) {
      for (const child of n.children) walk(child, n.tagName);
    }
  };
  return (tree: unknown) => walk(tree);
}

/** @提及 → 站内用户链接（在 sanitize 之前跑，白名单放行 .mention） */
function rehypeMentionLinks() {
  type Node = { type: string; value?: string; children?: Node[]; tagName?: string; properties?: Record<string, unknown> };
  const walk = (node: Node) => {
    if (node.type === 'text' && typeof node.value === 'string' && node.value.includes('@')) {
      const parts = node.value.split(/(@[\p{L}\p{N}_-]{2,24})/gu);
      if (parts.length === 1) return;
      node.type = 'element';
      node.tagName = 'span';
      node.properties = {};
      node.children = parts
        .filter((part) => part !== '')
        .map((part) =>
          part.startsWith('@')
            ? {
                type: 'element',
                tagName: 'a',
                properties: { href: `/users/${encodeURIComponent(part.slice(1))}`, className: 'mention' },
                children: [{ type: 'text', value: part }],
              }
            : { type: 'text', value: part },
        );
      return;
    }
    if (Array.isArray(node.children)) node.children.forEach((child) => walk(child));
  };
  return (tree: unknown) => walk(tree as Node);
}

/** 在默认白名单基础上放开语法高亮的 class（hljs*）与 .mention 链接 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ['className', 'mention']],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./, 'hljs']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', /^hljs(-|$)/]],
    input: [['type', 'checkbox'], 'checked', 'disabled'],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https'],
    href: ['http', 'https', 'mailto'],
  },
};

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView = memo(function MarkdownView({ content, className }: MarkdownViewProps) {
  return (
    <div className={cn('md-content text-sm', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeMentionLinks,
          [rehypeSanitize, sanitizeSchema],
          [rehypeHighlightSubset],
        ]}
        components={{
          a: ({ className, ...props }) =>
            // @提及 是站内链接，当前页打开；其余链接新窗口打开
            className?.toString().includes('mention') ? (
              <a {...props} className={className} />
            ) : (
              <a {...props} className={className} target="_blank" rel="noopener noreferrer nofollow" />
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
