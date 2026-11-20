// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from '../../../lib/cn'
import type { Topic } from '../../../types/api'

type TopicPickerProps = {
  topics: Topic[]
  value: number | null
  onChange: (topicId: number) => void
  error?: string
}

/**
 * 话题单选：用原生 radio + label 实现，方向键与空格由浏览器提供。
 * 单选语义比「一排按钮」更准确——发帖只能归属一个话题。
 */
export function TopicPicker({ topics, value, onChange, error }: TopicPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-ink">选择话题</legend>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => {
          const checked = value === topic.id
          return (
            <label
              key={topic.id}
              className={cn(
                'sp-transition inline-flex cursor-pointer items-center rounded-md px-3.5 py-2 text-sm',
                'border focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2',
                checked
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              <input
                type="radio"
                name="topic"
                value={topic.id}
                checked={checked}
                onChange={() => onChange(topic.id)}
                className="sr-only"
                aria-describedby={error ? 'topic-error' : undefined}
              />
              {topic.nameZh}
            </label>
          )
        })}
      </div>
      {error ? (
        <p id="topic-error" className="mt-2 text-xs text-[var(--sp-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
