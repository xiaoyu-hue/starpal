// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_ACCEPTED_TYPES,
  IMAGE_MAX_BYTES,
  formatBytes,
  imageUrl,
} from '../../../config/content-constants'
import { cn } from '../../../lib/cn'
import type { PostImage } from '../../../types/api'

type ImagePickerProps = {
  /** 已入库的图片（编辑页），按 sortOrder 排列。 */
  existing: PostImage[]
  /** 尚未上传的本地文件（新建页），提交时才上传。 */
  pending: File[]
  max: number
  /** 有上传 / 删除请求在飞，禁止继续操作，避免排序位竞争。 */
  busy: boolean
  /** 服务端返回的错误，原样展示。 */
  error: string | null
  onPick: (files: File[]) => void
  onRemoveExisting: (imageId: number) => void
  onRemovePending: (index: number) => void
}

/**
 * 图片选择器：本地预览 + 即时校验 + 移除。
 *
 * 校验只拦「一眼能看出错」的情况（格式、单张大小、数量）；真实类型仍是服务端
 * 按文件头字节判定的——改扩展名骗不过去，这里也不假装能骗过。
 */
export function ImagePicker({
  existing,
  pending,
  max,
  busy,
  error,
  onPick,
  onRemoveExisting,
  onRemovePending,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [previews, setPreviews] = useState<string[]>([])

  // 本地预览用 object URL；组件卸载或文件变更时必须释放，否则整张图留在内存里。
  useEffect(() => {
    const urls = pending.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [pending])

  const total = existing.length + pending.length
  const remaining = max - total
  const atLimit = remaining <= 0

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? [])
    // 无论校验结果如何都清空 input：否则再次选同一个文件不会触发 change。
    event.target.value = ''
    if (picked.length === 0) return

    const accepted: File[] = []
    const problems: string[] = []
    for (const file of picked) {
      // 浏览器给不出类型时（少见的空 type）放行，交给服务端按文件头判定。
      if (file.type !== '' && !IMAGE_ACCEPTED_TYPES.includes(file.type)) {
        problems.push(`${file.name} 格式不支持`)
        continue
      }
      if (file.size > IMAGE_MAX_BYTES) {
        problems.push(`${file.name} 超过 ${formatBytes(IMAGE_MAX_BYTES)}`)
        continue
      }
      if (existing.length + pending.length + accepted.length >= max) {
        problems.push(`最多 ${max} 张`)
        break
      }
      accepted.push(file)
    }

    setLocalError(
      problems.length === 0
        ? null
        : `${problems.slice(0, 2).join('；')}${problems.length > 2 ? ' 等' : ''}`,
    )
    if (accepted.length > 0) onPick(accepted)
  }

  const message = localError ?? error

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">图片</span>
        <span className="text-xs text-faint">
          {total}/{max}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {existing.map((image) => (
          <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md border border-line bg-subtle">
            <img
              src={imageUrl(image.key)}
              alt="已上传的图片"
              width={image.width}
              height={image.height}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemoveExisting(image.id)}
              disabled={busy}
              aria-label="移除这张图片"
              className="sp-transition absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        ))}

        {pending.map((file, index) => (
          <div
            key={`${file.name}-${file.lastModified}-${index}`}
            className="relative aspect-square overflow-hidden rounded-md border border-line bg-subtle"
          >
            {previews[index] ? (
              <img
                src={previews[index]}
                alt={`待上传：${file.name}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="sp-skeleton h-full w-full" />
            )}
            <span className="absolute bottom-1 left-1 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              待上传
            </span>
            <button
              type="button"
              onClick={() => onRemovePending(index)}
              disabled={busy}
              aria-label={`取消上传 ${file.name}`}
              className="sp-transition absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        ))}

        {!atLimit && (
          <label
            className={cn(
              'sp-transition flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md',
              'border border-dashed border-line-strong text-faint hover:border-accent hover:text-accent',
              busy && 'pointer-events-none opacity-50',
            )}
          >
            <ImagePlus size={20} aria-hidden="true" />
            <span className="text-xs">添加图片</span>
            <input
              ref={inputRef}
              type="file"
              accept={IMAGE_ACCEPT_ATTR}
              multiple
              className="sr-only"
              onChange={handleChange}
              disabled={busy}
            />
          </label>
        )}
      </div>

      <p
        className={cn(
          'mt-1.5 text-xs',
          message ? 'text-[var(--sp-danger)]' : 'text-faint',
        )}
        role={message ? 'alert' : undefined}
      >
        {message ??
          `支持 JPG / PNG / WebP / AVIF，单张不超过 ${formatBytes(IMAGE_MAX_BYTES)}，最多 ${max} 张。`}
      </p>
    </div>
  )
}
