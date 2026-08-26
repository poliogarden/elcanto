'use client'

import type {
  ExplorerClaim,
  ExplorerEmergent,
  ExplorerEvidence,
  ExplorerGap,
  ExplorerPattern,
  ExplorerRelationship,
  RelationshipExplorerGraph,
} from '@/lib/visualization/relationship-explorer-model'
import { SourceBadge } from '@/components/explorer/source-badge'
import { getVisualGrammar } from '@/lib/visualization/visual-grammar'
import { formatTimestamp, youtubeWatchUrl } from '@/lib/youtube/timestamp'

export type ExplorerSelection =
  | { kind: 'pattern'; pattern: ExplorerPattern }
  | { kind: 'claim'; claim: ExplorerClaim; evidence: ExplorerEvidence[] }
  | { kind: 'relationship'; relationship: ExplorerRelationship }
  | { kind: 'gap'; gap: ExplorerGap }
  | { kind: 'emergent'; insight: ExplorerEmergent }
  | null

type Props = {
  graph: RelationshipExplorerGraph
  selection: ExplorerSelection
  patternClaims?: ExplorerClaim[]
}

export function ExplorerDetailPanel({ graph, selection, patternClaims }: Props) {
  if (!selection) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper-2/10 p-6 text-center">
        <p className="text-xs text-ink-soft">
          Select a pattern, relationship, or claim to explore evidence.
        </p>
      </div>
    )
  }

  if (selection.kind === 'pattern') {
    const p = selection.pattern
    const claims =
      patternClaims ?? graph.claims.filter((c) => p.claimIds.includes(c.id))
    const grammar = getVisualGrammar(p.visualKind)

    return (
      <div className="rounded-xl border border-line bg-background p-4">
        <p className="text-[10px] font-semibold tracking-wide text-ink-soft">
          {grammar.icon} PATTERN · {p.type.replace(/_/g, ' ')}
        </p>
        <p className="mt-2 text-base font-semibold text-ink">{p.title}</p>
        <p className="mt-2 text-sm text-ink-soft">{p.description}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {graph.sources
            .filter((s) => p.sourceIds.includes(s.sourceId) && !s.excluded)
            .map((s) => (
              <SourceBadge
                key={s.sourceId}
                voiceIndex={s.voiceIndex}
                videoId={s.videoId}
                thumbnail={s.thumbnail}
                title={s.title}
              />
            ))}
        </div>
        {claims.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold text-ink-soft">CLAIMS</p>
            {claims.map((c) => (
              <div key={c.id} className="rounded-lg bg-paper-2/40 px-3 py-2">
                <SourceBadge voiceIndex={c.voiceIndex} videoId={c.videoId} size="sm" />
                <p className="mt-1 text-xs text-ink">{c.statement}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (selection.kind === 'relationship') {
    const r = selection.relationship
    const from = graph.claims.find((c) => c.id === r.fromClaimId)
    const to = graph.claims.find((c) => c.id === r.toClaimId)
    const grammar = getVisualGrammar(r.visualKind)

    return (
      <div className="rounded-xl border border-line bg-background p-4">
        <p className={`text-[10px] font-semibold tracking-wide ${grammar.accentClass}`}>
          {grammar.icon} {grammar.label.toUpperCase()}
        </p>
        <p className="mt-2 text-sm text-ink">{r.explanation}</p>
        <p className="mt-2 font-mono text-[10px] text-ink-soft">
          Reasoning: SYNTHESIZED · Confidence: {r.confidence}
        </p>
        {from && (
          <div className="mt-4 rounded-lg bg-paper-2/40 p-3">
            <SourceBadge voiceIndex={from.voiceIndex} videoId={from.videoId} size="sm" />
            <p className="mt-1 text-sm text-ink">{from.statement}</p>
          </div>
        )}
        {to && (
          <div className="mt-2 rounded-lg bg-paper-2/40 p-3">
            <SourceBadge voiceIndex={to.voiceIndex} videoId={to.videoId} size="sm" />
            <p className="mt-1 text-sm text-ink">{to.statement}</p>
          </div>
        )}
      </div>
    )
  }

  if (selection.kind === 'claim') {
    const { claim, evidence } = selection
    const src = graph.sources.find((s) => s.sourceId === claim.sourceId)

    return (
      <div className="rounded-xl border border-line bg-background p-4">
        <SourceBadge
          voiceIndex={claim.voiceIndex}
          videoId={claim.videoId}
          thumbnail={src?.thumbnail}
          title={src?.title}
        />
        <p className="mt-3 text-sm font-medium text-ink">{claim.statement}</p>
        {evidence.length > 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-[10px] font-semibold text-ink-soft">EVIDENCE</p>
            {evidence.map((ev) => (
              <div key={ev.id} className="rounded-lg bg-paper-2/40 p-3">
                <p className="font-mono text-[10px] text-ink-soft">
                  {formatTimestamp(ev.timestampStart)}
                </p>
                <p className="mt-1 text-sm italic text-ink-soft">
                  &ldquo;{ev.text}&rdquo;
                </p>
                <a
                  href={youtubeWatchUrl(ev.videoId, ev.timestampStart)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-ink underline"
                >
                  Watch from {formatTimestamp(ev.timestampStart)} →
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-ink-soft">No direct source evidence</p>
        )}
      </div>
    )
  }

  if (selection.kind === 'gap') {
    const g = selection.gap
    return (
      <div className="rounded-xl border border-dashed border-line bg-paper-2/10 p-4">
        <p className="text-[10px] font-semibold text-ink-soft">KNOWLEDGE GAP</p>
        <p className="mt-2 text-sm font-medium text-ink">{g.question}</p>
        {g.whyItMatters && (
          <p className="mt-2 text-xs text-ink-soft">{g.whyItMatters}</p>
        )}
        {g.linkedJudgmentAspect && (
          <p className="mt-2 text-xs italic text-ink-soft">
            Affects: {g.linkedJudgmentAspect}
          </p>
        )}
      </div>
    )
  }

  if (selection.kind === 'emergent') {
    const insight = selection.insight
    return (
      <div className="rounded-xl border border-line bg-paper-2/20 p-4">
        <p className="text-[10px] font-semibold text-coral">
          EMERGENT INSIGHT · INFERRED
        </p>
        <p className="mt-2 font-serif text-lg text-ink">&ldquo;{insight.statement}&rdquo;</p>
        {insight.explanation && (
          <p className="mt-2 text-sm text-ink-soft">{insight.explanation}</p>
        )}
        {insight.evidencePath.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-[10px] font-semibold text-ink-soft">WHY THIS EMERGES</p>
            {insight.evidencePath.map((step, i) => (
              <p key={`${step.refId}-${i}`} className="text-xs text-ink-soft">
                {i > 0 ? '↓ ' : ''}
                {step.label}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}
