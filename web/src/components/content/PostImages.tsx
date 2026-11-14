import { imageUrl } from '../../config/content-constants'
import { cn } from '../../lib/cn'
import type { PostImage } from '../../types/api'
import { ImageLightbox, useLightbox } from './ImageLightbox'

/**
 * 图片宽高比收敛到 4:3 — 1.91:1 之间。
 *
 * 原比例极端的图（长截图、竖拍全景）如果按原比例占位，详情页会出现半屏空白
 * 或一条窄缝。收敛后用 `object-cover` 裁切，视觉稳定，且占位框仍是提前算好的，
 * 图片加载完成不会推动下方内容。
 */
function clampRatio(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 16 / 9
  }
  return Math.min(1.91, Math.max(0.75, width / height))
}

type PostImagesProps = {
  images: PostImage[]
  /** 帖子标题，用于拼出有意义的 alt（「标题 配图 2」比「image」有用）。 */
  title: string
  className?: string
}

/**
 * 详情页正文后的图片区：单图整宽、多图两列网格；全部懒加载。
 *
 * 每张图都可点开看原图：网格里正方形的缩略图是裁切后的结果，
 * 竖图与长图在缩略态只能看到中段，必须有一条能看到完整画面的通路。
 */
export function PostImages({ images, title, className }: PostImagesProps) {
  const lightbox = useLightbox()
  if (images.length === 0) return null

  return (
    <>
      {images.length === 1 ? (
        <div className={cn('mt-5 overflow-hidden rounded-md border border-line', className)}>
          <button
            type="button"
            onClick={() => lightbox.openAt(0)}
            aria-label={`查看大图：${title} 配图`}
            className="block w-full cursor-zoom-in"
          >
            <img
              src={imageUrl(images[0]!.key)}
              alt={`${title} 配图`}
              width={images[0]!.width}
              height={images[0]!.height}
              loading="lazy"
              decoding="async"
              className="max-h-[560px] w-full object-cover"
              style={{ aspectRatio: String(clampRatio(images[0]!.width, images[0]!.height)) }}
            />
          </button>
        </div>
      ) : (
        <div className={cn('mt-5 grid grid-cols-2 gap-2', className)}>
          {images.map((image, index) => (
            <div key={image.id} className="overflow-hidden rounded-md border border-line">
              <button
                type="button"
                onClick={() => lightbox.openAt(index)}
                aria-label={`查看大图：${title} 配图 ${index + 1}`}
                className="block w-full cursor-zoom-in"
              >
                <img
                  src={imageUrl(image.key)}
                  alt={`${title} 配图 ${index + 1}`}
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        title={title}
        index={lightbox.index}
        onIndexChange={lightbox.setIndex}
        onClose={lightbox.close}
      />
    </>
  )
}

/** 信息流卡片封面：只取第一张，固定比例占位，避免卡片高度随图片加载抖动。 */
export function PostCover({ image, title }: { image: PostImage; title: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-line">
      <img
        src={imageUrl(image.key)}
        alt={`${title} 配图`}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        className="max-h-[420px] w-full object-cover"
        style={{ aspectRatio: String(clampRatio(image.width, image.height)) }}
      />
    </div>
  )
}
