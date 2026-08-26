'use client'

import type { ExplorerRelationship, RelationshipExplorerGraph } from '@/lib/visualization/relationship-explorer-model'
import { SourceBadge } from '@/components/explorer/source-badge'
import { getVisualGrammar } from '@/lib/visualization/visual-grammar'

type Props = {
  graph: RelationshipExplorerGraph
  relationships: ExplorerRelationship[]
  onSelectRelationship?: (rel: ExplorerRelationship) => void
}

export function AgreeHub({ graph, relationships, onSelectRelationship }: Props) {
  if (relationships.length === 0) return null

  const grammar = getVisualGrammar('agree')
  const sourceIds = new Set<string>()
  for (const r of relationships) {
    sourceIds.add(r.fromSourceId)
    sourceIds.add(r.toSourceId)
  }
  const sources = graph.sources.filter(
    (s) => sourceIds.has(s.sourceId) && !s.excluded,
  )

  const hubLabel =
    relationships[0]?.explanation.slice(0, 60) ?? 'Shared agreement'

  return (
    <div className="rounded-xl border border-line bg-paper-2/20 p-4">
      <p className="text-[10px] font-semibold tracking-wide text-ink-soft">
        {grammar.icon} {grammar.label.toUpperCase()}
      </p>

      <div className="mt-4 flex flex-col items-center">
        <div className="rounded-full border-2 border-ink bg-background px-4 py-2 text-center">
          <p className="text-xs font-semibold text-ink line-clamp-2">{hubLabel}</p>
          <p className="mt-0.5 font-mono text-[10px] text-ink-soft">
            {sources.length} sources · {relationships.length} links
          </p>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {sources.map((s) => (
            <SourceBadge
              key={s.sourceId}
              voiceIndex={s.voiceIndex}
              videoId={s.videoId}
              thumbnail={s.thumbnail}
              title={s.title}
            />
          ))}
        </div>

        <div className="mt-4 w-full space-y-2">
          {relationships.slice(0, 3).map((r) => {
            const from = graph.claims.find((c) => c.id === r.fromClaimId)
            const to = graph.claims.find((c) => c.id === r.toClaimId)
            if (!from || !to) return null
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRelationship?.(r)}
                className="flex w-full items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-left hover:bg-background"
              >
                <SourceBadge voiceIndex={from.voiceIndex} videoId={from.videoId} size="sm" />
                <span className="text-[10px] text-ink-soft">{grammar.connector}</span>
                <SourceBadge voiceIndex={to.voiceIndex} videoId={to.videoId} size="sm" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
