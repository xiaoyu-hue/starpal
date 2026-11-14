// SPDX-License-Identifier: AGPL-3.0-or-later
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

/** 应用入口：路由表由 app/router.tsx 统一定义。 */
export function App() {
  return <RouterProvider router={router} />
}
