import { ApiClientError } from '@/lib/api';

/** 统一提取后端错误信息（各管理 Tab 共用） */
export function errMsg(e: unknown): string {
  return e instanceof ApiClientError ? e.message : '操作失败';
}

/** 分类常用图标（点击即选） */
export const CATEGORY_EMOJIS = [
  '📢','💻','💬','❓','🎨','🎮','📚','🎬','🎵','⚽','🍜','✈️','🌱','🔧','📷','🧠','🚀','⭐','🔥','💡','🏆','🐾','💼','🛒','📝','🎓','🏠','❤️','🌈','☕',
];

export interface AdminStats {
  users: number;
  posts: number;
  replies: number;
  pendingReports: number;
  bannedUsers: number;
  totalViews: number;
  avgViews: number;
  topPosts: { id: string; title: string; viewCount: number; replyCount: number; likeCount: number; authorName: string }[];
}

export interface ModeratorRow {
  userId: string;
  categoryId: string;
  createdAt: string;
  uid: number;
  username: string;
  nickname: string;
  categoryName: string;
  categorySlug: string;
}

export interface SiteWideModerator {
  userId: string;
  uid: number;
  username: string;
  nickname: string;
  createdAt: string;
}

/** 全站管辖的特殊标记值（不与真实版块 id 冲突） */
export const SITE_WIDE = '__site_wide__';

export interface ViewStats {
  totals: { today: number; yesterday: number; week: number; month: number; allTime: number };
  daily: { date: string; views: number }[];
  top: { postId: string; title: string; views: number }[];
  recent: {
    id: string;
    postId: string;
    title: string;
    country: string;
    city: string;
    colo: string;
    device: string;
    userId: string | null;
    userName: string | null;
    createdAt: string;
  }[];
}

export const DEVICE_LABEL: Record<string, string> = { mobile: '手机', tablet: '平板', desktop: '电脑' };

export interface SeoPushLog {
  id: string;
  postId: string;
  url: string;
  title: string | null;
  channel: 'baidu' | 'indexnow';
  event: string;
  status: 'ok' | 'failed';
  httpCode: number | null;
  attempts: number;
  message: string | null;
  createdAt: string;
}

export const SEO_EVENT_LABEL: Record<string, string> = {
  create: '发布',
  edit: '编辑',
  delete: '删除',
  retry: '重试',
  cron: '定时校验',
};

/** HTTP 状态码含义速查（IndexNow / 百度常见响应） */
export const SEO_HTTP_HINT: Record<number, string> = {
  200: '已收录（URL 此前已提交过）',
  202: '已受理，等待抓取',
  400: '请求格式无效',
  403: 'key 无效或域名未验证',
  422: 'URL 与 key 的域名不匹配',
  429: '请求过于频繁被限流',
};

export interface ServiceView {
  key: string;
  label: string;
  configured: boolean;
  fields: { name: string; label: string; secret?: boolean; placeholder?: string; value?: string | null }[];
  accounts?: { from: string; source: string; api_key_masked: string }[];
}
