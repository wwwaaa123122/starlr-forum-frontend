import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, FileText, MessageSquare, Settings } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePageTitle } from '@/lib/use-page-title';
import { PostCard, PostCardSkeleton } from '@/components/post-card';
import { PaginationControls } from '@/components/pagination-controls';
import { PageContainer, PageMessage, PageSection } from '@/components/layout/page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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

/** 用户主页各 Tab 的列表外壳：统一边框、空状态与分页位置 */
function TabListShell({ children }: { children: ReactNode }) {
  return <PageSection className="mt-3">{children}</PageSection>;
}

export function UserPage() {
  const { username = '' } = useParams();
  const { user: currentUser } = useAuth();
  const [postPage, setPostPage] = useState(1);
  const [replyPage, setReplyPage] = useState(1);
  const [likesPage, setLikesPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: () => api<{ user: UserProfile }>(`/api/users/${encodeURIComponent(username)}`),
    enabled: Boolean(username),
  });

  // 后端 /users/:username/posts 支持分页，此前只取前 20 条且没有翻页入口
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', username, postPage],
    queryFn: () =>
      api<{ posts: PostSummary[]; pagination: Pagination }>(
        `/api/users/${encodeURIComponent(username)}/posts?page=${postPage}&pageSize=20`,
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
  const { data: likesData, error: likesError } = useQuery({
    queryKey: ['user-likes', username, likesPage],
    queryFn: () =>
      api<{ posts: PostSummary[]; pagination: Pagination }>(
        `/api/users/${encodeURIComponent(username)}/likes?page=${likesPage}&pageSize=20`,
      ),
    enabled: Boolean(username),
    retry: false,
  });
  const likesForbidden = likesError instanceof ApiClientError && likesError.code === 'LIKES_PRIVATE';

  const profile = data?.user;
  usePageTitle(profile ? profile.nickname : username ? `@${username}` : '用户主页');

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-36 w-full" />
        <Skeleton className="mt-4 h-9 w-64" />
        <Skeleton className="mt-3 h-48 w-full" />
      </PageContainer>
    );
  }

  if (!profile) {
    return (
      <PageContainer>
        <PageMessage
          title="用户不存在"
          description="该账号可能已注销，或链接输入有误。"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/">返回首页</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const isSelf = currentUser?.username === profile.username;
  const likesVisible = isSelf || profile.likesPublic === true || !likesForbidden;

  return (
    <PageContainer>
      <PageSection contentClassName="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
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
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/settings">
                  <Settings className="size-3.5" /> 编辑个人资料
                </Link>
              </Button>
            )}
          </div>
        </div>
      </PageSection>

      <Tabs defaultValue="posts" className="mt-6">
        <TabsList>
          <TabsTrigger value="posts">帖子（{formatNumber(profile.postCount)}）</TabsTrigger>
          <TabsTrigger value="replies">回复（{formatNumber(profile.replyCount)}）</TabsTrigger>
          {likesVisible && <TabsTrigger value="likes">喜欢</TabsTrigger>}
        </TabsList>

        <TabsContent value="posts">
          <TabListShell>
            {postsLoading ? (
              <>
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </>
            ) : (postsData?.posts.length ?? 0) === 0 ? (
              <PageMessage title="还没有发布过帖子" description={isSelf ? '去发一篇，让大家认识你。' : undefined} />
            ) : (
              postsData!.posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </TabListShell>
          <PaginationControls pagination={postsData?.pagination} onPageChange={setPostPage} />
        </TabsContent>

        <TabsContent value="replies">
          <TabListShell>
            {(repliesData?.replies.length ?? 0) === 0 ? (
              <PageMessage title="还没有发表过回复" />
            ) : (
              repliesData!.replies.map((reply) => (
                <div key={reply.id} className="border-b px-4 py-3.5 last:border-b-0">
                  <Link to={`/posts/${reply.postId}`} className="text-muted-foreground text-xs hover:text-foreground">
                    回复了帖子《{reply.postTitle}》 · {timeAgo(reply.createdAt)}
                  </Link>
                  <MarkdownView content={reply.content.slice(0, 300)} className="mt-1 text-sm" />
                </div>
              ))
            )}
          </TabListShell>
          <PaginationControls pagination={repliesData?.pagination} onPageChange={setReplyPage} />
        </TabsContent>

        <TabsContent value="likes">
          <TabListShell>
            {(likesData?.posts.length ?? 0) === 0 ? (
              <PageMessage title="还没有喜欢的帖子" description={isSelf ? '在帖子下方点个赞就会出现在这里。' : undefined} />
            ) : (
              likesData!.posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </TabListShell>
          <PaginationControls pagination={likesData?.pagination} onPageChange={setLikesPage} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
