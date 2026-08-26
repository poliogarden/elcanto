'use client'

import type { ExplorerRelationship, RelationshipExplorerGraph } from '@/lib/visualization/relationship-explorer-model'
import { SourceBadge } from '@/components/explorer/source-badge'
import { getVisualGrammar } from '@/lib/visualization/visual-grammar'

type Props = {
  graph: RelationshipExplorerGraph
  relationships: ExplorerRelationship[]
  onSelectRelationship?: (rel: ExplorerRelationship) => void
}

export function DivideSpectrum({ graph, relationships, onSelectRelationship }: Props) {
  if (relationships.length === 0) return null

  const rel = relationships[0]
  const from = graph.claims.find((c) => c.id === rel.fromClaimId)
  const to = graph.claims.find((c) => c.id === rel.toClaimId)
  if (!from || !to) return null

  const isTradeOff = rel.visualKind === 'trade-off'
  const grammar = getVisualGrammar(isTradeOff ? 'trade-off' : 'divide')

  const fromSource = graph.sources.find((s) => s.sourceId === from.sourceId)
  const toSource = graph.sources.find((s) => s.sourceId === to.sourceId)

  return (
    <div className="rounded-xl border border-coral/30 bg-coral/5 p-4">
      <p className="text-[10px] font-semibold tracking-wide text-coral">
        {grammar.icon} {grammar.label.toUpperCase()}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-lg border border-line bg-background p-3">
          <SourceBadge
            voiceIndex={from.voiceIndex}
            videoId={from.videoId}
            thumbnail={fromSource?.thumbnail}
            title={fromSource?.title}
          />
          <p className="mt-2 text-sm font-medium leading-snug text-ink">
            &ldquo;{from.statement}&rdquo;
          </p>
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          <span className="font-mono text-[10px] text-coral">{grammar.connector}</span>
          <span className="text-lg text-coral" aria-hidden>
            {grammar.icon}
          </span>
        </div>

        <div className="rounded-lg border border-line bg-background p-3">
          <SourceBadge
            voiceIndex={to.voiceIndex}
            videoId={to.videoId}
            thumbnail={toSource?.thumbnail}
            title={toSource?.title}
          />
          <p className="mt-2 text-sm font-medium leading-snug text-ink">
            &ldquo;{to.statement}&rdquo;
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelectRelationship?.(rel)}
        className="mt-3 w-full text-left text-xs text-ink-soft hover:text-ink"
      >
        {rel.explanation}
      </button>

      {relationships.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {relationships.slice(1, 4).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRelationship?.(r)}
              className="rounded-full border border-line bg-background px-2.5 py-1 text-[10px] text-ink-soft hover:border-ink"
            >
              +{r.visualKind === 'trade-off' ? ' trade-off' : ' divide'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
