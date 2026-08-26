'use client'

import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import { formatTimestamp } from '@/lib/youtube/timestamp'
import type { ReasoningNode } from '@/lib/reasoning-graph/types'

const TYPE_LABEL: Record<ReasoningNode['type'], string> = {
  question: 'QUESTION',
  judgment: 'JUDGMENT',
  agreement: '✓ AGREEMENT',
  disagreement: '⚡ DIVIDE',
  uncertainty: '? GAP',
  pattern: 'PATTERN',
  argument: 'RELATIONSHIP',
  claim: 'CLAIM',
  evidence: 'EVIDENCE',
  source: 'SOURCE',
  emergent: '✦ EMERGENT',
  excluded: 'EXCLUDED',
}

type Props = {
  node: ReasoningNode
  selected?: boolean
  dimmed?: boolean
  expanded?: boolean
  hasChildren?: boolean
  onClick?: () => void
}

export function ReasoningNodeCard({
  node,
  selected = false,
  dimmed = false,
  expanded = false,
  hasChildren = false,
  onClick,
}: Props) {
  const thumb =
    node.videoId && node.thumbnail !== undefined
      ? resolveVideoThumbnail(node.videoId, node.thumbnail)
      : node.videoId
        ? resolveVideoThumbnail(node.videoId)
        : null

  const meta =
    node.evidenceCount > 0 && node.type !== 'evidence'
      ? `${node.sourceIds.length || ''}${node.sourceIds.length ? ' sources · ' : ''}${node.evidenceCount} claim${node.evidenceCount !== 1 ? 's' : ''}`
      : node.voiceIndex != null
        ? `V${String(node.voiceIndex).padStart(2, '0')}`
        : null

  const accent =
    node.branch === 'divide'
      ? 'border-coral/40'
      : node.branch === 'gap'
        ? 'border-dashed border-line'
        : node.type === 'judgment'
          ? 'border-line bg-paper-2/50'
          : 'border-line'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${TYPE_LABEL[node.type]}: ${node.title}`}
      aria-expanded={hasChildren ? expanded : undefined}
      className={`w-[200px] rounded-xl border bg-background p-3 text-left shadow-sm transition-all ${
        selected ? 'border-ink ring-2 ring-ink/10' : accent
      } ${dimmed ? 'opacity-35' : 'opacity-100'} hover:border-ink/40`}
    >
      <p
        className={`text-[9px] font-semibold tracking-wide ${
          node.branch === 'divide' ? 'text-coral' : 'text-ink-soft'
        }`}
      >
        {TYPE_LABEL[node.type]}
        {node.relationshipType && node.type === 'pattern'
          ? ` · ${node.relationshipType.replace(/_/g, ' ').toUpperCase()}`
          : ''}
      </p>

      <p
        className={`mt-2 line-clamp-3 leading-snug text-ink ${
          node.type === 'judgment' ? 'font-serif text-sm font-medium' : 'text-xs font-medium'
        }`}
      >
        {node.title}
      </p>

      {node.summary && node.type !== 'claim' && node.type !== 'evidence' && (
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-ink-soft">
          {node.summary}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {thumb && (
            <img src={thumb} alt="" className="h-5 w-5 rounded-full object-cover" />
          )}
          {meta && <span className="font-mono text-[9px] text-ink-soft">{meta}</span>}
          {node.timestampStart != null && node.timestampStart > 0 && (
            <span className="font-mono text-[9px] text-ink-soft">
              {formatTimestamp(node.timestampStart)}
            </span>
          )}
        </div>
        {hasChildren && (
          <span className="text-[10px] text-ink-soft" aria-hidden>
            {expanded ? '↑' : '↓'}
          </span>
        )}
      </div>
    </button>
  )
}
