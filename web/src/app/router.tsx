// SPDX-License-Identifier: AGPL-3.0-or-later
import { lazy, Suspense, type ReactNode } from 'react'
import {
  createBrowserRouter,
  createMemoryRouter,
  Outlet,
  type RouteObject,
} from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { FeedSkeleton } from '../features/feed/components/FeedSkeleton'
import { PlaceholderPage } from '../features/placeholder'
// 话题目录是外壳级共享数据（左右栏都在读），必然进主包，故静态导入而非假装懒加载。
import { TopicPage, TopicsPage } from '../features/topics'
import { RequireAuth, RequireRole } from './guards'
import { AdminLayout } from '../features/admin/AdminLayout'

// 路由级懒加载边界：首页与设计系统预览页独立分包。
const HomePage = lazy(() =>
  import('../features/feed/pages/HomePage').then((m) => ({ default: m.HomePage })),
)
const PreviewPage = lazy(() =>
  import('../features/_preview/PreviewPage').then((m) => ({ default: m.PreviewPage })),
)
const AuthPage = lazy(() =>
  import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage })),
)
const ProfilePage = lazy(() =>
  import('../features/profile').then((m) => ({ default: m.ProfilePage })),
)
const SettingsPage = lazy(() =>
  import('../features/profile').then((m) => ({ default: m.SettingsPage })),
)
const PrivacyPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.PrivacyPage })),
)
const GuidelinesPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.GuidelinesPage })),
)
const TermsPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.TermsPage })),
)
const DisclaimerPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.DisclaimerPage })),
)
const ProductPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.ProductPage })),
)
const AnnouncementsPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.AnnouncementsPage })),
)
const InviteCodesPage = lazy(() =>
  import('../features/invite/InviteCodesPage').then((m) => ({ default: m.InviteCodesPage })),
)
const NotificationsPage = lazy(() =>
  import('../features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
const BookmarksPage = lazy(() =>
  import('../features/bookmarks/BookmarksPage').then((m) => ({ default: m.BookmarksPage })),
)
const LikesPage = lazy(() =>
  import('../features/likes/LikesPage').then((m) => ({ default: m.LikesPage })),
)
const MessagesPage = lazy(() =>
  import('../features/messages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
)
const SearchPage = lazy(() =>
  import('../features/search/SearchPage').then((m) => ({ default: m.SearchPage })),
)
const AchievementsPage = lazy(() =>
  import('../features/achievements').then((m) => ({ default: m.AchievementsPage })),
)
const DiscoverPage = lazy(() =>
  import('../features/discover').then((m) => ({ default: m.DiscoverPage })),
)
const MyReportsPage = lazy(() =>
  import('../features/reports/MyReportsPage').then((m) => ({ default: m.MyReportsPage })),
)
const AdminReportsPage = lazy(() =>
  import('../features/reports/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })),
)
const AdminAnnouncementsPage = lazy(() =>
  import('../features/announcements').then((m) => ({ default: m.AdminAnnouncementsPage })),
)
// 治理后台六分区：统一懒加载，路由层以 RequireRole + AdminLayout 包裹。
const AdminHomePage = lazy(() =>
  import('../features/admin').then((m) => ({ default: m.AdminHomePage })),
)
const AdminUsersPage = lazy(() =>
  import('../features/admin').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminPostsPage = lazy(() =>
  import('../features/admin').then((m) => ({ default: m.AdminPostsPage })),
)
const AdminCommentsPage = lazy(() =>
  import('../features/admin').then((m) => ({ default: m.AdminCommentsPage })),
)
const AdminTopicsPage = lazy(() =>
  import('../features/admin').then((m) => ({ default: m.AdminTopicsPage })),
)
const AdminStatsPage = lazy(() =>
  import('../features/admin').then((m) => ({ default: m.AdminStatsPage })),
)
const AboutPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.AboutPage })),
)
const AvatarCreditsPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.AvatarCreditsPage })),
)
// 内容域按 feature 分包：详情与发帖编辑独立成 chunk，首页不加载它们。
const ComposePage = lazy(() =>
  import('../features/posts').then((m) => ({ default: m.ComposePage })),
)
const PostDetailPage = lazy(() =>
  import('../features/posts').then((m) => ({ default: m.PostDetailPage })),
)
const EditPostPage = lazy(() =>
  import('../features/posts').then((m) => ({ default: m.EditPostPage })),
)

function ShellRoute() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function PreviewRoute() {
  return <PreviewPage />
}

function Suspended({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FeedSkeleton count={2} />}>{children}</Suspense>
}

/** 治理后台统一包裹：角色守卫 + 六分区导航骨架。服务端仍有第二道角色校验。 */
function AdminRoute() {
  return (
    <RequireRole role="admin">
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </RequireRole>
  )
}

function placeholder(title: string, milestone: string, description: string) {
  return <PlaceholderPage title={title} milestone={milestone} description={description} />
}

/** 路由表：全部注册路径可解析；未实现域以占位页保证目的地可达。 */
const routes: RouteObject[] = [
  {
    path: '/',
    element: <ShellRoute />,
    children: [
      { index: true, element: <Suspended><HomePage /></Suspended> },
      { path: 'discover', element: <Suspended><DiscoverPage /></Suspended> },
      { path: 'topics', element: <Suspended><TopicsPage /></Suspended> },
      { path: 'topics/:slug', element: <Suspended><TopicPage /></Suspended> },
      {
        path: 'posts/new',
        element: (
          <RequireAuth>
            <Suspended><ComposePage /></Suspended>
          </RequireAuth>
        ),
      },
      { path: 'posts/:id', element: <Suspended><PostDetailPage /></Suspended> },
      {
        path: 'posts/:id/edit',
        element: (
          <RequireAuth>
            <Suspended><EditPostPage /></Suspended>
          </RequireAuth>
        ),
      },
      { path: 'notifications', element: <Suspended><NotificationsPage /></Suspended> },
      {
        path: 'bookmarks',
        element: (
          <RequireAuth>
            <Suspended><BookmarksPage /></Suspended>
          </RequireAuth>
        ),
      },
      {
        path: 'likes',
        element: (
          <RequireAuth>
            <Suspended><LikesPage /></Suspended>
          </RequireAuth>
        ),
      },
      {
        path: 'reports',
        element: (
          <RequireAuth>
            <Suspended><MyReportsPage /></Suspended>
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          { index: true, element: <Suspended><AdminHomePage /></Suspended> },
          { path: 'users', element: <Suspended><AdminUsersPage /></Suspended> },
          { path: 'posts', element: <Suspended><AdminPostsPage /></Suspended> },
          { path: 'comments', element: <Suspended><AdminCommentsPage /></Suspended> },
          { path: 'topics', element: <Suspended><AdminTopicsPage /></Suspended> },
          { path: 'stats', element: <Suspended><AdminStatsPage /></Suspended> },
          { path: 'reports', element: <Suspended><AdminReportsPage /></Suspended> },
          { path: 'announcements', element: <Suspended><AdminAnnouncementsPage /></Suspended> },
        ],
      },
      {
        path: 'messages',
        element: (
          <RequireAuth>
            <Suspended><MessagesPage /></Suspended>
          </RequireAuth>
        ),
      },
      {
        path: 'settings',
        element: (
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'invite-codes',
        element: (
          <RequireRole role="admin">
            <Suspended><InviteCodesPage /></Suspended>
          </RequireRole>
        ),
      },
      { path: 'u/:username', element: <ProfilePage /> },
      { path: 'search', element: <Suspended><SearchPage /></Suspended> },
      { path: 'login', element: <Suspended><AuthPage mode="login" /></Suspended> },
      { path: 'register', element: <Suspended><AuthPage mode="register" /></Suspended> },
      { path: 'achievements', element: <Suspended><AchievementsPage /></Suspended> },
      { path: 'guidelines', element: <Suspended><GuidelinesPage /></Suspended> },
      { path: 'announcements', element: <Suspended><AnnouncementsPage /></Suspended> },
      { path: 'privacy', element: <Suspended><PrivacyPage /></Suspended> },
      { path: 'terms', element: <Suspended><TermsPage /></Suspended> },
      { path: 'disclaimer', element: <Suspended><DisclaimerPage /></Suspended> },
      { path: 'product', element: <Suspended><ProductPage /></Suspended> },
      { path: 'about', element: <Suspended><AboutPage /></Suspended> },
      { path: 'avatar-credits', element: <Suspended><AvatarCreditsPage /></Suspended> },
      { path: '*', element: placeholder('页面不存在', '—', '请求的地址不存在，可返回首页继续浏览。') },
    ],
  },
  { path: '/_preview', element: <Suspended><PreviewRoute /></Suspended> },
]

/**
 * 离线预览（file:// 协议）无服务端路由回退，使用内存路由并固定落在首页，
 * 避免把本地文件路径误判为未知路由。生产环境仍使用浏览器路由。
 */
const isOfflineFile =
  typeof window !== 'undefined' && window.location.protocol === 'file:'

export const router = isOfflineFile
  ? createMemoryRouter(routes, { initialEntries: ['/'] })
  : createBrowserRouter(routes)
