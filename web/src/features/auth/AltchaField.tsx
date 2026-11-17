// SPDX-License-Identifier: AGPL-3.0-or-later
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import 'altcha'
import type {} from 'altcha/types/react'
import type { WidgetAttributes, WidgetMethods } from 'altcha/types'
import { apiGet } from '../../lib/api-client'

/**
 * 人机验证字段（ALTCHA 自托管，工作量证明）。
 *
 * 真人在后台自动完成一小段计算，无需点击图片；脚本则需为每个请求付算力。
 * 组件挂载时从本服务拉取一次性挑战（解统一包络后交给 widget），
 * 求解完成由 statechange 事件回传 payload，提交时经 ref 读取。
 */
export type AltchaHandle = { getPayload: () => string | null }

type WidgetEl = WidgetAttributes & WidgetMethods & HTMLElement

export const AltchaField = forwardRef<AltchaHandle>(function AltchaField(_props, ref) {
  const widgetRef = useRef<WidgetEl>(null)
  const [payload, setPayload] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<string | null>(null)
  const [error, setError] = useState(false)

  // 一次性拉取挑战：失败时只显示重试提示，不阻断页面其它部分。
  useEffect(() => {
    let alive = true
    void apiGet<{ challenge: string }>('auth/challenge')
      .then((envelope) => {
        if (alive) setChallenge(envelope.data.challenge)
      })
      .catch(() => {
        if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [])

  // 监听 widget 求解完成，缓存 payload；重算时清空，避免交出过期结果。
  useEffect(() => {
    const el = widgetRef.current
    if (!el) return
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ payload?: string }>).detail
      setPayload(detail?.payload ?? null)
    }
    el.addEventListener('statechange', onChange)
    return () => el.removeEventListener('statechange', onChange)
  }, [challenge])

  useImperativeHandle(ref, () => ({ getPayload: () => payload }), [payload])

  if (error) {
    return (
      <p role="alert" className="text-sm text-[var(--sp-danger)]">
        安全验证加载失败，请刷新页面重试
      </p>
    )
  }

  return (
    <div>
      <altcha-widget
        ref={widgetRef}
        challenge={challenge ?? undefined}
        auto="onload"
        name="altcha"
        workers={2}
      />
      {payload === null ? (
        <p className="mt-1 text-xs text-muted">正在进行安全验证，请稍候…</p>
      ) : null}
    </div>
  )
})
