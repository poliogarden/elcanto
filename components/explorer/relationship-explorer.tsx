'use client'

import { useCallback, useMemo, useState } from 'react'
import { AgreeHub } from '@/components/explorer/agree-hub'
import { DivideSpectrum } from '@/components/explorer/divide-spectrum'
import { EmergentBridge } from '@/components/explorer/emergent-bridge'
import { ExplorerDetailPanel, type ExplorerSelection } from '@/components/explorer/explorer-detail-panel'
import { GapIndicator } from '@/components/explorer/gap-indicator'
import { PatternOverviewCanvas } from '@/components/explorer/pattern-overview-canvas'
import { SourceBadge } from '@/components/explorer/source-badge'
import { TradeOffBar } from '@/components/explorer/trade-off-bar'
import { useTranslation } from '@/lib/i18n/locale-context'
import {
  getAgreeRelationships,
  getClaimsForPattern,
  getDivideRelationships,
  getEvidenceForClaim,
  type RelationshipExplorerGraph,
} from '@/lib/visualization/relationship-explorer-model'

type FilterMode = 'all' | 'agree' | 'divide' | 'gap' | null

type Props = {
  graph: RelationshipExplorerGraph
  onClaimSelect?: (claimId: string) => void
  onRelationshipSelect?: (relationshipId: string) => void
}

export function RelationshipExplorer({
  graph,
  onClaimSelect,
  onRelationshipSelect,
}: Props) {
  const { t } = useTranslation()
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>(null)
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null)
  const [selection, setSelection] = useState<ExplorerSelection>(null)

  const agreeRels = useMemo(() => getAgreeRelationships(graph), [graph])
  const divideRels = useMemo(() => getDivideRelationships(graph), [graph])
  const tradeOffPatterns = useMemo(
    () => graph.patterns.filter((p) => p.visualKind === 'trade-off'),
    [graph.patterns],
  )

  const patternClaims = useMemo(
    () => (selectedPatternId ? getClaimsForPattern(graph, selectedPatternId) : []),
    [graph, selectedPatternId],
  )

  const handleSelectPattern = useCallback(
    (id: string | null) => {
      setSelectedPatternId(id)
      if (!id) {
        setSelection(null)
        return
      }
      const pattern = graph.patterns.find((p) => p.id === id)
      if (pattern) setSelection({ kind: 'pattern', pattern })
    },
    [graph.patterns],
  )

  const handleSelectRelationship = useCallback(
    (rel: (typeof graph.relationships)[0]) => {
      setSelection({ kind: 'relationship', relationship: rel })
      onRelationshipSelect?.(rel.id)
    },
    [onRelationshipSelect],
  )

  const handleSelectClaim = useCallback(
    (claim: (typeof graph.claims)[0]) => {
      const evidence = getEvidenceForClaim(graph, claim.id)
      setSelection({ kind: 'claim', claim, evidence })
      onClaimSelect?.(claim.id)
    },
    [graph, onClaimSelect],
  )

  const setFilterMode = (mode: FilterMode) => {
    setFilter((prev) => (prev === mode ? null : mode))
    setSelection(null)
    setSelectedPatternId(null)
  }

  const resetAll = () => {
    setFilter(null)
    setSelectedPatternId(null)
    setHighlightedSourceId(null)
    setSelection(null)
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-soft">
            {t('explorer.title')}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{t('explorer.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'agree', 'divide', 'gap'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode === 'all' ? 'all' : mode)}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                filter === mode || (mode === 'all' && filter === 'all')
                  ? 'border-ink bg-ink text-background'
                  : 'border-line bg-background text-ink-soft hover:border-ink'
              }`}
            >
              {mode === 'all'
                ? t('explorer.filterAll')
                : mode === 'agree'
                  ? `✓ ${t('explorer.filterAgree')}`
                  : mode === 'divide'
                    ? `⚡ ${t('explorer.filterDivide')}`
                    : `? ${t('explorer.filterGap')}`}
            </button>
          ))}
          {(filter || selectedPatternId || selection) && (
            <button
              type="button"
              onClick={resetAll}
              className="rounded-full border border-line px-3 py-1 text-[10px] text-ink-soft hover:text-ink"
            >
              {t('explorer.reset')}
            </button>
          )}
        </div>
      </div>

      {/* Source strip */}
      <div className="mt-4 flex flex-wrap gap-2">
        {graph.sources.map((s) => (
          <SourceBadge
            key={s.sourceId}
            voiceIndex={s.voiceIndex}
            videoId={s.videoId}
            thumbnail={s.thumbnail}
            title={s.excluded ? `${s.title} — ${s.excludeReason}` : s.title}
            muted={s.excluded}
            highlighted={highlightedSourceId === s.sourceId}
            onClick={
              s.excluded
                ? undefined
                : () =>
                    setHighlightedSourceId((prev) =>
                      prev === s.sourceId ? null : s.sourceId,
                    )
            }
          />
        ))}
      </div>

      {/* Desktop: canvas + detail */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <PatternOverviewCanvas
            graph={graph}
            selectedPatternId={selectedPatternId}
            filter={filter}
            highlightedSourceId={highlightedSourceId}
            onSelectPattern={handleSelectPattern}
          />

          {filter !== 'gap' && filter !== 'divide' && agreeRels.length > 0 && (
            <AgreeHub
              graph={graph}
              relationships={agreeRels}
              onSelectRelationship={handleSelectRelationship}
            />
          )}

          {filter !== 'gap' && filter !== 'agree' && divideRels.length > 0 && (
            <DivideSpectrum
              graph={graph}
              relationships={divideRels}
              onSelectRelationship={handleSelectRelationship}
            />
          )}

          {filter !== 'gap' &&
            filter !== 'agree' &&
            tradeOffPatterns.map((p) => (
              <TradeOffBar
                key={p.id}
                pattern={p}
                onClick={() => handleSelectPattern(p.id)}
              />
            ))}

          {filter !== 'agree' && filter !== 'divide' && (
            <GapIndicator
              gaps={graph.gaps}
              onSelectGap={(gap) => setSelection({ kind: 'gap', gap })}
            />
          )}

          {/* Pattern drill-down claims */}
          {selectedPatternId && patternClaims.length > 0 && (
            <div className="rounded-xl border border-line bg-paper-2/20 p-4">
              <p className="text-[10px] font-semibold text-ink-soft">
                {t('explorer.claimsInPattern')}
              </p>
              <div className="mt-3 space-y-2">
                {patternClaims.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClaim(c)}
                    className="flex w-full items-start gap-2 rounded-lg bg-background px-3 py-2 text-left hover:bg-paper-2/60"
                  >
                    <SourceBadge voiceIndex={c.voiceIndex} videoId={c.videoId} size="sm" />
                    <p className="text-xs text-ink">{c.statement}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-6">
            <ExplorerDetailPanel
              graph={graph}
              selection={selection}
              patternClaims={patternClaims}
            />
          </div>
        </div>
      </div>

      {/* Mobile detail (inline below) */}
      <div className="mt-4 lg:hidden">
        <ExplorerDetailPanel
          graph={graph}
          selection={selection}
          patternClaims={patternClaims}
        />
      </div>
    </section>
  )
}

export function RelationshipExplorerEmergent({
  graph,
  onSelectInsight,
}: {
  graph: RelationshipExplorerGraph
  onSelectInsight?: (insightId: string) => void
}) {
  const { t } = useTranslation()

  return (
    <section className="mt-12">
      <p className="text-center text-2xl text-coral/80" aria-hidden>
        ✦
      </p>
      <p className="mt-2 text-center text-xs font-semibold tracking-widest text-ink-soft">
        {t('explorer.emergentTitle')}
      </p>
      <div className="mx-auto mt-6 max-w-2xl">
        <EmergentBridge
          graph={graph}
          onSelectInsight={(insight) => onSelectInsight?.(insight.id)}
        />
      </div>
    </section>
  )
}
