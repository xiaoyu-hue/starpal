import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { StarpalMark, StarpalWordmark } from '../../components/brand/StarpalLogo'
import { Button } from '../../components/ui/Button'
import { applyTheme, readTheme, type Theme } from '../../lib/theme'
import { Section } from './Section'
import { BrandSection } from './sections/BrandSection'
import { ButtonSection } from './sections/ButtonSection'
import { FeedbackSection } from './sections/FeedbackSection'
import { FormSection } from './sections/FormSection'
import { NavigationSection } from './sections/NavigationSection'
import { OverlaySection } from './sections/OverlaySection'
import { PostCardSection } from './sections/PostCardSection'
import { TokensSection } from './sections/TokensSection'

export function PreviewPage() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sp-glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-[var(--sp-content-width)] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 text-accent">
            <StarpalMark size={32} />
            <StarpalWordmark compact />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-faint sm:inline">设计系统预览</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleTheme}
              icon={theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            >
              {theme === 'light' ? '深色' : '浅色'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[var(--sp-content-width)] px-4 pb-16">
        <div className="sp-enter py-10 sm:py-14">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Design System / 设计系统
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">星聚 STARPAL</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
            让兴趣相遇，让热爱聚集。这一页展示统一的视觉令牌、基础组件与三态反馈，用于在铺开全站页面之前确认风格基线。
          </p>
          <p className="mt-3 text-xs text-faint">
            当前为设计系统预览：不连接数据库、不产生真实数据、不提供业务功能；页面内交互仅用于检验组件行为。
          </p>
        </div>

        <div className="space-y-10">
          <Section
            id="brand"
            index="01"
            title="品牌标识"
            description="中心主星 + 环绕小星，几何构成、单色可用，favicon 尺寸仍可辨识。"
          >
            <BrandSection />
          </Section>

          <Section
            id="tokens"
            index="02"
            title="设计令牌"
            description="颜色、字号、间距、圆角的唯一取值来源；浅深两套由 data-theme 切换。"
          >
            <TokensSection />
          </Section>

          <Section
            id="navigation"
            index="03"
            title="导航与响应式外壳"
            description="桌面六目的地顶栏、移动端四 Tab + 中央凸起发布，目的地集合一致。"
          >
            <NavigationSection />
          </Section>

          <Section
            id="buttons"
            index="04"
            title="按钮"
            description="四种变体、三档尺寸、禁用与加载态；全部复用同一套令牌。"
          >
            <ButtonSection />
          </Section>

          <Section
            id="forms"
            index="05"
            title="表单与输入"
            description="语义标签、提示、错误态与键盘焦点，均带可访问属性。"
          >
            <FormSection />
          </Section>

          <Section
            id="overlays"
            index="06"
            title="浮层与对话框"
            description="基于 Radix 的焦点管理、键盘操作与语义描述；玻璃层不损害文字对比。"
          >
            <OverlaySection />
          </Section>

          <Section
            id="cards"
            index="07"
            title="内容卡片"
            description="内容卡片保持实色高可读；示例内容明确标注，不冒充真实用户。"
          >
            <PostCardSection />
          </Section>

          <Section
            id="states"
            index="08"
            title="三态反馈"
            description="加载、空态、错误态均可独立复现，并提供可重试与引导操作。"
          >
            <FeedbackSection />
          </Section>
        </div>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-faint">
        星聚 STARPAL · 让兴趣相遇，让热爱聚集。 · 设计系统预览
      </footer>
    </div>
  )
}
