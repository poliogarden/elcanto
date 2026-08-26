'use client'

import type { ReasoningLevel } from '@/lib/reasoning/provenance-types'
import type { ReasoningNode } from '@/lib/reasoning-graph/types'
import { SourceBadge } from '@/components/explorer/source-badge'
import { formatTimestamp, youtubeWatchUrl } from '@/lib/youtube/timestamp'

type Props = {
  node: ReasoningNode | null
  sources: Array<{
    sourceId: string
    videoId: string
    voiceIndex: number
    title: string
    thumbnail?: string
  }>
}

function reasoningLevelLabel(level?: ReasoningLevel): string | null {
  if (!level) return null
  return level
}

export function ReasoningGraphDetail({ node, sources }: Props) {
  if (!node) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper-2/10 p-6 text-center">
        <p className="text-xs text-ink-soft">
          Select a node to explore claims, evidence, and sources.
        </p>
      </div>
    )
  }

  const linkedSources = sources.filter((s) => node.sourceIds.includes(s.sourceId))
  const levelLabel = reasoningLevelLabel(node.reasoningLevel)

  return (
    <div className="rounded-xl border border-line bg-background p-4">
      <p className="text-[10px] font-semibold tracking-wide text-ink-soft uppercase">
        {node.type.replace(/_/g, ' ')}
        {levelLabel && <span className="ml-2 text-ink">· {levelLabel}</span>}
      </p>
      <p
        className={`mt-2 text-ink ${
          node.type === 'judgment' ? 'font-serif text-lg font-medium' : 'text-sm font-medium'
        }`}
      >
        {node.title}
      </p>
      {node.summary && (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{node.summary}</p>
      )}
      {node.confidence && (
        <p className="mt-2 text-xs text-ink-soft">Confidence: {node.confidence}</p>
      )}
      {node.evidenceCount === 0 && node.type !== 'question' && node.type !== 'excluded' && (
        <p className="mt-2 text-xs text-ink-soft">No direct source evidence</p>
      )}

      {linkedSources.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-ink-soft">SOURCES</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedSources.map((s) => (
              <SourceBadge
                key={s.sourceId}
                voiceIndex={s.voiceIndex}
                videoId={s.videoId}
                thumbnail={s.thumbnail}
                title={s.title}
              />
            ))}
          </div>
        </div>
      )}

      {node.type === 'evidence' && node.videoId && node.timestampStart != null && (
        <a
          href={youtubeWatchUrl(node.videoId, node.timestampStart)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs font-medium text-ink underline"
        >
          Watch from {formatTimestamp(node.timestampStart)} →
        </a>
      )}

      {node.type === 'evidence' && node.timestampStart == null && (
        <p className="mt-4 text-xs text-ink-soft">Timestamp unavailable</p>
      )}
    </div>
  )
}
