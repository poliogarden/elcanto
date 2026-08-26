import {
  applyClaimQualityGate,
  buildLockedOffTopicSourceIds,
} from '@/lib/reasoning/claim-quality'
import {
  attachAnalysisSchemaVersion,
  computeSurvivalDiagnostics,
} from '@/lib/reasoning/diagnostics'
import { runEmergentQualityGate } from '@/lib/reasoning/emergent-gate'
import {
  filterInsightsForIntegrity,
  validateJudgmentGrounding,
} from '@/lib/reasoning/evidence-integrity'
import { deriveLandscapeFromEvidence } from '@/lib/reasoning/landscape-from-evidence'
import { computeJudgmentConfidence } from '@/lib/reasoning/judgment-confidence'
import {
  alignJudgmentPropositions,
  buildSourceCountSummary,
} from '@/lib/reasoning/judgment-lineage'
import { applyJudgmentGate, assessJudgmentGate } from '@/lib/reasoning/judgment-gate'
import {
  buildSynthesisAndJudgment,
  clusterSources,
  discoverPatterns,
  generateEmergentInsights,
  generateRelationshipCandidates,
  runCriticPass,
  verifyRelationships,
} from '@/lib/reasoning/llm-steps'
import {
  buildExcludedSources,
  resolveSynthesisSourceIds,
} from '@/lib/reasoning/relevance'
import { resolveClaimsThroughRelevanceFunnel } from '@/lib/reasoning/claim-relevance'
import {
  enrichClaimsForCrossSourceCandidates,
  evaluateCandidateCollapseWarning,
} from '@/lib/reasoning/candidate-funnel'
import { buildClaimTransitionDiagnostics } from '@/lib/reasoning/claim-transition'
import { buildSourceParticipationDiagnostics } from '@/lib/reasoning/source-participation'
import {
  compressVerifiedRelationships,
  memberRelationshipsFromClusters,
  representativeRelationships,
  strictifyPartialAgreements,
} from '@/lib/reasoning/relationship-compression'
import {
  countTiers,
  enhanceSourceRelevance,
  synthesisIdsFromEnhanced,
} from '@/lib/reasoning/source-relevance-enhance'
import { softenOvergeneralization } from '@/lib/reasoning/provenance'
import {
  filterHighSignalClaims,
  ingestSourceUnderstanding,
} from '@/lib/reasoning/source-ingest'
import type {
  ExcludedReasoningSource,
  MultiSourceReasoning,
  PipelineStats,
  ReasoningClaim,
  ReasoningProgressEvent,
} from '@/lib/reasoning/types'
import type { SourceAnalysis } from '@/lib/types/source'

const ENGINE_VERSION = 'reasoning-v2.1'

function buildInsufficientResult(input: {
  clustered: Awaited<ReturnType<typeof clusterSources>>
  sources: SourceAnalysis[]
  ingested: ReturnType<typeof ingestSourceUnderstanding>
  claims: ReasoningClaim[]
  excludedSources: ExcludedReasoningSource[]
  synthesisSourceIds: Set<string>
  gateReason: string
  pipelineStats?: PipelineStats
  relevanceFunnel?: import('@/lib/reasoning/claim-relevance').RelevanceFunnel
  claimRelevanceDiagnostics?: import('@/lib/reasoning/claim-relevance').ClaimRelevanceDiagnostic[]
  pipelineWarnings?: import('@/lib/reasoning/claim-relevance').PipelineWarning[]
}): MultiSourceReasoning {
  const {
    clustered,
    sources,
    ingested,
    claims,
    excludedSources,
    synthesisSourceIds,
    gateReason,
    pipelineStats,
    relevanceFunnel,
    claimRelevanceDiagnostics,
    pipelineWarnings,
  } = input

  return {
    mode: 'multi',
    version: ENGINE_VERSION,
    centralQuestion: clustered.centralQuestion,
    clusters: clustered.clusters,
    sourceRelevance: clustered.sourceRelevance,
    excludedSources,
    claims,
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
    knowledgeGaps: [],
    landscape: {
      agree: { countLabel: '0', cards: [] },
      divide: { countLabel: '0', cards: [] },
      unclear: { countLabel: String(synthesisSourceIds.size), cards: [] },
    },
    diagnostics: computeSurvivalDiagnostics({
      mode: 'multi',
      version: ENGINE_VERSION,
      centralQuestion: clustered.centralQuestion,
      clusters: clustered.clusters,
      sourceRelevance: clustered.sourceRelevance,
      excludedSources,
      claims,
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
          q5_tenSecondClarity: true,
          q6_noForcedLinks: true,
          q7_structurallyDifferent: false,
          notes: [gateReason],
        },
        rejectedRelationshipCount: 0,
        rejectedInsightCount: 0,
        clusterCount: clustered.clusters.length,
        primaryClusterSourceCount: synthesisSourceIds.size,
        passesRun: ['source_ingest', 'clustering'],
        pipelineStats,
        relevanceFunnel,
        claimRelevanceDiagnostics: claimRelevanceDiagnostics?.slice(0, 150),
        pipelineWarnings,
      },
      createdAt: new Date().toISOString(),
    }),
    createdAt: new Date().toISOString(),
  }
}

export async function runReasoningPipeline(input: {
  sources: SourceAnalysis[]
  voices: Array<{ channel: string; thumbnail?: string }>
  userQuestion?: string
  outputLanguage?: 'ko' | 'en'
  onProgress?: (event: ReasoningProgressEvent) => void
}): Promise<MultiSourceReasoning> {
  const { sources, voices, userQuestion, outputLanguage, onProgress } = input

  if (sources.length < 2) {
    throw new Error('Reasoning pipeline requires at least 2 videos.')
  }
  if (sources.length > 6) {
    throw new Error('Reasoning pipeline supports at most 6 videos.')
  }

  onProgress?.({ type: 'phase', phase: 'source_ingest', status: 'start' })
  const ingested = ingestSourceUnderstanding(sources)
  const allClaims = filterHighSignalClaims(ingested.claims)
  onProgress?.({ type: 'phase', phase: 'source_ingest', status: 'complete' })
  onProgress?.({
    type: 'log',
    message: `Ingested ${allClaims.length} claims from ${sources.length} sources`,
  })

  onProgress?.({ type: 'phase', phase: 'clustering', status: 'start' })
  const clustered = await clusterSources({ sources, userQuestion, outputLanguage })
  onProgress?.({ type: 'phase', phase: 'clustering', status: 'complete' })

  let synthesisSourceIds = resolveSynthesisSourceIds({
    sources,
    sourceRelevance: clustered.sourceRelevance,
    clusters: clustered.clusters,
  })

  let excludedSources = buildExcludedSources({
    sources,
    sourceRelevance: clustered.sourceRelevance,
    synthesisSourceIds,
    legacyExcluded: clustered.excluded,
    offTopicClusters: clustered.clusters.filter((c) => c.relevance === 'off_topic'),
  })

  let relevanceFunnel = resolveClaimsThroughRelevanceFunnel({
    allClaims,
    synthesisSourceIds,
    centralQuestion: clustered.centralQuestion,
    sourceRelevance: clustered.sourceRelevance,
    lockedOffTopicIds: new Set(),
  })
  let claims = relevanceFunnel.usableClaims
  let peripheralClaims = relevanceFunnel.peripheralClaims
  let claimRelevanceDiagnostics = relevanceFunnel.diagnostics
  let pipelineWarnings = relevanceFunnel.warnings

  const offTopicClusters = clustered.clusters.filter((c) => c.relevance === 'off_topic')
  const lockedOffTopicIds = buildLockedOffTopicSourceIds({
    sourceRelevance: clustered.sourceRelevance,
    offTopicClusters,
    legacyExcluded: clustered.excluded,
  })

  const enhancedRelevance = enhanceSourceRelevance({
    sources,
    claims: allClaims.filter((c) => !lockedOffTopicIds.has(c.sourceId)),
    evidence: ingested.evidence,
    centralQuestion: clustered.centralQuestion,
    existing: clustered.sourceRelevance,
    lockedOffTopicIds,
  })
  const tierCounts = countTiers(enhancedRelevance)
  synthesisSourceIds = synthesisIdsFromEnhanced(enhancedRelevance)
  excludedSources = buildExcludedSources({
    sources,
    sourceRelevance: enhancedRelevance,
    synthesisSourceIds,
    legacyExcluded: clustered.excluded,
    offTopicClusters,
  })
  relevanceFunnel = resolveClaimsThroughRelevanceFunnel({
    allClaims,
    synthesisSourceIds,
    centralQuestion: clustered.centralQuestion,
    sourceRelevance: enhancedRelevance,
    lockedOffTopicIds,
  })
  claims = relevanceFunnel.usableClaims
  peripheralClaims = relevanceFunnel.peripheralClaims
  claimRelevanceDiagnostics = relevanceFunnel.diagnostics
  pipelineWarnings = relevanceFunnel.warnings

  const funnelFinalUsable = claims.length
  const usableClaimIds = new Set(claims.map((c) => c.id))
  const preQualityUsableClaims = [...claims]

  const claimQuality = applyClaimQualityGate({
    claims,
    evidence: ingested.evidence,
    excludedSourceIds: new Set(excludedSources.map((e) => e.sourceId)),
    centralQuestion: clustered.centralQuestion,
  })
  claims = claimQuality.accepted

  const fidelityByClaimId = new Map(
    claimQuality.fidelityRecords.map((r) => [
      r.claimId,
      {
        status: r.status,
        mutations: r.mutations,
        scope: r.scope,
        strength: r.strength,
        evidenceText: r.evidenceText,
      },
    ]),
  )

  const postQualityWarnings = [...pipelineWarnings]
  const qualityCollapseRatio =
    allClaims.length > 0 ? claims.length / allClaims.length : 0
  if (
    (allClaims.length >= 20 &&
      qualityCollapseRatio < 0.05 &&
      synthesisSourceIds.size >= 2) ||
    (funnelFinalUsable >= 10 &&
      claims.length <= 1 &&
      synthesisSourceIds.size >= 2)
  ) {
    postQualityWarnings.push({
      code: 'ABNORMAL_RELEVANCE_COLLAPSE',
      message: `Relevance collapse: ${allClaims.length} extracted → ${funnelFinalUsable} funnel-usable → ${claims.length} quality-accepted (${synthesisSourceIds.size} synthesis sources).`,
      extractedClaims: allClaims.length,
      relevantClaims: claims.length,
      relevantSources: synthesisSourceIds.size,
    })
  }
  pipelineWarnings = postQualityWarnings

  const pipelineStats: PipelineStats = {
    sourcesCount: sources.length,
    claimsExtracted: allClaims.length,
    relevantClaims: claims.length,
    acceptedClaims: claimQuality.accepted.length,
    rejectedClaims: claimQuality.stats.rejected,
    duplicateClaimsMerged: claimQuality.stats.duplicatesMerged,
    funnelFinalUsable,
    claimsPrimaryTier: relevanceFunnel.funnel.primaryTier,
    claimsSupportingTier: relevanceFunnel.funnel.supportingTier,
    claimsPeripheralTier: relevanceFunnel.funnel.peripheralTier,
    candidatePairs: 0,
    directCandidates: 0,
    semanticCandidates: 0,
    inferenceCandidates: 0,
    verifiedRelationships: 0,
    rejectedRelationships: 0,
    emergentCandidates: 0,
    verifiedEmergentInsights: 0,
    discoveryPassesCompleted: [],
    sourceRelevancePrimary: tierCounts.PRIMARY,
    sourceRelevanceSecondary: tierCounts.SECONDARY,
    sourceRelevancePeripheral: tierCounts.PERIPHERAL,
    sourceRelevanceOffTopic: tierCounts.OFF_TOPIC,
  }

  const gate = assessJudgmentGate({
    synthesisSourceCount: synthesisSourceIds.size,
    claims,
    relationships: [],
    patternsCount: 0,
  })

  if (!gate.canGenerate || synthesisSourceIds.size < 2) {
    const reason =
      synthesisSourceIds.size < 2
        ? `Only ${synthesisSourceIds.size} relevant source(s) — need at least 2 for cross-source synthesis.`
        : gate.reason
    onProgress?.({ type: 'log', message: reason })
    return buildInsufficientResult({
      clustered: { ...clustered, sourceRelevance: enhancedRelevance },
      sources,
      ingested,
      claims,
      excludedSources,
      synthesisSourceIds,
      gateReason: reason,
      pipelineStats,
      relevanceFunnel,
      claimRelevanceDiagnostics,
      pipelineWarnings,
    })
  }

  onProgress?.({ type: 'phase', phase: 'alignment', status: 'start' })
  onProgress?.({ type: 'phase', phase: 'alignment', status: 'complete' })

  onProgress?.({ type: 'phase', phase: 'relationships', status: 'start' })
  const claimsForCandidates = enrichClaimsForCrossSourceCandidates({
    acceptedClaims: claims,
    supplementalClaims: peripheralClaims,
    synthesisSourceIds,
    minPerSource: 2,
    maxTotal: 24,
  })
  const claimTransitionDiagnostics = buildClaimTransitionDiagnostics({
    allClaims,
    usableClaimIds,
    relevanceDiagnostics: claimRelevanceDiagnostics,
    qualityAcceptedIds: new Set(claimQuality.accepted.map((c) => c.id)),
    qualityRejected: claimQuality.rejected,
    generationClaimIds: new Set(claimsForCandidates.claims.map((c) => c.id)),
    fidelityByClaimId,
  })
  const {
    candidates,
    stats,
    funnel: candidateFunnel,
    generationDiagnostics,
  } = await generateRelationshipCandidates({
    claims: claimsForCandidates.claims,
    outputLanguage,
    claimsAfterRelevance: funnelFinalUsable,
  })
  pipelineStats.candidatePairs = stats.candidatePairs
  pipelineStats.directCandidates = stats.directCandidates
  pipelineStats.semanticCandidates = stats.semanticCandidates
  pipelineStats.inferenceCandidates = stats.inferenceCandidates
  if (stats.bridgeCandidates != null) {
    pipelineStats.bridgeCandidates = stats.bridgeCandidates
  }
  pipelineStats.possibleCrossSourcePairs = candidateFunnel.possibleCrossSourcePairs
  pipelineStats.participatingSourceCount = candidateFunnel.participatingSourceCount
  pipelineStats.discoveryPassesCompleted = [
    'direct_match',
    'semantic_relationship',
    'topic_bridge',
    'cross_source_inference',
    'llm_enrichment',
  ]
  const collapseWarning = evaluateCandidateCollapseWarning(candidateFunnel)
  if (collapseWarning) {
    pipelineWarnings = [...pipelineWarnings, collapseWarning]
  }
  onProgress?.({ type: 'phase', phase: 'relationships', status: 'complete' })
  onProgress?.({
    type: 'log',
    message: `${candidates.length} candidates (direct:${stats.directCandidates} semantic:${stats.semanticCandidates} inference:${stats.inferenceCandidates} possible:${candidateFunnel.possibleCrossSourcePairs} sources:${candidateFunnel.participatingSourceCount})`,
  })

  onProgress?.({ type: 'phase', phase: 'verification', status: 'start' })
  let { verified, rejected, verificationDiagnostics } = await verifyRelationships({
    claims: claimsForCandidates.claims,
    candidates,
    outputLanguage,
  })

  const partialStrict = strictifyPartialAgreements({ verified, rejected, claims })
  verified = partialStrict.verified
  rejected = partialStrict.rejected
  pipelineStats.partialAgreementRejected = partialStrict.partialRejected

  pipelineStats.verifiedRelationships = verified.length
  pipelineStats.rejectedRelationships = rejected.length
  pipelineStats.verifiedAgreements = verified.filter(
    (r) => r.type === 'AGREEMENT' || r.type === 'PARTIAL_AGREEMENT',
  ).length
  pipelineStats.verifiedComplementary = verified.filter(
    (r) =>
      r.type === 'COMPLEMENTARY' ||
      r.type === 'MECHANISM_OUTCOME' ||
      r.type === 'PROBLEM_SOLUTION' ||
      r.type === 'CAUSE_EFFECT',
  ).length
  pipelineStats.verifiedContradictions = verified.filter(
    (r) => r.type === 'CONTRADICTION' || r.type === 'TENSION' || r.type === 'TRADE_OFF',
  ).length
  onProgress?.({ type: 'phase', phase: 'verification', status: 'complete' })
  onProgress?.({
    type: 'log',
    message: `Verified ${verified.length}, rejected ${rejected.length}`,
  })

  onProgress?.({ type: 'log', message: 'Semantic deduplication and clustering…' })
  const compressed = compressVerifiedRelationships({
    verified,
    claims,
    evidence: ingested.evidence,
    centralQuestion: clustered.centralQuestion,
  })
  pipelineStats.deduplicatedRelationships = compressed.stats.deduplicatedRelationships
  pipelineStats.normalizedPropositions = compressed.stats.normalizedPropositions
  pipelineStats.relationshipClusters = compressed.stats.relationshipClusters
  pipelineStats.significantRelationships = compressed.stats.significantRelationships
  pipelineStats.genericRelationshipsSuppressed = compressed.stats.genericRelationshipsSuppressed
  pipelineStats.duplicateRelationshipsMerged = compressed.stats.duplicateRelationshipsMerged
  pipelineStats.weakRelationshipsSuppressed = compressed.stats.weakRelationshipsSuppressed
  pipelineStats.partialAgreementRejected =
    (pipelineStats.partialAgreementRejected ?? 0) + compressed.stats.partialAgreementRejected

  const significantClusters = compressed.significantClusters
  const sourceParticipation = buildSourceParticipationDiagnostics({
    allClaims,
    relevanceUsableClaims: relevanceFunnel.usableClaims,
    qualityAcceptedClaims: claimQuality.accepted,
    generationClaims: claimsForCandidates.claims,
    candidates,
    verified,
    significantClusters,
    relevantSourceIds: [...synthesisSourceIds],
  })
  const displayRelationships = representativeRelationships(significantClusters, verified)
  const patternInputRels =
    significantClusters.length > 0
      ? memberRelationshipsFromClusters(significantClusters, verified)
      : verified

  onProgress?.({
    type: 'log',
    message: `Clusters: ${compressed.clusters.length}, significant: ${significantClusters.length}`,
  })

  onProgress?.({ type: 'phase', phase: 'patterns', status: 'start' })
  const patterns = await discoverPatterns({
    claims,
    relationships: patternInputRels,
    centralQuestion: clustered.centralQuestion,
    outputLanguage,
  })
  onProgress?.({ type: 'phase', phase: 'patterns', status: 'complete' })

  const postGate = assessJudgmentGate({
    synthesisSourceCount: synthesisSourceIds.size,
    claims,
    relationships: displayRelationships,
    patternsCount: patterns.length,
  })

  onProgress?.({ type: 'phase', phase: 'synthesis', status: 'start' })
  let { synthesis, judgment, landscape, knowledgeGaps } = await buildSynthesisAndJudgment({
    centralQuestion: clustered.centralQuestion,
    claims,
    relationships: displayRelationships,
    patterns,
    excludedCount: excludedSources.length,
    outputLanguage,
  })
  onProgress?.({ type: 'phase', phase: 'synthesis', status: 'complete' })
  onProgress?.({ type: 'phase', phase: 'judgment', status: 'complete' })

  landscape = deriveLandscapeFromEvidence({
    significantClusters,
    knowledgeGaps,
  })

  const propositionAligned = alignJudgmentPropositions({
    judgment,
    synthesis,
    significantClusters,
    patterns,
    insights: [],
    knowledgeGaps,
    claims,
    evidence: ingested.evidence,
    verifiedRelationships: verified,
  })
  judgment = propositionAligned.judgment
  pipelineStats.unsupportedJudgmentPropositionsRemoved = propositionAligned.propositions.filter(
    (p) => p.supportStatus === 'UNSUPPORTED',
  ).length
  pipelineStats.judgmentPropositions = propositionAligned.propositions.filter(
    (p) => p.supportStatus !== 'UNSUPPORTED',
  ).length

  const grounded = validateJudgmentGrounding({
    judgment,
    significantClusters,
    patterns,
    knowledgeGaps,
    verifiedRelationships: verified,
  })
  judgment = grounded.judgment
  pipelineStats.unsupportedJudgmentPropositionsRemoved +=
    grounded.unsupportedRemoved

  judgment = applyJudgmentGate(judgment, postGate)
  if (!postGate.canGenerate) {
    judgment = null
    synthesis = null
  }

  onProgress?.({ type: 'phase', phase: 'emergent', status: 'start' })
  let insights = await generateEmergentInsights({
    claims,
    relationships: displayRelationships,
    patterns,
    judgment,
    outputLanguage,
  })
  pipelineStats.emergentCandidates = insights.length
  onProgress?.({ type: 'phase', phase: 'emergent', status: 'complete' })

  const significantRelIds = new Set(
    significantClusters.flatMap((c) => c.memberRelationshipIds),
  )
  const significantClusterIds = new Set(significantClusters.map((c) => c.id))
  const patternIds = new Set(patterns.map((p) => p.id))
  insights = filterInsightsForIntegrity({
    insights,
    significantClusterIds,
    significantRelationshipIds: significantRelIds,
    patternIds,
    knowledgeGaps,
  })

  onProgress?.({ type: 'phase', phase: 'critic', status: 'start' })
  const criticized = await runCriticPass({
    claims,
    relationships: displayRelationships,
    synthesis,
    judgment,
    insights,
    outputLanguage,
  })
  onProgress?.({ type: 'phase', phase: 'critic', status: 'complete' })

  let finalJudgment = applyJudgmentGate(criticized.judgment, postGate)
  if (!criticized.judgment) {
    finalJudgment = null
  }

  const finalGrounded = validateJudgmentGrounding({
    judgment: finalJudgment,
    significantClusters,
    patterns,
    knowledgeGaps,
    verifiedRelationships: verified,
  })
  finalJudgment = finalGrounded.judgment

  const finalPropositionAligned = alignJudgmentPropositions({
    judgment: finalJudgment,
    synthesis: criticized.synthesis,
    significantClusters,
    patterns,
    insights,
    knowledgeGaps,
    claims,
    evidence: ingested.evidence,
    verifiedRelationships: verified,
  })
  finalJudgment = finalPropositionAligned.judgment

  if (finalJudgment) {
    const confidenceResult = computeJudgmentConfidence({
      judgment: finalJudgment,
      significantClusters,
      relevantSourceCount: synthesisSourceIds.size,
      verifiedPairCount: verified.length,
      propositions: finalPropositionAligned.propositions,
      knowledgeGaps,
      centralQuestion: clustered.centralQuestion,
    })
    finalJudgment = {
      ...finalJudgment,
      confidence: confidenceResult.confidence,
    }
    pipelineStats.judgmentConfidenceScore = confidenceResult.factors?.finalScore
  }

  pipelineStats.synthesizedSources = synthesisSourceIds.size
  pipelineStats.inputSources = sources.length
  pipelineStats.relevantSources = sources.length - excludedSources.length
  pipelineStats.excludedSources = excludedSources.length

  const sourceCountSummary = buildSourceCountSummary({
    submittedSourceCount: sources.length,
    excludedSourceIds: excludedSources.map((e) => e.sourceId),
    relevantSourceIds: [...synthesisSourceIds],
  })

  insights = filterInsightsForIntegrity({
    insights: criticized.insights,
    significantClusterIds,
    significantRelationshipIds: significantRelIds,
    patternIds,
    knowledgeGaps,
  })

  const emergentGate = runEmergentQualityGate({
    insights,
    claimStatements: claims.map((c) => c.statement),
    knowledgeGaps,
    synthesizedSourceCount: synthesisSourceIds.size,
  })
  insights = emergentGate.accepted
  pipelineStats.rejectedEmergentInsights = emergentGate.rejected.length
  const rejectedEmergentCandidates = emergentGate.rejected

  if (finalJudgment) {
    finalJudgment = {
      ...finalJudgment,
      statement: softenOvergeneralization(
        finalJudgment.statement,
        synthesisSourceIds.size,
      ),
    }
  }

  pipelineStats.verifiedEmergentInsights = insights.length

  const result: MultiSourceReasoning = {
    mode: 'multi',
    version: ENGINE_VERSION,
    schemaVersion: 3,
    centralQuestion: clustered.centralQuestion,
    clusters: clustered.clusters,
    sourceRelevance: enhancedRelevance,
    excludedSources,
    claims,
    evidence: ingested.evidence,
    concepts: ingested.concepts,
    stances: ingested.stances,
    assumptions: ingested.assumptions,
    relationships: verified,
    rejectedRelationships: rejected,
    relationshipClusters: compressed.clusters,
    significantRelationships: significantClusters,
    patterns,
    synthesis: criticized.synthesis,
    judgment: finalJudgment,
    insights,
    rejectedEmergentCandidates,
    knowledgeGaps,
    landscape,
    diagnostics: {
      survivalTest: {
        q1_crossSourceValue: false,
        q2_newRelationships: false,
        q3_beyondSummary: false,
        q4_trueEmergent: false,
        q5_tenSecondClarity: false,
        q6_noForcedLinks: false,
        q7_structurallyDifferent: false,
        notes: criticized.notes,
      },
      rejectedRelationshipCount: rejected.length,
      rejectedInsightCount: 0,
      clusterCount: clustered.clusters.length,
      primaryClusterSourceCount: synthesisSourceIds.size,
      passesRun: [],
      pipelineStats,
      judgmentPropositionLineage: finalPropositionAligned.propositions,
      sourceCountSummary,
    },
    createdAt: new Date().toISOString(),
  }

  result.diagnostics = computeSurvivalDiagnostics(result)
  result.diagnostics.relevanceFunnel = relevanceFunnel
  result.diagnostics.claimRelevanceDiagnostics = claimRelevanceDiagnostics.slice(0, 150)
  result.diagnostics.pipelineWarnings = pipelineWarnings
  result.diagnostics.candidateFunnel = candidateFunnel
  result.diagnostics.candidateGenerationDiagnostics = generationDiagnostics?.slice(0, 50)
  result.diagnostics.sourceParticipation = sourceParticipation
  result.diagnostics.claimTransitionDiagnostics = claimTransitionDiagnostics.slice(0, 120)
  result.diagnostics.relationshipVerificationDiagnostics = verificationDiagnostics.slice(0, 50)
  return attachAnalysisSchemaVersion(result)
}
