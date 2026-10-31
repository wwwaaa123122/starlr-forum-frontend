import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { PenLine } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PostCard, PostCardSkeleton } from '@/components/post-card';
import { CategoryIcon } from '@/components/category-icon';
import { PaginationControls } from '@/components/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Category, PostSummary, Pagination } from '@/lib/types';

export function HomePage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const sort = (searchParams.get('sort') ?? 'new') as 'new' | 'hot';
  const tag = searchParams.get('tag') ?? '';
  const { user } = useAuth();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', { category: slug ?? '', sort, page, tag }],
    queryFn: () =>
      api<{ posts: PostSummary[]; pagination: Pagination }>(
        `/api/posts?category=${encodeURIComponent(slug ?? '')}&sort=${sort}&page=${page}&pageSize=20${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`,
      ),
    placeholderData: keepPreviousData,
  });

  const setParams = (next: Partial<{ page: number; sort: string; tag: string }>) => {
    const params = new URLSearchParams(searchParams);
    if (next.page !== undefined) params.set('page', String(next.page));
    if (next.sort !== undefined) params.set('sort', next.sort);
    if (next.tag !== undefined) {
      if (next.tag) params.set('tag', next.tag);
      else params.delete('tag');
    }
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  const categories = categoriesData?.categories ?? [];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0">
        {/* 排序 */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <Tabs value={sort} onValueChange={(v) => setParams({ sort: v, page: 1 })}>
            <TabsList>
              <TabsTrigger value="new">最新文章</TabsTrigger>
              <TabsTrigger value="hot">热门</TabsTrigger>
            </TabsList>
          </Tabs>
          {tag && (
            <Button variant="outline" size="sm" onClick={() => setParams({ tag: '', page: 1 })}>
              标签：{tag} ✕
            </Button>
          )}
          {user && (
            <Button asChild size="sm">
              <Link to="/new">
                <PenLine className="size-4" /> 发帖
              </Link>
            </Button>
          )}
        </div>

        {/* 移动端分类横滑 */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Link to="/">
            <Badge variant={slug ? 'outline' : 'default'} className="cursor-pointer whitespace-nowrap px-3 py-1">
              全部
            </Badge>
          </Link>
          {categories.map((c) => (
            <Link key={c.id} to={`/categories/${c.slug}`}>
              <Badge variant={slug === c.slug ? 'default' : 'outline'} className="cursor-pointer whitespace-nowrap px-3 py-1">
                {c.icon} {c.name}
              </Badge>
            </Link>
          ))}
        </div>

        <div className="bg-card rounded-none border">
          {isLoading ? (
            <>
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </>
          ) : (postsData?.posts.length ?? 0) === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-3 px-4 py-16 text-center">
              <p>还没有帖子，来发布第一篇吧！</p>
              {user && (
                <Button asChild size="sm">
                  <Link to="/new">发布帖子</Link>
                </Button>
              )}
            </div>
          ) : (
            postsData!.posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>

        <PaginationControls pagination={postsData?.pagination} onPageChange={(p) => setParams({ page: p })} />
      </div>

      {/* 桌面侧栏 */}
      <aside className="hidden min-w-0 space-y-4 md:block">
        <div className="bg-card rounded-none border p-4">
          <h2 className="mb-3 text-sm font-semibold">分类</h2>
          <nav className="space-y-1">
            <Link
              to="/"
              className={`flex items-center justify-between rounded-none px-2 py-1.5 text-sm hover:bg-accent ${!slug ? 'bg-accent font-medium' : ''}`}
            >
              <span>全部</span>
              <span className="text-muted-foreground text-xs">
                {categories.reduce((acc, c) => acc + c.postCount, 0)}
              </span>
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/categories/${c.slug}`}
                className={`flex items-center justify-between rounded-none px-2 py-1.5 text-sm hover:bg-accent ${slug === c.slug ? 'bg-accent font-medium' : ''}`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <CategoryIcon icon={c.icon} className="size-4 shrink-0" />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="text-muted-foreground text-xs">{c.postCount}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="bg-card rounded-none border p-4 text-sm">
          <h2 className="mb-2 text-sm font-semibold">关于</h2>
          <p className="text-muted-foreground leading-relaxed">
            Starlr Forum —— 运行在 Cloudflare Workers + D1 上的现代化中文社区，支持 Markdown、标签、通知与 @ 提及。
          </p>
        </div>
      </aside>
    </div>
  );
}
