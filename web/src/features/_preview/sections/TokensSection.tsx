import { COLOR_GROUPS, RADII, SPACING, TYPE_SCALE } from '../preview-data'

export function TokensSection() {
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-4 text-xs font-medium text-faint">
          颜色令牌 · 切换右上角主题可查看浅深两套取值
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {COLOR_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-3 text-sm font-medium text-ink">{group.title}</p>
              <div className="space-y-2.5">
                {group.swatches.map((swatch) => (
                  <div key={swatch.name} className="flex items-center gap-3">
                    <span
                      className="h-8 w-8 shrink-0 rounded-sm border border-line"
                      style={{ background: `var(${swatch.token})` }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink">{swatch.name}</p>
                      <p className="truncate text-xs text-faint">{swatch.token}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-6">
        <p className="mb-3 text-xs font-medium text-faint">字号阶梯 · 中英文混排</p>
        <div className="max-w-xl">
          {TYPE_SCALE.map((item) => (
            <div
              key={item.name}
              className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0"
            >
              <span className={`${item.className} truncate text-ink`}>星聚 STARPAL</span>
              <span className="shrink-0 text-xs text-faint">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-medium text-faint">间距阶梯（示意放大 3 倍）</p>
          <div className="space-y-2">
            {SPACING.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-faint">{item.name}</span>
                <span
                  className="h-3 rounded-sm bg-accent-soft"
                  style={{ width: `calc(var(${item.token}) * 3)` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-medium text-faint">圆角阶梯</p>
          <div className="flex gap-4">
            {RADII.map((item) => (
              <div key={item.name} className="flex flex-col items-center gap-2">
                <div
                  className="h-12 w-16 border border-line bg-accent-soft"
                  style={{ borderRadius: `var(${item.token})` }}
                />
                <span className="text-xs text-faint">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
