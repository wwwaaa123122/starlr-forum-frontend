import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, Heart, LogIn, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePageTitle } from '@/lib/use-page-title';
import { formatNumber } from '@/lib/utils';
import { PostCard } from '@/components/post-card';
import { PaginationControls } from '@/components/pagination-controls';
import { PageContainer, PageHeader, PageMessage, PageSection } from '@/components/layout/page';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const tab = TABS.find((t) => t.kind === kind) ?? TABS[0];
  usePageTitle(tab.label);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [tab.kind, page],
    queryFn: () => api<{ posts: PostSummary[]; pagination: Pagination }>(`${tab.endpoint}?page=${page}&pageSize=20`),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
  });

  if (authLoading) {
    return (
      <PageContainer width="narrow">
        <PageSection>
          <ListSkeleton rows={4} />
        </PageSection>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer width="narrow">
        <PageMessage
          icon={<LogIn className="size-9" />}
          title={`登录后查看你的${tab.label.replace('我的', '')}列表`}
          description="点赞与收藏只对自己可见，登录即可同步到所有设备。"
          action={
            <Button asChild>
              <Link to="/login" state={{ from: location.pathname }}>
                去登录
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const posts = data?.posts ?? [];

  return (
    <PageContainer width="narrow">
      <PageHeader
        title={tab.label}
        description="仅自己可见"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/">去逛逛</Link>
          </Button>
        }
      />

      {/* 与搜索页、用户主页一致的 Tabs 组件（原先这里是手写的分段控件） */}
      <Tabs
        value={kind}
        onValueChange={(v) => {
          if (v === kind) return;
          navigate(v === 'likes' ? '/me/likes' : '/me/favorites');
        }}
        className="mb-4"
      >
        <TabsList className="w-full">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.kind} value={t.kind} className="flex-1">
                <Icon className={t.kind === 'likes' ? 'text-rose-500' : undefined} />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <PageSection>
          <ListSkeleton rows={3} />
        </PageSection>
      ) : isError ? (
        <PageMessage
          title="列表加载失败"
          description="网络或服务暂时不可用，可以稍后重试。"
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              重新加载
            </Button>
          }
        />
      ) : posts.length === 0 ? (
        <PageSection>
          <PageMessage
            icon={<Eye className="size-8" />}
            title={tab.empty}
            description={tab.hint}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/">去逛逛 →</Link>
              </Button>
            }
          />
        </PageSection>
      ) : (
        <>
          <PageSection>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </PageSection>
          <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <p className="text-muted-foreground mt-4 text-center text-xs">
        共 {formatNumber(data?.pagination.total ?? 0)} 篇 · 仅自己可见
      </p>
    </PageContainer>
  );
}

export function MyLikesPage() {
  return <MyListPage kind="likes" />;
}

export function MyFavoritesPage() {
  return <MyListPage kind="favorites" />;
}
