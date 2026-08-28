import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import {
  enrichClaimsForCrossSourceCandidates,
  buildCandidateFunnelSnapshot,
  evaluateCandidateCollapseWarning,
} from '@/lib/reasoning/candidate-funnel'
import { buildComparableClaimPool } from '@/lib/reasoning/comparable-claim-pool'
import { resolveClaimsThroughRelevanceFunnel } from '@/lib/reasoning/claim-relevance'
import { computeSurvivalDiagnostics } from '@/lib/reasoning/diagnostics'
import { buildEvidenceCoverageDiagnostics } from '@/lib/reasoning/evidence-coverage'
import {
  enhanceSourceRelevance,
  synthesisIdsFromEnhanced,
} from '@/lib/reasoning/source-relevance-enhance'
import {
  filterHighSignalClaims,
  ingestSourceUnderstanding,
} from '@/lib/reasoning/source-ingest'
import { buildSourceParticipationDiagnostics } from '@/lib/reasoning/source-participation'
import { buildVerificationDiagnosticsBundle } from '@/lib/reasoning/verification-diagnostics'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SourceAnalysis } from '@/lib/types/source'

const ENGINE_VERSION = 'reasoning-v2.1'

/**
 * Pre-LLM deterministic trace when live pipeline cannot run (e.g. no API key).
 * Does not modify reasoning thresholds — only collects diagnostics.
 */
export function runDeterministicReasoningTrace(input: {
  sources: SourceAnalysis[]
  question: string
}): MultiSourceReasoning {
  const ingested = ingestSourceUnderstanding(input.sources)
  const allClaims = filterHighSignalClaims(ingested.claims)

  const clusteredRelevance = input.sources.map((s) => ({
    sourceId: s.sourceId,
    classification: 'direct' as const,
    score: 0.9,
    reason: input.question.slice(0, 80),
    relevantClaimIds: [],
  }))

  const enhanced = enhanceSourceRelevance({
    sources: input.sources,
    claims: allClaims,
    evidence: ingested.evidence,
    centralQuestion: input.question,
    existing: clusteredRelevance,
  })
  const synthesisSourceIds = synthesisIdsFromEnhanced(enhanced)
  const funnel = resolveClaimsThroughRelevanceFunnel({
    allClaims,
    synthesisSourceIds,
    centralQuestion: input.question,
    sourceRelevance: enhanced,
  })

  const comparablePool = buildComparableClaimPool({
    usableClaims: funnel.usableClaims,
    evidence: ingested.evidence,
    relevanceDiagnostics: funnel.diagnostics,
    centralQuestion: input.question,
    synthesisSourceIds,
  })

  const generationClaims = comparablePool.generationClaims
  const claimsForCandidates = enrichClaimsForCrossSourceCandidates({
    acceptedClaims: generationClaims,
    supplementalClaims: funnel.peripheralClaims,
    synthesisSourceIds,
    minPerSource: 2,
    maxTotal: 28,
  })

  const heuristic = discoverHeuristicCandidates(claimsForCandidates.claims)
  const evidenceCoverage = buildEvidenceCoverageDiagnostics({
    allClaims,
    generationClaims,
  })

  const candidateFunnel = buildCandidateFunnelSnapshot({
    claimsAfterRelevance: funnel.funnel.finalUsable,
    claimsForGeneration: claimsForCandidates.claims,
    heuristic,
    finalCandidates: heuristic.all,
    sameSourceDropped: 0,
    llmCandidatesAdded: 0,
  })

  const verificationDiagnosticsBundle = buildVerificationDiagnosticsBundle({
    candidates: heuristic.all,
    verified: [],
    rejected: [],
    verificationDiagnostics: [],
    generationClaims: claimsForCandidates.claims,
    allClaims,
    evidence: ingested.evidence,
    relevantSourceIds: [...synthesisSourceIds],
  })

  const sourceParticipation = buildSourceParticipationDiagnostics({
    allClaims,
    relevanceUsableClaims: funnel.usableClaims,
    comparableClaims: comparablePool.comparableClaims,
    qualityAcceptedClaims: comparablePool.comparableClaims,
    generationClaims: claimsForCandidates.claims,
    candidates: heuristic.all,
    verified: [],
    significantClusters: [],
    relevantSourceIds: [...synthesisSourceIds],
  })

  const pipelineWarnings = [...funnel.warnings]
  const collapseWarning = evaluateCandidateCollapseWarning(candidateFunnel)
  if (collapseWarning) pipelineWarnings.push(collapseWarning)

  const reasoning: MultiSourceReasoning = {
    mode: 'multi',
    version: ENGINE_VERSION,
    schemaVersion: 3,
    centralQuestion: input.question,
    clusters: [],
    sourceRelevance: enhanced,
    excludedSources: [],
    claims: comparablePool.comparableClaims,
    evidence: ingested.evidence,
    concepts: ingested.concepts,
    stances: ingested.stances,
    assumptions: ingested.assumptions,
    relationships: [],
    rejectedRelationships: [],
    relationshipClusters: [],
    significantRelationships: [],
    patterns: [],
    synthesis: null,
    judgment: null,
    insights: [],
    rejectedEmergentCandidates: [],
    knowledgeGaps: [],
    landscape: {
      agree: { countLabel: '0', cards: [] },
      divide: { countLabel: '0', cards: [] },
      unclear: { countLabel: '0', cards: [] },
    },
    diagnostics: {
      survivalTest: {
        q1_crossSourceValue: false,
        q2_newRelationships: false,
        q3_beyondSummary: false,
        q4_trueEmergent: false,
        q5_tenSecondClarity: false,
        q6_noForcedLinks: true,
        q7_structurallyDifferent: false,
        notes: ['Deterministic pre-LLM trace only — live pipeline did not run.'],
      },
      rejectedRelationshipCount: 0,
      rejectedInsightCount: 0,
      clusterCount: 0,
      primaryClusterSourceCount: synthesisSourceIds.size,
      passesRun: ['deterministic_pre_llm'],
      pipelineStats: {
        sourcesCount: input.sources.length,
        inputSources: input.sources.length,
        relevantSources: synthesisSourceIds.size,
        excludedSources: 0,
        synthesizedSources: synthesisSourceIds.size,
        claimsExtracted: allClaims.length,
        relevantClaims: comparablePool.comparableClaims.length,
        funnelFinalUsable: funnel.funnel.finalUsable,
        topicRelevant: funnel.funnel.topicRelevant,
        comparableClaims: comparablePool.stats.comparable,
        generationEligible: generationClaims.length,
        candidatePairs: heuristic.all.length,
        directCandidates: heuristic.direct.length,
        semanticCandidates: heuristic.semantic.length,
        inferenceCandidates: heuristic.inference.length,
        possibleCrossSourcePairs: candidateFunnel.possibleCrossSourcePairs,
        participatingSourceCount: candidateFunnel.participatingSourceCount,
        verifiedRelationships: 0,
        rejectedRelationships: 0,
        emergentCandidates: 0,
        verifiedEmergentInsights: 0,
        discoveryPassesCompleted: ['deterministic_heuristic'],
        claimsPrimaryTier: funnel.funnel.primaryTier,
        claimsSupportingTier: funnel.funnel.supportingTier,
        claimsPeripheralTier: funnel.funnel.peripheralTier,
        relationshipClusters: 0,
      },
      relevanceFunnel: funnel,
      claimRelevanceDiagnostics: funnel.diagnostics.slice(0, 150),
      pipelineWarnings,
      candidateFunnel,
      comparableClaimFunnel: comparablePool.stats,
      sourceParticipation,
      verificationDiagnosticsBundle,
      evidenceCoverage,
    },
    createdAt: new Date().toISOString(),
  }

  const survivalDiagnostics = computeSurvivalDiagnostics(reasoning)
  reasoning.diagnostics = {
    ...survivalDiagnostics,
    candidateFunnel,
    comparableClaimFunnel: comparablePool.stats,
    sourceParticipation,
    verificationDiagnosticsBundle,
    evidenceCoverage,
  }
  return reasoning
}
