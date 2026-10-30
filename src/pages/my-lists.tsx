import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, Heart, LogIn, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatNumber } from '@/lib/utils';
import { PostCard } from '@/components/post-card';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Pagination, PostSummary } from '@/lib/types';

type ListKind = 'likes' | 'favorites';

const TABS: { kind: ListKind; label: string; icon: typeof Heart; endpoint: string; empty: string; hint: string }[] = [
  {
    kind: 'likes',
    label: '我的点赞',
    icon: Heart,
    endpoint: '/api/me/likes',
    empty: '还没有点赞过任何帖子',
    hint: '看到喜欢的帖子，点个赞就会出现在这里',
  },
  {
    kind: 'favorites',
    label: '我的收藏',
    icon: Star,
    endpoint: '/api/me/favorites',
    empty: '还没有收藏任何帖子',
    hint: '收藏好帖子，方便以后回来看',
  },
];

function MyListPage({ kind }: { kind: ListKind }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const tab = TABS.find((t) => t.kind === kind) ?? TABS[0];

  const { data, isLoading } = useQuery({
    queryKey: [tab.kind, page],
    queryFn: () => api<{ posts: PostSummary[]; pagination: Pagination }>(`${tab.endpoint}?page=${page}&pageSize=20`),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
  });

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
        <LogIn className="text-muted-foreground size-10" />
        <p className="text-sm">登录后查看你的{tab.label.replace('我的', '')}列表</p>
        <Button onClick={() => navigate('/login')}>
          <LogIn className="size-4" /> 去登录
        </Button>
      </div>
    );
  }

  const posts = data?.posts ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-lg font-bold">{tab.label}</h1>

      {/* 点赞 / 收藏 切换 */}
      <div className="bg-card mb-4 flex gap-1 rounded-none border p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.kind}
              to={t.kind === 'likes' ? '/me/likes' : '/me/favorites'}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-none px-3 py-2 text-sm transition-colors',
                t.kind === kind ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              <Icon className={cn('size-4', t.kind === 'likes' && t.kind === kind && 'fill-current text-rose-500')} />
              {t.label}
            </Link>
          );
        })}
      </div>

      {isLoading ? (
        <div className="bg-card rounded-none border">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="m-3 h-20" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-2 rounded-none border px-4 py-16 text-center">
          <Eye className="text-muted-foreground size-8" />
          <p className="text-sm font-medium">{tab.empty}</p>
          <p className="text-muted-foreground text-xs">{tab.hint}</p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/">去逛逛 →</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-none border">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <p className="text-muted-foreground mt-4 text-center text-xs">
        共 {formatNumber(data?.pagination.total ?? 0)} 篇 · 仅自己可见
      </p>
    </div>
  );
}

export function MyLikesPage() {
  return <MyListPage kind="likes" />;
}

export function MyFavoritesPage() {
  return <MyListPage kind="favorites" />;
}
