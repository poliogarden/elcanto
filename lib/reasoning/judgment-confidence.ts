import type {
  ReasoningJudgment,
  ReasoningKnowledgeGap,
  ReasoningRelationship,
  RelationshipCluster,
} from '@/lib/reasoning/types'
import type { JudgmentPropositionLineage } from '@/lib/reasoning/judgment-lineage'

export type JudgmentConfidenceFactors = {
  sourceCoverage: number
  clusterStrength: number
  evidenceDiversity: number
  claimSpecificity: number
  tensionCoverage: number
  unsupportedPenalty: number
  pairInflationPenalty: number
  gapPenalty: number
  finalScore: number
}

export function computeJudgmentConfidence(input: {
  judgment: ReasoningJudgment | null
  significantClusters: RelationshipCluster[]
  relevantSourceCount: number
  verifiedPairCount: number
  verifiedRelationships?: ReasoningRelationship[]
  propositions: JudgmentPropositionLineage[]
  knowledgeGaps: ReasoningKnowledgeGap[]
  centralQuestion: string
  evidenceProfile?: import('@/lib/reasoning/judgment-evidence-profile').JudgmentEvidenceProfile
}): {
  confidence: ReasoningJudgment['confidence']
  factors: JudgmentConfidenceFactors | null
} {
  if (!input.judgment) return { confidence: 'low', factors: null }

  const finalProposition = input.propositions[0]
  if (finalProposition?.supportStatus === 'UNSUPPORTED') {
    return { confidence: 'low', factors: null }
  }

  const participatingSources = new Set(
    input.significantClusters.flatMap((c) => c.supportingSourceIds),
  )
  const sourceCoverage =
    input.relevantSourceCount > 0
      ? Math.min(1, participatingSources.size / input.relevantSourceCount)
      : 0

  const clusterStrength =
    input.significantClusters.length > 0
      ? input.significantClusters.reduce((sum, c) => sum + c.significanceScore, 0) /
        input.significantClusters.length
      : 0

  const evidenceDiversity = Math.min(
    1,
    input.significantClusters.reduce((sum, c) => sum + c.evidenceCount, 0) / 8,
  )

  const claimSpecificity =
    input.significantClusters.length > 0
      ? input.significantClusters.reduce(
          (sum, c) => sum + (1 - c.genericnessScore),
          0,
        ) / input.significantClusters.length
      : 0

  const hasDivide = input.significantClusters.some(
    (c) => c.visualKind === 'divide' || c.visualKind === 'trade-off',
  )
  const tensionCoverage = hasDivide ? 0.15 : 0

  const unsupportedCount = input.propositions.filter(
    (p) => p.supportStatus === 'UNSUPPORTED',
  ).length
  const unsupportedPenalty = Math.min(0.35, unsupportedCount * 0.12)

  const totalPairs = input.significantClusters.reduce(
    (sum, c) => sum + c.memberRelationshipIds.length,
    0,
  )
  const pairInflationPenalty =
    input.significantClusters.length > 0 && totalPairs > input.significantClusters.length * 2
      ? Math.min(0.25, (totalPairs / input.significantClusters.length - 2) * 0.08)
      : 0

  const gapPenalty = Math.min(0.2, input.knowledgeGaps.length * 0.04)

  const verifiedRelationships = input.verifiedRelationships ?? []
  const relationshipConfidenceScore =
    verifiedRelationships.length > 0
      ? verifiedRelationships.reduce(
          (sum, r) =>
            sum +
            (r.confidence === 'strong' ? 1 : r.confidence === 'moderate' ? 0.55 : 0.25),
          0,
        ) / verifiedRelationships.length
      : 0

  const relationshipCoverage =
    input.relevantSourceCount > 0
      ? Math.min(1, input.verifiedPairCount / input.relevantSourceCount)
      : 0

  const finalScore =
    sourceCoverage * 0.24 +
    clusterStrength * 0.22 +
    evidenceDiversity * 0.1 +
    claimSpecificity * 0.14 +
    relationshipConfidenceScore * 0.14 +
    relationshipCoverage * 0.1 +
    tensionCoverage -
    unsupportedPenalty -
    pairInflationPenalty -
    gapPenalty

  let confidence: ReasoningJudgment['confidence'] = 'low'
  if (
    finalScore >= 0.62 &&
    sourceCoverage >= 0.66 &&
    unsupportedCount === 0 &&
    relationshipConfidenceScore >= 0.55 &&
    relationshipCoverage >= 0.5
  ) {
    confidence = 'high'
  } else if (finalScore >= 0.38) {
    confidence = 'moderate'
  }

  const supportCeiling =
    Math.min(sourceCoverage, relationshipCoverage, relationshipConfidenceScore + 0.05, clusterStrength)
  if (confidence === 'high' && supportCeiling < 0.62) confidence = 'moderate'
  if (confidence === 'moderate' && supportCeiling < 0.35) confidence = 'low'
  if (unsupportedCount > 0) confidence = 'low'
  if (finalProposition?.supportStatus === 'PARTIALLY_SUPPORTED' && confidence === 'high') {
    confidence = 'moderate'
  }

  if (input.evidenceProfile) {
    const ceiling = input.evidenceProfile.confidenceCeiling
    if (ceiling === 'LOW' || ceiling === 'WEAK') confidence = 'low'
    else if (ceiling === 'MODERATE' && confidence === 'high') confidence = 'moderate'
    else if (ceiling === 'HIGH') {
      // keep computed confidence
    }
    if (
      input.evidenceProfile.participatingSources < input.evidenceProfile.totalSources &&
      confidence === 'high'
    ) {
      confidence = 'moderate'
    }
  }

  return {
    confidence,
    factors: {
      sourceCoverage,
      clusterStrength,
      evidenceDiversity,
      claimSpecificity,
      tensionCoverage,
      unsupportedPenalty,
      pairInflationPenalty,
      gapPenalty,
      finalScore,
    },
  }
}
