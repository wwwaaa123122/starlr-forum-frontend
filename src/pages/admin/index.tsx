import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePageTitle } from '@/lib/use-page-title';
import { PageContainer, PageHeader, PageMessage } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCards } from './overview';
import { UsersTab } from './users';
import { PostsTab } from './posts';
import { CategoriesTab } from './categories';
import { ReportsTab } from './reports';
import { ModeratorsTab } from './moderators';
import { AdminsTab } from './admins';
import { ViewsTab } from './views';
import { NotificationsTab } from './notifications';
import { AuditTab } from './audit';
import { SeoPushesTab } from './seo_pushes';
import { ServicesTab } from './services';
import { SsoTab } from './sso';

export function AdminPage() {
  const { user, isModerator, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  usePageTitle('管理后台');

  if (loading) {
    return (
      <PageContainer width="wide">
        <Skeleton className="h-96 w-full" />
      </PageContainer>
    );
  }

  if (!user || !isModerator) {
    return (
      <PageContainer width="wide">
        <PageMessage
          icon={<ShieldCheck className="size-10" />}
          title="无权访问管理后台"
          description="只有管理员和版主可以进入这里。"
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        title="管理后台"
        icon={<ShieldCheck className="text-primary size-5" />}
        description={isAdmin ? '站点数据、内容与第三方服务配置。' : '你当前是版主，只显示有权限的分区。'}
        actions={!isAdmin && <Badge variant="secondary">版主权限</Badge>}
      />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 w-full max-w-full flex-nowrap justify-start overflow-x-auto [&>[role=tab]]:flex-none">
          <TabsTrigger value="overview">概览</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">用户</TabsTrigger>}
          <TabsTrigger value="posts">帖子</TabsTrigger>
          <TabsTrigger value="categories">分类</TabsTrigger>
          <TabsTrigger value="reports">举报</TabsTrigger>
          <TabsTrigger value="views">浏览统计</TabsTrigger>
          {isAdmin && <TabsTrigger value="notify">通知</TabsTrigger>}
          {isAdmin && <TabsTrigger value="moderators">版主</TabsTrigger>}
          {isAdmin && <TabsTrigger value="admins">管理员</TabsTrigger>}
          {isAdmin && <TabsTrigger value="services">服务配置</TabsTrigger>}
          {isAdmin && <TabsTrigger value="sso">SSO 同步</TabsTrigger>}
          {isAdmin && <TabsTrigger value="audit">审计日志</TabsTrigger>}
          {isAdmin && <TabsTrigger value="seo-pushes">推送记录</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview">
          <StatCards />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="posts">
          <PostsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="notify">
            <NotificationsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="moderators">
            <ModeratorsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="admins">
            <AdminsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="services">
            <ServicesTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="sso">
            <SsoTab />
          </TabsContent>
        )}
        {isModerator && (
          <TabsContent value="views">
            <ViewsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="audit">
            <AuditTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="seo-pushes">
            <SeoPushesTab />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
