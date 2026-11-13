import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// 生产构建产物输出到 server/public，由 Express 单进程托管（ARCHITECTURE §3.2 / §14）。
// base 使用绝对路径：SPA 深层路由回退到 index.html 时，assets 仍从站点根解析。
// 开发期通过 proxy 将 /api 转发到后端，避免跨域与双份凭据。
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: fileURLToPath(new URL('../server/public/', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
})
