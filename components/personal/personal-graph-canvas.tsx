'use client'

import { useMemo, useState } from 'react'
import type { PersonalGraphEdge, PersonalGraphNode } from '@/lib/types/personal'
import {
  getConnectedNodeIds,
  isPatternEdge,
  layoutPersonalGraph,
  nodeRadius,
} from '@/lib/personal/graph-layout'

type Props = {
  nodes: PersonalGraphNode[]
  edges: PersonalGraphEdge[]
  onSelectTopic?: (label: string) => void
  selectedTopicLabel?: string | null
}

export function PersonalGraphCanvas({ nodes, edges, onSelectTopic, selectedTopicLabel }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const activeId = focusedId ?? hoveredId
  const highlightIds = useMemo(
    () => (activeId ? getConnectedNodeIds(activeId, edges) : null),
    [activeId, edges],
  )

  const layout = useMemo(() => layoutPersonalGraph(nodes, 720, 480), [nodes])

  const activeNode = nodes.find((n) => n.id === activeId)

  if (nodes.length === 0) return null

  return (
    <div className="border border-line bg-background">
      <div className="border-b border-line px-4 py-3">
        <span className="mono-label text-[10px] text-ink-soft">CONNECTION MAP</span>
        <p className="mt-1 font-serif text-sm text-ink-soft">
          Solid lines: source → topic · Dashed lines: related interests
        </p>
      </div>

      <div className="overflow-x-auto p-4">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="mx-auto w-full max-w-4xl"
          role="img"
          aria-label="Personal knowledge graph"
        >
          <rect width={layout.width} height={layout.height} fill="transparent" />

          {edges.map((edge) => {
            const from = layout.positions.get(edge.from)
            const to = layout.positions.get(edge.to)
            if (!from || !to) return null

            const pattern = isPatternEdge(edge)
            const dimmed = highlightIds && !highlightIds.has(edge.from) && !highlightIds.has(edge.to)
            const highlighted = highlightIds?.has(edge.from) && highlightIds?.has(edge.to)

            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth={pattern ? (highlighted ? 2.5 : 1.5) : highlighted ? 2 : 1}
                strokeDasharray={pattern ? '6 4' : undefined}
                className={
                  dimmed
                    ? 'text-line opacity-25'
                    : highlighted
                      ? 'text-ink'
                      : pattern
                        ? 'text-ink-soft opacity-70'
                        : 'text-line opacity-60'
                }
              />
            )
          })}

          {nodes.map((node) => {
            const pos = layout.positions.get(node.id)
            if (!pos) return null

            const r = nodeRadius(node)
            const isTopic = node.type === 'topic'
            const isSelected = isTopic && selectedTopicLabel === node.label
            const dimmed = highlightIds && !highlightIds.has(node.id)
            const highlighted = highlightIds?.has(node.id)
            const recent = node.recent

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  setFocusedId((prev) => (prev === node.id ? null : node.id))
                  if (isTopic && onSelectTopic) onSelectTopic(node.label)
                }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 6}
                  fill="transparent"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={isSelected || highlighted ? 'currentColor' : 'var(--background)'}
                  stroke="currentColor"
                  strokeWidth={isSelected ? 2.5 : recent ? 2 : 1.5}
                  className={
                    dimmed
                      ? 'text-line opacity-30'
                      : isSelected || highlighted
                        ? 'text-ink'
                        : recent
                          ? 'text-ink'
                          : 'text-ink-soft'
                  }
                />
                {isTopic && (
                  <text
                    x={pos.x}
                    y={pos.y + r + 14}
                    textAnchor="middle"
                    className={`fill-current font-mono text-[11px] ${
                      dimmed ? 'text-line opacity-40' : 'text-ink'
                    }`}
                  >
                    {node.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {activeNode && (
        <div className="border-t border-line px-4 py-4">
          <span className="mono-label text-[10px] text-ink-soft">
            {activeNode.type.toUpperCase()}
            {activeNode.recent ? ' · RECENT' : ''}
          </span>
          <p className="mt-2 font-serif text-base leading-relaxed">{activeNode.label}</p>
          {activeNode.type === 'topic' && (
            <p className="mono mt-1 text-[11px] text-ink-soft">{activeNode.weight} connected signals</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4 border-t border-line px-4 py-3">
        <LegendItem dash={false} label="Source → topic" />
        <LegendItem dash label="Related interest" />
        <span className="mono text-[10px] text-ink-soft">● recent</span>
      </div>
    </div>
  )
}

function LegendItem({ dash, label }: { dash: boolean; label: string }) {
  return (
    <span className="flex items-center gap-2 mono text-[10px] text-ink-soft">
      <svg width="28" height="2" aria-hidden>
        <line
          x1="0"
          y1="1"
          x2="28"
          y2="1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={dash ? '4 3' : undefined}
        />
      </svg>
      {label}
    </span>
  )
}
