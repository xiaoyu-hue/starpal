// SPDX-License-Identifier: AGPL-3.0-or-later
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { createMigratedDb } from '../helpers/db.js'
import type { RowExecutor } from '../../src/modules/posts/index.js'
import { buildBundle, fileNameOf, renderMarkdown } from '../../src/modules/export/index.js'

/**
 * 用户数据导出 M5-S3：PGlite 内存真库跑与线上同一段 SQL。
 *
 * 这份测试要证明的不是「函数能跑」，而是四件容易出错的边界：
 * 1. 范围严格限定本人——别人的帖子、评论、图片一条都不能混进来；
 * 2. 状态完整——草稿与软删除的内容必须导出并如实标注，否则「找回来」无从谈起；
 * 3. 隐私边界——产物要能被仓库里既有的 `scripts/export-check.mjs` 接受，
 *    即不含 password_hash / session / role（用真脚本跑真产物，不做等价重写）；
 * 4. 人读版可还原——Markdown 里要能看出「哪条评论回复的是哪篇帖子」。
 */

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

describe('用户数据导出 M5-S3', () => {
  let db: PGlite
  let ex: RowExecutor

  before(async () => {
    db = await createMigratedDb()
    ex = { query: (sql, params) => db.query(sql, params) as never }

    await db.exec(`
      INSERT INTO users (id, username, password_hash, display_name) VALUES
        (1, 'alice', '$argon2id$secret-hash', 'Alice'),
        (2, 'bob',   '$argon2id$other-hash',  'Bob');

      INSERT INTO user_profiles (user_id, biography, mbti, show_optional)
      VALUES (1, E'第一行简介\\n第二行简介', 'INFP', true);

      -- 软删除的一致性约束要求 status='deleted' 与 deleted_at 同时成立，故一次写入。
      INSERT INTO posts (id, author_id, topic_id, title, body, excerpt, status, created_at, deleted_at) VALUES
        (1, 1, 1, 'Alice 的已发布帖', '正文一', '摘要一', 'published', '2026-11-01T02:00:00Z', NULL),
        (2, 1, 2, 'Alice 的草稿',     '正文二', '摘要二', 'draft',     '2026-11-02T02:00:00Z', NULL),
        (3, 1, 1, 'Alice 已删除的帖', '正文三', '摘要三', 'deleted',   '2026-11-03T02:00:00Z', '2026-11-05T02:00:00Z'),
        (4, 2, 1, 'Bob 的帖子',       '别人的', '别人的', 'published', '2026-11-04T02:00:00Z', NULL);

      INSERT INTO post_images (id, post_id, storage_key, original_name, mime_type, width, height, byte_size, sort_order)
      VALUES
        (1, 1, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'alice-1.png', 'image/png', 1280, 720, 2048, 0),
        (2, 4, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'bob-1.png',   'image/png', 800,  600, 1024, 0);

      INSERT INTO comments (id, post_id, author_id, body, status, created_at, deleted_at) VALUES
        (1, 1, 1, 'Alice 自己的评论', 'published', '2026-11-06T02:00:00Z', NULL),
        (2, 4, 1, 'Alice 在别人帖下的评论', 'published', '2026-11-07T02:00:00Z', NULL),
        (3, 1, 2, 'Bob 的评论', 'published', '2026-11-08T02:00:00Z', NULL),
        (4, 1, 1, 'Alice 已删的评论', 'deleted', '2026-11-09T02:00:00Z', '2026-11-10T02:00:00Z');
    `)
  })

  after(async () => {
    await db.close()
  })

  it('只导出本人内容，别人的帖子、图片、评论一条都不带', async () => {
    const bundle = await buildBundle('1', 'https://starpal.cc.cd', ex)

    assert.equal(bundle.user.username, 'alice')
    assert.deepEqual(
      bundle.posts.map((p) => p.id),
      [1, 2, 3],
      '应含本人全部帖子且不含 Bob 的 4 号帖',
    )
    assert.deepEqual(
      bundle.comments.map((c) => c.id),
      [1, 2, 4],
      '应含本人在别人帖下的评论，但不含 Bob 的 3 号评论',
    )
    const imageUrls = bundle.posts.flatMap((p) => p.images.map((i) => i.url))
    assert.equal(imageUrls.length, 1, '只应带本人的一张图')
    assert.ok(imageUrls[0]!.startsWith('https://starpal.cc.cd/api/images/'))
  })

  it('草稿与软删除内容照样导出，状态如实标注', async () => {
    const bundle = await buildBundle('1', '', ex)
    const byId = new Map(bundle.posts.map((p) => [p.id, p]))

    assert.equal(byId.get(2)!.status, 'draft')
    assert.equal(byId.get(3)!.status, 'deleted')
    assert.ok(byId.get(3)!.deletedAt, '删除时间应一并导出，便于还原时间线')

    const deletedComment = bundle.comments.find((c) => c.id === 4)
    assert.equal(deletedComment!.status, 'deleted')
  })

  it('产物能通过仓库既有的 export:check 校验（不含 password_hash / role / session）', async () => {
    const bundle = await buildBundle('1', 'https://starpal.cc.cd', ex)
    const dir = mkdtempSync(join(tmpdir(), 'starpal-export-'))
    const file = join(dir, 'bundle.json')
    try {
      writeFileSync(file, JSON.stringify(bundle), 'utf8')
      // 跑真脚本而非等价断言：脚本才是对外契约，测试不得自行解释契约。
      const output = execFileSync('node', [join(REPO_ROOT, 'scripts/export-check.mjs'), file], {
        encoding: 'utf8',
      })
      assert.match(output, /通过/)
      assert.doesNotMatch(JSON.stringify(bundle), /password_hash|\$argon2id\$/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('Markdown 版能看出「哪条评论回复的是哪篇帖子」，并保留删除状态', async () => {
    const md = renderMarkdown(await buildBundle('1', 'https://starpal.cc.cd', ex))

    assert.match(md, /# 星聚 STARPAL · 数据导出/)
    assert.match(md, /## 帖子（共 3 篇）/)
    assert.match(md, /## 评论（共 3 条）/)
    assert.match(md, /已发布/)
    assert.match(md, /草稿/)
    assert.match(md, /已删除/)
    assert.match(md, /回复《Bob 的帖子》/, '跨帖评论要带上原帖标题')
    assert.match(md, /^> 第一行简介$/m, '多行简介按引用块渲染，不破坏结构')
  })

  it('账号不存在时抛 NOT_FOUND，不返回空壳文件', async () => {
    await assert.rejects(
      () => buildBundle('9999', '', ex),
      (error: unknown) => (error as { code?: string }).code === 'NOT_FOUND',
    )
  })

  it('文件名只含安全字符并带东八区时间戳', async () => {
    const bundle = await buildBundle('1', '', ex)
    const name = fileNameOf(bundle, 'json', new Date('2026-11-15T04:30:00Z'))
    assert.equal(name, 'starpal-alice-20261115-1230.json')

    const weird = { ...bundle, user: { ...bundle.user, username: '../../etc/passwd' } }
    assert.equal(
      fileNameOf(weird, 'md', new Date('2026-11-15T04:30:00Z')),
      'starpal-______etc_passwd-20261115-1230.md',
    )
  })
})
