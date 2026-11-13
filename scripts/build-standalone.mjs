#!/usr/bin/env node
/**
 * 生成可脱离服务、可直接双击打开的自包含预览 HTML。
 * 主构建使用路由懒加载（多分包），动态 import 在 file:// 下无法解析，
 * 故此处以单分包方式单独构建一次，再将 CSS/JS/图标全部内联。
 * 输出仅用于本地预览与分发，不纳入版本控制。
 */
import { build } from 'vite'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB_ROOT = resolve(fileURLToPath(new URL('../web/', import.meta.url)))
const OUT = resolve(fileURLToPath(new URL('../web/dist/starpal-preview.html', import.meta.url)))
const tempDir = mkdtempSync(join(tmpdir(), 'starpal-standalone-'))

// Tailwind / PostCSS 的 content 路径相对工作目录解析，必须切到 web/。
const previousCwd = process.cwd()
process.chdir(WEB_ROOT)

try {
  await build({
    configFile: join(WEB_ROOT, 'vite.config.ts'),
    logLevel: 'warn',
    build: {
      outDir: tempDir,
      emptyOutDir: true,
      // 单分包：把懒加载 chunk 内联进入口，消除运行期动态 import
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  })

  const html = readFileSync(join(tempDir, 'index.html'), 'utf8')
  const assets = join(tempDir, 'assets')
  const jsFiles = readdirSync(assets).filter((f) => f.endsWith('.js')).sort()
  const cssFiles = readdirSync(assets).filter((f) => f.endsWith('.css')).sort()
  if (jsFiles.length !== 1 || cssFiles.length !== 1) {
    throw new Error(`预期单 CSS + 单 JS，实际 css=${cssFiles.length} js=${jsFiles.length}`)
  }
  const js = readFileSync(join(assets, jsFiles[0]), 'utf8')
  const css = readFileSync(join(assets, cssFiles[0]), 'utf8')
  const favicon = readFileSync(join(tempDir, 'favicon.svg'), 'utf8')

  const favUri = 'data:image/svg+xml,' + encodeURIComponent(favicon)
  const jsSafe = js.replace(/<\/script/gi, '<\\/script')
  const cssSafe = css.replace(/<\/style/gi, '<\\/style')

  let out = html.replace(/href="[^"]*favicon\.svg"/, `href="${favUri}"`)
  out = out.replace(
    /<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/,
    () => `<script type="module">\n${jsSafe}\n</script>`,
  )
  out = out.replace(
    /<link rel="stylesheet"[^>]*href="[^"]+"[^>]*>/,
    () => `<style>\n${cssSafe}\n</style>`,
  )

  // 只检查标签级资源引用；内联 JS/CSS 内部合法出现的路径字符串不算外部依赖。
  const leftover = /<(?:script|link)[^>]+(?:src|href)="\/assets\//.test(out)
  if (leftover) throw new Error('仍残留 /assets/ 标签引用')

  writeFileSync(OUT, out, 'utf8')
  console.log(`自包含预览已生成：${OUT}`)
  console.log(
    `大小：${(Buffer.byteLength(out) / 1024).toFixed(1)} KB | CSS ${cssFiles[0]} (${(Buffer.byteLength(css) / 1024).toFixed(1)} KB) | JS ${jsFiles[0]}`,
  )
} finally {
  process.chdir(previousCwd)
  rmSync(tempDir, { recursive: true, force: true })
}
