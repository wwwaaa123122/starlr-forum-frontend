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
