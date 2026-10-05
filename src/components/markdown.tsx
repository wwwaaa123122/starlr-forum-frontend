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
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

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
    <div className={cn('md-content text-[15px]', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeMentionLinks,
          [rehypeSanitize, sanitizeSchema],
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
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
