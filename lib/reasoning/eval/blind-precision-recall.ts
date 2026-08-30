import type { BenchmarkMetrics } from '@/lib/reasoning/eval/evaluate-benchmark'
import type { BenchmarkGoldExpectations } from '@/lib/reasoning/eval/benchmark-gold'
import { requiredGoldRelationships } from '@/lib/reasoning/eval/benchmark-gold'
import { computeGoldPrecisionRecall } from '@/lib/reasoning/eval/evaluate-benchmark'
import type { ReasoningClaim, ReasoningRelationship } from '@/lib/reasoning/types'

export type BlindPrecisionRecall = {
  goldRelationships: number
  predictedRelationships: number
  truePositive: number
  falsePositive: number
  falseNegative: number
  precision: number | null
  recall: number | null
  precisionLabel: string
  recallLabel: string
}

export function computeBlindPrecisionRecall(
  verified: ReasoningRelationship[],
  claims: ReasoningClaim[],
  gold: BenchmarkGoldExpectations,
  metrics: BenchmarkMetrics,
): BlindPrecisionRecall {
  const scoped = verified.filter((r) => {
    const t = r.type.toUpperCase()
    return t === 'AGREEMENT' || t === 'PARTIAL_AGREEMENT' || t === 'COMPLEMENTARY' ||
      t === 'CONTRADICTION' || t === 'DIVIDE' || t === 'DISAGREEMENT'
  })
  const goldRels = requiredGoldRelationships(gold)
  const { missedGold } = computeGoldPrecisionRecall(verified, claims, gold)

  const goldCount = goldRels.length
  const predictedCount = scoped.length
  const truePositive = goldCount - missedGold
  const falseNegative = missedGold
  const falsePositive =
    metrics.falseAgreement + metrics.falseDivide + metrics.falseComplementary

  let precision: number | null = null
  let recall: number | null = null
  let precisionLabel = 'N/A — no predicted relationships'
  let recallLabel = 'N/A — no gold relationships'

  if (predictedCount === 0 && goldCount === 0) {
    precisionLabel = 'N/A — no predicted relationships'
    recallLabel = 'N/A — no gold relationships'
  } else if (predictedCount === 0) {
    recall = goldCount > 0 ? 0 : null
    recallLabel = goldCount > 0 ? '0' : 'N/A — no gold relationships'
  } else if (goldCount === 0) {
    const denom = truePositive + falsePositive
    precision = denom > 0 ? truePositive / denom : 0
    precisionLabel = `${precision}`
    recallLabel = 'N/A — no gold relationships'
  } else {
    const precDenom = truePositive + falsePositive
    const recDenom = truePositive + falseNegative
    precision = precDenom > 0 ? truePositive / precDenom : null
    recall = recDenom > 0 ? truePositive / recDenom : null
    precisionLabel = precision !== null ? `${precision}` : 'N/A'
    recallLabel = recall !== null ? `${recall}` : 'N/A'
  }

  return {
    goldRelationships: goldCount,
    predictedRelationships: predictedCount,
    truePositive,
    falsePositive,
    falseNegative,
    precision,
    recall,
    precisionLabel,
    recallLabel,
  }
}

export type PipelineFunnelSnapshot = {
  extractedClaims: number
  evidenceSupportedClaims: number
  relevanceUsable: number
  generationEligible: number
  candidatePairs: number
  verifiedRelationships: number
  agreement: number
  divide: number
  complementary: number
  finalJudgment?: string
  judgmentConfidence: string
}

export function extractPipelineFunnel(metrics: BenchmarkMetrics): PipelineFunnelSnapshot {
  return {
    extractedClaims: metrics.totalExtractedClaims,
    evidenceSupportedClaims: metrics.evidenceSupportedClaims,
    relevanceUsable: metrics.relevanceUsable,
    generationEligible: metrics.generationEligible,
    candidatePairs: metrics.candidates,
    verifiedRelationships: metrics.verified,
    agreement: metrics.agreement,
    divide: metrics.divide,
    complementary: metrics.complementary,
    finalJudgment: metrics.finalJudgment,
    judgmentConfidence: metrics.judgmentConfidence,
  }
}

function normalizeType(type: string): string {
  const t = type.toUpperCase()
  if (t === 'CONTRADICTION' || t === 'DIVIDE' || t === 'DISAGREEMENT') return 'DIVIDE'
  if (t === 'PARTIAL_AGREEMENT') return 'AGREEMENT'
  return t
}

export function relationshipIdentitySet(verified: ReasoningRelationship[]): string[] {
  return verified
    .map((rel) => {
      const sources = [rel.fromSourceId, rel.toSourceId].sort().join('|')
      return `${sources}:${normalizeType(rel.type)}:${rel.fromClaimId}:${rel.toClaimId}`
    })
    .sort()
}
