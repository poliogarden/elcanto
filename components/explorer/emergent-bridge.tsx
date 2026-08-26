'use client'

import type { ExplorerEmergent, RelationshipExplorerGraph } from '@/lib/visualization/relationship-explorer-model'

type Props = {
  graph: RelationshipExplorerGraph
  onSelectInsight?: (insight: ExplorerEmergent) => void
}

export function EmergentBridge({ graph, onSelectInsight }: Props) {
  if (graph.emergentInsights.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-paper-2/10 px-4 py-6 text-center">
        <p className="text-2xl text-ink-soft/40" aria-hidden>
          ✦
        </p>
        <p className="mt-2 text-xs font-semibold tracking-wide text-ink-soft">
          NO VERIFIED EMERGENT RELATIONSHIP
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          No cross-source insight passed verification.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {graph.emergentInsights.map((insight) => {
        const patterns = graph.patterns.filter((p) => insight.patternIds.includes(p.id))

        return (
          <button
            key={insight.id}
            type="button"
            onClick={() => onSelectInsight?.(insight)}
            className="w-full rounded-xl border border-line bg-paper-2/20 p-5 text-left transition-colors hover:border-ink/30"
          >
            {patterns.length >= 2 && (
              <div className="mb-4 flex items-center justify-center gap-4">
                <div className="max-w-[8rem] text-center">
                  <p className="text-[10px] font-semibold text-ink-soft">
                    {patterns[0].title.slice(0, 40)}
                  </p>
                </div>
                <div className="flex flex-col items-center text-ink-soft">
                  <span className="text-lg" aria-hidden>
                    ↘
                  </span>
                  <span className="text-coral" aria-hidden>
                    ✦
                  </span>
                  <span className="text-lg" aria-hidden>
                    ↙
                  </span>
                </div>
                <div className="max-w-[8rem] text-center">
                  <p className="text-[10px] font-semibold text-ink-soft">
                    {patterns[1].title.slice(0, 40)}
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs font-semibold tracking-wide text-coral">EMERGENT INSIGHT</p>
            <p className="mt-2 font-serif text-lg leading-snug text-ink">
              &ldquo;{insight.statement}&rdquo;
            </p>
            <p className="mt-2 text-xs text-ink-soft">Why this emerges →</p>
          </button>
        )
      })}
    </div>
  )
}
