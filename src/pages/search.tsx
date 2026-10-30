import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { PostCard, PostCardSkeleton } from '@/components/post-card';
import { PaginationControls } from '@/components/pagination-controls';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Pagination, PostSummary, UserProfile } from '@/lib/types';
import { assetUrl } from '@/lib/base-url';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const type = (searchParams.get('type') ?? 'post') as 'post' | 'user';
  const sort = (searchParams.get('sort') ?? 'relevant') as 'relevant' | 'new';
  const page = Number(searchParams.get('page') ?? '1');
  const [input, setInput] = useState(q);

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['search', 'posts', q, sort, page],
    queryFn: () =>
      api<{ posts: PostSummary[]; pagination: Pagination; mode: string }>(
        `/api/search?q=${encodeURIComponent(q)}&type=post&sort=${sort}&page=${page}&pageSize=20`,
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
    params.set(key, value);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <form onSubmit={submit} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索帖子标题、正文或用户…"
            className="pl-9"
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
          <Select value={sort} onValueChange={(v) => setParam('sort', v)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevant">相关度</SelectItem>
              <SelectItem value="new">最新发布</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {!q ? (
        <p className="text-muted-foreground py-16 text-center text-sm">输入关键词开始搜索</p>
      ) : type === 'post' ? (
        <>
          <div className="bg-card rounded-none border">
            {postsLoading ? (
              <>
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </>
            ) : (postsData?.posts.length ?? 0) === 0 ? (
              <p className="text-muted-foreground px-4 py-16 text-center text-sm">没有找到相关帖子</p>
            ) : (
              postsData!.posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
          <PaginationControls pagination={postsData?.pagination} onPageChange={(p) => setParam('page', String(p))} />
          {postsData?.mode && (
            <p className="text-muted-foreground text-center text-xs">
              共 {postsData.pagination.total} 条结果（{postsData.mode === 'fts' ? '全文索引' : '模糊匹配'}）
            </p>
          )}
        </>
      ) : (
        <>
          <div className="bg-card rounded-none border">
            {usersLoading ? (
              <p className="text-muted-foreground px-4 py-16 text-center text-sm">搜索中…</p>
            ) : (usersData?.users.length ?? 0) === 0 ? (
              <p className="text-muted-foreground px-4 py-16 text-center text-sm">没有找到相关用户</p>
            ) : (
              usersData!.users.map((u) => (
                <Link
                  key={u.id}
                  to={`/users/${u.username}`}
                  className="hover:bg-accent/40 flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
                >
                  <Avatar className="size-10 border">
                    <AvatarImage src={assetUrl(u.avatarUrl)} alt={u.username} />
                    <AvatarFallback>{u.nickname.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
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
          </div>
          <PaginationControls pagination={usersData?.pagination} onPageChange={(p) => setParam('page', String(p))} />
        </>
      )}
    </div>
  );
}
