// SPDX-License-Identifier: AGPL-3.0-or-later
import { Card } from '../../components/ui/Primitives'
import { useAvatarStylesQuery } from '../profile'
import { StaticPage, StatusLine } from './StaticPage'

/**
 * 头像署名页：列出全部可自托管头像风格的作品作者与许可。
 *
 * 数据来自 GET /api/meta/avatar-styles，与设置页选择器共用同一份清单（单一真相源）。
 * CC BY 风格必须署名，逐条列出作者、许可与来源；这是遵守 DiceBear 各风格许可的要求。
 */
export function AvatarCreditsPage() {
  const { data, isLoading, isError } = useAvatarStylesQuery()
  return (
    <StaticPage title="头像作者与许可">
      <Card className="space-y-3 p-6">
        <p className="text-sm leading-relaxed text-muted">
          站内头像是开源项目 DiceBear 的作品，由服务端用你的种子本地生成，
          不向任何外部服务发送请求。每种风格的作者与许可如下；
          CC BY 4.0 的图案按其许可要求署名，其余为 CC0 / MIT / 免费商用。
        </p>
        <p className="text-xs leading-relaxed text-faint">
          随机头像由 DiceBear 在本地组合、调整背景并转换为 SVG。以下为作品来源与许可。
        </p>
      </Card>

      {isLoading && <StatusLine text="加载中…" />}
      {isError && <StatusLine text="加载失败，请刷新重试。" tone="danger" />}
      {data && (
        <Card className="p-4 sm:p-6">
          <ul className="space-y-2">
            {data.map((style) => (
              <li key={style.slug} className="text-sm leading-relaxed">
                <a
                  href={style.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {style.label}
                </a>
                {' — '}
                <span className="text-muted">{style.author}</span>
                {' · '}
                {style.licenseUrl !== null ? (
                  <a
                    href={style.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {style.license}
                  </a>
                ) : (
                  <span className="text-muted">{style.license}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </StaticPage>
  )
}
