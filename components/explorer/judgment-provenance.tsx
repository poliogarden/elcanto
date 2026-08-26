'use client'

import type { JudgmentProvenanceItem } from '@/lib/visualization/relationship-explorer-model'

type Props = {
  items: JudgmentProvenanceItem[]
  onSelect?: (item: JudgmentProvenanceItem) => void
}

export function JudgmentProvenance({ items, onSelect }: Props) {
  if (items.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      <span className="text-[10px] font-semibold text-ink-soft">Based on:</span>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect?.(item)}
          className="rounded-full border border-line bg-background px-3 py-1 text-[10px] font-medium text-ink transition-colors hover:border-ink"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
