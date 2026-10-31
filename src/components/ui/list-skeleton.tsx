import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/** 列表型骨架屏：帖子 / 通知 / 搜索结果共用同一种节奏 */
export function ListSkeleton({
  rows = 4,
  className,
  rowClassName,
}: {
  rows?: number;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <div className={cn('divide-y', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn('flex gap-3 px-4 py-3.5', rowClassName)}>
          <Skeleton className="size-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 卡片区块骨架 */
export function BlockSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-40 w-full', className)} />;
}
