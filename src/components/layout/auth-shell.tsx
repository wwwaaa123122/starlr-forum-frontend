import type { ReactNode } from 'react';
import { PageContainer } from '@/components/layout/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * 登录 / 注册 / 找回密码 / 重置密码 共用外壳：
 * 图标 → 标题 → 说明 → 表单 → 底部链接，宽度与留白统一，
 * 避免每个页面自己拼 mx-auto max-w-sm + 不同 py。
 */
export function AuthShell({
  icon,
  title,
  description,
  children,
  footer,
  contentClassName,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <PageContainer width="auth" className="flex flex-col items-center py-12">
      <div className="text-primary bg-primary/5 mb-4 flex size-12 items-center justify-center border">{icon}</div>
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className={cn('space-y-4', contentClassName)}>{children}</CardContent>
      </Card>
      {footer && <div className="text-muted-foreground mt-4 text-center text-sm">{footer}</div>}
    </PageContainer>
  );
}
