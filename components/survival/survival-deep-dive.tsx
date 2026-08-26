'use client'

import type { AnalysisResult } from '@/lib/reasoning/analysis-result'
import type { SurvivalAnalysis, SurvivalClaim, SurvivalRelationship } from '@/lib/survival/types'

type Props = {
  survival: SurvivalAnalysis
  analysis?: AnalysisResult | null
  onSelectClaim: (claim: SurvivalClaim) => void
  onSelectRelationship: (rel: SurvivalRelationship) => void
}

export function SurvivalDeepDive({ survival, analysis, onSelectClaim, onSelectRelationship }: Props) {
  const claimCount = analysis?.counts.displayedClaims ?? survival.claims.length
  const verifiedCount = analysis?.counts.verifiedRelationships ?? survival.verifiedRelationships.length
  const claimsToShow = analysis
    ? analysis.displayedClaims.map((c) => {
        const s = survival.claims.find((sc) => sc.claimId === c.id)
        return s ?? {
          claimId: c.id,
          videoId: c.videoId,
          sourceId: c.sourceId,
          voiceIndex: c.voiceIndex,
          claim: c.statement,
          evidence: 'No direct source evidence',
          timestamp: null,
          confidence: c.confidence,
        }
      })
    : survival.claims

  const relsToShow = analysis
    ? analysis.verifiedRelationships.map((r) => {
        const s = survival.verifiedRelationships.find((sr) => sr.id === r.id)
        return s ?? {
          id: r.id,
          fromClaimId: r.fromClaimId,
          toClaimId: r.toClaimId,
          fromVideoId: r.fromVideoId,
          toVideoId: r.toVideoId,
          type: 'AGREEMENT' as const,
          explanation: r.explanation,
          confidence: r.confidence,
        }
      })
    : survival.verifiedRelationships

  return (
    <div className="mt-6 space-y-8 text-sm">
      <section>
        <p className="text-xs font-semibold text-ink-soft">
          ALL CLAIMS ({claimCount})
        </p>
        <ul className="mt-3 space-y-2">
          {claimsToShow.map((c) => (
            <li key={c.claimId}>
              <button
                type="button"
                onClick={() => onSelectClaim(c)}
                className="w-full rounded-lg bg-paper-2/40 px-3 py-2 text-left hover:bg-paper-2/70"
              >
                <span className="text-[10px] text-ink-soft">V{c.voiceIndex}</span>
                <p className="text-ink">{c.claim}</p>
                {c.evidence === 'No direct source evidence' && (
                  <p className="mt-1 text-[10px] text-ink-soft">No direct source evidence</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="text-xs font-semibold text-ink-soft">
          VERIFIED RELATIONSHIPS ({verifiedCount})
        </p>
        <ul className="mt-3 space-y-2">
          {relsToShow.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelectRelationship(r)}
                className="w-full rounded-lg bg-paper-2/40 px-3 py-2 text-left hover:bg-paper-2/70"
              >
                <span className="text-[10px] font-medium text-coral">{r.type}</span>
                <p className="text-xs text-ink-soft">{r.explanation}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {survival.rejectedRelationships.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-ink-soft">
            REJECTED ({survival.rejectedRelationships.length})
          </p>
          <ul className="mt-3 space-y-2 text-xs text-ink-soft">
            {survival.rejectedRelationships.map((r, i) => (
              <li key={`${r.fromClaimId}-${r.toClaimId}-${i}`} className="rounded-lg bg-paper-2/20 p-2">
                {r.proposedType}: {r.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {survival.knowledgeGaps.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-ink-soft">KNOWLEDGE GAPS</p>
          <ul className="mt-2 list-inside list-disc text-ink-soft">
            {survival.knowledgeGaps.map((g) => (
              <li key={g.id}>{g.question}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
