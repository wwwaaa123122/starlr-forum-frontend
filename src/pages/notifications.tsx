import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Heart, MessageSquare, ShieldAlert, Sparkles, Star, AtSign } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list', unreadOnly],
    queryFn: () =>
      api<{ notifications: NotificationItem[]; unread: number; pagination: Pagination }>(
        `/api/notifications?pageSize=30${unreadOnly ? '&unreadOnly=1' : ''}`,
      ),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (ids?: string[]) =>
      api('/api/notifications/read', { method: 'POST', body: ids ? { ids } : {} }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (!loading && !user) {
    navigate('/login');
    return null;
  }

  const notifications = data?.notifications ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Bell className="size-5" /> 通知
          {(data?.unread ?? 0) > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {data!.unread} 条未读
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setUnreadOnly((v) => !v)}>
            {unreadOnly ? '显示全部' : '只看未读'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => markRead.mutate(undefined)}>
            <CheckCheck className="size-4" /> 全部已读
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        {isLoading ? (
          <>
            <Skeleton className="m-4 h-12" />
            <Skeleton className="m-4 h-12" />
            <Skeleton className="m-4 h-12" />
          </>
        ) : notifications.length === 0 ? (
          <p className="text-muted-foreground px-4 py-12 text-center text-sm">
            {unreadOnly ? '没有未读通知 🎉' : '暂无通知'}
          </p>
        ) : (
          notifications.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            const Icon = meta.icon;
            const read = Boolean(n.isRead);
            const targetLink = n.postId ? `/posts/${n.postId}` : null;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 border-b px-4 py-3.5 last:border-b-0 ${read ? '' : 'bg-primary/5'}`}
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
                  {n.content && <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{n.content}</p>}
                  <span className="text-muted-foreground text-xs">{timeAgo(n.createdAt)}</span>
                </div>
                {!read && (
                  <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={() => markRead.mutate([n.id])}>
                    已读
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
