// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react'
import { useLevelQuery } from './level.queries'
import { LevelCard } from './LevelCard'

type ProfileLevelProps = {
  username: string
}

/**
 * 个人页的等级区块。
 *
 * 加载中、请求失败、已注销（`progress` 为 null）三种情况**一律不渲染**：
 * 等级是装饰性信息，页面主体（资料、成就、帖子）不该被它的失败拖成错误页。
 * 这与成就区块不同——成就失败会给重试入口，因为那一整块就是页面主角之一；
 * 等级只有一行字，静默退场比弹一个「等级加载失败」更体面。
 */
export function ProfileLevel({ username }: ProfileLevelProps): ReactNode {
  const query = useLevelQuery(username)
  const data = query.data
  if (!data?.progress) return null

  return (
    <LevelCard
      level={data.progress.level}
      rank={data.progress.rank}
      experience={data.progress.experience}
      basis={data.basis}
    />
  )
}
