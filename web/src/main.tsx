// SPDX-License-Identifier: AGPL-3.0-or-later
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { Providers } from './app/providers'
import { applyTheme, readTheme } from './lib/theme'
import './styles/tokens.css'
import './styles/globals.css'

// 首屏前应用主题，避免浅深闪烁
applyTheme(readTheme())

const root = document.getElementById('root')
if (!root) throw new Error('缺少 #root 挂载节点')

createRoot(root).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)
