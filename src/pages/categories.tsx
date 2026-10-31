import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { usePageTitle } from '@/lib/use-page-title';
import { CategoryIcon } from '@/components/category-icon';
import { PageContainer, PageHeader, PageMessage } from '@/components/layout/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';

export function CategoriesPage() {
  usePageTitle('全部分类');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  const categories = data?.categories ?? [];

  return (
    <PageContainer width="wide">
      <PageHeader title="全部分类" description="按主题浏览，找到你想读或想聊的那一块。" />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </div>
      ) : isError ? (
        <PageMessage
          title="分类加载失败"
          description="网络或服务暂时不可用，可以稍后重试。"
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              重新加载
            </Button>
          }
        />
      ) : categories.length === 0 ? (
        <PageMessage title="还没有分类" description="管理员可以在后台「分类」里创建第一个分类。" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <Link key={category.id} to={`/categories/${category.slug}`} className="block">
              <div className="surface-interactive flex items-center gap-4 px-5 py-4">
                <CategoryIcon icon={category.icon} className="size-8 shrink-0 text-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{category.name}</div>
                  <p className="text-muted-foreground line-clamp-1 text-xs">{category.description || '暂无简介'}</p>
                </div>
                <div className="text-muted-foreground shrink-0 text-right text-xs">
                  <div className="text-foreground text-sm font-semibold">{category.postCount}</div>
                  帖子
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
