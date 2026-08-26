'use client'

import type { ReasoningGraph, ReasoningNode } from '@/lib/reasoning-graph/types'
import { ancestors } from '@/lib/reasoning-graph/build-reasoning-graph'
import { isNodeVisible } from '@/lib/reasoning-graph/layout'
import { ReasoningNodeCard } from '@/components/reasoning-graph/reasoning-node-card'
import type { GraphFilter } from '@/lib/reasoning-graph/types'

type Props = {
  graph: ReasoningGraph
  selectedId: string | null
  expandedIds: Set<string>
  filter: GraphFilter
  onSelect: (node: ReasoningNode) => void
}

function depthOf(node: ReasoningNode, graph: ReasoningGraph): number {
  const chain = ancestors(graph, node.id)
  return chain.size - 1
}

export function ReasoningGraphMobile({
  graph,
  selectedId,
  expandedIds,
  filter,
  onSelect,
}: Props) {
  const visible = graph.nodes
    .filter((n) => isNodeVisible(n, expandedIds, filter))
    .sort((a, b) => {
      const da = depthOf(a, graph)
      const db = depthOf(b, graph)
      if (da !== db) return da - db
      return a.id.localeCompare(b.id)
    })

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {visible.map((node) => {
        const depth = depthOf(node, graph)
        const dimmed =
          selectedId != null &&
          !ancestors(graph, selectedId).has(node.id) &&
          selectedId !== node.id

        return (
          <div
            key={node.id}
            style={{ paddingLeft: `${Math.min(depth, 4) * 12}px` }}
          >
            <ReasoningNodeCard
              node={node}
              selected={selectedId === node.id}
              dimmed={dimmed}
              expanded={expandedIds.has(node.id)}
              hasChildren={node.childIds.length > 0}
              onClick={() => onSelect(node)}
            />
          </div>
        )
      })}
    </div>
  )
}
