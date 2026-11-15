// SPDX-License-Identifier: AGPL-3.0-or-later
import { buttonClass } from '../../components/ui/Button'
import { ApiError } from '../../lib/api-client'
import { useLevelQuery, useSetRankMutation } from './level.queries'
import type { RankKey } from '../../types/level'

/**
 * 段位徽标设置（任何登录成员可用）。
 *
 * 与其他资料项不同，这里没有「保存」按钮：五个段位 + 一个「不显示」是单选，
 * 点一下立即生效。多一步保存只会在「选完忘了点」时让人以为没生效。
 *
 * 未解锁的段位照样列出来、但置灰并写明门槛。藏起来的话，用户不会知道
 * 「往上还有四段」，只会以为这里只有「萌新」和「不显示」两个选项。
 */
export function RankSection({ username }: { username: string }) {
  const query = useLevelQuery(username)
  const mutation = useSetRankMutation(username)
  const current: RankKey | null = query.data?.badge?.key ?? null
  const catalog = query.data?.catalog ?? []

  const error = mutation.error
  const errorText =
    error instanceof ApiError ? error.message : error ? '设置失败，请稍后重试' : ''

  return (
    <section className="sp-card space-y-4 p-6" aria-labelledby="rank-heading">
      <div className="space-y-1">
        <h2 id="rank-heading" className="text-base font-semibold text-ink">
          我的段位
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          段位显示在<strong className="font-medium text-ink">你的公开主页</strong>名字旁，不会出现在帖子和评论的署名处。
          等级到过的段位会永久解锁，可以随时换一个、也可以不显示；戴哪个都不影响你的等级。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={current === null}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(null)}
          className={choiceClass(current === null, true)}
        >
          不显示
        </button>
        {catalog.map((item) => {
          const active = current === item.key
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              disabled={!item.unlocked || mutation.isPending}
              onClick={() => mutation.mutate(item.key)}
              title={item.unlocked ? undefined : `达到 L${item.minLevel} 解锁`}
              className={choiceClass(active, item.unlocked)}
            >
              {/* 未解锁也给一层中性底色：按钮整体是 opacity-50，
                  没有底色时段位名会淡到读不出来，用户就不知道「上面还有老友和元老」。 */}
              <span
                className="inline-flex items-center rounded-sm px-1.5 py-px text-xs font-medium"
                style={
                  item.unlocked
                    ? { color: 'var(--sp-level)', backgroundColor: 'var(--sp-level-soft)' }
                    : { color: 'var(--sp-text-subtle)', backgroundColor: 'var(--sp-bg-subtle)' }
                }
              >
                {item.nameZh}
              </span>
              {!item.unlocked && (
                <span className="text-[11px] text-faint">L{item.minLevel} 解锁</span>
              )}
            </button>
          )
        })}
      </div>

      {mutation.isPending && (
        <p role="status" className="text-xs text-faint">
          正在更新…
        </p>
      )}
      {errorText && (
        <p role="alert" className="text-xs text-[var(--sp-danger)]">
          {errorText}
        </p>
      )}
      {!errorText && !mutation.isPending && mutation.isSuccess && (
        <p role="status" className="text-xs text-faint">
          {current === null ? '已隐藏段位。' : '已更新，去你的主页看看效果。'}
        </p>
      )}
    </section>
  )
}

/**
 * 选项按钮。
 *
 * 可选项复用按钮体系（AGENTS 第十节），未解锁项单独写一套：
 * `buttonClass` 的 `disabled:opacity-50` 会把整块内容一起压暗，段位名的底色也就一起消失，
 * 结果是「看不清但也不知道为什么不能点」。这里改用低饱和底色 + 灰字表达不可用，
 * 保留原生 `disabled`（不可点、键盘跳过），外观不再靠透明度。
 */
function choiceClass(active: boolean, enabled: boolean): string {
  if (!enabled) {
    return 'inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-sm border border-line bg-subtle px-3 text-sm text-faint'
  }
  return buttonClass(active ? 'primary' : 'secondary', 'sm')
}
