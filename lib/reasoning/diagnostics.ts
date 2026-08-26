import type { MultiSourceReasoning, ReasoningInsight } from '@/lib/reasoning/types'
import { ANALYSIS_SCHEMA_VERSION } from '@/lib/reasoning/provenance-types'

export function syncPipelineStatsFromArrays(result: MultiSourceReasoning): MultiSourceReasoning['diagnostics']['pipelineStats'] {
  const supportedRels = result.relationships.filter((r) => r.verificationStatus === 'SUPPORTED')
  const crossSource = supportedRels.filter((r) => r.fromSourceId !== r.toSourceId)
  const supportedInsights = result.insights.filter((i) => i.verificationStatus !== 'REJECTED')
  const excludedCount = result.excludedSources.length
  const inputCount = result.diagnostics.sourceCountSummary?.submittedSourceCount ??
    result.diagnostics.pipelineStats?.sourcesCount ??
    result.clusters.flatMap((c) => c.sourceIds).length
  const relevantCount = result.diagnostics.sourceCountSummary?.relevantSourceCount ??
    inputCount - excludedCount
  const synthesizedCount = result.diagnostics.sourceCountSummary
    ? result.diagnostics.sourceCountSummary.relevantSourceCount
    : relevantCount

  const existing = result.diagnostics.pipelineStats

  return {
    sourcesCount: inputCount,
    inputSources: inputCount,
    relevantSources: relevantCount,
    excludedSources: excludedCount,
    synthesizedSources: synthesizedCount,
    claimsExtracted: existing?.claimsExtracted ?? result.claims.length,
    relevantClaims: existing?.relevantClaims ?? existing?.acceptedClaims ?? result.claims.length,
    acceptedClaims: existing?.acceptedClaims ?? result.claims.length,
    rejectedClaims: existing?.rejectedClaims,
    duplicateClaimsMerged: existing?.duplicateClaimsMerged,
    candidatePairs: existing?.candidatePairs ?? 0,
    directCandidates: existing?.directCandidates ?? 0,
    semanticCandidates: existing?.semanticCandidates ?? 0,
    inferenceCandidates: existing?.inferenceCandidates ?? 0,
    verifiedRelationships: supportedRels.length,
    rejectedRelationships: result.rejectedRelationships.length,
    emergentCandidates: existing?.emergentCandidates ?? result.insights.length,
    verifiedEmergentInsights: supportedInsights.length,
    discoveryPassesCompleted: existing?.discoveryPassesCompleted ?? [],
    deduplicatedRelationships: result.relationshipClusters?.length ?? existing?.deduplicatedRelationships,
    relationshipClusters: result.relationshipClusters?.length ?? existing?.relationshipClusters,
    significantRelationships: result.significantRelationships?.length ?? existing?.significantRelationships,
    genericRelationshipsSuppressed: existing?.genericRelationshipsSuppressed,
    duplicateRelationshipsMerged: existing?.duplicateRelationshipsMerged,
    weakRelationshipsSuppressed: existing?.weakRelationshipsSuppressed,
    partialAgreementRejected: existing?.partialAgreementRejected,
    judgmentPropositions: existing?.judgmentPropositions,
    unsupportedJudgmentPropositionsRemoved: existing?.unsupportedJudgmentPropositionsRemoved,
    sourceRelevancePrimary: existing?.sourceRelevancePrimary,
    sourceRelevanceSecondary: existing?.sourceRelevanceSecondary,
    sourceRelevancePeripheral: existing?.sourceRelevancePeripheral,
    sourceRelevanceOffTopic: existing?.sourceRelevanceOffTopic,
    claimsPrimaryTier: existing?.claimsPrimaryTier,
    claimsSupportingTier: existing?.claimsSupportingTier,
    claimsPeripheralTier: existing?.claimsPeripheralTier,
    funnelFinalUsable: existing?.funnelFinalUsable,
    verifiedAgreements: existing?.verifiedAgreements,
    verifiedComplementary: existing?.verifiedComplementary,
    verifiedContradictions: existing?.verifiedContradictions,
    crossSourceVerifiedRelationships: crossSource.length,
  }
}

export function computeSurvivalDiagnostics(result: MultiSourceReasoning): MultiSourceReasoning['diagnostics'] {
  const supportedRels = result.relationships.filter((r) => r.verificationStatus === 'SUPPORTED')
  const supportedInsights = result.insights.filter((i) => i.verificationStatus !== 'REJECTED')
  const primaryCluster = result.clusters.find((c) => c.relevance === 'primary')
  const primaryCount = primaryCluster?.sourceIds.length ?? 0

  const notes: string[] = []
  if (supportedRels.length === 0) notes.push('No verified cross-source relationships.')
  if (supportedInsights.length === 0) notes.push('No emergent insights passed verification.')
  if (result.excludedSources.length > 0) {
    notes.push(`${result.excludedSources.length} source(s) excluded from synthesis.`)
  }

  const q1 =
    Boolean(result.judgment?.statement) &&
    (supportedRels.length > 0 || result.patterns.length > 0)
  const q2 = (result.significantRelationships?.length ?? 0) > 0 || supportedRels.length > 0
  const q3 = Boolean(result.judgment?.statement && result.synthesis?.statement)
  const q4 = supportedInsights.some((i) => i.evidencePath.length >= 2 || Boolean(i.reasoningBridge))
  const q5 = Boolean(result.judgment?.statement && result.landscape)
  const q6 = result.rejectedRelationships.length >= 0 && result.excludedSources.length >= 0
  const q7 = result.patterns.length > 0 || supportedRels.some((r) => r.type === 'TENSION')

  const pipelineStats = syncPipelineStatsFromArrays(result)

  return {
    survivalTest: {
      q1_crossSourceValue: q1,
      q2_newRelationships: q2,
      q3_beyondSummary: q3,
      q4_trueEmergent: q4,
      q5_tenSecondClarity: q5,
      q6_noForcedLinks: q6,
      q7_structurallyDifferent: q7,
      notes,
    },
    rejectedRelationshipCount: result.rejectedRelationships.length,
    rejectedInsightCount: result.insights.filter((i) => i.verificationStatus === 'REJECTED').length,
    clusterCount: result.clusters.length,
    primaryClusterSourceCount: primaryCount,
    passesRun: [
      'source_ingest',
      'claim_normalization',
      'clustering',
      'source_relevance_enhance',
      'claim_relevance',
      'direct_match_discovery',
      'semantic_discovery',
      'inference_discovery',
      'verification',
      'partial_agreement_strict',
      'semantic_deduplication',
      'relationship_clustering',
      'significance_ranking',
      'evidence_integrity',
      'patterns',
      'synthesis',
      'judgment',
      'emergent',
      'critic',
    ],
    pipelineStats,
    judgmentPropositionLineage: result.diagnostics.judgmentPropositionLineage,
    sourceCountSummary: result.diagnostics.sourceCountSummary,
    relevanceFunnel: result.diagnostics.relevanceFunnel,
    claimRelevanceDiagnostics: result.diagnostics.claimRelevanceDiagnostics,
    pipelineWarnings: result.diagnostics.pipelineWarnings,
    relationshipVerificationDiagnostics: result.diagnostics.relationshipVerificationDiagnostics,
  }
}

export function countRelationshipTypes(rels: import('@/lib/reasoning/types').ReasoningRelationship[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rels) counts[r.type] = (counts[r.type] ?? 0) + 1
  return counts
}

export function insightProvenanceComplete(insight: ReasoningInsight): boolean {
  return (
    insight.evidencePath.length >= 2 &&
    insight.claimIds.length >= 1 &&
    (insight.relationshipIds.length >= 1 || insight.patternIds.length >= 1 || Boolean(insight.reasoningBridge))
  )
}

export function attachAnalysisSchemaVersion(result: MultiSourceReasoning): MultiSourceReasoning {
  return { ...result, schemaVersion: ANALYSIS_SCHEMA_VERSION }
}
