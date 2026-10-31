import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { PenLine, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSiteConfig } from '@/lib/site-config';
import { usePageTitle } from '@/lib/use-page-title';
import { PostCard, PostCardSkeleton } from '@/components/post-card';
import { CategoryIcon } from '@/components/category-icon';
import { PaginationControls } from '@/components/pagination-controls';
import { PageContainer, PageHeader, PageSection, PageMessage } from '@/components/layout/page';
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
  const { siteDescription, siteTagline } = useSiteConfig();

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  const { data: postsData, isLoading, isError, refetch } = useQuery({
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
  const currentCategory = categories.find((c) => c.slug === slug);
  const totalPosts = categories.reduce((acc, c) => acc + c.postCount, 0);

  usePageTitle(currentCategory?.name ?? (tag ? `#${tag}` : null));

  return (
    <PageContainer width="wide" className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0">
        {/* 分类页给出可见标题，列表首页保留站点标语作为无障碍/SEO 的 h1 */}
        <PageHeader
          title={currentCategory ? `${currentCategory.icon ? `${currentCategory.icon} ` : ''}${currentCategory.name}` : '全部帖子'}
          description={currentCategory?.description || siteTagline || undefined}
          className="mb-3"
          actions={
            user && (
              <Button asChild size="sm">
                <Link to="/new">
                  <PenLine className="size-4" /> 发帖
                </Link>
              </Button>
            )
          }
        />

        {/* 排序 + 当前标签 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Tabs value={sort} onValueChange={(v) => setParams({ sort: v, page: 1 })}>
            <TabsList>
              <TabsTrigger value="new">最新</TabsTrigger>
              <TabsTrigger value="hot">热门</TabsTrigger>
            </TabsList>
          </Tabs>
          {tag && (
            <Button variant="secondary" size="sm" className="gap-1" onClick={() => setParams({ tag: '', page: 1 })}>
              #{tag}
              <X className="size-3.5" />
              <span className="sr-only">清除标签筛选</span>
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

        <PageSection>
          {isLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </>
          ) : isError ? (
            <PageMessage
              title="帖子加载失败"
              description="网络或服务暂时不可用，可以稍后重试。"
              action={
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  重新加载
                </Button>
              }
            />
          ) : (postsData?.posts.length ?? 0) === 0 ? (
            <PageMessage
              title={tag ? `没有带 #${tag} 标签的帖子` : '这里还没有帖子'}
              description={tag ? '换一个标签，或看看最新的讨论。' : '来发布第一篇，让这里热闹起来。'}
              action={
                user ? (
                  <Button asChild size="sm">
                    <Link to="/new">发布帖子</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/login">登录后发帖</Link>
                  </Button>
                )
              }
            />
          ) : (
            postsData!.posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </PageSection>

        <PaginationControls pagination={postsData?.pagination} onPageChange={(p) => setParams({ page: p })} />
      </div>

      {/* 桌面侧栏 */}
      <aside className="hidden min-w-0 space-y-4 md:block">
        <PageSection title="分类" contentClassName="space-y-0.5 p-2">
          <Link
            to="/"
            className={`flex items-center justify-between rounded-none px-2 py-1.5 text-sm transition-colors hover:bg-accent ${!slug ? 'bg-accent font-medium' : ''}`}
          >
            <span>全部</span>
            <span className="text-muted-foreground text-xs">{totalPosts}</span>
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/categories/${c.slug}`}
              className={`flex items-center justify-between rounded-none px-2 py-1.5 text-sm transition-colors hover:bg-accent ${slug === c.slug ? 'bg-accent font-medium' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <CategoryIcon icon={c.icon} className="size-4 shrink-0" />
                <span className="truncate">{c.name}</span>
              </span>
              <span className="text-muted-foreground text-xs">{c.postCount}</span>
            </Link>
          ))}
        </PageSection>

        <PageSection title="关于" contentClassName="p-4 pt-3">
          <p className="text-muted-foreground text-sm leading-relaxed">{siteDescription}</p>
        </PageSection>
      </aside>
    </PageContainer>
  );
}
