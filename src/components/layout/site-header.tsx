import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Compass,
  Home,
  Monitor,
  LogOut,
  Menu,
  Moon,
  PenLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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
      {theme === 'system' ? (
        <Monitor className="size-[1.2rem]" />
      ) : (
        <>
          <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </>
      )}
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
    <Button asChild variant="ghost" size="icon" aria-label="通知" className="relative">
      <Link to="/notifications">
        <Bell className="size-[1.15rem]" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none">
            {unread > 99 ? '99+' : unread}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const { user, logout, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    navigate('/');
  };

  const navItems = (
    <>
      <NavLink to="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
        <Home className="size-4" /> 首页
      </NavLink>
      <NavLink
        to="/categories"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        <Compass className="size-4" /> 分类
      </NavLink>
      {user && (
        <NavLink
          to="/notifications"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
        >
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
                <Sparkles className="text-primary size-4" /> 星辰旅人论坛
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" onClick={() => setMobileOpen(false)}>
              {navItems}
              {user && (
                <NavLink
                  to={`/users/${user.username}`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  <User className="size-4" /> 我的主页
                </NavLink>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex shrink-0 items-center gap-2 font-bold">
          <Sparkles className="text-primary size-5" />
          <span className="hidden sm:inline">星辰旅人论坛</span>
          <span className="sm:hidden">星辰旅人</span>
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
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer" aria-label="用户菜单">
                  <Avatar className="size-8 border">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.nickname} />
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
                <DropdownMenuItem onClick={() => navigate(`/users/${user.username}`)}>
                  <User className="size-4" /> 我的主页
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="size-4" /> 账号设置
                </DropdownMenuItem>
                {isModerator && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <ShieldCheck className="size-4" /> 管理后台
                    {isAdmin ? '' : ''}
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
            <Button asChild size="sm">
              <Link to="/register">注册</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="safe-bottom border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs sm:flex-row">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary size-3.5" />
          <span>星辰旅人论坛 · 运行在 Cloudflare 边缘网络</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/search" className="hover:text-foreground">
            搜索
          </Link>
          <a
            href="https://www.cloudflare.com/developer-platform/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Workers + D1 + KV + R2
          </a>
        </div>
      </div>
    </footer>
  );
}
