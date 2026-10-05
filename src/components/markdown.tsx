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

/** 在默认白名单基础上放开语法高亮的 class（hljs*） */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
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
          [rehypeSanitize, sanitizeSchema],
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
        ]}
        components={{
          a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
