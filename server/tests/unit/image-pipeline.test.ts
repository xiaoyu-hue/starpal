// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { DomainError } from '../../src/shared/errors.js'
import { detectImageFormat, processImage } from '../../src/storage/image-pipeline.js'

/**
 * `M7-S1-T4` 上传安全用例：只看文件内容，不信扩展名与声明的 MIME。
 *
 * 这些用例保护的是一个具体后果：把可执行内容（SVG 里的脚本、伪装成图片的 HTML）
 * 当图片存进数据库、再由 `/api/images/:key` 以图片类型吐回去。
 * 以及 EXIF 里的 GPS 坐标——原图直接存下来，等于公开用户在哪拍的照。
 */

async function isRejectedWith(promise: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    if (!(error instanceof DomainError)) return false
    assert.equal(error.code, code)
    return true
  })
}

/** 8×8 纯色图，够小够快，只用来验格式判定。 */
function solid(format: 'png' | 'jpeg' | 'webp'): Promise<Buffer> {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: '#3366ff' } })
    .toFormat(format)
    .toBuffer()
}

describe('M7-S1-T4 图片管线安全用例', () => {
  it('PNG 输入被重编码为 WebP，尺寸取自真实解码结果', async () => {
    const result = await processImage(await solid('png'))
    assert.equal(result.mimeType, 'image/webp')
    assert.equal(result.width, 8)
    assert.equal(result.height, 8)
    const meta = await sharp(result.buffer).metadata()
    assert.equal(meta.format, 'webp')
  })

  it('EXIF（含 GPS）在重编码后消失', async () => {
    const marker = 'GPS48.8566N2.3522E-STARPAL'
    const withExif = await sharp(await solid('jpeg'))
      .withExif({
        IFD0: { ImageDescription: marker, Copyright: 'starpal-test' },
        IFD3: { GPSLatitude: '48/1 51/1 0/1' },
      })
      .jpeg()
      .toBuffer()
    assert.ok(withExif.includes(Buffer.from(marker)), '前置条件：样本本身应带 EXIF')

    const result = await processImage(withExif)
    const meta = await sharp(result.buffer).metadata()
    assert.equal(meta.exif, undefined, '输出不应保留 EXIF 段')
    assert.ok(!result.buffer.includes(Buffer.from(marker)), '输出不应残留原始 EXIF 文本')
  })

  it('SVG 即使内嵌脚本也被拒（不按图片对待）', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><script>alert(1)</script></svg>',
    )
    assert.equal(detectImageFormat(svg), null)
    await isRejectedWith(processImage(svg), 'UNSUPPORTED_MEDIA_TYPE')
  })

  it('伪装成 PNG 的 HTML 被拒', async () => {
    const html = Buffer.from('<!doctype html><html><body>not an image at all</body></html>')
    await isRejectedWith(processImage(html), 'UNSUPPORTED_MEDIA_TYPE')
  })

  it('GIF 不在白名单内，被拒', async () => {
    // GIF89a 魔数 + 足够长度，确保是被白名单挡下而不是被「太短」挡下
    const gif = Buffer.concat([
      Buffer.from('GIF89a', 'ascii'),
      Buffer.alloc(20, 0x00),
      Buffer.from(';', 'ascii'),
    ])
    assert.equal(detectImageFormat(gif), null)
    await isRejectedWith(processImage(gif), 'UNSUPPORTED_MEDIA_TYPE')
  })

  it('文件头是 PNG、内容是垃圾字节：解码失败按不支持处理，不暴露解码器错误', async () => {
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const fake = Buffer.concat([pngMagic, Buffer.alloc(64, 0x41)])
    assert.equal(detectImageFormat(fake), 'png', '前置条件：魔数应被认成 PNG')
    await isRejectedWith(processImage(fake), 'UNSUPPORTED_MEDIA_TYPE')
  })

  it('空文件被拒，且错误码是校验失败而不是内部错误', async () => {
    await isRejectedWith(processImage(Buffer.alloc(0)), 'VALIDATION_FAILED')
  })

  it('不足 12 字节的输入不参与格式判定', async () => {
    assert.equal(detectImageFormat(Buffer.from([0xff, 0xd8, 0xff])), null)
  })
})
