// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { Modal } from '../../../components/ui/Dialog'
import { Menu } from '../../../components/ui/DropdownMenu'
import { TabGroup } from '../../../components/ui/Tabs'
import { buttonClass } from '../../../components/ui/Button'

const MENU_ITEMS = [
  { label: '技术与数码', value: 'tech' },
  { label: '游戏', value: 'gaming' },
  { label: '动漫与文化', value: 'anime' },
  { label: '生活方式', value: 'lifestyle' },
]

export function OverlaySection() {
  const [selected, setSelected] = useState('')

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-3">
        <Modal
          trigger={<button className={buttonClass('primary', 'md')}>打开对话框</button>}
          title="确认操作"
          description="用于检验焦点管理、Esc 关闭与语义描述的对话框。"
        >
          <p className="text-sm leading-relaxed text-muted">
            弹窗与下拉使用玻璃层，正文保持高对比文本色。键盘 Tab 可遍历全部控件。
          </p>
        </Modal>
        <Menu
          label="选择话题"
          items={MENU_ITEMS}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <p className="text-xs text-faint" role="status">
        最近选择：<span className="font-medium text-accent">{selected || '尚未选择'}</span>
        <span className="ml-2">（菜单选择由组件真实记录）</span>
      </p>

      <div className="border-t border-line pt-6">
        <TabGroup
          ariaLabel="信息流排序预览"
          tabs={[
            {
              value: 'recommended',
              label: '推荐',
              content: <p>按话题偏好与时间衰减加权，不使用机器学习模型。</p>,
            },
            { value: 'latest', label: '最新', content: <p>按发布时间倒序排列。</p> },
            { value: 'popular', label: '热门', content: <p>按互动量确定性加权排列。</p> },
          ]}
        />
      </div>
    </div>
  )
}
