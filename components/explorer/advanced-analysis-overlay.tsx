'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SurvivalAnalysis, SurvivalClaim, SurvivalRelationship } from '@/lib/survival/types'
import { ReasoningDiagnosticsPanel } from '@/components/survival/reasoning-diagnostics'
import { useTranslation } from '@/lib/i18n/locale-context'

type Tab = 'overview' | 'claims' | 'relationships' | 'rejected' | 'gaps' | 'diagnostics'

type Props = {
  open: boolean
  onClose: () => void
  survival: SurvivalAnalysis
  reasoning?: MultiSourceReasoning | null
  onSelectClaim: (claim: SurvivalClaim) => void
  onSelectRelationship: (rel: SurvivalRelationship) => void
}

export function AdvancedAnalysisOverlay({
  open,
  onClose,
  survival,
  reasoning,
  onSelectClaim,
  onSelectRelationship,
}: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('overview')
  const [claimSourceFilter, setClaimSourceFilter] = useState<string | 'all'>('all')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const claimsBySource = useMemo(() => {
    const map = new Map<number, SurvivalClaim[]>()
    for (const c of survival.claims) {
      const list = map.get(c.voiceIndex) ?? []
      list.push(c)
      map.set(c.voiceIndex, list)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [survival.claims])

  if (!open) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('advanced.tabOverview') },
    { id: 'claims', label: t('advanced.tabClaims') },
    { id: 'relationships', label: t('advanced.tabRelationships') },
    { id: 'rejected', label: t('advanced.tabRejected') },
    { id: 'gaps', label: t('advanced.tabGaps') },
    { id: 'diagnostics', label: t('advanced.tabDiagnostics') },
  ]

  const filteredClaims =
    claimSourceFilter === 'all'
      ? survival.claims
      : survival.claims.filter((c) => c.sourceId === claimSourceFilter)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('advanced.title')}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-soft">{t('advanced.title')}</p>
          <p className="text-sm text-ink-soft">{t('explorer.advancedHint')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-paper-2/50"
        >
          {t('common.close')}
        </button>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-4 py-2 sm:px-6">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide ${
              tab === item.id ? 'bg-ink text-background' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {tab === 'overview' && (
          <div className="mx-auto max-w-2xl space-y-4 text-sm">
            <p>
              {survival.analyzedVideoCount ?? 0} analyzed · {survival.excludedVideoCount ?? 0}{' '}
              excluded · {survival.claims.length} claims ·{' '}
              {survival.verifiedRelationships.length} verified relationships
            </p>
            {survival.excludedSources && survival.excludedSources.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-ink-soft">EXCLUDED</p>
                <ul className="mt-2 space-y-2 text-xs text-ink-soft">
                  {survival.excludedSources.map((e) => (
                    <li key={e.sourceId} className="rounded-lg border border-line p-2">
                      <span className="font-medium text-ink">{e.title}</span> — {e.reason}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {tab === 'claims' && (
          <div className="mx-auto max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setClaimSourceFilter('all')}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                  claimSourceFilter === 'all' ? 'bg-ink text-background' : 'border border-line text-ink-soft'
                }`}
              >
                All ({survival.claims.length})
              </button>
              {claimsBySource.map(([voiceIndex, claims]) => {
                const sourceId = claims[0]?.sourceId ?? ''
                return (
                  <button
                    key={voiceIndex}
                    type="button"
                    onClick={() => setClaimSourceFilter(sourceId)}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                      claimSourceFilter === sourceId
                        ? 'bg-ink text-background'
                        : 'border border-line text-ink-soft'
                    }`}
                  >
                    V{String(voiceIndex).padStart(2, '0')} ({claims.length})
                  </button>
                )
              })}
            </div>
            <ul className="mt-4 space-y-2">
              {filteredClaims.map((c) => (
                <li key={c.claimId}>
                  <button
                    type="button"
                    onClick={() => onSelectClaim(c)}
                    className="w-full rounded-lg border border-line bg-background px-3 py-2 text-left hover:bg-paper-2/30"
                  >
                    <span className="font-mono text-[10px] text-ink-soft">
                      V{String(c.voiceIndex).padStart(2, '0')}
                    </span>
                    <p className="text-sm text-ink">{c.claim}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'relationships' && (
          <ul className="mx-auto max-w-2xl space-y-2">
            {survival.verifiedRelationships.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelectRelationship(r)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-left hover:bg-paper-2/30"
                >
                  <span className="text-[10px] font-medium text-coral">{r.type}</span>
                  <p className="text-xs text-ink-soft">{r.explanation}</p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === 'rejected' && (
          <ul className="mx-auto max-w-2xl space-y-2 text-xs text-ink-soft">
            {survival.rejectedRelationships.length === 0 && (
              <p>{t('advanced.noRejected')}</p>
            )}
            {survival.rejectedRelationships.map((r, i) => (
              <li key={`${r.fromClaimId}-${i}`} className="rounded-lg border border-line p-2">
                {r.proposedType}: {r.reason}
              </li>
            ))}
          </ul>
        )}

        {tab === 'gaps' && (
          <ul className="mx-auto max-w-2xl list-inside list-disc text-sm text-ink-soft">
            {survival.knowledgeGaps.length === 0 && <p>{t('advanced.noGaps')}</p>}
            {survival.knowledgeGaps.map((g) => (
              <li key={g.id}>{g.question}</li>
            ))}
          </ul>
        )}

        {tab === 'diagnostics' && reasoning && (
          <div className="mx-auto max-w-2xl">
            <ReasoningDiagnosticsPanel reasoning={reasoning} />
          </div>
        )}
      </div>
    </div>
  )
}
