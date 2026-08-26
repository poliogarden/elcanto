import type {
  ReasoningJudgment,
  ReasoningKnowledgeGap,
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
  propositions: JudgmentPropositionLineage[]
  knowledgeGaps: ReasoningKnowledgeGap[]
  centralQuestion: string
}): {
  confidence: ReasoningJudgment['confidence']
  factors: JudgmentConfidenceFactors | null
} {
  if (!input.judgment) return { confidence: 'low', factors: null }

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

  const finalScore =
    sourceCoverage * 0.28 +
    clusterStrength * 0.28 +
    evidenceDiversity * 0.12 +
    claimSpecificity * 0.18 +
    tensionCoverage -
    unsupportedPenalty -
    pairInflationPenalty -
    gapPenalty

  let confidence: ReasoningJudgment['confidence'] = 'low'
  if (finalScore >= 0.62 && sourceCoverage >= 0.66 && unsupportedCount === 0) {
    confidence = 'high'
  } else if (finalScore >= 0.38) {
    confidence = 'moderate'
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
