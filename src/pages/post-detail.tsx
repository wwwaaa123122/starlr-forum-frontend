import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Eye,
  Flag,
  Heart,
  Link2,
  MessageSquare,
  Pencil,
  Pin,
  Send,
  Share2,
  Star,
  Trash2,
} from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MarkdownView } from '@/components/markdown';
import { MentionTextarea } from '@/components/mention-textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploadButton } from '@/components/image-upload-button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatNumber, timeAgo } from '@/lib/utils';
import type { Pagination, PostDetail, Reply } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------
// 举报对话框
// ---------------------------------------------------------------
function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetType: 'post' | 'reply';
  targetId: string;
}) {
  const [reason, setReason] = useState('spam');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api('/api/reports', { method: 'POST', body: { targetType, targetId, reason, detail } });
      toast.success('举报已提交，管理员会尽快处理');
      onOpenChange(false);
      setDetail('');
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '举报失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>举报内容</DialogTitle>
          <DialogDescription>请选择举报原因，恶意举报可能导致账号受限。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>原因</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">垃圾广告 / 灌水</SelectItem>
                <SelectItem value="abuse">辱骂 / 人身攻击</SelectItem>
                <SelectItem value="porn">色情低俗</SelectItem>
                <SelectItem value="illegal">违法违规</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>补充说明（可选）</Label>
            <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={1000} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            提交举报
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------
// 单条回复
// ---------------------------------------------------------------
function ReplyItem({
  reply,
  postId,
  onReply,
  replyPage,
}: {
  reply: Reply;
  postId: string;
  replyPage: number;
  onReply: (reply: Reply) => void;
}) {
  const { user, isModerator } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [reportOpen, setReportOpen] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['replies', postId] });
    void queryClient.invalidateQueries({ queryKey: ['post', postId] });
  };

  // 单一开关式 mutation：以 reply.liked 为准，成功后直接应用服务端权威计数
  const replyLikeMutation = useMutation({
    mutationFn: () =>
      api<{ liked: boolean; likeCount: number }>(`/api/replies/${reply.id}/like`, {
        method: reply.liked ? 'DELETE' : 'POST',
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(['replies', postId, replyPage], (old: { replies: Reply[] } | undefined) =>
        old
          ? {
              ...old,
              replies: old.replies.map((r) => (r.id === reply.id ? { ...r, liked: res.liked, likeCount: res.likeCount } : r)),
            }
          : old,
      );
      invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : '操作失败'),
  });

  const saveEdit = async () => {
    try {
      await api(`/api/replies/${reply.id}`, { method: 'PATCH', body: { content: editContent } });
      toast.success('回复已更新');
      setEditing(false);
      invalidate();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '更新失败');
    }
  };

  const remove = async () => {
    try {
      await api(`/api/replies/${reply.id}`, { method: 'DELETE' });
      toast.success('回复已删除');
      invalidate();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '删除失败');
    }
  };

  const canEdit = user && (user.id === reply.authorId || isModerator);

  return (
    <div className="border-b px-4 py-4 last:border-b-0">
      <div className="flex gap-3">
        <Link to={`/users/${reply.authorName}`} className="shrink-0">
          <Avatar className="size-8 border">
            <AvatarImage src={reply.authorAvatar ?? undefined} alt={reply.authorName} />
            <AvatarFallback>{reply.authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link to={`/users/${reply.authorName}`} className="font-medium hover:underline">
              {reply.authorName}
            </Link>
            {reply.authorRole === 'admin' && <Badge variant="destructive" className="px-1 py-0 text-[10px]">管理员</Badge>}
            {reply.authorRole === 'moderator' && <Badge variant="secondary" className="px-1 py-0 text-[10px]">版主</Badge>}
            <span className="text-muted-foreground">{timeAgo(reply.createdAt)}</span>
            {reply.editedAt && (
              <span
                className="text-muted-foreground inline-flex items-center gap-1"
                title={`编辑于 ${new Date(reply.editedAt).toLocaleString('zh-CN')}`}
              >
                <Pencil className="size-3" /> 已编辑
              </span>
            )}
            {reply.replyToUserName && (
              <span className="text-muted-foreground">
                回复 <span className="text-primary">@{reply.replyToUserName}</span>
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <MentionTextarea value={editContent} onChange={setEditContent} rows={4} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void saveEdit()}>
                  保存
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <MarkdownView content={reply.content} className="mt-1.5 text-sm" />
          )}

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-1 text-xs">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2"
              onClick={() => replyLikeMutation.mutate()}
            >
              <Heart className={`size-3.5 ${reply.liked ? 'fill-current text-rose-500' : ''}`} />
              {formatNumber(reply.likeCount)}
            </Button>
            {user && (
              <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2" onClick={() => onReply(reply)}>
                <MessageSquare className="size-3.5" /> 回复
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> 编辑
              </Button>
            )}
            {user && (user.id === reply.authorId || isModerator) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2">
                    <Trash2 className="size-3.5" /> 删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除这条回复？</AlertDialogTitle>
                    <AlertDialogDescription>删除后内容不再展示，管理员可恢复。</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void remove()}>删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {user && user.id !== reply.authorId && (
              <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2" onClick={() => setReportOpen(true)}>
                <Flag className="size-3.5" /> 举报
              </Button>
            )}
          </div>
        </div>
      </div>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="reply" targetId={reply.id} />
    </div>
  );
}

// ---------------------------------------------------------------
// 帖子详情页
// ---------------------------------------------------------------
export function PostDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, isModerator } = useAuth();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState('');
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [replyPage, setReplyPage] = useState(1);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api<{ post: PostDetail }>(`/api/posts/${id}`),
    enabled: Boolean(id),
  });

  const { data: repliesData } = useQuery({
    queryKey: ['replies', id, replyPage],
    queryFn: () => api<{ replies: Reply[]; pagination: Pagination }>(`/api/posts/${id}/replies?page=${replyPage}&pageSize=50`),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

  const post = data?.post;

  // 浏览量（去重由服务端 KV 处理）
  useEffect(() => {
    if (!id) return;
    void api(`/api/posts/${id}/view`, { method: 'POST', retryOn401: false }).catch(() => undefined);
  }, [id]);

  const invalidatePost = () => {
    void queryClient.invalidateQueries({ queryKey: ['post', id] });
  };

  const likeMutation = useMutation({
    mutationFn: () => api<{ liked: boolean; likeCount: number }>(`/api/posts/${id}/like`, { method: post?.liked ? 'DELETE' : 'POST' }),
    onSuccess: (res) => {
      // 以服务端返回的权威值更新缓存，避免连点/乱序响应造成计数虚高
      queryClient.setQueryData(['post', id], (old: { post: PostDetail } | undefined) =>
        old ? { ...old, post: { ...old.post, liked: res.liked, likeCount: res.likeCount } } : old,
      );
      invalidatePost();
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : '操作失败'),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => api(`/api/posts/${id}/favorite`, { method: post?.favorited ? 'DELETE' : 'POST' }),
    onSuccess: () => {
      invalidatePost();
      toast.success(post?.favorited ? '已取消收藏' : '已收藏');
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : '操作失败'),
  });

  const submitReply = async () => {
    if (!replyContent.trim()) return;
    try {
      await api(`/api/posts/${id}/replies`, {
        method: 'POST',
        body: { content: replyContent, parentReplyId: replyTo?.id ?? null },
      });
      setReplyContent('');
      setReplyTo(null);
      toast.success('回复成功');
      await queryClient.invalidateQueries({ queryKey: ['replies', id] });
      invalidatePost();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '回复失败');
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('链接已复制到剪贴板');
      }
    } catch {
      /* 用户取消 */
    }
  };

  const deletePost = async () => {
    try {
      await api(`/api/posts/${id}`, { method: 'DELETE' });
      toast.success('帖子已删除');
      navigate('/');
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '删除失败');
    }
  };

  const toggleModeration = async (action: 'pin' | 'unpin' | 'feature' | 'unfeature' | 'restore') => {
    try {
      await api(`/api/admin/posts/${id}/${action}`, { method: 'POST' });
      toast.success('操作成功');
      invalidatePost();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '操作失败');
    }
  };

  const replies = useMemo(() => repliesData?.replies ?? [], [repliesData]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">帖子不存在或已被删除</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </div>
    );
  }

  const tags = (post.tags ?? []).map((t) => (typeof t === 'string' ? t : t.name));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" /> 返回
      </Button>

      {/* 帖子主体 */}
      <article className="bg-card rounded-xl border">
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {Boolean(post.isPinned) && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="size-3" /> 置顶
              </Badge>
            )}
            {Boolean(post.isFeatured) && (
              <Badge variant="warning" className="gap-1">
                <Star className="size-3" /> 精华
              </Badge>
            )}
            <Link to={`/categories/${post.categorySlug}`}>
              <Badge variant="outline">{post.categoryName}</Badge>
            </Link>
            {post.isDeleted && <Badge variant="destructive">已删除</Badge>}
          </div>

          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{post.title}</h1>

          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
            <Link to={`/users/${post.authorName}`} className="flex items-center gap-2">
              <Avatar className="size-6 border">
                <AvatarImage src={post.authorAvatar ?? undefined} alt={post.authorName} />
                <AvatarFallback>{post.authorName.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="text-foreground font-medium">{post.authorName}</span>
            </Link>
            <span>发布于 {timeAgo(post.createdAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" /> {formatNumber(post.viewCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3" /> {formatNumber(post.replyCount)}
            </span>
          </div>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`}>
                  <Badge variant="outline" className="font-normal">
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="p-5">
          {post.editedAt && (
            <p className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-xs" title={timeAgo(post.editedAt)}>
              <Pencil className="size-3" /> 已编辑
            </p>
          )}
          <MarkdownView content={post.content} />
        </div>

        <Separator />

        {/* 操作栏 */}
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Button
            variant={post.liked ? 'default' : 'outline'}
            size="sm"
            onClick={() => likeMutation.mutate()}
            disabled={!user || likeMutation.isPending}
          >
            <Heart className={`size-4 ${post.liked ? 'fill-current' : ''}`} /> 点赞 {formatNumber(post.likeCount)}
          </Button>
          <Button
            variant={post.favorited ? 'default' : 'outline'}
            size="sm"
            onClick={() => favoriteMutation.mutate()}
            disabled={!user || favoriteMutation.isPending}
          >
            <Star className={`size-4 ${post.favorited ? 'fill-current' : ''}`} /> 收藏 {formatNumber(post.favoriteCount)}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void share()}>
            <Share2 className="size-4" /> 分享
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href);
              toast.success('链接已复制');
            }}
          >
            <Link2 className="size-4" /> 复制链接
          </Button>

          {user && post.isAuthor && (
            <div className="flex shrink-0 basis-full items-center gap-2 sm:ml-auto sm:basis-auto">
              <Button variant="outline" size="sm" onClick={() => navigate(`/edit/${post.id}`)}>
                <Pencil className="size-4" /> 编辑
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="size-4" /> 删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除该帖子？</AlertDialogTitle>
                    <AlertDialogDescription>删除后帖子将不再展示，管理员可以恢复。</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void deletePost()}>删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {user && !post.isAuthor && (
            <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
              <Flag className="size-4" /> 举报
            </Button>
          )}

          {isModerator && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void toggleModeration(post.isPinned ? 'unpin' : 'pin')}>
                <Pin className="size-4" /> {post.isPinned ? '取消置顶' : '置顶'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void toggleModeration(post.isFeatured ? 'unfeature' : 'feature')}
              >
                <Star className="size-4" /> {post.isFeatured ? '取消精华' : '加精'}
              </Button>
              {Boolean(post.isDeleted) && (
                <Button variant="secondary" size="sm" onClick={() => void toggleModeration('restore')}>
                  恢复帖子
                </Button>
              )}
            </div>
          )}
        </div>
      </article>

      {/* 回复区 */}
      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold">全部回复（{post.replyCount}）</h2>

        {/* 回复输入 */}
        {user ? (
          <div className="bg-card mb-4 rounded-xl border p-4">
            {replyTo && (
              <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
                <span>
                  正在回复 <span className="text-primary">@{replyTo.authorName}</span>
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setReplyTo(null)}>
                  取消
                </Button>
              </div>
            )}
            <Tabs defaultValue="write">
              <TabsList className="mb-2">
                <TabsTrigger value="write">编写</TabsTrigger>
                <TabsTrigger value="preview">预览</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <div className="mb-2 flex justify-end">
                <ImageUploadButton
                  purpose="reply"
                  getValue={() => replyContent}
                  insertMarkdown={(md) => {
                    const el = replyRef.current;
                    if (!el) {
                      setReplyContent((c) => `${c}${c.endsWith('\n') || !c ? '' : '\n'}${md}`);
                      return;
                    }
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    setReplyContent((cur) => cur.slice(0, start) + md + cur.slice(end));
                    requestAnimationFrame(() => {
                      el.focus();
                      const pos = start + md.length;
                      el.setSelectionRange(pos, pos);
                    });
                  }}
                />
              </div>
              <MentionTextarea
                  textareaRef={replyRef}
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder="友善发言…（输入 @ 可提及他人）"
                  rows={4}
                  maxLength={20000}
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-24 rounded-md border p-3">
                  {replyContent.trim() ? <MarkdownView content={replyContent} /> : <p className="text-muted-foreground text-sm">没有可预览的内容</p>}
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">{replyContent.length} / 20000</span>
              <Button size="sm" onClick={() => void submitReply()} disabled={!replyContent.trim()}>
                <Send className="size-4" /> 发表回复
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card text-muted-foreground mb-4 rounded-xl border p-4 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              登录
            </Link>{' '}
            后参与讨论
          </div>
        )}

        <div className="bg-card rounded-xl border">
          {replies.length === 0 ? (
            <p className="text-muted-foreground px-4 py-10 text-center text-sm">还没有回复，来抢沙发～</p>
          ) : (
            replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                postId={id}
        replyPage={replyPage}
                onReply={(r) => {
                  setReplyTo(r);
                  document.querySelector('textarea')?.focus();
                }}
              />
            ))
          )}
        </div>

        {repliesData && repliesData.pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={replyPage <= 1} onClick={() => setReplyPage((p) => p - 1)}>
              上一页
            </Button>
            <span className="text-muted-foreground self-center text-sm">
              {replyPage} / {repliesData.pagination.totalPages}
            </span>
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
      </section>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="post" targetId={id} />
    </div>
  );
}
