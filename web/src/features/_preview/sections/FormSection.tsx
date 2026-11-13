import { Search } from 'lucide-react'
import { Input } from '../../../components/ui/Input'

export function FormSection() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Input label="昵称" placeholder="请输入昵称" hint="仅用于展示组件，不会提交到任何服务" />
      <Input
        label="密码"
        type="password"
        placeholder="请输入密码"
        error="密码长度不足（示例错误态）"
      />
      <div className="relative sm:col-span-2">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          aria-label="搜索兴趣、话题或内容"
          placeholder="搜索兴趣、话题或内容"
          className="sp-transition h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--sp-accent-soft)]"
        />
      </div>
      <p className="text-xs text-faint sm:col-span-2">
        所有输入均带语义标签与键盘焦点态；错误态通过 aria-invalid 与 role=alert 关联。
      </p>
    </div>
  )
}
