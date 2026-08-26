'use client'

import type { ExplorerGap } from '@/lib/visualization/relationship-explorer-model'
import { getVisualGrammar } from '@/lib/visualization/visual-grammar'

type Props = {
  gaps: ExplorerGap[]
  onSelectGap?: (gap: ExplorerGap) => void
}

export function GapIndicator({ gaps, onSelectGap }: Props) {
  if (gaps.length === 0) return null

  const grammar = getVisualGrammar('unclear')

  return (
    <div className="rounded-xl border border-dashed border-line bg-paper-2/10 p-4">
      <p className="text-[10px] font-semibold tracking-wide text-ink-soft">
        {grammar.icon} INSUFFICIENT EVIDENCE
      </p>
      <div className="mt-3 space-y-2">
        {gaps.slice(0, 4).map((gap) => (
          <button
            key={gap.id}
            type="button"
            onClick={() => onSelectGap?.(gap)}
            className="flex w-full items-start gap-3 rounded-lg bg-background/60 px-3 py-2 text-left hover:bg-background"
          >
            <span className="mt-0.5 font-mono text-sm text-ink-soft" aria-hidden>
              ?
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{gap.title}</p>
              {gap.whyItMatters && (
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{gap.whyItMatters}</p>
              )}
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wide text-ink-soft">
                {gap.status.replace(/_/g, ' ')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
