import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, Bell, CheckCheck, Heart, MessageSquare, ShieldAlert, Sparkles, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePageTitle } from '@/lib/use-page-title';
import { timeAgo } from '@/lib/utils';
import { PageContainer, PageHeader, PageMessage, PageSection } from '@/components/layout/page';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { PaginationControls } from '@/components/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NotificationItem, Pagination } from '@/lib/types';

const TYPE_META: Record<string, { icon: typeof Bell; label: string }> = {
  reply: { icon: MessageSquare, label: '回复了你的帖子' },
  reply_reply: { icon: MessageSquare, label: '回复了你' },
  mention: { icon: AtSign, label: '提到了你' },
  like: { icon: Heart, label: '赞了你的帖子' },
  like_reply: { icon: Heart, label: '赞了你的回复' },
  favorite: { icon: Star, label: '收藏了你的帖子' },
  system: { icon: Sparkles, label: '系统通知' },
  moderation: { icon: ShieldAlert, label: '管理通知' },
};

export function NotificationsPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  usePageTitle('通知');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', 'list', unreadOnly, page],
    queryFn: () =>
      api<{ notifications: NotificationItem[]; unread: number; pagination: Pagination }>(
        `/api/notifications?page=${page}&pageSize=30${unreadOnly ? '&unreadOnly=1' : ''}`,
      ),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (ids?: string[]) =>
      api('/api/notifications/read', { method: 'POST', body: ids ? { ids } : {} }),
    onSuccess: (_res, ids) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (!ids) void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  if (!loading && !user) return <Navigate to="/login" replace />;

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="通知"
        icon={<Bell className="size-5" />}
        description={unread > 0 ? `${unread} 条未读` : '全部已读'}
        actions={
          <>
            <Button
              variant={unreadOnly ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setUnreadOnly((v) => !v);
                setPage(1);
              }}
            >
              {unreadOnly ? '显示全部' : '只看未读'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={markRead.isPending && markRead.variables === undefined}
              disabled={unread === 0}
              onClick={() => markRead.mutate(undefined)}
            >
              <CheckCheck className="size-4" /> 全部已读
            </Button>
          </>
        }
      />

      <PageSection>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : isError ? (
          <PageMessage
            title="通知加载失败"
            description="网络或服务暂时不可用，可以稍后重试。"
            action={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                重新加载
              </Button>
            }
          />
        ) : notifications.length === 0 ? (
          <PageMessage
            icon={<Bell className="size-8" />}
            title={unreadOnly ? '没有未读通知' : '暂无通知'}
            description={unreadOnly ? '都处理完了，切回「显示全部」看看历史消息。' : '有人回复、提及或点赞你时，会出现在这里。'}
          />
        ) : (
          notifications.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            let systemPayload: { title: string; body?: string; link?: string } | null = null;
            if (n.type === 'system' && n.content?.startsWith('{')) {
              try {
                const parsed = JSON.parse(n.content) as { title?: string; body?: string; link?: string };
                if (parsed && typeof parsed.title === 'string') {
                  systemPayload = { title: parsed.title, body: parsed.body, link: parsed.link };
                }
              } catch {
                // 旧格式纯文本
              }
            }
            const Icon = meta.icon;
            const read = Boolean(n.isRead);
            const targetLink = n.postId ? `/posts/${n.postId}` : null;
            return (
              <div
                key={n.id}
                className={`row-interactive flex items-start gap-3 border-b px-4 py-3.5 last:border-b-0 ${read ? '' : 'bg-primary/5'}`}
              >
                <div className={`mt-0.5 shrink-0 ${read ? 'text-muted-foreground' : 'text-primary'}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {n.actorName && (
                      <Link to={`/users/${n.actorName}`} className="font-medium hover:underline">
                        {n.actorName}
                      </Link>
                    )}{' '}
                    <span className="text-muted-foreground">{meta.label}</span>
                    {n.postTitle && targetLink && (
                      <Link to={targetLink} className="text-primary ml-1 hover:underline">
                        {n.postTitle.slice(0, 30)}
                      </Link>
                    )}
                  </p>
                  {systemPayload && (
                    <div className="mt-0.5">
                      <p className="text-xs font-medium">{systemPayload.title}</p>
                      {systemPayload.body && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-3 text-xs">{systemPayload.body}</p>
                      )}
                      {systemPayload.link && (
                        <Link
                          to={systemPayload.link}
                          onClick={() => {
                            if (!read) markRead.mutate([n.id]);
                          }}
                          className="text-primary mt-1 inline-block text-xs hover:underline"
                        >
                          查看详情 →
                        </Link>
                      )}
                    </div>
                  )}
                  {!systemPayload && n.content && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{n.content}</p>
                  )}
                  <span className="text-muted-foreground text-xs">{timeAgo(n.createdAt)}</span>
                </div>
                {!read ? (
                  <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={() => markRead.mutate([n.id])}>
                    标为已读
                  </Button>
                ) : (
                  <Badge variant="secondary" className="mt-1 shrink-0 font-normal">
                    已读
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </PageSection>

      <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
    </PageContainer>
  );
}
