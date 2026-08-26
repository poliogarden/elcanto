'use client'

import type { AnalysisResult } from '@/lib/reasoning/analysis-result'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'

type Props = {
  reasoning: MultiSourceReasoning
  analysis?: AnalysisResult | null
}

export function ReasoningDiagnosticsPanel({ reasoning, analysis }: Props) {
  const d = reasoning.diagnostics
  const scores = d.survivalTest
  const stats = reasoning.diagnostics.pipelineStats
  const counts = analysis?.counts

  return (
    <section className="rounded-xl border border-dashed border-line bg-paper-2/20 p-4">
      <p className="text-xs font-semibold tracking-wide text-ink-soft">REASONING DIAGNOSTICS</p>
      <p className="mt-1 text-[10px] text-ink-soft">
        Engine {reasoning.version}
        {reasoning.schemaVersion != null && ` · schema v${reasoning.schemaVersion}`}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(
          [
            ['Cross-source value', scores.q1_crossSourceValue],
            ['New relationships', scores.q2_newRelationships],
            ['Beyond summary', scores.q3_beyondSummary],
            ['True emergent', scores.q4_trueEmergent],
            ['10-second clarity', scores.q5_tenSecondClarity],
            ['No forced links', scores.q6_noForcedLinks],
            ['Structurally different', scores.q7_structurallyDifferent],
          ] as const
        ).map(([label, ok]) => (
          <div key={label} className="flex items-center gap-2 text-xs text-ink">
            <span aria-hidden>{ok ? '✓' : '○'}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {(stats || counts) && (
        <div className="mt-4 grid gap-1 text-xs text-ink-soft sm:grid-cols-2">
          <span>
            Input sources: {counts?.inputSources ?? stats?.inputSources ?? stats?.sourcesCount ?? '—'}
          </span>
          <span>Relevant sources: {counts?.relevantSources ?? stats?.relevantSources ?? '—'}</span>
          <span>Excluded sources: {counts?.excludedSources ?? stats?.excludedSources ?? '—'}</span>
          <span>Synthesized sources: {counts?.synthesizedSources ?? stats?.synthesizedSources ?? '—'}</span>
          <span>Claims extracted: {counts?.extractedClaims ?? stats?.claimsExtracted ?? '—'}</span>
          <span>Accepted claims: {counts?.displayedClaims ?? stats?.acceptedClaims ?? stats?.relevantClaims ?? '—'}</span>
          {stats?.rejectedClaims != null && (
            <span>Rejected claims: {stats.rejectedClaims}</span>
          )}
          {stats?.duplicateClaimsMerged != null && (
            <span>Duplicate claims merged: {stats.duplicateClaimsMerged}</span>
          )}
          {stats?.funnelFinalUsable != null && (
            <span>Funnel usable: {stats.funnelFinalUsable}</span>
          )}
          <span>Candidate pairs: {stats?.candidatePairs ?? '—'}</span>
          <span>Direct candidates: {stats?.directCandidates ?? '—'}</span>
          <span>Semantic candidates: {stats?.semanticCandidates ?? '—'}</span>
          {stats?.claimsPrimaryTier != null && (
            <span>Claim tiers: Pri{stats.claimsPrimaryTier} Sup{stats.claimsSupportingTier} Pe{stats.claimsPeripheralTier}</span>
          )}
          <span>
            Verified relationships: {counts?.verifiedRelationships ?? stats?.verifiedRelationships ?? '—'}
          </span>
          <span>
            Cross-source verified:{' '}
            {counts?.crossSourceVerifiedRelationships ??
              stats?.crossSourceVerifiedRelationships ??
              '—'}
          </span>
          <span>
            Significant clusters:{' '}
            {counts?.significantRelationships ?? stats?.significantRelationships ?? '—'}
          </span>
          <span>
            Relationship clusters: {counts?.relationshipClusters ?? stats?.relationshipClusters ?? '—'}
          </span>
          <span>Displayed relationships: {counts?.displayedRelationships ?? '—'}</span>
          <span>Rejected relationships: {counts?.rejectedRelationships ?? stats?.rejectedRelationships ?? '—'}</span>
          <span>Emergent insights: {counts?.emergentInsights ?? stats?.verifiedEmergentInsights ?? '—'}</span>
          {stats?.rejectedEmergentInsights != null && (
            <span>Rejected emergent: {stats.rejectedEmergentInsights}</span>
          )}
          {stats?.genericRelationshipsSuppressed != null && (
            <span>Generic suppressed: {stats.genericRelationshipsSuppressed}</span>
          )}
          {stats?.duplicateRelationshipsMerged != null && (
            <span>Duplicates merged: {stats.duplicateRelationshipsMerged}</span>
          )}
          {stats?.sourceRelevancePrimary != null && (
            <span>
              Source tiers: P{stats.sourceRelevancePrimary} S{stats.sourceRelevanceSecondary} Pe
              {stats.sourceRelevancePeripheral} O{stats.sourceRelevanceOffTopic}
            </span>
          )}
        </div>
      )}

      {d.relevanceFunnel && (
        <div className="mt-4 rounded-lg border border-line bg-background/60 p-3">
          <p className="text-[10px] font-semibold text-ink-soft">RELEVANCE FUNNEL</p>
          <div className="mt-2 grid gap-1 text-xs text-ink-soft sm:grid-cols-2">
            <span>Extracted: {d.relevanceFunnel.extracted}</span>
            <span>From synthesis sources: {d.relevanceFunnel.fromSynthesisSources}</span>
            <span>Topic relevant: {d.relevanceFunnel.topicRelevant}</span>
            <span>Question aligned: {d.relevanceFunnel.questionAligned}</span>
            <span>Primary tier: {d.relevanceFunnel.primaryTier}</span>
            <span>Supporting tier: {d.relevanceFunnel.supportingTier}</span>
            <span>Peripheral tier: {d.relevanceFunnel.peripheralTier}</span>
            <span>Off-topic tier: {d.relevanceFunnel.offTopicTier}</span>
            <span>Final usable: {d.relevanceFunnel.finalUsable}</span>
          </div>
        </div>
      )}

      {d.candidateFunnel && (
        <div className="mt-4 rounded-lg border border-line bg-background/60 p-3">
          <p className="text-[10px] font-semibold text-ink-soft">PIPELINE FUNNEL</p>
          <div className="mt-2 space-y-1 text-xs text-ink-soft">
            <p className="font-medium text-ink">CLAIMS</p>
            <p>
              {stats?.claimsExtracted ?? '—'} extracted → {d.candidateFunnel.claimsAfterRelevance}{' '}
              relevance-usable → {d.candidateFunnel.claimsForCandidateGeneration} generation
            </p>
            <p className="font-medium text-ink">CANDIDATES</p>
            <p>
              {d.candidateFunnel.possibleCrossSourcePairs} possible pairs →{' '}
              {d.candidateFunnel.candidatePairs} candidates ({stats?.semanticCandidates ?? '—'}{' '}
              semantic)
            </p>
            <p className="font-medium text-ink">VERIFICATION</p>
            <p>
              {stats?.verifiedRelationships ?? '—'} verified pairs ·{' '}
              {stats?.rejectedRelationships ?? '—'} rejected
            </p>
            {(stats?.normalizedPropositions != null || stats?.relationshipClusters != null) && (
              <>
                <p className="font-medium text-ink">CONSOLIDATION</p>
                <p>
                  {stats?.verifiedRelationships ?? '—'} verified pairs →{' '}
                  {stats?.normalizedPropositions ?? '—'} normalized propositions →{' '}
                  {stats?.relationshipClusters ?? '—'} clusters →{' '}
                  {stats?.significantRelationships ?? '—'} significant
                </p>
              </>
            )}
            <p>
              {d.candidateFunnel.participatingSourceCount} participating in generation
              {d.sourceParticipation && (
                <>
                  {' '}
                  · {d.sourceParticipation.relevantSourceCount} relevant sources
                </>
              )}
            </p>
          </div>
          {d.pipelineWarnings?.some((w) => w.code === 'CROSS_SOURCE_CANDIDATE_COLLAPSE') && (
            <p className="mt-2 text-xs font-medium text-coral">
              ⚠ CROSS-SOURCE CANDIDATE COLLAPSE
            </p>
          )}
        </div>
      )}

      {d.sourceParticipation && (
        <div className="mt-4 rounded-lg border border-line bg-background/60 p-3">
          <p className="text-[10px] font-semibold text-ink-soft">SOURCE PARTICIPATION</p>
          <p className="mt-1 text-[10px] text-ink-soft">
            Relevant {d.sourceParticipation.relevantSourceCount} · Generation{' '}
            {d.sourceParticipation.generationParticipatingCount} · Verified{' '}
            {d.sourceParticipation.verifiedParticipatingCount}
          </p>
          <ul className="mt-2 space-y-2 text-[10px] text-ink-soft">
            {d.sourceParticipation.rows
              .filter((r) => r.extracted > 0)
              .map((row) => (
                <li key={row.sourceId} className="rounded border border-line/50 px-2 py-1">
                  <span className="font-mono text-ink">{row.sourceId}</span>
                  <p>
                    extracted {row.extracted} · usable {row.relevanceUsable} · accepted{' '}
                    {row.qualityAccepted} · generation {row.generationClaims}
                  </p>
                  <p>
                    pairs {row.candidatePairsAsMember} · verified {row.verifiedRelationships} ·
                    clusters {row.clusterMembership}
                    {row.candidateZeroReason ? ` · ⚠ ${row.candidateZeroReason}` : ''}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      )}

      {d.pipelineWarnings && d.pipelineWarnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-coral/40 bg-coral/5 p-3">
          <p className="text-[10px] font-semibold text-coral">PIPELINE WARNINGS</p>
          <ul className="mt-2 space-y-1 text-xs text-ink">
            {d.pipelineWarnings.map((w, i) => (
              <li key={i}>
                {w.code === 'CROSS_SOURCE_CANDIDATE_COLLAPSE' ? '⚠ ' : ''}
                {w.code}: {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.claimRelevanceDiagnostics && d.claimRelevanceDiagnostics.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-ink-soft">
            CLAIM RELEVANCE ({d.claimRelevanceDiagnostics.length} sampled)
          </p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[10px] text-ink-soft">
            {d.claimRelevanceDiagnostics.slice(0, 40).map((row) => (
              <li key={row.claimId} className="rounded border border-line/50 px-2 py-1">
                <span className="font-mono text-ink">{row.decision}</span> · {row.tier} · score{' '}
                {row.relevanceScore.toFixed(2)} · topic {row.topicScore.toFixed(2)} · q{' '}
                {row.questionAlignmentScore.toFixed(2)}
                {row.reason ? ` · ${row.reason}` : ''}
                <p className="mt-0.5 truncate text-ink">{row.claimText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.claimTransitionDiagnostics && d.claimTransitionDiagnostics.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-ink-soft">
            CLAIM TRANSITION ({d.claimTransitionDiagnostics.length} tracked)
          </p>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-[10px] text-ink-soft">
            {d.claimTransitionDiagnostics
              .filter((r) => r.usable || r.qualityAccepted || r.inGenerationSet)
              .slice(0, 40)
              .map((row) => (
                <li key={row.claimId} className="rounded border border-line/50 px-2 py-1">
                  <span className="font-mono text-ink">{row.sourceId}</span> · {row.tier} ·
                  usable {row.usable ? '✓' : '×'} · accepted {row.qualityAccepted ? '✓' : '×'}
                  {row.qualityRejectionReason ? ` · ${row.qualityRejectionReason}` : ''}
                  {row.fidelityStatus ? ` · fidelity ${row.fidelityStatus}` : ''}
                  {row.fidelityMutation?.length ? ` · ${row.fidelityMutation.join(',')}` : ''}
                  {row.inGenerationSet ? ' · IN GENERATION' : ''}
                  <p className="mt-0.5 truncate text-ink">{row.claimText}</p>
                  {row.evidenceText && (
                    <p className="truncate text-ink-soft">ev: {row.evidenceText}</p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      {reasoning.diagnostics.judgmentPropositionLineage &&
        reasoning.diagnostics.judgmentPropositionLineage.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold text-ink-soft">JUDGMENT PROPOSITION LINEAGE</p>
            <ul className="mt-2 space-y-3 text-xs text-ink">
              {reasoning.diagnostics.judgmentPropositionLineage.map((p, i) => (
                <li key={i} className="rounded-lg border border-line bg-background/60 p-2">
                  <p className="font-medium">{p.proposition.slice(0, 160)}</p>
                  <p className="mt-1 text-ink-soft">
                    {p.supportStatus} · clusters {p.clusterIds.join(', ') || '—'} · rels{' '}
                    {p.relationshipIds.join(', ') || '—'} · claims {p.claimIds.join(', ') || '—'} ·
                    sources {p.sourceIds.join(', ') || '—'} · evidence{' '}
                    {p.evidenceIds.join(', ') || '—'}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

      {reasoning.patterns.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-ink-soft">PATTERNS</p>
          <ul className="mt-2 space-y-2 text-xs text-ink">
            {reasoning.patterns.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.title}</span>
                <span className="text-ink-soft"> — {p.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reasoning.rejectedEmergentCandidates &&
        reasoning.rejectedEmergentCandidates.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold text-ink-soft">REJECTED EMERGENT CANDIDATES</p>
            <ul className="mt-2 space-y-2 text-xs text-ink-soft">
              {reasoning.rejectedEmergentCandidates.map((r, i) => (
                <li key={i} className="rounded-lg border border-line bg-background/60 p-2">
                  <p className="text-ink">{r.insight.statement}</p>
                  <p className="mt-1">{r.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

      {d.relationshipVerificationDiagnostics &&
        d.relationshipVerificationDiagnostics.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold text-ink-soft">
              VERIFICATION ALIGNMENT ({d.relationshipVerificationDiagnostics.length})
            </p>
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-[10px] text-ink-soft">
              {d.relationshipVerificationDiagnostics.slice(0, 20).map((row, i) => (
                <li key={i} className="rounded border border-line/50 px-2 py-1">
                  <p className="font-mono text-ink">
                    {row.proposedType} · {row.stage}
                    {row.rejectionReason ? ` · ${row.rejectionReason}` : ' · passed'}
                  {row.rejectionDetail ? ` (${row.rejectionDetail})` : ''}
                  </p>
                  <p>
                    semantic {row.scores.semanticSimilarity.toFixed(2)} · topic{' '}
                    {row.scores.topicAlignment.toFixed(2)} · subject{' '}
                    {row.scores.subjectEntityAlignment.toFixed(2)} · predicate{' '}
                    {row.scores.predicateAlignment.toFixed(2)} · polarity{' '}
                    {row.scores.polarity} · final{' '}
                    {row.scores.finalAlignment.toFixed(2)} / req{' '}
                    {row.scores.requiredThreshold.toFixed(2)}
                  </p>
                  {row.scores.failedConditions.length > 0 && (
                    <p>FAILED: {row.scores.failedConditions.join(', ')}</p>
                  )}
                  <p className="mt-0.5 truncate text-ink">A: {row.fromClaimText}</p>
                  <p className="truncate text-ink">B: {row.toClaimText}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

      {reasoning.rejectedRelationships.length > 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          Rejected relationships in store: {d.rejectedRelationshipCount}
        </p>
      )}

      {scores.notes.length > 0 && (
        <ul className="mt-3 list-inside list-disc text-xs text-ink-soft">
          {scores.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
