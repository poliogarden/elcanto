'use client'

import { STORY_MODE_LABELS, type StoryMode } from '@/lib/types/story-plan'

type Props = {
  mode: StoryMode
  onChange: (mode: StoryMode) => void
  disabled?: boolean
}

const MODES: StoryMode[] = ['insight', 'debate', 'funny', 'story']

export function StoryModePicker({ mode, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <span className="mono-label text-[10px] text-ink-soft">01 · CHOOSE A STORY</span>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => {
          const meta = STORY_MODE_LABELS[m]
          const active = mode === m
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onChange(m)}
              className={`border p-4 text-left transition-colors ${
                active ? 'border-ink bg-paper-2/80' : 'border-line hover:border-ink/40'
              } disabled:opacity-40`}
            >
              <span className="mono-label text-[10px] text-ink">{meta.title}</span>
              <p className="mt-2 font-serif text-base leading-snug text-ink-soft">
                {meta.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
