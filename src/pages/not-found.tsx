import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <Compass className="text-muted-foreground size-12" />
      <h1 className="text-2xl font-bold">404 · 页面未找到</h1>
      <p className="text-muted-foreground text-sm">你访问的页面可能已被删除或从未存在。</p>
      <Button asChild>
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
