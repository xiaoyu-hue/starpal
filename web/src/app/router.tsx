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
import { RequireAuth } from './guards'

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
const AboutPage = lazy(() =>
  import('../features/_static').then((m) => ({ default: m.AboutPage })),
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
      { path: 'discover', element: placeholder('发现', 'M3', '热门与最新话题的聚合视图将在 M3 后续交付。') },
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
      { path: 'notifications', element: placeholder('通知', 'M5', '通知中心将在 M5 里程碑交付。') },
      { path: 'messages', element: placeholder('私信', 'M5', '留言式私信将在 M5 里程碑交付。') },
      {
        path: 'settings',
        element: (
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        ),
      },
      { path: 'u/:username', element: <ProfilePage /> },
      { path: 'search', element: placeholder('搜索', 'M7', '全站检索将在 M7 里程碑交付。') },
      { path: 'login', element: <Suspended><AuthPage mode="login" /></Suspended> },
      { path: 'register', element: <Suspended><AuthPage mode="register" /></Suspended> },
      { path: 'achievements', element: placeholder('成就时间线', 'M5', '成就与每周热门将在 M5 里程碑交付。') },
      { path: 'guidelines', element: <Suspended><GuidelinesPage /></Suspended> },
      { path: 'announcements', element: <Suspended><AnnouncementsPage /></Suspended> },
      { path: 'privacy', element: <Suspended><PrivacyPage /></Suspended> },
      { path: 'terms', element: <Suspended><TermsPage /></Suspended> },
      { path: 'disclaimer', element: <Suspended><DisclaimerPage /></Suspended> },
      { path: 'product', element: <Suspended><ProductPage /></Suspended> },
      { path: 'about', element: <Suspended><AboutPage /></Suspended> },
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
