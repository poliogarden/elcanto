import {
  ANALYSIS_SCHEMA_VERSION,
  type ClaimProvenance,
  type EvidenceRef,
  type JudgmentProvenance,
  type RelationshipProvenance,
} from '@/lib/reasoning/provenance-types'
import {
  evidenceRefsForClaim,
  isCrossSourceRelationship,
  reasoningLevelForClaim,
  reasoningLevelForJudgment,
  reasoningLevelForRelationship,
} from '@/lib/reasoning/provenance'
import type {
  MultiSourceReasoning,
  ReasoningClaim,
  ReasoningRelationship,
} from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export type AnalysisSourceEntry = {
  sourceId: string
  videoId: string
  voiceIndex: number
  title: string
  relevanceTier?: string
}

export type AnalysisCounts = {
  inputSources: number
  relevantSources: number
  excludedSources: number
  synthesizedSources: number
  extractedClaims: number
  relevantClaims: number
  displayedClaims: number
  candidatePairs: number
  semanticCandidates: number
  verifiedRelationships: number
  crossSourceVerifiedRelationships: number
  significantRelationships: number
  relationshipClusters: number
  displayedRelationships: number
  patterns: number
  emergentInsights: number
  rejectedRelationships: number
  rejectedEmergentInsights: number
  knowledgeGaps: number
}

export type AnalysisResult = {
  schemaVersion: typeof ANALYSIS_SCHEMA_VERSION
  analysisId: string
  question: string
  sources: {
    input: AnalysisSourceEntry[]
    relevant: AnalysisSourceEntry[]
    excluded: AnalysisSourceEntry[]
    synthesized: AnalysisSourceEntry[]
  }
  counts: AnalysisCounts
  claims: ReasoningClaim[]
  verifiedRelationships: ReasoningRelationship[]
  rejectedRelationships: ReasoningRelationship[]
  displayedClaims: ReasoningClaim[]
  displayedRelationships: ReasoningRelationship[]
  claimProvenance: Record<string, ClaimProvenance>
  relationshipProvenance: Record<string, RelationshipProvenance>
  judgmentProvenance: JudgmentProvenance | null
}

function sourceEntry(
  document: SynthesisDocument,
  sourceId: string,
  relevanceTier?: string,
): AnalysisSourceEntry | null {
  const voice = document.voices.find(
    (v) => (v.source?.sourceId ?? `source_${v.voice.n}`) === sourceId,
  )
  if (!voice) return null
  return {
    sourceId,
    videoId: voice.voice.youtubeId,
    voiceIndex: voice.voice.n,
    title: voice.voice.title,
    relevanceTier,
  }
}

export function supportedRelationships(reasoning: MultiSourceReasoning): ReasoningRelationship[] {
  return reasoning.relationships.filter((r) => r.verificationStatus === 'SUPPORTED')
}

export function crossSourceSupportedRelationships(
  reasoning: MultiSourceReasoning,
): ReasoningRelationship[] {
  return supportedRelationships(reasoning).filter(isCrossSourceRelationship)
}

export function buildAnalysisResult(
  reasoning: MultiSourceReasoning,
  document: SynthesisDocument,
): AnalysisResult {
  const excludedIds = new Set(reasoning.excludedSources.map((e) => e.sourceId))
  const inputIds = document.voices.map(
    (v) => v.source?.sourceId ?? `source_${v.voice.n}`,
  )
  const relevantIds = inputIds.filter((sid) => !excludedIds.has(sid))
  const synthesizedIds = relevantIds.filter((sid) => {
    const rel = reasoning.sourceRelevance?.find((r) => r.sourceId === sid)
    return !rel || rel.classification !== 'off_topic'
  })

  const input = inputIds
    .map((sid) => sourceEntry(document, sid))
    .filter((s): s is AnalysisSourceEntry => Boolean(s))
  const excluded = reasoning.excludedSources.map((e) => ({
    sourceId: e.sourceId,
    videoId: e.videoId,
    voiceIndex: e.voiceIndex,
    title: e.title,
    relevanceTier: 'off_topic',
  }))
  const relevant = relevantIds
    .map((sid) => {
      const tier = reasoning.sourceRelevance?.find((r) => r.sourceId === sid)?.classification
      return sourceEntry(document, sid, tier)
    })
    .filter((s): s is AnalysisSourceEntry => Boolean(s))
  const synthesized = synthesizedIds
    .map((sid) => {
      const tier = reasoning.sourceRelevance?.find((r) => r.sourceId === sid)?.classification
      return sourceEntry(document, sid, tier)
    })
    .filter((s): s is AnalysisSourceEntry => Boolean(s))

  const verified = supportedRelationships(reasoning)
  const crossSourceVerified = verified.filter(isCrossSourceRelationship)
  const significant = reasoning.significantRelationships ?? []
  const displayedRelationships =
    significant.length > 0
      ? verified.filter((r) =>
          significant.some((c) => c.memberRelationshipIds.includes(r.id)),
        )
      : crossSourceVerified

  const synthesizedSet = new Set(synthesizedIds)
  const displayedClaims = reasoning.claims.filter((c) => synthesizedSet.has(c.sourceId))

  const evidenceById = new Map(reasoning.evidence.map((e) => [e.id, e]))
  const claimProvenance: Record<string, ClaimProvenance> = {}
  for (const claim of displayedClaims) {
    claimProvenance[claim.id] = {
      sourceId: claim.sourceId,
      videoId: claim.videoId,
      voiceIndex: claim.voiceIndex,
      evidenceRefs: evidenceRefsForClaim(claim, evidenceById),
      relevanceTier: reasoning.sourceRelevance?.find((r) => r.sourceId === claim.sourceId)
        ?.classification,
      reasoningLevel: reasoningLevelForClaim(claim),
    }
  }

  const relationshipProvenance: Record<string, RelationshipProvenance> = {}
  for (const rel of verified) {
    const fromClaim = reasoning.claims.find((c) => c.id === rel.fromClaimId)
    const toClaim = reasoning.claims.find((c) => c.id === rel.toClaimId)
    const evidenceRefs: EvidenceRef[] = []
    if (fromClaim) evidenceRefs.push(...evidenceRefsForClaim(fromClaim, evidenceById))
    if (toClaim) evidenceRefs.push(...evidenceRefsForClaim(toClaim, evidenceById))
    relationshipProvenance[rel.id] = {
      claimIds: [rel.fromClaimId, rel.toClaimId],
      sourceIds: [rel.fromSourceId, rel.toSourceId],
      evidenceRefs,
      crossSource: isCrossSourceRelationship(rel),
      reasoningLevel: reasoningLevelForRelationship(rel),
    }
  }

  let judgmentProvenance: JudgmentProvenance | null = null
  if (reasoning.judgment) {
    const patternIds = reasoning.patterns.map((p) => p.id)
    const relIds = displayedRelationships.map((r) => r.id)
    const claimIds = [
      ...new Set(displayedRelationships.flatMap((r) => [r.fromClaimId, r.toClaimId])),
    ]
    judgmentProvenance = {
      reasoningLevel: reasoningLevelForJudgment(reasoning.judgment, synthesizedIds.length),
      basedOnRelationshipIds: relIds,
      basedOnPatternIds: patternIds,
      basedOnClaimIds: claimIds,
      sourceIds: [...new Set(displayedRelationships.flatMap((r) => [r.fromSourceId, r.toSourceId]))],
    }
  }

  const stats = reasoning.diagnostics.pipelineStats
  const counts: AnalysisCounts = {
    inputSources: input.length,
    relevantSources: relevant.length,
    excludedSources: excluded.length,
    synthesizedSources: synthesized.length,
    extractedClaims: stats?.claimsExtracted ?? reasoning.claims.length,
    relevantClaims: stats?.relevantClaims ?? displayedClaims.length,
    displayedClaims: displayedClaims.length,
    candidatePairs: stats?.candidatePairs ?? 0,
    semanticCandidates: stats?.semanticCandidates ?? 0,
    verifiedRelationships: verified.length,
    crossSourceVerifiedRelationships: crossSourceVerified.length,
    significantRelationships: significant.length,
    relationshipClusters: reasoning.relationshipClusters?.length ?? 0,
    displayedRelationships: displayedRelationships.length,
    patterns: reasoning.patterns.length,
    emergentInsights: reasoning.insights.filter((i) => i.verificationStatus !== 'REJECTED').length,
    rejectedRelationships: reasoning.rejectedRelationships.length,
    rejectedEmergentInsights: reasoning.insights.filter((i) => i.verificationStatus === 'REJECTED')
      .length,
    knowledgeGaps: reasoning.knowledgeGaps.length,
  }

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    analysisId: document.id,
    question: reasoning.centralQuestion,
    sources: { input, relevant, excluded, synthesized },
    counts,
    claims: reasoning.claims,
    verifiedRelationships: verified,
    rejectedRelationships: reasoning.rejectedRelationships,
    displayedClaims,
    displayedRelationships,
    claimProvenance,
    relationshipProvenance,
    judgmentProvenance,
  }
}
