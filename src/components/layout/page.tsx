import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * 页面骨架（全站唯一入口）
 *
 * 改动前各页面各写一遍 `mx-auto max-w-* px-4 py-*`，宽度有 3xl / 4xl / 6xl 三种、
 * 上下留白有 py-6 / py-8 / py-12 / py-16 / py-20 / py-24 六种，视觉上就不像一个站。
 * 这里收敛为四档宽度 + 统一 padding：
 *   wide    内容流（首页、分类、管理后台）   max-w-6xl
 *   default 详情/编辑/搜索                   max-w-4xl
 *   narrow  个人中心、通知、列表             max-w-3xl
 *   auth    登录注册等单卡片表单             max-w-sm
 */
const WIDTH = {
  wide: 'max-w-6xl',
  default: 'max-w-4xl',
  narrow: 'max-w-3xl',
  md: 'max-w-md',
  auth: 'max-w-sm',
} as const;

type PageWidth = keyof typeof WIDTH;

interface PageContainerProps {
  width?: PageWidth;
  className?: string;
  children: ReactNode;
}

export function PageContainer({ width = 'default', className, children }: PageContainerProps) {
  return <div className={cn('mx-auto w-full px-4 py-6', WIDTH[width], className)}>{children}</div>;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** 首行图标，与标题同级 */
  icon?: ReactNode;
  /** 右侧操作区（按钮等） */
  actions?: ReactNode;
  /** true = 显示「返回」按钮（浏览器历史后退） */
  back?: boolean;
  className?: string;
}

export function PageHeader({ title, description, icon, actions, back, className }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className={cn('mb-4', className)}>
      {back && (
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" /> 返回
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            {icon}
            <span className="truncate">{title}</span>
          </h1>
          {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface PageSectionProps {
  /** 有标题时渲染带分隔线的头部 */
  title?: ReactNode;
  description?: ReactNode;
  /** 头部右侧操作 */
  action?: ReactNode;
  /** 内容区额外样式（默认不自带内边距，由内容自己控制行距） */
  contentClassName?: string;
  className?: string;
  children: ReactNode;
}

/** 页面内的卡片区块：统一 border + bg-card + 标题头样式 */
export function PageSection({ title, description, action, contentClassName, className, children }: PageSectionProps) {
  const hasHeader = Boolean(title || action);
  return (
    <section className={cn('surface', className)}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

/** 空状态 / 错误状态 / 骨架屏共用的居中容器 */
export function PageMessage({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4 py-14 text-center', className)}>
      {icon && <div className="text-muted-foreground mb-1">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** 需要「回首页/去登录」等出口时常用的链接按钮 */
export function BackHomeLink({ label = '返回首页' }: { label?: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to="/">{label}</Link>
    </Button>
  );
}
