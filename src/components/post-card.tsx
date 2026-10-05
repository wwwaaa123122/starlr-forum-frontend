import { Link } from 'react-router-dom';
import { Eye, Heart, MessageSquare, Pin, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatNumber, timeAgo } from '@/lib/utils';
import type { PostSummary } from '@/lib/types';

function tagNames(tags: PostSummary['tags']): string[] {
  if (!tags) return [];
  return tags.map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean);
}

export function PostCard({ post }: { post: PostSummary }) {
  const tags = tagNames(post.tags);
  const authorName = post.authorName ?? '匿名';
  return (
    <article className="hover:bg-accent/40 group flex gap-3 border-b px-4 py-3.5 transition-colors last:border-b-0">
      <Link to={`/users/${encodeURIComponent(authorName)}`} className="shrink-0" aria-label={`${authorName} 的主页`}>
        <Avatar className="size-9 border">
          <AvatarImage src={post.authorAvatar ?? undefined} alt={authorName} />
          <AvatarFallback>{authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {Boolean(post.isPinned) && (
            <Badge variant="secondary" className="gap-1 px-1.5 py-0">
              <Pin className="size-3" /> 置顶
            </Badge>
          )}
          {Boolean(post.isFeatured) && (
            <Badge variant="warning" className="gap-1 px-1.5 py-0">
              <Star className="size-3" /> 精华
            </Badge>
          )}
          <Link
            to={`/posts/${post.id}`}
            className="group-hover:text-primary line-clamp-2 text-[15px] font-semibold leading-snug"
          >
            {post.title}
          </Link>
        </div>

        {post.excerpt && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-[13px] leading-relaxed">{post.excerpt}</p>
        )}

        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Link to={`/categories/${post.categorySlug}`} className="hover:text-foreground">
            {post.categoryName}
          </Link>
          <Link to={`/users/${encodeURIComponent(authorName)}`} className="hover:text-foreground">
            {authorName}
          </Link>
          <span>{timeAgo(post.lastReplyAt ?? post.createdAt)}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" /> {formatNumber(post.replyCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3" /> {formatNumber(post.likeCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3" /> {formatNumber(post.viewCount)}
          </span>
          {tags.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}&type=post`}>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="flex gap-3 border-b px-4 py-3.5">
      <div className="bg-muted size-9 shrink-0 animate-pulse rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="bg-muted h-4 w-3/5 animate-pulse rounded" />
        <div className="bg-muted h-3 w-full animate-pulse rounded" />
        <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
      </div>
    </div>
  );
}
