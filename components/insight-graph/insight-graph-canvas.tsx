'use client'

import { useMemo, useState } from 'react'
import type {
  ClaimNodeData,
  ConceptNodeData,
  InsightGraphData,
  InsightGraphNode,
  RelationshipNodeData,
} from '@/lib/types/insight-graph'
import {
  getConnectedNodeIds,
  layoutInsightGraph,
  nodeVisualRadius,
} from '@/lib/insight-graph/layout'

type Props = {
  graph: InsightGraphData
  selectedId: string | null
  expandedIds: Set<string>
  onSelect: (id: string | null) => void
  onToggleExpand: (id: string) => void
}

function isNodeVisible(node: InsightGraphNode, expandedIds: Set<string>): boolean {
  if (node.defaultVisible) return true
  if (expandedIds.has(node.id)) return true

  if (node.type === 'claim') {
    const data = node.data as ClaimNodeData
    return [...expandedIds].some((id) => id === `video_${data.sourceId}`)
  }

  if (node.type === 'concept') {
    const data = node.data as ConceptNodeData
    return [...expandedIds].some((id) => {
      if (!id.startsWith('video_')) return false
      const sourceId = id.slice('video_'.length)
      return data.sourceIds.includes(sourceId)
    })
  }

  if (node.type === 'unique') {
    const data = node.data as RelationshipNodeData
    return [...expandedIds].some((id) => {
      if (!id.startsWith('video_')) return false
      return data.sourceIds.includes(id.slice('video_'.length))
    })
  }

  return false
}

function nodeFillClass(node: InsightGraphNode, selected: boolean, highlighted: boolean): string {
  if (node.type === 'insight') {
    return selected || highlighted ? 'fill-mint text-ink' : 'fill-background text-ink'
  }
  if (node.type === 'contradiction') {
    return selected || highlighted ? 'fill-ink text-background' : 'fill-background text-ink'
  }
  return selected || highlighted ? 'fill-ink text-background' : 'fill-background text-ink-soft'
}

export function InsightGraphCanvas({
  graph,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const activeId = selectedId ?? hoveredId

  const visibleNodes = useMemo(
    () => graph.nodes.filter((n) => isNodeVisible(n, expandedIds)),
    [graph.nodes, expandedIds],
  )

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes])

  const visibleEdges = useMemo(
    () =>
      graph.edges.filter(
        (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to),
      ),
    [graph.edges, visibleNodeIds],
  )

  const layout = useMemo(
    () => layoutInsightGraph(visibleNodes, visibleEdges, 880, 520),
    [visibleNodes, visibleEdges],
  )

  const highlightIds = useMemo(
    () => (activeId ? getConnectedNodeIds(activeId, visibleEdges) : null),
    [activeId, visibleEdges],
  )

  if (visibleNodes.length === 0) return null

  return (
    <div className="overflow-x-auto p-4">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="mx-auto w-full min-w-[640px] max-w-5xl"
        role="img"
        aria-label="Insight relationship graph"
      >
        <rect width={layout.width} height={layout.height} fill="transparent" />

        {visibleEdges.map((edge) => {
          const from = layout.positions.get(edge.from)
          const to = layout.positions.get(edge.to)
          if (!from || !to) return null

          const dimmed =
            highlightIds && !highlightIds.has(edge.from) && !highlightIds.has(edge.to)
          const highlighted = highlightIds?.has(edge.from) && highlightIds?.has(edge.to)

          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="currentColor"
              strokeWidth={highlighted ? 2 : 1}
              className={dimmed ? 'text-line opacity-25' : highlighted ? 'text-ink' : 'text-line opacity-50'}
            />
          )
        })}

        {visibleNodes.map((node) => {
          const pos = layout.positions.get(node.id)
          if (!pos) return null

          const r = nodeVisualRadius(node)
          const selected = selectedId === node.id
          const dimmed = highlightIds && !highlightIds.has(node.id)
          const highlighted = highlightIds?.has(node.id)
          const isInsight = node.type === 'insight'
          const canExpand =
            !node.defaultVisible ||
            node.type === 'video' ||
            node.type === 'shared' ||
            node.type === 'different'

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                onSelect(selected ? null : node.id)
                if (canExpand && node.type !== 'insight') onToggleExpand(node.id)
              }}
            >
              <circle cx={pos.x} cy={pos.y} r={r + 8} fill="transparent" />

              {isInsight ? (
                <>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r + 4}
                    className={`stroke-current ${dimmed ? 'text-line opacity-30' : 'text-mint-ink opacity-60'}`}
                    fill="none"
                    strokeWidth={1}
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r}
                    className={`stroke-current stroke-[1.5] ${nodeFillClass(node, selected, Boolean(highlighted))} ${dimmed ? 'opacity-30' : ''}`}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`fill-current font-serif text-sm ${dimmed ? 'opacity-30' : ''}`}
                  >
                    ✦
                  </text>
                </>
              ) : (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  className={`stroke-current stroke-[1.5] ${nodeFillClass(node, selected, Boolean(highlighted))} ${dimmed ? 'opacity-30' : ''}`}
                />
              )}

              <text
                x={pos.x}
                y={pos.y + r + 16}
                textAnchor="middle"
                className={`fill-current font-mono text-[9px] uppercase tracking-wide ${
                  dimmed ? 'text-line opacity-40' : 'text-ink'
                }`}
              >
                {node.type === 'video'
                  ? node.label
                  : node.type === 'insight'
                    ? 'INSIGHT'
                    : node.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
