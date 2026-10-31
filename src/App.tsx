import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { CookieConsent } from '@/components/cookie-consent';
import { initConsent } from '@/lib/consent';
import { ScrollToTop } from '@/lib/use-page-title';
import { HomePage } from '@/pages/home';
import { CategoriesPage } from '@/pages/categories';
import { PostDetailPage } from '@/pages/post-detail';
import { PostEditorPage } from '@/pages/post-editor';
import { LoginPage } from '@/pages/login';
import OAuthCallback from '@/pages/oauth-callback';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { ResetPasswordPage } from '@/pages/reset-password';
import { RegisterPage } from '@/pages/register';
import { UserPage } from '@/pages/user';
import { NotificationsPage } from '@/pages/notifications';
import { SettingsPage } from '@/pages/settings';
import { SearchPage } from '@/pages/search';
import { AdminPage } from '@/pages/admin';
import { NotFoundPage } from '@/pages/not-found';
import { PrivacyPage, TermsPage } from '@/pages/legal';
import { MyFavoritesPage, MyLikesPage } from '@/pages/my-lists';
import { UnverifiedBanner, VerifyEmailPage } from '@/pages/verify-email';

export default function App() {
  initConsent();
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      {/* 键盘用户第一个 Tab 即可跳过导航直达正文，与全站统一焦点样式配套 */}
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-none px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        跳到主要内容
      </a>
      <SiteHeader />
      <UnverifiedBanner />
      <main id="main" className="flex-1">
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
      </main>
      <SiteFooter />
      <CookieConsent />
    </div>
  );
}
