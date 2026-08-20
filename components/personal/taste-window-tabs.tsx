'use client'

import type { TasteWindow } from '@/lib/types/personal'

const WINDOWS: { id: TasteWindow; label: string }[] = [
  { id: '7d', label: '7 DAYS' },
  { id: '30d', label: '30 DAYS' },
  { id: '90d', label: '90 DAYS' },
  { id: 'all', label: 'ALL TIME' },
]

type Props = {
  value: TasteWindow
  onChange: (window: TasteWindow) => void
  signalCounts?: Partial<Record<TasteWindow, number>>
}

export function TasteWindowTabs({ value, onChange, signalCounts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {WINDOWS.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => onChange(w.id)}
          className={`mono-label border px-3 py-2 text-[10px] ${
            value === w.id
              ? 'border-ink bg-ink text-background'
              : 'border-line text-ink-soft hover:bg-ink hover:text-background'
          }`}
        >
          {w.label}
          {signalCounts?.[w.id] !== undefined ? ` (${signalCounts[w.id]})` : ''}
        </button>
      ))}
    </div>
  )
}
