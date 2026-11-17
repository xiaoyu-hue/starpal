// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * 移动抽屉导航的 destinations 唯一性回归。
 *
 * 抽屉曾把 `DESKTOP_KEYS` 全量渲染一遍后，又在末尾手写死了一个相同的「私信」链接，
 * 于是同一目的地出现两次。这里不测具体样式，只钉住一条不变量：
 * 每个导航目的地在抽屉里恰好出现一次——数据驱动的入口不该再被硬编码复制。
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MobileMenu } from '../../../src/app/shell/MobileMenu'
import { ABOUT_LINKS, DESTINATIONS, DESKTOP_KEYS } from '../../../src/app/shell/nav-items'

function renderOpenMenu(onOpenChange = () => {}) {
  return render(
    <MemoryRouter>
      <MobileMenu open onOpenChange={onOpenChange} />
    </MemoryRouter>,
  )
}

describe('MobileMenu 抽屉导航', () => {
  it('每个桌面目的地恰好出现一次，没有重复的「私信」', () => {
    renderOpenMenu()
    const links = screen.getAllByRole('link')

    for (const key of DESKTOP_KEYS) {
      const label = DESTINATIONS[key]!.label
      const matches = links.filter((link) => link.textContent?.trim() === label)
      expect(matches, `目的地「${label}」应恰好出现一次`).toHaveLength(1)
    }
  })

  it('「私信」只有一个链接，且不止一处指向它不会通过', () => {
    renderOpenMenu()
    const messageLinks = screen
      .getAllByRole('link')
      .filter((link) => link.textContent?.trim() === DESTINATIONS.messages!.label)
    expect(messageLinks).toHaveLength(1)
    expect(messageLinks[0]).toHaveAttribute('href', DESTINATIONS.messages!.path)
  })

  it('关于区说明页入口也各出现一次', () => {
    renderOpenMenu()
    const links = screen.getAllByRole('link')
    for (const item of ABOUT_LINKS) {
      const matches = links.filter((link) => link.textContent?.trim() === item.label)
      expect(matches, `说明页「${item.label}」应恰好出现一次`).toHaveLength(1)
    }
  })

  it('点击导航链接与说明页链接都会请求关闭抽屉', async () => {
    const onOpenChange = vi.fn()
    renderOpenMenu(onOpenChange)
    await userEvent.click(screen.getByRole('link', { name: DESTINATIONS.home!.label }))
    await userEvent.click(screen.getByRole('link', { name: ABOUT_LINKS[0]!.label }))
    expect(onOpenChange).toHaveBeenCalledTimes(2)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
