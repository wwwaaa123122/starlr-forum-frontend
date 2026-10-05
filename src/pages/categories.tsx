import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { CategoryIcon } from '@/components/category-icon';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Category } from '@/lib/types';

export function CategoriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">全部分类</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(data?.categories ?? []).map((category) => (
          <Link key={category.id} to={`/categories/${category.slug}`}>
            <Card className="hover:border-primary/50 flex-row items-center gap-4 px-5 py-4 transition-colors">
              <CategoryIcon icon={category.icon} className="size-8 text-2xl" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{category.name}</div>
                <p className="text-muted-foreground line-clamp-1 text-sm">{category.description}</p>
              </div>
              <div className="text-muted-foreground shrink-0 text-right text-xs">
                <div className="text-foreground font-semibold">{category.postCount}</div>
                帖子
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
