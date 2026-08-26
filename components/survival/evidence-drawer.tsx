'use client'

import type {
  ConsensusItem,
  DisagreementItem,
  EmergentInsight,
  LandscapeCard,
  SurvivalAnalysis,
  SurvivalClaim,
  SurvivalRelationship,
} from '@/lib/survival/types'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import { formatTimestamp, youtubeWatchUrl } from '@/lib/youtube/timestamp'

type DrawerState =
  | { kind: 'claim'; claim: SurvivalClaim }
  | { kind: 'relationship'; relationship: SurvivalRelationship }
  | { kind: 'consensus'; item: ConsensusItem }
  | { kind: 'disagreement'; item: DisagreementItem }
  | { kind: 'emergence'; item: EmergentInsight }
  | { kind: 'landscape'; card: LandscapeCard; zone: string }
  | null

type Props = {
  open: boolean
  onClose: () => void
  drawer: DrawerState
  survival: SurvivalAnalysis
}

function DrawerContent({
  drawer,
  survival,
}: {
  drawer: NonNullable<DrawerState>
  survival: SurvivalAnalysis
}) {
  if (drawer.kind === 'claim') {
    const src = survival.sources.find((s) => s.videoId === drawer.claim.videoId)
    const thumb = resolveVideoThumbnail(drawer.claim.videoId, src?.thumbnail)
    return (
      <>
        {thumb && (
          <img src={thumb} alt="" className="mb-3 h-20 w-32 rounded-lg object-cover" />
        )}
        <p className="text-xs text-ink-soft">
          VIDEO {String(drawer.claim.voiceIndex).padStart(2, '0')} · {src?.title}
        </p>
        <p className="mt-3 text-sm font-medium text-ink">{drawer.claim.claim}</p>
        <p className="mt-4 text-xs font-semibold text-ink-soft">EVIDENCE</p>
        <p className="mt-1 text-sm italic text-ink-soft">
          &ldquo;{drawer.claim.evidence}&rdquo;
        </p>
        {drawer.claim.timestamp != null && (
          <>
            <p className="mt-3 font-mono text-xs text-ink-soft">
              {formatTimestamp(drawer.claim.timestamp)}
            </p>
            <a
              href={youtubeWatchUrl(drawer.claim.videoId, drawer.claim.timestamp)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-ink underline"
            >
              Watch from {formatTimestamp(drawer.claim.timestamp)} →
            </a>
          </>
        )}
        <p className="mt-4 text-xs">
          Confidence: <strong>{drawer.claim.confidence}</strong>
        </p>
      </>
    )
  }

  if (drawer.kind === 'relationship') {
    const from = survival.claims.find((c) => c.claimId === drawer.relationship.fromClaimId)
    const to = survival.claims.find((c) => c.claimId === drawer.relationship.toClaimId)
    return (
      <>
        <p className="text-xs font-semibold text-ink-soft">WHY CONNECTED</p>
        <p className="mt-1 text-sm text-ink">{drawer.relationship.explanation}</p>
        {from && (
          <div className="mt-4 rounded-lg bg-paper-2/60 p-3">
            <p className="text-[10px] text-ink-soft">
              VIDEO {String(from.voiceIndex).padStart(2, '0')}
            </p>
            <p className="text-sm text-ink">{from.claim}</p>
            {from.timestamp != null && (
              <a
                href={youtubeWatchUrl(from.videoId, from.timestamp)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-ink underline"
              >
                {formatTimestamp(from.timestamp)} →
              </a>
            )}
          </div>
        )}
        {to && (
          <div className="mt-2 rounded-lg bg-paper-2/60 p-3">
            <p className="text-[10px] text-ink-soft">
              VIDEO {String(to.voiceIndex).padStart(2, '0')}
            </p>
            <p className="text-sm text-ink">{to.claim}</p>
            {to.timestamp != null && (
              <a
                href={youtubeWatchUrl(to.videoId, to.timestamp)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-ink underline"
              >
                {formatTimestamp(to.timestamp)} →
              </a>
            )}
          </div>
        )}
        <p className="mt-4 text-xs">Confidence: {drawer.relationship.confidence}</p>
      </>
    )
  }

  if (drawer.kind === 'consensus') {
    return (
      <>
        <p className="text-lg font-medium text-ink">{drawer.item.title}</p>
        <p className="mt-2 text-sm text-ink-soft">{drawer.item.oneLineSummary}</p>
        <p className="mt-4 text-xs text-ink-soft">
          Supported by {drawer.item.supportingVideoIds.length} video(s)
        </p>
      </>
    )
  }

  if (drawer.kind === 'disagreement') {
    return (
      <>
        <p className="text-sm text-ink-soft">{drawer.item.oneLineSummary}</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-paper-2/60 p-3">
            <p className="text-[10px] font-semibold text-ink-soft">CLAIM A</p>
            <p className="mt-1 text-sm text-ink">&ldquo;{drawer.item.sideA.claimText}&rdquo;</p>
          </div>
          <div className="rounded-lg border border-coral/20 bg-paper-2/60 p-3">
            <p className="text-[10px] font-semibold text-coral">CLAIM B</p>
            <p className="mt-1 text-sm text-ink">&ldquo;{drawer.item.sideB.claimText}&rdquo;</p>
          </div>
        </div>
      </>
    )
  }

  if (drawer.kind === 'emergence') {
    return (
      <>
        <p className="font-serif text-lg text-ink">{drawer.item.statement}</p>
        <p className="mt-4 text-xs font-semibold text-ink-soft">REASONING PATH</p>
        <div className="mt-2 space-y-1 text-sm text-ink-soft">
          {drawer.item.reasoningPath.map((step, i) => (
            <p key={`${step.refId}-${i}`}>
              {i > 0 ? '↓ ' : ''}
              {step.label}
            </p>
          ))}
        </div>
      </>
    )
  }

  if (drawer.kind === 'landscape') {
    return (
      <>
        <p className="text-lg font-medium text-ink">{drawer.card.title}</p>
        <p className="mt-2 text-sm text-ink-soft">{drawer.card.summary}</p>
      </>
    )
  }

  return null
}

function drawerTitle(drawer: NonNullable<DrawerState>): string {
  if (drawer.kind === 'claim') return 'Evidence'
  if (drawer.kind === 'relationship') return drawer.relationship.type.replace(/_/g, ' ')
  if (drawer.kind === 'consensus') return 'Consensus'
  if (drawer.kind === 'disagreement') return `Divide — ${drawer.item.title}`
  if (drawer.kind === 'emergence') return 'Emergent insight'
  return drawer.zone.toUpperCase()
}

export function EvidenceDrawer({ open, onClose, drawer, survival }: Props) {
  if (!open || !drawer) return null

  const title = drawerTitle(drawer)

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      {/* Desktop: right panel */}
      <aside className="fixed inset-y-0 right-0 z-50 hidden w-full max-w-md overflow-y-auto border-l border-line bg-background p-6 shadow-xl md:block">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-ink-soft">{title}</p>
          <button type="button" onClick={onClose} className="text-ink-soft hover:text-ink">
            ×
          </button>
        </div>
        <div className="mt-6">
          <DrawerContent drawer={drawer} survival={survival} />
        </div>
      </aside>
      {/* Mobile: bottom sheet */}
      <aside className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-line bg-background p-5 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden />
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-ink-soft">{title}</p>
          <button type="button" onClick={onClose} className="text-ink-soft hover:text-ink">
            ×
          </button>
        </div>
        <div className="mt-4">
          <DrawerContent drawer={drawer} survival={survival} />
        </div>
      </aside>
    </>
  )
}
