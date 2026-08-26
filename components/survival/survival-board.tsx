'use client'

import { useMemo, useState } from 'react'
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
import { AdvancedAnalysis } from '@/components/explorer/advanced-analysis'
import { JudgmentProvenance } from '@/components/explorer/judgment-provenance'
import { RelationshipExplorerEmergent } from '@/components/explorer/relationship-explorer'
import { ReasoningGraphExplorer } from '@/components/reasoning-graph/reasoning-graph-explorer'
import {
  buildReasoningGraph,
  resolveProvenanceNodeId,
} from '@/lib/reasoning-graph/build-reasoning-graph'
import type { GraphFocusIntent } from '@/lib/reasoning-graph/types'
import { SurvivalAskPanel } from '@/components/survival/survival-ask'
import { SurvivalArchiveActions } from '@/components/survival/survival-archive-actions'
import { EvidenceDrawer } from '@/components/survival/evidence-drawer'
import { getAnalysisResult } from '@/lib/reasoning/adapter-survival'
import { buildExplorerGraph } from '@/lib/visualization/relationship-explorer-model'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

type DrawerState =
  | { kind: 'claim'; claim: SurvivalClaim }
  | { kind: 'relationship'; relationship: SurvivalRelationship }
  | { kind: 'consensus'; item: ConsensusItem }
  | { kind: 'disagreement'; item: DisagreementItem }
  | { kind: 'emergence'; item: EmergentInsight }
  | { kind: 'landscape'; card: LandscapeCard; zone: string }
  | null

function ConfidenceDot({ level }: { level: 'strong' | 'moderate' | 'weak' }) {
  if (level === 'strong') return <span className="text-ink">●</span>
  if (level === 'moderate') return <span className="text-ink-soft">◐</span>
  return <span className="text-ink-soft/50">○</span>
}

type Props = {
  survival: SurvivalAnalysis
  document: SynthesisDocument
}

export function SurvivalBoard({ survival, document }: Props) {
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [explorerHighlight, setExplorerHighlight] = useState<string | null>(null)

  const analysisResult = useMemo(() => getAnalysisResult(document), [document])
  const explorerGraph = useMemo(() => buildExplorerGraph(document), [document])
  const reasoningGraph = useMemo(
    () => buildReasoningGraph(document, survival),
    [document, survival],
  )
  const graphFocusIntent = useMemo((): GraphFocusIntent | null => {
    if (!explorerHighlight) return null
    return { kind: 'node', nodeId: explorerHighlight }
  }, [explorerHighlight])

  const synthesizedCount =
    analysisResult?.counts.synthesizedSources ??
    survival.analyzedVideoCount ??
    survival.sources.filter((s) => s.includedInSynthesis !== false).length
  const excludedCount =
    analysisResult?.counts.excludedSources ??
    survival.excludedVideoCount ??
    survival.excludedSources?.length ??
    0
  const centralQuestion = survival.topicCoherence?.centralQuestion

  function claimById(id: string): SurvivalClaim | undefined {
    return survival.claims.find((c) => c.claimId === id)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 font-ui sm:px-6">
      <SurvivalArchiveActions document={document} />

      {(excludedCount > 0 || survival.topicCoherence?.coherenceLevel === 'low') && (
        <div className="mb-6 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3">
          <p className="text-sm font-medium text-ink">
            {synthesizedCount} video{synthesizedCount !== 1 ? 's' : ''} synthesized
            {excludedCount > 0 && (
              <span className="text-ink-soft"> · {excludedCount} excluded (off-topic)</span>
            )}
          </p>
          {centralQuestion && (
            <p className="mt-1 text-xs text-ink-soft">Central question: {centralQuestion}</p>
          )}
        </div>
      )}

      {/* Source strip */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {survival.sources.map((s) => {
          const thumb = resolveVideoThumbnail(s.videoId, s.thumbnail)
          const excluded = s.includedInSynthesis === false
          return (
            <div
              key={s.sourceId}
              className={`w-32 shrink-0 sm:w-36 ${excluded ? 'opacity-50' : ''}`}
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-paper-2">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-ink-soft">
                    {String(s.voiceIndex).padStart(2, '0')}
                  </div>
                )}
                {excluded && (
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    EXCLUDED
                  </span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs font-medium text-ink">{s.title}</p>
            </div>
          )
        })}
      </div>

      {/* LEVEL 0: Judgment */}
      <div className="mt-8 text-center">
        <p className="text-xs font-semibold tracking-widest text-ink-soft">
          {synthesizedCount} VIDEO{synthesizedCount !== 1 ? 'S' : ''} ANALYZED
          {excludedCount > 0 && ` · ${excludedCount} EXCLUDED`}
        </p>
        <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-line bg-paper-2/40 px-6 py-8">
          <p className="text-xs font-semibold tracking-wide text-coral">JUDGMENT</p>
          <h1 className="mt-3 font-serif text-2xl font-medium leading-snug text-ink sm:text-3xl">
            {survival.synthesis.headline}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            {survival.synthesis.explanation}
          </p>
          {survival.synthesis.judgmentBasis && (
            <p className="mt-3 text-xs italic text-ink-soft">{survival.synthesis.judgmentBasis}</p>
          )}
          <p className="mt-3 text-xs text-ink-soft">
            <ConfidenceDot level={survival.synthesis.confidence} />{' '}
            {survival.synthesis.confidence} confidence
          </p>
          {explorerGraph && (
            <JudgmentProvenance
              items={explorerGraph.provenance}
              onSelect={(item) => {
                if (item.targetId.startsWith('__filter_')) return
                setExplorerHighlight(resolveProvenanceNodeId(item.targetId, item.kind))
              }}
            />
          )}
        </div>
      </div>

      {/* LEVEL 1–3: Reasoning Map */}
      {reasoningGraph && explorerGraph && (
        <ReasoningGraphExplorer
          graph={reasoningGraph}
          sources={explorerGraph.sources}
          focusIntent={graphFocusIntent}
          onClaimSelect={(id) => {
            const claim = claimById(id)
            if (claim) setDrawer({ kind: 'claim', claim })
          }}
        />
      )}

      {/* Compact landscape summary */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {(
          [
            ['AGREE', survival.landscape.agree, '✓', 'text-ink'],
            ['DIVIDE', survival.landscape.divide, '⚡', 'text-coral'],
            ['UNCLEAR', survival.landscape.unclear, '?', 'text-ink-soft'],
          ] as const
        ).map(([label, zone, icon, accent]) => (
          <div
            key={label}
            className="rounded-xl border border-line bg-background px-3 py-4 text-center"
          >
            <span className="text-lg" aria-hidden>
              {icon}
            </span>
            <p className="mt-1 text-[10px] font-semibold tracking-wide text-ink-soft">{label}</p>
            <p className={`mt-1 text-xl font-semibold ${accent}`}>{zone.countLabel}</p>
          </div>
        ))}
      </div>

      {/* Emergent */}
      {explorerGraph && (
        <RelationshipExplorerEmergent
          graph={explorerGraph}
          onSelectInsight={(id) => {
            const insight = survival.emergentInsights.find((i) => i.id === id)
            if (insight) setDrawer({ kind: 'emergence', item: insight })
          }}
        />
      )}

      {/* Advanced analysis */}
      <div className="mt-12 border-t border-line pt-6">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-sm font-medium text-ink-soft hover:text-ink"
        >
          {showAdvanced ? 'Hide advanced analysis ↑' : 'Advanced analysis — audit & raw data ↓'}
        </button>
        {showAdvanced && (
          <AdvancedAnalysis
            survival={survival}
            reasoning={document.reasoning?.mode === 'multi' ? document.reasoning : null}
            analysis={analysisResult}
            onSelectClaim={(c) => setDrawer({ kind: 'claim', claim: c })}
            onSelectRelationship={(r) => setDrawer({ kind: 'relationship', relationship: r })}
          />
        )}
      </div>

      <SurvivalAskPanel synthesisId={document.id} survival={survival} document={document} />

      <EvidenceDrawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        drawer={drawer}
        survival={survival}
      />
    </div>
  )
}
