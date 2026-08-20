'use client'

import Image from 'next/image'
import type {
  ClaimNodeData,
  ConceptNodeData,
  InsightGraphNode,
  InsightNodeData,
  RelationshipNodeData,
  VideoNodeData,
} from '@/lib/types/insight-graph'
import { formatTimestamp, youtubeWatchUrl } from '@/lib/youtube/timestamp'
import type { Voice } from '@/lib/types/voice'
import { SourceChip } from '@/components/synthesis/source-chip'

type Props = {
  node: InsightGraphNode | null
  voices: Voice[]
  onAskAboutInsight?: (statement: string) => void
  onClose: () => void
}

export function InsightGraphDetail({ node, voices, onAskAboutInsight, onClose }: Props) {
  if (!node) return null

  return (
    <aside className="flex h-full flex-col border-l border-line bg-background">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="mono-label text-[10px] text-ink-soft">{node.label}</span>
        <button
          type="button"
          onClick={onClose}
          className="mono text-[10px] text-ink-soft hover:text-ink"
          aria-label="Close detail panel"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {node.type === 'video' && <VideoDetail data={node.data as VideoNodeData} voices={voices} />}
        {node.type === 'concept' && <ConceptDetail data={node.data as ConceptNodeData} voices={voices} />}
        {(node.type === 'shared' ||
          node.type === 'different' ||
          node.type === 'contradiction' ||
          node.type === 'unique') && (
          <RelationshipDetail node={node} data={node.data as RelationshipNodeData} voices={voices} />
        )}
        {node.type === 'claim' && <ClaimDetail data={node.data as ClaimNodeData} voices={voices} />}
        {node.type === 'insight' && (
          <InsightDetail
            data={node.data as InsightNodeData}
            voices={voices}
            onAsk={onAskAboutInsight}
          />
        )}
      </div>
    </aside>
  )
}

function VideoDetail({ data, voices }: { data: VideoNodeData; voices: Voice[] }) {
  const watchUrl = youtubeWatchUrl(data.youtubeId, 0)
  return (
    <div className="space-y-6">
      {data.thumbnail && (
        <div className="relative aspect-video w-full overflow-hidden border border-line">
          <Image src={data.thumbnail} alt="" fill className="object-cover" sizes="320px" />
        </div>
      )}
      <div>
        <h3 className="font-serif text-xl font-medium">{data.title}</h3>
        {data.channel && <p className="mt-1 text-sm text-ink-soft">{data.channel}</p>}
      </div>
      {data.keyClaims.length > 0 && (
        <div>
          <span className="mono-label text-[10px] text-ink-soft">KEY CLAIMS</span>
          <ul className="mt-3 space-y-3">
            {data.keyClaims.map((c, index) => (
              <li
                key={`${c.id}-${index}`}
                className="font-serif text-base leading-relaxed text-ink-soft"
              >
                {c.statement}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.keyConcepts.length > 0 && (
        <div>
          <span className="mono-label text-[10px] text-ink-soft">KEY CONCEPTS</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.keyConcepts.map((c) => (
              <span key={c.id} className="mono border border-line px-2 py-1 text-[10px]">
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mono-label inline-block border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
      >
        OPEN YOUTUBE →
      </a>
    </div>
  )
}

function ConceptDetail({ data, voices }: { data: ConceptNodeData; voices: Voice[] }) {
  return (
    <div className="space-y-5">
      <h3 className="font-serif text-2xl font-medium">{data.label}</h3>
      {data.description && (
        <p className="font-serif text-base leading-relaxed text-ink-soft">{data.description}</p>
      )}
      <div>
        <span className="mono-label text-[10px] text-ink-soft">APPEARS IN</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.sourceIds.map((sourceId) => {
            const match = sourceId.match(/(\d+)/)
            const voice = match ? Number(match[1]) : 0
            return voice > 0 ? (
              <SourceChip key={sourceId} voice={voice} voices={voices} />
            ) : null
          })}
        </div>
      </div>
    </div>
  )
}

function RelationshipDetail({
  node,
  data,
  voices,
}: {
  node: InsightGraphNode
  data: RelationshipNodeData
  voices: Voice[]
}) {
  const heading =
    node.type === 'shared'
      ? 'SHARED IDEA'
      : node.type === 'different'
        ? 'WHERE THEY DIFFER'
        : node.type === 'contradiction'
          ? 'WHERE THEY CONFLICT'
          : 'UNIQUE PERSPECTIVE'

  return (
    <div className="space-y-5">
      <span className="mono-label text-[10px] text-ink-soft">{heading}</span>
      <p className="font-serif text-xl font-medium leading-relaxed">{data.statement}</p>
      {data.claims.length > 0 && (
        <div className="space-y-4">
          <span className="mono-label text-[10px] text-ink-soft">SUPPORTED BY</span>
          {data.claims.map((claim, index) => (
            <div
              key={`${claim.claimId}-${claim.voiceIndex}-${index}`}
              className="border-l border-line pl-4"
            >
              <SourceChip voice={claim.voiceIndex} voices={voices} />
              <p className="mt-2 font-serif text-base leading-relaxed text-ink-soft">
                {claim.statement}
              </p>
              {claim.evidence && (
                <p className="mono mt-2 text-[10px] text-ink-soft">
                  {formatTimestamp(claim.evidence.timestamp)} — {claim.evidence.text.slice(0, 120)}
                  {claim.evidence.text.length > 120 ? '…' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <div>
        <span className="mono-label text-[10px] text-ink-soft">EXPLANATION</span>
        <p className="mt-2 font-serif text-base leading-relaxed text-ink-soft">{data.explanation}</p>
      </div>
    </div>
  )
}

function ClaimDetail({ data, voices }: { data: ClaimNodeData; voices: Voice[] }) {
  return (
    <div className="space-y-4">
      <SourceChip voice={data.voiceIndex} voices={voices} />
      <p className="font-serif text-lg leading-relaxed">{data.statement}</p>
      {data.evidence.length > 0 && (
        <div>
          <span className="mono-label text-[10px] text-ink-soft">EVIDENCE</span>
          {data.evidence.map((e) => (
            <p key={e.id} className="mt-2 font-serif text-sm text-ink-soft">
              {formatTimestamp(e.timestamp)} — {e.text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function InsightDetail({
  data,
  voices,
  onAsk,
}: {
  data: InsightNodeData
  voices: Voice[]
  onAsk?: (statement: string) => void
}) {
  return (
    <div className="space-y-6">
      <span className="mono-label text-[10px] text-mint-ink">✦ EMERGING INSIGHT</span>
      <blockquote className="font-serif text-2xl font-medium leading-snug">
        &ldquo;{data.statement}&rdquo;
      </blockquote>

      <div>
        <span className="mono-label text-[10px] text-ink-soft">DERIVED FROM</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...new Set(data.sourceIds)].map((sourceId) => {
            const match = sourceId.match(/(\d+)/)
            const voice = match ? Number(match[1]) : 0
            return voice > 0 ? <SourceChip key={sourceId} voice={voice} voices={voices} /> : null
          })}
        </div>
      </div>

      <div>
        <span className="mono-label text-[10px] text-ink-soft">WHY THIS EMERGES</span>
        <p className="mt-2 font-serif text-base leading-relaxed text-ink-soft">
          {data.noveltyReason || data.explanation}
        </p>
      </div>

      {data.explanation && data.explanation !== data.noveltyReason && (
        <div>
          <span className="mono-label text-[10px] text-ink-soft">WHAT SUPPORTS THIS</span>
          <p className="mt-2 font-serif text-base leading-relaxed text-ink-soft">
            {data.explanation}
          </p>
        </div>
      )}

      {onAsk && (
        <button
          type="button"
          onClick={() => onAsk(data.statement)}
          className="mono-label border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
        >
          ASK ABOUT THIS →
        </button>
      )}
    </div>
  )
}
