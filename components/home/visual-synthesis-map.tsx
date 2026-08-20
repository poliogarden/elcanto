'use client'

import { useEffect, useMemo, useState } from 'react'
import { AsterismMark } from '@/components/brand/asterism-mark'
import {
  DEMO_SYNTHESIS_MAP,
  RELATIONSHIP_LABELS,
  buildMapFromVoices,
  shouldShowDemoAnimation,
  type EmergentInsight,
  type MapRelationshipType,
  type RelationshipEdge,
  type SourceNode,
  type VisualSynthesisMapData,
} from '@/lib/home/visual-synthesis-map-model'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
}

type LayoutPoint = { x: number; y: number }

type DetailSelection =
  | { kind: 'source'; node: SourceNode }
  | { kind: 'edge'; edge: RelationshipEdge }
  | { kind: 'insight'; insight: EmergentInsight }

const TRIANGLE_POSITIONS: LayoutPoint[] = [
  { x: 50, y: 18 },
  { x: 12, y: 58 },
  { x: 88, y: 58 },
]

function positionForSource(node: SourceNode, index: number, total: number): LayoutPoint {
  if (index < 3 && total <= 3) return TRIANGLE_POSITIONS[index] ?? TRIANGLE_POSITIONS[0]

  if (total === 1) return { x: 50, y: 40 }
  if (total === 2) {
    return index === 0 ? { x: 30, y: 45 } : { x: 70, y: 45 }
  }
  const angle = (2 * Math.PI * index) / total - Math.PI / 2
  return {
    x: 50 + Math.cos(angle) * 28,
    y: 42 + Math.sin(angle) * 22,
  }
}

function edgeStyle(type: MapRelationshipType): {
  strokeDasharray?: string
  marker?: string
} {
  switch (type) {
    case 'different':
      return { strokeDasharray: '4 4' }
    case 'contradiction':
      return { strokeDasharray: '1 5' }
    case 'parallel':
      return {}
    case 'independent':
      return { strokeDasharray: '2 6', marker: 'none' }
    default:
      return {}
  }
}

function MapDetail({ selection, onClose }: { selection: DetailSelection; onClose: () => void }) {
  return (
    <aside className="mt-4 border border-line bg-paper-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="mono-label text-[10px] text-ink-soft">
          {selection.kind === 'source'
            ? 'SOURCE'
            : selection.kind === 'edge'
              ? 'WHY THESE CONNECT'
              : 'WHY THIS EMERGED'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="mono-label text-[10px] text-ink-soft hover:text-ink"
        >
          Close
        </button>
      </div>

      {selection.kind === 'source' && (
        <div className="mt-3">
          <p className="mono text-[11px] text-ink-soft">
            VOICE {String(selection.node.voiceIndex).padStart(2, '0')}
          </p>
          <p className="mt-2 font-serif text-lg leading-snug">
            {selection.node.title || 'Empty slot'}
          </p>
          {selection.node.summary && (
            <p className="mt-2 font-serif text-sm text-ink-soft">{selection.node.summary}</p>
          )}
        </div>
      )}

      {selection.kind === 'edge' && (
        <div className="mt-3">
          <p className="mono-label text-[10px] text-ink">
            {RELATIONSHIP_LABELS[selection.edge.type]}
          </p>
          <p className="mt-2 font-serif text-sm leading-relaxed">{selection.edge.explanation}</p>
        </div>
      )}

      {selection.kind === 'insight' && (
        <div className="mt-3">
          <p className="font-serif text-lg leading-relaxed">&ldquo;{selection.insight.statement}&rdquo;</p>
          <p className="mt-2 font-serif text-sm text-ink-soft">{selection.insight.explanation}</p>
        </div>
      )}
    </aside>
  )
}

function DesktopMap({
  data,
  step,
  reducedMotion,
  onSelect,
}: {
  data: VisualSynthesisMapData
  step: number
  reducedMotion: boolean
  onSelect: (s: DetailSelection) => void
}) {
  const filledSources = data.sources.filter((s) => s.filled)
  const positions = new Map(
    data.sources.map((s, i) => [s.id, positionForSource(s, i, data.sources.length)]),
  )

  const visibleEdges = reducedMotion
    ? data.edges
    : data.edges.filter((_, i) => step >= 4 + i)
  const showInsight =
    data.insight && (reducedMotion || step >= 4 + data.edges.length + 1)
  const visibleFilledCount = reducedMotion
    ? filledSources.length
    : Math.min(filledSources.length, step)

  return (
    <svg
      viewBox="0 0 100 100"
      className="mx-auto h-auto w-full max-w-2xl"
      role="img"
      aria-label="Visual synthesis map"
    >
      {visibleEdges.map((edge) => {
        const from = positions.get(edge.fromId)
        const to = positions.get(edge.toId)
        if (!from || !to) return null
        const style = edgeStyle(edge.type)
        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        const labelVisible = reducedMotion || step >= 5 + data.edges.indexOf(edge)

        return (
          <g key={edge.id}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="currentColor"
              strokeWidth="0.35"
              className="text-line"
              strokeDasharray={style.strokeDasharray}
            />
            {labelVisible && (
              <text
                x={midX}
                y={midY - 1.5}
                textAnchor="middle"
                className="fill-ink-soft font-mono text-[2.8px] uppercase tracking-widest"
              >
                {RELATIONSHIP_LABELS[edge.type]}
              </text>
            )}
            <rect
              x={midX - 8}
              y={midY - 4}
              width={16}
              height={6}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onSelect({ kind: 'edge', edge })}
            />
          </g>
        )
      })}

      {data.sources.map((node, index) => {
        const pos = positions.get(node.id)
        if (!pos) return null

        if (node.filled) {
          const filledIndex = filledSources.indexOf(node)
          if (filledIndex >= visibleFilledCount) return null
        }

        return (
          <g
            key={node.id}
            className={node.filled ? 'cursor-pointer' : ''}
            onClick={() => node.filled && onSelect({ kind: 'source', node })}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={node.filled ? 3.2 : 2.4}
              className={node.filled ? 'fill-ink' : 'fill-none stroke-line'}
              strokeWidth={node.filled ? 0 : 0.5}
            />
            {node.filled && (
              <text
                x={pos.x}
                y={pos.y + (pos.y < 50 ? -5 : 7)}
                textAnchor="middle"
                className="fill-ink font-mono text-[2.6px] uppercase"
              >
                {String(node.voiceIndex).padStart(2, '0')}
              </text>
            )}
          </g>
        )
      })}

      {showInsight && data.insight && (
        <g
          className="cursor-pointer"
          onClick={() => onSelect({ kind: 'insight', insight: data.insight! })}
        >
          <circle cx={50} cy={88} r="2.8" className="fill-ink" />
          <text
            x={50}
            y={94}
            textAnchor="middle"
            className="fill-ink font-mono text-[2.4px] uppercase tracking-widest"
          >
            Fourth Idea
          </text>
        </g>
      )}

      {data.showNoStrongRelationship && (
        <text
          x={50}
          y={88}
          textAnchor="middle"
          className="fill-ink-soft font-mono text-[2.8px] uppercase"
        >
          No strong relationship
        </text>
      )}
    </svg>
  )
}

function MobileFlow({
  data,
  onSelect,
}: {
  data: VisualSynthesisMapData
  onSelect: (s: DetailSelection) => void
}) {
  const filled = data.sources.filter((s) => s.filled)

  return (
    <div className="space-y-0 md:hidden">
      {filled.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex h-10 w-10 items-center justify-center border border-line">
              <span className="mono text-[10px] text-ink-soft">○</span>
            </div>
          ))}
          <span className="mono text-[10px] text-ink-soft">↓</span>
          <AsterismMark size={24} className="text-ink" />
        </div>
      ) : (
        filled.map((node, i) => (
          <div key={node.id}>
            <button
              type="button"
              onClick={() => onSelect({ kind: 'source', node })}
              className="w-full border border-line p-4 text-left"
            >
              <span className="mono-label text-[10px] text-ink-soft">
                VOICE {String(node.voiceIndex).padStart(2, '0')}
              </span>
              <p className="mt-2 font-serif text-base leading-snug">{node.title}</p>
            </button>
            {data.edges[i] && (
              <div className="flex flex-col items-center py-2">
                <span className="mono text-[10px] text-ink-soft">↓</span>
                <button
                  type="button"
                  onClick={() => onSelect({ kind: 'edge', edge: data.edges[i] })}
                  className="mono-label mt-1 text-[10px] text-ink"
                >
                  {RELATIONSHIP_LABELS[data.edges[i].type]}
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {data.insight && (
        <div className="mt-4 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => onSelect({ kind: 'insight', insight: data.insight! })}
            className="flex w-full items-start gap-3 text-left"
          >
            <AsterismMark size={28} className="shrink-0 text-ink" />
            <div>
              <span className="mono-label text-[10px] text-ink-soft">FOURTH IDEA</span>
              <p className="mt-2 font-serif text-lg leading-snug">{data.insight.statement}</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

function SourceCards({
  data,
  onSelect,
}: {
  data: VisualSynthesisMapData
  onSelect: (s: DetailSelection) => void
}) {
  const nodes = data.sources.filter((s) => s.filled)
  if (nodes.length === 0 && data.mode !== 'demo') return null

  const display = data.mode === 'demo' ? data.sources : nodes

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {display.map((node) => (
        <button
          key={node.id}
          type="button"
          onClick={() => node.filled && onSelect({ kind: 'source', node })}
          disabled={!node.filled}
          className={`border p-3 text-left transition-colors ${
            node.filled
              ? 'border-line hover:border-ink'
              : 'border-dashed border-line bg-transparent opacity-60'
          }`}
        >
          <span className="mono-label text-[10px] text-ink-soft">
            {node.filled ? `VIDEO ${String(node.voiceIndex).padStart(2, '0')}` : 'SLOT'}
          </span>
          <p className="mt-2 font-serif text-sm leading-snug">
            {node.filled ? node.title : '—'}
          </p>
        </button>
      ))}
    </div>
  )
}

export function VisualSynthesisMap({ voices }: Props) {
  const [step, setStep] = useState(0)
  const [selection, setSelection] = useState<DetailSelection | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  const isDemo = shouldShowDemoAnimation(voices)
  const data: VisualSynthesisMapData = useMemo(
    () => (isDemo ? DEMO_SYNTHESIS_MAP : buildMapFromVoices(voices)),
    [isDemo, voices],
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!isDemo || reducedMotion) {
      setStep(99)
      return
    }

    setStep(0)
    const filled = data.sources.filter((s) => s.filled).length
    const totalSteps = filled + data.edges.length + 2
    const interval = window.setInterval(() => {
      setStep((s) => (s >= totalSteps ? 0 : s + 1))
    }, 450)

    return () => window.clearInterval(interval)
  }, [isDemo, reducedMotion, data])

  return (
    <div className="w-full">
      {isDemo && (
        <span className="mono-label text-[10px] text-ink-soft">SAMPLE SYNTHESIS</span>
      )}

      <div className="hidden md:block">
        <DesktopMap
          data={data}
          step={step}
          reducedMotion={reducedMotion || !isDemo}
          onSelect={setSelection}
        />
      </div>

      <MobileFlow data={data} onSelect={setSelection} />

      {data.mode === 'demo' && <SourceCards data={data} onSelect={setSelection} />}

      {data.insight && data.mode === 'demo' && (
        <blockquote className="mt-6 max-w-xl border-l-2 border-ink pl-4 font-serif text-lg leading-relaxed md:text-xl">
          &ldquo;{data.insight.statement}&rdquo;
        </blockquote>
      )}

      {data.statusMessage && data.mode !== 'demo' && (
        <p className="mono mt-4 text-[11px] text-ink-soft">{data.statusMessage}</p>
      )}

      {data.mode === 'demo' && (
        <p className="mono mt-3 text-[10px] text-ink-soft" title="Relationship legend">
          ○ source · — shared · ⋯ different · × contradiction · ↗ parallel · ✦ fourth idea
        </p>
      )}

      {selection && <MapDetail selection={selection} onClose={() => setSelection(null)} />}
    </div>
  )
}
