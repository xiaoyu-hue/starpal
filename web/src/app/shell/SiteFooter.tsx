// SPDX-License-Identifier: AGPL-3.0-or-later
import { Link } from 'react-router-dom'
import { useAboutQuery } from '../../features/_static/meta.queries'
import { ABOUT_LINKS } from './nav-items'

/**
 * 站点页脚：说明页入口 + 源码入口 + 许可标注。
 *
 * 「源码」地址取自 /api/meta/about 的 licensing.sourceUrl，与「关于」页同一真源，
 * 避免两处各写一份 URL 后漂移（README 的部署章节承诺该链接真实可用）。
 * 取不到数据时只省略外链，其余链接照常显示——不因说明页接口失败而白屏。
 * 外链固定带 noopener noreferrer，避免新标签页反向持有 window.opener。
 */
export function SiteFooter() {
  const about = useAboutQuery()
  const sourceUrl = about.data?.licensing.sourceUrl

  return (
    <footer className="mx-auto w-full max-w-[1440px] px-4 pb-24 md:px-6 md:pb-10">
      <div className="space-y-3 border-t border-line pt-5 text-xs text-faint">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {ABOUT_LINKS.map((item) => (
            <li key={item.key}>
              <Link to={item.path} className="sp-transition hover:text-ink hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
          {sourceUrl && (
            <li>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sp-transition hover:text-ink hover:underline"
              >
                源码
              </a>
            </li>
          )}
        </ul>
        <p>源代码 AGPL-3.0-or-later · 文档 CC BY-NC-SA 4.0 · 名称与标识为商标保留</p>
      </div>
    </footer>
  )
}
