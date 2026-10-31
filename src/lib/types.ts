/** API 响应类型（与后端路由保持一致） */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  postCount: number;
  /** 发布权限：everyone = 所有用户；staff = 仅版主及以上 */
  postPolicy: 'everyone' | 'staff';
}

export interface PostSummary {
  id: string;
  authorUid?: number | null;
  title: string;
  excerpt?: string;
  isPinned: number | boolean;
  isFeatured: number | boolean;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt?: string;
  lastReplyAt: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  categoryId?: string;
  categoryName: string;
  categorySlug: string;
  tags?: string[] | { name: string }[];
}

export interface PostDetail extends PostSummary {
  content: string;
  isDeleted: boolean;
  editedAt: string | null;
  liked: boolean;
  favorited: boolean;
  isAuthor: boolean;
  canModerate: boolean;
  authorUsername?: string;
  authorRole?: string;
}

export interface Reply {
  id: string;
  authorUid?: number | null;
  content: string;
  parentReplyId: string | null;
  replyToUserId: string | null;
  replyToUserName: string | null;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  /** 软删除标记：管理员/辖区版主可见，用于复核 */
  isDeleted?: boolean;
  liked?: number | boolean;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  postId: string | null;
  replyId: string | null;
  content: string | null;
  isRead: number | boolean;
  createdAt: string;
  actorName: string | null;
  actorAvatar: string | null;
  postTitle: string | null;
}

export interface UserProfile {
  id: string;
  uid: number | null;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string;
  role: string;
  postCount: number;
  replyCount: number;
  createdAt: string;
  banned?: boolean;
  likesPublic?: boolean;
  backgroundUrl?: string | null;
  hasGithub?: boolean;
}

export interface AdminUser {
  id: string;
  uid: number;
  username: string;
  email: string;
  nickname: string;
  role: string;
  status: string;
  postCount: number;
  replyCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified?: number | boolean;
  /** 当前生效禁言的到期时间（null/undefined = 永久禁言时也为 null，需配合 mutedPermanent） */
  mutedUntil?: string | null;
  mutedPermanent?: boolean;
}

export interface AdminPost {
  id: string;
  title: string;
  isDeleted: number;
  isPinned: number;
  isFeatured: number;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  authorName: string;
  categoryName: string;
}

export interface ReportItem {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  detail: string;
  status: string;
  resolutionNote: string;
  createdAt: string;
  handledAt: string | null;
  reporterName: string;
  /** 被举报内容（软删除后仍返回，便于回溯） */
  targetTitle?: string | null;
  targetContent?: string | null;
  targetAuthorName?: string | null;
  targetUserId?: string | null;
  targetDeleted?: number | boolean;
}

export interface AdminStaff {
  id: string;
  uid: number;
  username: string;
  email: string;
  nickname: string;
  role: 'admin' | 'moderator';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string;
  ip: string;
  createdAt: string;
  actorName: string | null;
}
