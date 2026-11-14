// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { imageUrl } from '../../config/content-constants'
import type { PostImage } from '../../types/api'

type ImageLightboxProps = {
  images: PostImage[]
  title: string
  /** 当前查看的下标；null 表示关闭。由调用方持有，便于从任意一张打开。 */
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
}

/**
 * 图片大图查看。
 *
 * 详情页的图片按 4:3—1.91:1 裁切以保证版面稳定，代价是竖图与长图会被切掉一截；
 * 用户因此需要一条「看原图」的通路。这里用整屏 contain 呈现原始比例，不做任何裁切。
 *
 * 交互覆盖三种输入：鼠标点遮罩/按钮、键盘 ← → Esc、触摸左右滑动。
 * 三套都要有，否则「手机上能滑但键盘用户卡住」这类缺口只会换个设备重现。
 */
export function ImageLightbox({ images, title, index, onIndexChange, onClose }: ImageLightboxProps) {
  const open = index !== null
  const count = images.length
  const current = open ? images[index] : undefined

  // 滑动起点：只记录按下位置，抬起时比较横向位移。
  const touchStartX = useRef<number | null>(null)

  const step = useCallback(
    (delta: number) => {
      if (index === null || count <= 1) return
      // 循环切换：首尾相接，避免用户在多图里反复「到底了再返回」。
      onIndexChange((index + delta + count) % count)
    },
    [index, count, onIndexChange],
  )

  // 焦点回到触发元素：Radix 默认会还原，但图片会随索引替换，显式处理更稳。
  useEffect(() => {
    if (!open) touchStartX.current = null
  }, [open])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogPrimitive.Portal>
        {current && (
          <>
        {/* 单独一层深色底：sp-overlay 是浅灰蒙层，用于对话框；看图需要更暗的底才不干扰色彩判断。 */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[var(--sp-scrim)] sp-enter" />
        <DialogPrimitive.Content
          className="sp-enter fixed inset-0 z-[70] flex items-center justify-center p-3 outline-none sm:p-8"
          onClick={(event) => {
            // 只有点在空白处才关闭；点在图片或按钮上不触发。
            if (event.target === event.currentTarget) onClose()
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
            if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
          }}
          onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null }}
          onTouchEnd={(event) => {
            const start = touchStartX.current
            touchStartX.current = null
            const end = event.changedTouches[0]?.clientX
            if (start === null || end === undefined) return
            const dx = end - start
            if (Math.abs(dx) < 48) return
            step(dx > 0 ? -1 : 1)
          }}
        >
          {/* 标题与描述仅供读屏；视觉上由图片本身说明。 */}
          <DialogPrimitive.Title className="sr-only">{title} 配图</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            大图查看，共 {count} 张，当前第 {(index ?? 0) + 1} 张。可用左右方向键切换，Esc 关闭。
          </DialogPrimitive.Description>

          <img
            src={imageUrl(current.key)}
            alt={`${title} 配图 ${(index ?? 0) + 1}`}
            width={current.width}
            height={current.height}
            className="max-h-[78vh] max-w-full select-none rounded-sm object-contain shadow-lg"
            draggable={false}
          />

          <DialogPrimitive.Close
            aria-label="关闭大图"
            className="sp-transition absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sp-scrim-control)] text-[var(--sp-on-accent)] hover:bg-[var(--sp-scrim-control-hover)]"
          >
            <X size={20} />
          </DialogPrimitive.Close>

          {/* 切换与计数放在底部一行：压在图片左右两侧会盖住画面，且手机上两侧边距只剩几像素，拇指也够不着。 */}
          {count > 1 && (
            <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
              <button
                type="button"
                aria-label="上一张"
                onClick={() => step(-1)}
                className="sp-transition flex h-11 w-11 items-center justify-center rounded-full bg-[var(--sp-scrim-control)] text-[var(--sp-on-accent)] hover:bg-[var(--sp-scrim-control-hover)]"
              >
                <ChevronLeft size={22} />
              </button>
              <span className="min-w-[64px] rounded-full bg-[var(--sp-scrim-control)] px-3 py-2 text-center text-xs text-[var(--sp-on-accent)]">
                {(index ?? 0) + 1} / {count}
              </span>
              <button
                type="button"
                aria-label="下一张"
                onClick={() => step(1)}
                className="sp-transition flex h-11 w-11 items-center justify-center rounded-full bg-[var(--sp-scrim-control)] text-[var(--sp-on-accent)] hover:bg-[var(--sp-scrim-control-hover)]"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          )}
        </DialogPrimitive.Content>
          </>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** 提供给 PostImages 的受控开关：把「第几张」的 state 收在一处，避免每张图各存一份。 */
export function useLightbox() {
  const [index, setIndex] = useState<number | null>(null)
  return {
    index,
    openAt: (i: number) => setIndex(i),
    setIndex,
    close: () => setIndex(null),
  }
}
