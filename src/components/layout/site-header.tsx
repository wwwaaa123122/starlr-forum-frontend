import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Compass,
  Cookie,
  Heart,
  Home,
  LogOut,
  Menu,
  Moon,
  PenLine,
  Rss,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  User,
} from 'lucide-react';
import { assetUrl } from '@/lib/base-url';
import { useTheme } from 'next-themes';
import { openCookieSettings } from '@/lib/consent';
import { feedUrl, useSiteConfig } from '@/lib/site-config';
import { API_BASE } from '@/lib/base-url';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const THEME_ORDER = ['light', 'dark', 'system'] as const;
const THEME_LABEL: Record<string, string> = { light: '浅色', dark: '深色', system: '跟随系统' };

/** 顶栏导航统一态：默认 muted，hover 浅底，当前路由高亮（原先没有激活态） */
function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-colors',
    'hover:bg-accent hover:text-foreground',
    isActive ? 'bg-accent text-foreground' : 'text-muted-foreground',
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = () => {
    const idx = THEME_ORDER.indexOf((theme ?? 'system') as (typeof THEME_ORDER)[number]);
    const target = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setTheme(target);
    toast.success(`主题：${THEME_LABEL[target]}`);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`切换主题（当前：${THEME_LABEL[theme ?? 'system']}）`}
      title={`主题：${THEME_LABEL[theme ?? 'system']}（点击切换 浅色→深色→跟随系统）`}
      onClick={next}
    >
      {/* 太阳/月亮跟随实际外观切换（跟随系统时也显示真实生效的明暗状态） */}
      <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api<{ unread: number }>('/api/notifications/unread-count'),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
  const unread = data?.unread ?? 0;
  if (!user) return null;
  return (
    <Button asChild variant="ghost" size="icon" aria-label={unread > 0 ? `通知（${unread} 条未读）` : '通知'} className="relative">
      <Link to="/notifications">
        <Bell className="size-[1.15rem]" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 rounded-none px-1 text-[10px] leading-none">
            {unread > 99 ? '99+' : unread}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const { user, logout, isModerator } = useAuth();
  const { siteName, registrationEnabled } = useSiteConfig();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // 展开时立即聚焦输入框
  useEffect(() => {
    if (searchOpen) mobileSearchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    navigate('/');
  };

  const navItems = (
    <>
      <NavLink to="/" end className={navLinkClass}>
        <Home className="size-4" /> 首页
      </NavLink>
      <NavLink to="/categories" className={navLinkClass}>
        <Compass className="size-4" /> 分类
      </NavLink>
      {user && (
        <NavLink to="/notifications" className={navLinkClass}>
          <Bell className="size-4" /> 通知
        </NavLink>
      )}
    </>
  );

  return (
    <header className="bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        {/* 移动端菜单 */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="菜单">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="text-primary size-4" /> {siteName}
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" onClick={() => setMobileOpen(false)}>
              {navItems}
              {user && (
                <NavLink to={`/users/${user.username}`} className={navLinkClass}>
                  <User className="size-4" /> 我的主页
                </NavLink>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex shrink-0 items-center gap-2 font-bold">
          <Sparkles className="text-primary size-5" />
          <span className="hidden max-w-40 truncate sm:inline">{siteName}</span>
          <span className="sm:hidden">Starlr</span>
        </Link>

        {/* 桌面导航 */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">{navItems}</nav>

        <div className="flex-1" />

        {/* 搜索 */}
        <form onSubmit={handleSearch} className="relative hidden w-56 sm:block md:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索帖子 / 用户…"
            className="h-9 pl-8"
            aria-label="搜索"
          />
        </form>

        {/* 移动端：搜索按钮（在通知旁），点击展开 */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="搜索"
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen((v) => !v)}
        >
          <Search className="size-[1.15rem]" />
        </Button>
        <NotificationBell />
        <ThemeToggle />

        {user ? (
          <>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/new">
                <PenLine className="size-4" /> 发帖
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-none outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  aria-label="用户菜单"
                >
                  <Avatar className="size-8 border">
                    <AvatarImage src={assetUrl(user.avatarUrl)} alt={user.nickname} />
                    <AvatarFallback>{user.nickname.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold">{user.nickname}</div>
                  <div className="text-muted-foreground text-xs font-normal">@{user.username}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/me/likes')}>
                  <Heart className="size-4" /> 我的点赞
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/me/favorites')}>
                  <Star className="size-4" /> 我的收藏
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/users/${user.username}`)}>
                  <User className="size-4" /> 我的主页
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="size-4" /> 账号设置
                </DropdownMenuItem>
                {isModerator && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <ShieldCheck className="size-4" /> 管理后台
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => void handleLogout()}>
                  <LogOut className="size-4" /> 退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">登录</Link>
            </Button>
            {registrationEnabled && (
              <Button asChild size="sm">
                <Link to="/register">注册</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 移动端展开的搜索行 */}
      {searchOpen && (
        <div className="bg-background/95 border-t sm:hidden">
          <form onSubmit={handleSearch} className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                ref={mobileSearchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                placeholder="搜索帖子 / 用户…"
                className="h-9 pl-8"
                aria-label="搜索"
              />
            </div>
            <Button type="submit" size="sm">
              搜索
            </Button>
          </form>
        </div>
      )}
    </header>
  );
}

const footerLinkClass = 'inline-flex items-center gap-1 hover:text-foreground hover:underline underline-offset-4';

export function SiteFooter() {
  const { siteName, siteFooter } = useSiteConfig();
  return (
    <footer className="safe-bottom bg-background/60 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-xs sm:flex-row sm:justify-between">
        <span className="text-center sm:text-left">
          © {new Date().getFullYear()} {siteName}
          {siteFooter ? ` · ${siteFooter}` : ''}
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link to="/terms" className={footerLinkClass}>
            用户协议
          </Link>
          <Link to="/privacy" className={footerLinkClass}>
            隐私政策
          </Link>
          {/* 后端一直在出 /feed.xml 与 /sitemap.xml，页面此前没有任何入口 */}
          <a href={feedUrl()} target="_blank" rel="noreferrer" className={footerLinkClass}>
            <Rss className="size-3" /> RSS
          </a>
          <a href={`${API_BASE}/sitemap.xml`} target="_blank" rel="noreferrer" className={footerLinkClass}>
            站点地图
          </a>
          <button type="button" onClick={() => openCookieSettings()} className={footerLinkClass}>
            <Cookie className="size-3" /> Cookie 设置
          </button>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="text-primary size-3.5" />
            运行在 Cloudflare 边缘网络上
          </span>
        </nav>
      </div>
    </footer>
  );
}
