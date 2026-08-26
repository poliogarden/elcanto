'use client'

import type { ExplorerPattern } from '@/lib/visualization/relationship-explorer-model'
import { getVisualGrammar } from '@/lib/visualization/visual-grammar'

type Props = {
  pattern: ExplorerPattern
  leftLabel?: string
  rightLabel?: string
  onClick?: () => void
}

export function TradeOffBar({ pattern, leftLabel, rightLabel, onClick }: Props) {
  const grammar = getVisualGrammar('trade-off')

  const left = leftLabel ?? pattern.title.split(/\s*(?:vs|↔|←|→)\s*/i)[0]?.trim() ?? 'Side A'
  const right =
    rightLabel ?? pattern.title.split(/\s*(?:vs|↔|←|→)\s*/i)[1]?.trim() ?? 'Side B'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-coral/20 bg-background p-4 text-left transition-colors hover:border-coral/40"
    >
      <p className="text-[10px] font-semibold tracking-wide text-coral">
        {grammar.icon} TRADE-OFF
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">{pattern.title}</p>

      <div className="mt-4 flex items-center gap-3">
        <span className="w-24 shrink-0 text-right text-xs font-medium text-ink">{left}</span>
        <div className="relative flex-1">
          <div className="h-1.5 rounded-full bg-paper-2" />
          <div className="absolute inset-y-0 left-1/4 right-1/4 flex items-center justify-center">
            <span className="rounded-full bg-coral/20 px-2 py-0.5 font-mono text-[9px] text-coral">
              {grammar.connector}
            </span>
          </div>
        </div>
        <span className="w-24 shrink-0 text-xs font-medium text-ink">{right}</span>
      </div>

      <p className="mt-2 line-clamp-2 text-xs text-ink-soft">{pattern.description}</p>
    </button>
  )
}
