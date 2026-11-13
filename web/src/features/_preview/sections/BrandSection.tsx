import { StarpalMark, StarpalWordmark } from '../../../components/brand/StarpalLogo'
import { GlassPanel } from '../../../components/layout/GlassPanel'

const SIZES = [48, 32, 20, 16]

export function BrandSection() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-accent">
          <StarpalMark size={64} />
          <StarpalWordmark />
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          中心主星代表个体，四颗环绕小星代表不同兴趣与社区。纯几何构成，使用
          <code className="mx-1 rounded-sm bg-subtle px-1 text-xs">currentColor</code>
          自动适配浅深两套文本色。
        </p>
      </div>

      <GlassPanel className="flex items-center justify-around p-6">
        {SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2 text-accent">
            <StarpalMark size={size} decorative />
            <span className="text-xs text-faint">{size}px</span>
          </div>
        ))}
      </GlassPanel>

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <span className="text-xs text-faint">应用约束：</span>
        <span className="rounded-sm border border-line px-2 py-1 text-xs text-muted">
          缩至 favicon 尺寸仍可辨识中心主星
        </span>
        <span className="rounded-sm border border-line px-2 py-1 text-xs text-muted">
          单色 / 深浅两套由同一路径生成
        </span>
        <span className="rounded-sm border border-line px-2 py-1 text-xs text-muted">
          品牌名统一使用「星聚 STARPAL」
        </span>
      </div>
    </div>
  )
}
