'use client'

import { useMemo } from 'react'
import type { ExplorerPattern, RelationshipExplorerGraph } from '@/lib/visualization/relationship-explorer-model'
import { SourceBadge } from '@/components/explorer/source-badge'
import { getVisualGrammar } from '@/lib/visualization/visual-grammar'

type Props = {
  graph: RelationshipExplorerGraph
  selectedPatternId: string | null
  filter: 'all' | 'agree' | 'divide' | 'gap' | null
  highlightedSourceId: string | null
  onSelectPattern: (id: string | null) => void
}

function layoutPatterns(patterns: ExplorerPattern[], count: number): Array<{ x: number; y: number }> {
  if (count === 0) return []
  if (count === 1) return [{ x: 50, y: 55 }]
  if (count === 2) return [
    { x: 30, y: 55 },
    { x: 70, y: 55 },
  ]
  if (count === 3) return [
    { x: 20, y: 58 },
    { x: 50, y: 42 },
    { x: 80, y: 58 },
  ]
  const positions: Array<{ x: number; y: number }> = []
  const cols = Math.min(3, count)
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    positions.push({
      x: 15 + (col / Math.max(cols - 1, 1)) * 70,
      y: 38 + row * 28,
    })
  }
  return positions
}

function patternVisible(p: ExplorerPattern, filter: Props['filter']): boolean {
  if (!filter || filter === 'all') return true
  if (filter === 'agree') return p.visualKind === 'agree'
  if (filter === 'divide') return p.visualKind === 'divide' || p.visualKind === 'trade-off'
  return true
}

export function PatternOverviewCanvas({
  graph,
  selectedPatternId,
  filter,
  highlightedSourceId,
  onSelectPattern,
}: Props) {
  const visiblePatterns = useMemo(
    () => graph.patterns.filter((p) => patternVisible(p, filter)),
    [graph.patterns, filter],
  )

  const positions = useMemo(
    () => layoutPatterns(visiblePatterns, visiblePatterns.length),
    [visiblePatterns],
  )

  if (!graph.hasVerifiedRelationships && graph.patterns.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper-2/10 p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
          {graph.emptyMessage ?? 'No verified cross-source relationships'}
        </p>
        <p className="mt-2 max-w-sm text-xs text-ink-soft">
          Sources may address independent topics, or evidence was insufficient for defensible links.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 100"
        className="mx-auto h-auto w-full min-h-[220px] max-h-[360px]"
        role="img"
        aria-label="Relationship overview"
      >
        {/* Central question */}
        <text
          x={50}
          y={18}
          textAnchor="middle"
          className="fill-ink font-serif text-[3.2px] font-medium"
        >
          {graph.question.length > 60 ? `${graph.question.slice(0, 58)}…` : graph.question}
        </text>

        {/* Lines from center to patterns */}
        {visiblePatterns.map((p, i) => {
          const pos = positions[i]
          if (!pos) return null
          const selected = selectedPatternId === p.id
          const grammar = getVisualGrammar(p.visualKind)
          return (
            <line
              key={`line_${p.id}`}
              x1={50}
              y1={24}
              x2={pos.x}
              y2={pos.y - 6}
              stroke="currentColor"
              strokeWidth={selected ? 0.5 : 0.25}
              className={selected ? 'text-ink' : 'text-line'}
              strokeDasharray={
                grammar.lineStyle === 'dashed'
                  ? '2 2'
                  : grammar.lineStyle === 'dotted'
                    ? '1 2'
                    : undefined
              }
            />
          )
        })}

        {/* Pattern nodes */}
        {visiblePatterns.map((p, i) => {
          const pos = positions[i]
          if (!pos) return null
          const selected = selectedPatternId === p.id
          const grammar = getVisualGrammar(p.visualKind)
          const sources = graph.sources.filter(
            (s) => p.sourceIds.includes(s.sourceId) && !s.excluded,
          )
          const dimmed =
            highlightedSourceId &&
            !sources.some((s) => s.sourceId === highlightedSourceId)

          return (
            <g
              key={p.id}
              className="cursor-pointer"
              opacity={dimmed ? 0.35 : 1}
              onClick={() => onSelectPattern(selected ? null : p.id)}
            >
              <rect
                x={pos.x - 14}
                y={pos.y - 8}
                width={28}
                height={16}
                rx={2}
                className={
                  selected
                    ? 'fill-ink stroke-ink'
                    : 'fill-background stroke-line'
                }
                strokeWidth={0.3}
              />
              <text
                x={pos.x}
                y={pos.y - 2}
                textAnchor="middle"
                className={`font-mono text-[2px] uppercase tracking-wide ${
                  selected ? 'fill-background' : 'fill-ink-soft'
                }`}
              >
                {grammar.icon} {p.type.replace(/_/g, ' ').slice(0, 14)}
              </text>
              <text
                x={pos.x}
                y={pos.y + 3}
                textAnchor="middle"
                className={`text-[2.6px] font-medium ${
                  selected ? 'fill-background' : 'fill-ink'
                }`}
              >
                {p.title.length > 22 ? `${p.title.slice(0, 20)}…` : p.title}
              </text>
              <text
                x={pos.x}
                y={pos.y + 6.5}
                textAnchor="middle"
                className={`font-mono text-[1.8px] ${
                  selected ? 'fill-background/80' : 'fill-ink-soft'
                }`}
              >
                {p.claimCount}c · {p.sourceCount}v
              </text>
            </g>
          )
        })}
      </svg>

      {/* Mobile-friendly pattern cards (always visible below sm breakpoint) */}
      <div className="mt-4 grid gap-2 sm:hidden">
        {visiblePatterns.map((p) => {
          const selected = selectedPatternId === p.id
          const grammar = getVisualGrammar(p.visualKind)
          const sources = graph.sources.filter(
            (s) => p.sourceIds.includes(s.sourceId) && !s.excluded,
          )
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPattern(selected ? null : p.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selected ? 'border-ink bg-ink text-background' : 'border-line bg-background'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase">
                {grammar.icon} {p.type.replace(/_/g, ' ')}
              </span>
              <p className="mt-1 text-sm font-semibold">{p.title}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {sources.map((s) => (
                  <SourceBadge
                    key={s.sourceId}
                    voiceIndex={s.voiceIndex}
                    videoId={s.videoId}
                    thumbnail={s.thumbnail}
                    size="sm"
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
