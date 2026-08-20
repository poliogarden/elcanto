'use client'

import { useMemo } from 'react'
import { AsterismMark } from '@/components/brand/asterism-mark'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { Voice } from '@/lib/types/voice'

export type RelationshipCanvasPhase = 'idle' | 'processing' | 'complete'

const RELATION_LABELS = ['SHARED', 'DIFFERENT', 'UNIQUE', 'CONNECTION', 'CONTRADICTION']

type Props = {
  voices: Voice[]
  phase: RelationshipCanvasPhase
  onRemove?: (id: string) => void
  /** Smaller preview for home / why sections */
  compact?: boolean
}

function truncate(text: string, max = 52): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export function VoiceRelationshipCanvas({ voices, phase, onRemove, compact }: Props) {
  const { t } = useTranslation()
  const n = voices.length
  const W = compact ? 720 : 920
  const H = compact ? Math.max(160, n * 52 + 60) : Math.max(220, n * 72 + 80)

  const nodes = useMemo(() => {
    const leftX = 28
    const top = 52
    const usable = H - top * 2
    return voices.map((voice, i) => {
      const y = n === 1 ? H / 2 : top + (usable * i) / Math.max(n - 1, 1)
      return { voice, x: leftX, y, num: String(voice.n).padStart(2, '0') }
    })
  }, [voices, n, H])

  const hubX = W - 120
  const hubY = H / 2
  const active = phase !== 'idle'

  return (
    <div className="relative w-full overflow-hidden border border-line bg-paper">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        style={{
          height: compact
            ? `${Math.min(180, H)}px`
            : `clamp(${Math.min(220, H)}px, ${n * 3.2}rem, ${H}px)`,
        }}
        role="img"
        aria-label={
          phase === 'complete'
            ? t('canvas.connected')
            : n === 1
              ? t('canvas.readyOne')
              : t('canvas.readyMany', { count: n })
        }
      >
        {n >= 1 &&
          nodes.map((node, i) => {
            const midX = (node.x + 72 + hubX) / 2
            return (
              <g key={node.voice.id}>
                <path
                  d={`M ${node.x + 72} ${node.y} C ${midX} ${node.y}, ${midX} ${hubY}, ${hubX - 28} ${hubY}`}
                  fill="none"
                  stroke={active ? 'var(--mint-ink)' : 'var(--line)'}
                  strokeWidth={active ? 1.4 : 1}
                  strokeDasharray={phase === 'processing' ? '4 4' : '0'}
                  className={phase === 'processing' ? 'animate-[dash_0.7s_linear_infinite]' : ''}
                  opacity={active ? 0.95 : 0.55}
                  style={{ transition: 'stroke 0.45s, opacity 0.45s' }}
                />
                {phase === 'complete' && (
                  <text
                    x={midX}
                    y={(node.y + hubY) / 2 - 4}
                    textAnchor="middle"
                    className="fill-ink-soft font-mono"
                    style={{ fontSize: 9, letterSpacing: '0.1em' }}
                  >
                    {RELATION_LABELS[i % RELATION_LABELS.length]}
                  </text>
                )}
              </g>
            )
          })}

        {nodes.map((node) => (
          <g key={`node-${node.voice.id}`}>
            <text
              x={node.x}
              y={node.y - 18}
              className="fill-ink font-mono"
              style={{ fontSize: 11, letterSpacing: '0.06em' }}
            >
              {node.num}
            </text>
            <text
              x={node.x}
              y={node.y - 2}
              className="fill-ink font-serif"
              style={{ fontSize: 13 }}
            >
              {truncate(`${node.voice.channel} — ${node.voice.title}`, 56)}
            </text>
            <circle
              cx={node.x + 58}
              cy={node.y + 14}
              r={5}
              className="fill-ink"
            />
          </g>
        ))}

        {n >= 1 && (
          <g style={{ transition: 'opacity 0.45s' }}>
            {phase === 'complete' ? (
              <>
                <circle
                  cx={hubX}
                  cy={hubY}
                  r={28}
                  className="fill-mint stroke-mint-ink"
                  strokeWidth={1.2}
                />
                <foreignObject x={hubX - 14} y={hubY - 14} width={28} height={28}>
                  <div className="flex h-full w-full items-center justify-center">
                    <AsterismMark size={16} className="text-mint-ink" />
                  </div>
                </foreignObject>
                <text
                  x={hubX}
                  y={hubY + 48}
                  textAnchor="middle"
                  className="fill-ink font-mono"
                  style={{ fontSize: 10, letterSpacing: '0.14em' }}
                >
                  INSIGHT
                </text>
              </>
            ) : (
              <>
                <circle
                  cx={hubX}
                  cy={hubY}
                  r={24}
                  fill="none"
                  className="stroke-line"
                  strokeWidth={1.2}
                  strokeDasharray="3 4"
                  style={{
                    transformOrigin: `${hubX}px ${hubY}px`,
                    animation: phase === 'processing' ? 'spin 6s linear infinite' : undefined,
                  }}
                />
                <text
                  x={hubX}
                  y={hubY + (phase === 'processing' ? 5 : 7)}
                  textAnchor="middle"
                  className="fill-ink-soft font-serif italic"
                  style={{ fontSize: phase === 'processing' ? 14 : 22 }}
                >
                  {phase === 'processing' ? '···' : '?'}
                </text>
                {phase === 'idle' && (
                  <text
                    x={hubX}
                    y={hubY + 44}
                    textAnchor="middle"
                    className="fill-ink-soft font-mono"
                    style={{ fontSize: 9, letterSpacing: '0.12em' }}
                  >
                    WHAT EMERGES?
                  </text>
                )}
              </>
            )}
          </g>
        )}
      </svg>

      {onRemove && phase === 'idle' && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {voices.map((voice) => (
            <button
              key={voice.id}
              type="button"
              onClick={() => onRemove(voice.id)}
              className="mono-label border border-line px-2 py-1 text-[9px] text-ink-soft hover:bg-ink hover:text-background"
            >
              REMOVE {String(voice.n).padStart(2, '0')}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -8;
          }
        }
      `}</style>
    </div>
  )
}
