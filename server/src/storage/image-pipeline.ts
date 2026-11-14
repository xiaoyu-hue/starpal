import sharp from 'sharp'
import {
  IMAGE_MAX_DIMENSION,
  IMAGE_MAX_PIXELS,
  IMAGE_WEBP_QUALITY,
  IMAGE_WEBP_QUALITY_FALLBACK,
} from '../config/constants.js'
import { appEnv } from '../config/env.js'
import { DomainError } from '../shared/errors.js'

/**
 * 图片处理管线（ARCHITECTURE.md §8.1）：魔术字节验真 → 解码校验 → 重编码 → 尺寸与体积。
 *
 * 为什么统一转 WebP：体积约为原 JPEG 六成、保留透明通道，且**重编码本身就是剥离元数据**
 * （EXIF 里的拍摄时间、设备型号、GPS 坐标全部丢弃）。这不是可选项——原样存储等于把
 * 用户的拍摄地点一起公开。
 */

export type ProcessedImage = {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
}

type SupportedFormat = 'jpeg' | 'png' | 'webp' | 'avif'

const ALLOWED_FORMATS: ReadonlySet<string> = new Set<SupportedFormat>([
  'jpeg',
  'png',
  'webp',
  'avif',
])

/**
 * 仅凭文件头判定真实格式，不看扩展名，也不信客户端声明的 `Content-Type`。
 *
 * 覆盖白名单四种；其余（含 SVG、GIF、HEIC）一律返回 null。SVG 尤其重要：
 * sharp 能解析它，但它可以内嵌脚本，属于需要独立处理的可执行内容，不是"图片"。
 */
export function detectImageFormat(buffer: Buffer): SupportedFormat | null {
  if (buffer.length < 12) return null

  // PNG：89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png'
  }
  // JPEG：FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  // WebP：'RIFF' + 4 字节长度 + 'WEBP'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp'
  }
  // AVIF：ftyp box 的品牌为 avif / avis
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12)
    if (brand === 'avif' || brand === 'avis') return 'avif'
  }
  return null
}

function encode(source: Buffer, quality: number) {
  return sharp(source, { limitInputPixels: IMAGE_MAX_PIXELS })
    // 无参 rotate() 先按 EXIF Orientation 摆正，再丢弃该标记——否则手机照片会横躺。
    .rotate()
    .resize({
      width: IMAGE_MAX_DIMENSION,
      height: IMAGE_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true })
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.byteLength === 0) {
    throw new DomainError('VALIDATION_FAILED', '图片内容为空')
  }

  const declared = detectImageFormat(input)
  if (!declared) {
    throw new DomainError(
      'UNSUPPORTED_MEDIA_TYPE',
      '仅支持 JPEG、PNG、WebP、AVIF 格式的图片',
    )
  }

  let decodedFormat: string | undefined
  try {
    decodedFormat = (await sharp(input, { limitInputPixels: IMAGE_MAX_PIXELS }).metadata()).format
  } catch {
    // 文件头像图片但内容损坏，解码失败——按不支持处理，不把解码器内部错误暴露给客户端。
    throw new DomainError('UNSUPPORTED_MEDIA_TYPE', '图片已损坏或无法解析')
  }

  // 双保险：文件头与解码结果必须一致，且都在白名单内。
  if (decodedFormat !== declared || !ALLOWED_FORMATS.has(decodedFormat)) {
    throw new DomainError('UNSUPPORTED_MEDIA_TYPE', '图片格式与文件内容不符')
  }

  let encoded = await encode(input, IMAGE_WEBP_QUALITY)
  if (encoded.data.byteLength > appEnv.maxUploadBytes) {
    // 只降一次质量；仍超上限说明原图实在过大，交由用户压缩。
    encoded = await encode(input, IMAGE_WEBP_QUALITY_FALLBACK)
  }
  if (encoded.data.byteLength > appEnv.maxUploadBytes) {
    throw new DomainError('PAYLOAD_TOO_LARGE', '图片处理后仍超过大小上限，请压缩后重试')
  }

  return {
    buffer: encoded.data,
    // 类型取自重编码结果而非输入：输出恒为 WebP。
    mimeType: 'image/webp',
    width: encoded.info.width,
    height: encoded.info.height,
  }
}
