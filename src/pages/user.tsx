import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, FileText, MessageSquare } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PostCard, PostCardSkeleton } from '@/components/post-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownView } from '@/components/markdown';
import { formatNumber, timeAgo } from '@/lib/utils';
import type { Pagination, PostSummary, UserProfile } from '@/lib/types';
import { assetUrl } from '@/lib/base-url';

interface UserReply {
  id: string;
  content: string;
  createdAt: string;
  postId: string;
  postTitle: string;
}

export function UserPage() {
  const { username = '' } = useParams();
  const { user: currentUser } = useAuth();
  const [replyPage, setReplyPage] = useState(1);
  const [likesPage, setLikesPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: () => api<{ user: UserProfile }>(`/api/users/${encodeURIComponent(username)}`),
    enabled: Boolean(username),
  });

  const { data: postsData } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () =>
      api<{ posts: PostSummary[]; pagination: Pagination }>(
        `/api/users/${encodeURIComponent(username)}/posts?pageSize=20`,
      ),
    enabled: Boolean(username),
  });

  const { data: repliesData } = useQuery({
    queryKey: ['user-replies', username, replyPage],
    queryFn: () =>
      api<{ replies: UserReply[]; pagination: Pagination }>(
        `/api/users/${encodeURIComponent(username)}/replies?page=${replyPage}&pageSize=20`,
      ),
    enabled: Boolean(username),
  });

  // 注意：所有 hooks 必须在任何提前 return 之前调用（React Hooks 规则）
  const likesEnabled = Boolean(username);
  const { data: likesData, error: likesError } = useQuery({
    queryKey: ['user-likes', username, likesPage],
    queryFn: () =>
      api<{ posts: PostSummary[]; pagination: Pagination }>(
        `/api/users/${encodeURIComponent(username)}/likes?page=${likesPage}&pageSize=20`,
      ),
    enabled: likesEnabled,
    retry: false,
  });
  const likesForbidden =
    likesError instanceof ApiClientError && likesError.code === 'LIKES_PRIVATE';

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Skeleton className="h-36 w-full rounded-none" />
      </div>
    );
  }

  const profile = data?.user;
  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">用户不存在</p>
      </div>
    );
  }

  const isSelf = currentUser?.username === profile.username;
  const likesVisible = isSelf || profile.likesPublic === true || !likesForbidden;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar className="size-16 border sm:size-20">
            <AvatarImage src={assetUrl(profile.avatarUrl)} alt={profile.nickname} />
            <AvatarFallback className="text-xl">{profile.nickname.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold">{profile.nickname}</h1>
              <span className="text-muted-foreground text-sm">@{profile.username}</span>
              {profile.uid != null && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  UID {profile.uid}
                </Badge>
              )}
              {profile.role === 'admin' && <Badge variant="destructive">管理员</Badge>}
              {profile.role === 'moderator' && <Badge variant="secondary">版主</Badge>}
              {profile.banned && <Badge variant="destructive">已封禁</Badge>}
            </div>
            {profile.bio && <MarkdownView content={profile.bio} className="text-muted-foreground mt-1 text-sm" />}
            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3.5" /> 帖子 {formatNumber(profile.postCount)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3.5" /> 回复 {formatNumber(profile.replyCount)}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" /> 加入于 {timeAgo(profile.createdAt)}
              </span>
            </div>
            {isSelf && (
              <Link to="/settings" className="text-primary mt-3 inline-block text-sm hover:underline">
                编辑个人资料 →
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="mt-6">
        <TabsList>
          <TabsTrigger value="posts">帖子（{formatNumber(profile.postCount)}）</TabsTrigger>
          <TabsTrigger value="replies">回复（{formatNumber(profile.replyCount)}）</TabsTrigger>
          {likesVisible && <TabsTrigger value="likes">喜欢</TabsTrigger>}
        </TabsList>

        <TabsContent value="posts" className="mt-3">
          <div className="bg-card rounded-none border">
            {(postsData?.posts.length ?? 0) === 0 ? (
              <p className="text-muted-foreground px-4 py-10 text-center text-sm">还没有发布过帖子</p>
            ) : (
              postsData!.posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="replies" className="mt-3">
          <div className="bg-card rounded-none border divide-y">
            {(repliesData?.replies.length ?? 0) === 0 ? (
              <p className="text-muted-foreground px-4 py-10 text-center text-sm">还没有发表过回复</p>
            ) : (
              repliesData!.replies.map((reply) => (
                <div key={reply.id} className="px-4 py-3.5">
                  <Link to={`/posts/${reply.postId}`} className="text-muted-foreground text-xs hover:text-foreground">
                    回复了帖子《{reply.postTitle}》 · {timeAgo(reply.createdAt)}
                  </Link>
                  <MarkdownView content={reply.content.slice(0, 300)} className="mt-1 text-sm" />
                </div>
              ))
            )}
          </div>
          {repliesData && repliesData.pagination.totalPages > 1 && (
            <div className="mt-3 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={replyPage <= 1}
                onClick={() => setReplyPage((p) => p - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={replyPage >= repliesData.pagination.totalPages}
                onClick={() => setReplyPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="likes" className="mt-3">
          <div>
            {(likesData?.posts.length ?? 0) === 0 ? (
              <p className="text-muted-foreground bg-card rounded-none border px-4 py-10 text-center text-sm">还没有喜欢的帖子</p>
            ) : (
              likesData!.posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
          {likesData && likesData.pagination.totalPages > 1 && (
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={likesPage <= 1} onClick={() => setLikesPage((p) => p - 1)}>
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={likesPage >= likesData.pagination.totalPages}
                onClick={() => setLikesPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
