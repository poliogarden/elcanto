'use client'

import { useState } from 'react'
import type {
  MultiSourceReasoning,
  ReasoningClaim,
  ReasoningPattern,
  ReasoningRelationship,
} from '@/lib/reasoning/types'
import { useTranslation } from '@/lib/i18n/locale-context'

const REL_TYPE_LABEL: Record<ReasoningRelationship['type'], string> = {
  AGREEMENT: 'Agree',
  CONTRADICTION: 'Contradict',
  TENSION: 'Tension',
  COMPLEMENTARY: 'Complement',
  CAUSE_EFFECT: 'Cause → Effect',
  DEPENDENCY: 'Dependency',
  SAME_TOPIC_DIFFERENT_PERSPECTIVE: 'Different view',
  PARTIAL_AGREEMENT: 'Partly agree',
  INDEPENDENT: 'Separate',
  PROBLEM_SOLUTION: 'Problem → Solution',
  MECHANISM_OUTCOME: 'Mechanism → Outcome',
  TRADE_OFF: 'Trade-off',
  PREREQUISITE: 'Prerequisite',
  CONSTRAINT: 'Constraint',
  ADOPTION_BARRIER: 'Adoption barrier',
  ENABLER: 'Enabler',
  EXAMPLE_OF: 'Example',
  GENERALIZATION: 'Generalization',
  SPECIALIZATION: 'Specialization',
  TEMPORAL_PROGRESSION: 'Temporal',
}

type Props = {
  reasoning: MultiSourceReasoning
  onSelectClaim?: (claim: ReasoningClaim) => void
  onSelectRelationship?: (relationship: ReasoningRelationship) => void
}

function ClaimChip({
  claim,
  onClick,
}: {
  claim: ReasoningClaim
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-line bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-paper-2/60"
    >
      <span className="font-semibold text-ink-soft">
        V{String(claim.voiceIndex).padStart(2, '0')}
      </span>
      <p className="mt-1 leading-relaxed text-ink">{claim.statement}</p>
    </button>
  )
}

export function PatternTracePanel({
  reasoning,
  onSelectClaim,
  onSelectRelationship,
}: Props) {
  const { t } = useTranslation()
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)
  const [expandedRel, setExpandedRel] = useState<string | null>(null)

  if (reasoning.patterns.length === 0) return null

  const claimById = new Map(reasoning.claims.map((c) => [c.id, c]))
  const relById = new Map(reasoning.relationships.map((r) => [r.id, r]))

  function togglePattern(p: ReasoningPattern) {
    setExpandedPattern((prev) => (prev === p.id ? null : p.id))
    setExpandedRel(null)
  }

  return (
    <section className="mt-10 rounded-2xl border border-line bg-paper-2/20 p-4 sm:p-5">
      <p className="text-xs font-semibold tracking-wide text-ink-soft">
        {t('reasoning.patterns.title')}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{t('reasoning.patterns.subtitle')}</p>

      <div className="mt-4 space-y-3">
        {reasoning.patterns.map((pattern) => {
          const open = expandedPattern === pattern.id
          const rels = pattern.relationshipIds
            .map((id) => relById.get(id))
            .filter((r): r is ReasoningRelationship => Boolean(r))

          return (
            <div key={pattern.id} className="rounded-xl border border-line bg-background">
              <button
                type="button"
                onClick={() => togglePattern(pattern)}
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-coral">
                    {pattern.type.replace(/_/g, ' ')}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-ink">{pattern.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{pattern.description}</p>
                </div>
                <span className="shrink-0 text-ink-soft" aria-hidden>
                  {open ? '↑' : '↓'}
                </span>
              </button>

              {open && (
                <div className="border-t border-line px-4 pb-4 pt-3">
                  {rels.length > 0 ? (
                    <div className="space-y-2">
                      {rels.map((rel) => {
                        const relOpen = expandedRel === rel.id
                        const from = claimById.get(rel.fromClaimId)
                        const to = claimById.get(rel.toClaimId)

                        return (
                          <div key={rel.id} className="rounded-lg bg-paper-2/40 p-3">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedRel((prev) => (prev === rel.id ? null : rel.id))
                                onSelectRelationship?.(rel)
                              }}
                              className="flex w-full items-center justify-between gap-2 text-left"
                            >
                              <span className="text-xs font-semibold text-ink">
                                {REL_TYPE_LABEL[rel.type]}
                              </span>
                              <span className="text-[10px] text-ink-soft" aria-hidden>
                                {relOpen ? '↑' : '↓'}
                              </span>
                            </button>
                            <p className="mt-1 text-xs text-ink-soft">{rel.explanation}</p>

                            {relOpen && from && to && (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <ClaimChip
                                  claim={from}
                                  onClick={() => onSelectClaim?.(from)}
                                />
                                <ClaimChip
                                  claim={to}
                                  onClick={() => onSelectClaim?.(to)}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {pattern.claimIds.map((cid) => {
                        const claim = claimById.get(cid)
                        if (!claim) return null
                        return (
                          <ClaimChip
                            key={cid}
                            claim={claim}
                            onClick={() => onSelectClaim?.(claim)}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
