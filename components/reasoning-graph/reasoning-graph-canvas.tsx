'use client'

import type { ReasoningGraph, ReasoningNode } from '@/lib/reasoning-graph/types'
import { edgePath, isNodeVisible, layoutReasoningGraph } from '@/lib/reasoning-graph/layout'
import { descendants } from '@/lib/reasoning-graph/build-reasoning-graph'
import { ReasoningNodeCard } from '@/components/reasoning-graph/reasoning-node-card'
import type { GraphFilter } from '@/lib/reasoning-graph/types'

type Props = {
  graph: ReasoningGraph
  selectedId: string | null
  expandedIds: Set<string>
  filter: GraphFilter
  onSelect: (node: ReasoningNode) => void
}

function edgeStroke(kind: string, selected: boolean): string {
  if (selected) return 'stroke-ink'
  if (kind === 'contradicts' || kind === 'trade_off') return 'stroke-coral/60'
  if (kind === 'evidence_for') return 'stroke-line'
  return 'stroke-line'
}

function edgeDash(kind: string): string | undefined {
  if (kind === 'trade_off' || kind === 'contradicts') return '6 4'
  if (kind === 'evidence_for') return '2 4'
  return undefined
}

export function ReasoningGraphCanvas({
  graph,
  selectedId,
  expandedIds,
  filter,
  onSelect,
}: Props) {
  const visibleNodes = graph.nodes.filter((n) => isNodeVisible(n, expandedIds, filter))
  const { points, width, height } = layoutReasoningGraph(graph, visibleNodes)
  const pointById = new Map(points.map((p) => [p.node.id, p]))

  const highlightIds = selectedId
    ? descendants(graph, selectedId)
    : null

  const visibleEdges = graph.edges.filter(
    (e) => pointById.has(e.from) && pointById.has(e.to),
  )

  return (
    <div className="relative w-full overflow-x-auto rounded-xl border border-line bg-paper-2/10">
      <div className="relative mx-auto" style={{ width, height, minWidth: '100%' }}>
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          {visibleEdges.map((e) => {
            const from = pointById.get(e.from)
            const to = pointById.get(e.to)
            if (!from || !to) return null
            const active =
              selectedId === e.from ||
              selectedId === e.to ||
              (highlightIds?.has(e.from) && highlightIds?.has(e.to))
            return (
              <path
                key={e.id}
                d={edgePath(from, to)}
                fill="none"
                strokeWidth={active ? 1.5 : 1}
                className={edgeStroke(e.kind, Boolean(active))}
                strokeDasharray={edgeDash(e.kind)}
              />
            )
          })}
        </svg>

        {points.map((p) => {
          const dimmed =
            selectedId != null &&
            highlightIds != null &&
            !highlightIds.has(p.node.id) &&
            selectedId !== p.node.id &&
            !p.node.parentIds.includes(selectedId)

          return (
            <div
              key={p.node.id}
              className="absolute -translate-x-1/2"
              style={{ left: p.x, top: p.y }}
            >
              <ReasoningNodeCard
                node={p.node}
                selected={selectedId === p.node.id}
                dimmed={dimmed}
                expanded={expandedIds.has(p.node.id)}
                hasChildren={p.node.childIds.length > 0}
                onClick={() => onSelect(p.node)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
