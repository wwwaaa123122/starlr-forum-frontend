import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { usePageTitle } from '@/lib/use-page-title';
import { assetUrl } from '@/lib/base-url';
import { PostCard, PostCardSkeleton } from '@/components/post-card';
import { PaginationControls } from '@/components/pagination-controls';
import { PageContainer, PageHeader, PageMessage, PageSection } from '@/components/layout/page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Category, Pagination, PostSummary, UserProfile } from '@/lib/types';

const ALL = '__all__';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const type = (searchParams.get('type') ?? 'post') as 'post' | 'user';
  const sort = (searchParams.get('sort') ?? 'relevant') as 'relevant' | 'new' | 'hot';
  const category = searchParams.get('category') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const [input, setInput] = useState(q);
  usePageTitle(q ? `搜索「${q}」` : '搜索');

  // 分类筛选数据：后端 /api/search 一直支持 category，此前前端没有入口
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  const { data: postsData, isLoading: postsLoading, isError: postsError, refetch: refetchPosts } = useQuery({
    queryKey: ['search', 'posts', q, sort, category, page],
    queryFn: () =>
      api<{ posts: PostSummary[]; pagination: Pagination; mode: string }>(
        `/api/search?q=${encodeURIComponent(q)}&type=post&sort=${sort}&page=${page}&pageSize=20${category ? `&category=${encodeURIComponent(category)}` : ''}`,
      ),
    enabled: Boolean(q) && type === 'post',
    placeholderData: keepPreviousData,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['search', 'users', q, page],
    queryFn: () =>
      api<{ users: UserProfile[]; pagination: Pagination }>(
        `/api/search?q=${encodeURIComponent(q)}&type=user&page=${page}&pageSize=20`,
      ),
    enabled: Boolean(q) && type === 'user',
    placeholderData: keepPreviousData,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.set('q', input.trim());
    params.set('page', '1');
    setSearchParams(params);
  };

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <PageContainer>
      <PageHeader title="搜索" description="按标题、正文或用户查找；支持分类与热门排序。" />

      <form onSubmit={submit} className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索帖子标题、正文或用户…"
            className="pl-9"
            aria-label="搜索关键词"
            autoFocus
          />
        </div>
        <Button type="submit">搜索</Button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={type} onValueChange={(v) => setParam('type', v)}>
          <TabsList>
            <TabsTrigger value="post">帖子</TabsTrigger>
            <TabsTrigger value="user">用户</TabsTrigger>
          </TabsList>
        </Tabs>

        {type === 'post' && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category || ALL} onValueChange={(v) => setParam('category', v)}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部分类</SelectItem>
                {(categoriesData?.categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.slug}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setParam('sort', v)}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevant">相关度</SelectItem>
                <SelectItem value="new">最新发布</SelectItem>
                <SelectItem value="hot">最热</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!q ? (
        <PageMessage
          icon={<SearchIcon className="size-8" />}
          title="输入关键词开始搜索"
          description="例如一个技术名词、帖子标题的一部分，或某位用户的昵称。"
        />
      ) : type === 'post' ? (
        <>
          <PageSection>
            {postsLoading ? (
              <>
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </>
            ) : postsError ? (
              <PageMessage
                title="搜索失败"
                description="请求过于频繁或服务暂时不可用。"
                action={
                  <Button variant="outline" size="sm" onClick={() => void refetchPosts()}>
                    重试
                  </Button>
                }
              />
            ) : (postsData?.posts.length ?? 0) === 0 ? (
              <PageMessage
                title="没有找到相关帖子"
                description={category ? '试试取消分类筛选，或换一个关键词。' : '换一个关键词，或减少筛选条件。'}
              />
            ) : (
              postsData!.posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </PageSection>
          <PaginationControls pagination={postsData?.pagination} onPageChange={(p) => setParam('page', String(p))} />
          {postsData?.mode && (
            <p className="text-muted-foreground text-center text-xs">
              共 {postsData.pagination.total} 条结果（{postsData.mode === 'fts' ? '全文索引' : '模糊匹配'}）
            </p>
          )}
        </>
      ) : (
        <>
          <PageSection>
            {usersLoading ? (
              <p className="text-muted-foreground px-4 py-14 text-center text-sm">搜索中…</p>
            ) : (usersData?.users.length ?? 0) === 0 ? (
              <PageMessage title="没有找到相关用户" description="可以试试用户名、昵称，或直接输入 UID。" />
            ) : (
              usersData!.users.map((u) => (
                <Link
                  key={u.id}
                  to={`/users/${u.username}`}
                  className="row-interactive flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
                >
                  <Avatar className="size-10 border">
                    <AvatarImage src={assetUrl(u.avatarUrl)} alt={u.username} />
                    <AvatarFallback>{u.nickname.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {u.nickname} <span className="text-muted-foreground text-xs">@{u.username}</span>
                    </div>
                    {u.bio && <p className="text-muted-foreground line-clamp-1 text-xs">{u.bio}</p>}
                  </div>
                  <div className="text-muted-foreground shrink-0 text-xs">
                    {u.postCount} 帖 · {u.replyCount} 回复
                  </div>
                </Link>
              ))
            )}
          </PageSection>
          <PaginationControls pagination={usersData?.pagination} onPageChange={(p) => setParam('page', String(p))} />
        </>
      )}
    </PageContainer>
  );
}
