// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Download, FileJson, FileText } from 'lucide-react'
import { Card } from '../../components/ui/Primitives'
import { buttonClass } from '../../components/ui/Button'

/**
 * 「导出我的数据」区块。
 *
 * 走 `fetch` + `blob` 而不是 `<a download>`：直链在未登录时会把 AUTH_REQUIRED 的
 * JSON 错误直接存成文件，用户拿到一个坏文件还不知道为什么；fetch 能先判状态码，
 * 再把服务端的错误文案显示出来。
 *
 * 文件名以服务端 `Content-Disposition` 为准（它带用户名与东八区时间戳），
 * 取不到时用保守的兜底名，不影响文件本身可用。
 */
type Format = 'json' | 'md'
type State = { kind: 'idle' } | { kind: 'busy'; format: Format } | { kind: 'done'; format: Format } | { kind: 'error'; message: string }

async function download(format: Format): Promise<void> {
  const response = await fetch(`/api/export?format=${format}`, {
    credentials: 'same-origin',
  })
  if (!response.ok) {
    let message = '导出失败，请稍后重试'
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      if (body.error?.message) message = body.error.message
    } catch {
      // 服务端未返回 JSON（例如网关错误页）时保留兜底文案。
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const named = /filename="([^"]+)"/.exec(disposition)?.[1]
  const filename = named ?? `starpal-export.${format}`

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // 立刻 revoke 会让部分浏览器来不及取数据，下一帧再释放。
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function ExportSection() {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function handle(format: Format): Promise<void> {
    setState({ kind: 'busy', format })
    try {
      await download(format)
      setState({ kind: 'done', format })
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : '导出失败' })
    }
  }

  const busy = state.kind === 'busy'

  return (
    <Card className="space-y-3 p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <Download size={16} /> 导出我的数据
      </h2>
      <p className="text-sm leading-relaxed text-muted">
        把你的帖子、评论、图片链接和资料打成一份文件下载到本机。JSON 适合备份和交给程序处理，
        Markdown 适合直接打开阅读。已删除的内容也会保留并标注状态，方便你自己留底。
      </p>
      <p className="text-xs text-faint">
        只包含你本人写的内容，不含私信，也不含其他用户的数据；图片给的是可访问链接，不是图片文件本身。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          disabled={busy}
          onClick={() => void handle('json')}
        >
          <FileJson size={14} /> 下载 JSON
        </button>
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          disabled={busy}
          onClick={() => void handle('md')}
        >
          <FileText size={14} /> 下载 Markdown
        </button>
        {busy && (
          <span role="status" className="text-xs text-muted">
            正在打包…
          </span>
        )}
        {state.kind === 'done' && (
          <span role="status" className="text-xs text-accent">
            已下载 {state.format === 'json' ? 'JSON' : 'Markdown'} 文件
          </span>
        )}
        {state.kind === 'error' && (
          <span role="alert" className="text-xs text-[var(--sp-danger)]">
            {state.message}
          </span>
        )}
      </div>
    </Card>
  )
}
