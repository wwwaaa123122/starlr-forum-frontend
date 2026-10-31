import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { PageContainer, PageMessage } from '@/components/layout/page';
import { usePageTitle } from '@/lib/use-page-title';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  usePageTitle('页面未找到');
  return (
    <PageContainer>
      <PageMessage
        icon={<Compass className="size-12" />}
        title="404 · 页面未找到"
        description="你访问的页面可能已被删除，或从未存在过。"
        action={
          <Button asChild>
            <Link to="/">返回首页</Link>
          </Button>
        }
        className="py-24"
      />
    </PageContainer>
  );
}
