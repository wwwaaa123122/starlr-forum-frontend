import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { CookieConsent } from '@/components/cookie-consent';
import { ErrorBoundary } from '@/components/error-boundary';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { initConsent } from '@/lib/consent';
import { ScrollToTop } from '@/lib/use-page-title';
import { HomePage } from '@/pages/home';
import { UnverifiedBanner } from '@/pages/verify-email';

// 路由级代码分割：首页 / 顶栏横幅常驻，其余页面按需加载，减小首屏 JS
const CategoriesPage = lazy(() => import('@/pages/categories').then((m) => ({ default: m.CategoriesPage })));
const PostDetailPage = lazy(() => import('@/pages/post-detail').then((m) => ({ default: m.PostDetailPage })));
const PostEditorPage = lazy(() => import('@/pages/post-editor').then((m) => ({ default: m.PostEditorPage })));
const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })));
const AppAuthPage = lazy(() => import('@/pages/app-auth').then((m) => ({ default: m.AppAuthPage })));
const OAuthCallback = lazy(() => import('@/pages/oauth-callback'));
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/reset-password').then((m) => ({ default: m.ResetPasswordPage })));
const RegisterPage = lazy(() => import('@/pages/register').then((m) => ({ default: m.RegisterPage })));
const UserPage = lazy(() => import('@/pages/user').then((m) => ({ default: m.UserPage })));
const NotificationsPage = lazy(() => import('@/pages/notifications').then((m) => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('@/pages/settings').then((m) => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import('@/pages/search').then((m) => ({ default: m.SearchPage })));
const AdminPage = lazy(() => import('@/pages/admin').then((m) => ({ default: m.AdminPage })));
const NotFoundPage = lazy(() => import('@/pages/not-found').then((m) => ({ default: m.NotFoundPage })));
const PrivacyPage = lazy(() => import('@/pages/legal').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/legal').then((m) => ({ default: m.TermsPage })));
const MyLikesPage = lazy(() => import('@/pages/my-lists').then((m) => ({ default: m.MyLikesPage })));
const MyFavoritesPage = lazy(() => import('@/pages/my-lists').then((m) => ({ default: m.MyFavoritesPage })));
const VerifyEmailPage = lazy(() => import('@/pages/verify-email').then((m) => ({ default: m.VerifyEmailPage })));

/** 路由切换时的加载骨架（与列表骨架一致的全宽占位） */
function RouteFallback() {
  return (
    <div className="px-4 py-6">
      <ListSkeleton rows={3} />
    </div>
  );
}

export default function App() {
  initConsent();
  const { pathname } = useLocation();
  // Android 登录桥接页是独立全屏页面，不挂站点顶栏/页脚/Cookie 横幅
  const bare = pathname.replace(/\/+$/, '') === '/app-auth';
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      {/* 键盘用户第一个 Tab 即可跳过导航直达正文，与全站统一焦点样式配套 */}
      {!bare && (
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only rounded-none px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          跳到主要内容
        </a>
      )}
      {!bare && <SiteHeader />}
      {!bare && <UnverifiedBanner />}
      <main id="main" className="flex-1">
        <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/:slug" element={<HomePage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/new" element={<PostEditorPage />} />
          <Route path="/edit/:id" element={<PostEditorPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/users/:username" element={<UserPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/me/likes" element={<MyLikesPage />} />
          <Route path="/me/favorites" element={<MyFavoritesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app-auth" element={<AppAuthPage />} />
          <Route path="/auth/github/done" element={<OAuthCallback />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
      {!bare && <SiteFooter />}
      {!bare && <CookieConsent />}
    </div>
  );
}
