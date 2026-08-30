import type { BenchmarkGoldRelationship, BenchmarkGoldExpectations } from '@/lib/reasoning/eval/benchmark-gold'
import { requiredGoldRelationships } from '@/lib/reasoning/eval/benchmark-gold'
import type { PipelineFunnelSnapshot } from '@/lib/reasoning/eval/blind-precision-recall'
import {
  computeGoldPrecisionRecall,
  normalizeBenchmarkRelationshipType,
  relationshipMatchesGold,
  type BenchmarkMetrics,
} from '@/lib/reasoning/eval/evaluate-benchmark'
import type { MultiSourceReasoning, ReasoningClaim, ReasoningRelationship } from '@/lib/reasoning/types'

export type FailureAttribution =
  | 'EXTRACTION_FAILURE'
  | 'EVIDENCE_FAILURE'
  | 'RELEVANCE_FAILURE'
  | 'GENERATION_ELIGIBILITY_FAILURE'
  | 'CANDIDATE_DISCOVERY_FAILURE'
  | 'RELATIONSHIP_VERIFICATION_FAILURE'
  | 'RELATIONSHIP_CLASSIFICATION_FAILURE'
  | 'JUDGMENT_GROUNDING_FAILURE'
  | 'STABILITY_FAILURE'
  | 'NONE'

export type PipelineHealthResult = 'PASS' | 'DEGRADED' | 'FAIL'
export type RelationshipQualityResult = 'PASS' | 'DEGRADED' | 'FAIL' | 'N/A'

export function assessPipelineHealth(
  funnel: PipelineFunnelSnapshot,
  metrics: BenchmarkMetrics,
  gold: BenchmarkGoldExpectations,
): PipelineHealthResult {
  const goldCount = requiredGoldRelationships(gold).length
  const collapse =
    funnel.relevanceUsable === 0 ||
    funnel.generationEligible === 0 ||
    (goldCount > 0 && funnel.candidatePairs === 0 && funnel.extractedClaims > 0)

  if (!metrics.evidenceIntegrityPass) return 'FAIL'
  if (collapse && goldCount > 0) return 'FAIL'
  if (
    funnel.generationEligible === 0 &&
    funnel.extractedClaims > 0 &&
    goldCount > 0
  ) {
    return 'DEGRADED'
  }
  if (metrics.aggregationInvariantFailures.length > 0) return 'DEGRADED'
  return 'PASS'
}

export function assessRelationshipQuality(
  pr: { precision: number | null; recall: number | null; falsePositive: number; falseNegative: number },
  gold: BenchmarkGoldExpectations,
): RelationshipQualityResult {
  const goldCount = requiredGoldRelationships(gold).length
  if (goldCount === 0 && pr.falsePositive === 0) return 'N/A'
  if (pr.falsePositive > 0) return 'FAIL'
  if (pr.recall !== null && gold.criticalRecall !== undefined && pr.recall < gold.criticalRecall) {
    return 'FAIL'
  }
  if (pr.precision !== null && gold.minPrecision !== undefined && pr.precision < gold.minPrecision) {
    return 'FAIL'
  }
  if (pr.falseNegative > 0) return 'FAIL'
  return 'PASS'
}

export function attributeFailure(
  reasoning: MultiSourceReasoning | null,
  gold: BenchmarkGoldExpectations,
  metrics: BenchmarkMetrics,
  funnel: PipelineFunnelSnapshot,
): { stage: FailureAttribution; detail: string } {
  if (!reasoning) {
    return { stage: 'EXTRACTION_FAILURE', detail: 'No reasoning output produced.' }
  }

  const claims = reasoning.claims ?? []
  const goldRels = requiredGoldRelationships(gold)
  if (goldRels.length === 0) return { stage: 'NONE', detail: 'No gold relationships required.' }

  const { missedGold } = computeGoldPrecisionRecall(
    reasoning.relationships ?? [],
    claims,
    gold,
  )
  if (missedGold === 0 && metrics.falseAgreement + metrics.falseDivide + metrics.falseComplementary === 0) {
    return { stage: 'NONE', detail: 'All gold relationships satisfied.' }
  }

  if (funnel.extractedClaims === 0) {
    return { stage: 'EXTRACTION_FAILURE', detail: 'Zero extracted claims.' }
  }
  if (funnel.evidenceSupportedClaims === 0) {
    return { stage: 'EVIDENCE_FAILURE', detail: 'No evidence-supported claims.' }
  }
  if (funnel.relevanceUsable === 0) {
    return { stage: 'RELEVANCE_FAILURE', detail: 'relevanceUsable=0' }
  }
  if (funnel.generationEligible === 0) {
    return { stage: 'GENERATION_ELIGIBILITY_FAILURE', detail: 'generationEligible=0' }
  }
  if (funnel.candidatePairs === 0) {
    return { stage: 'CANDIDATE_DISCOVERY_FAILURE', detail: 'candidatePairs=0' }
  }
  if (funnel.verifiedRelationships === 0) {
    const audit = reasoning.diagnostics?.verificationDiagnosticsBundle?.candidateAudit ?? []
    const goldAudit = audit.filter((row) => {
      const key = [row.sourceA, row.sourceB].sort().join('|')
      return goldRels.some((g) => [...g.sources].sort().join('|') === key)
    })
    if (goldAudit.some((r) => r.verificationStage === 'POST_LLM' || r.verificationStage === 'POST_HEURISTIC')) {
      return {
        stage: 'RELATIONSHIP_VERIFICATION_FAILURE',
        detail: goldAudit.map((r) => `${r.verificationRejectionReason ?? r.verificationResult}`).join('; '),
      }
    }
    return { stage: 'RELATIONSHIP_VERIFICATION_FAILURE', detail: 'Candidates existed but none verified.' }
  }

  if (metrics.falseAgreement + metrics.falseDivide + metrics.falseComplementary > 0) {
    return {
      stage: 'RELATIONSHIP_CLASSIFICATION_FAILURE',
      detail: `falseAgreement=${metrics.falseAgreement} falseDivide=${metrics.falseDivide} falseComplementary=${metrics.falseComplementary}`,
    }
  }

  if (missedGold > 0) {
    return {
      stage: 'RELATIONSHIP_CLASSIFICATION_FAILURE',
      detail: `missedGold=${missedGold}`,
    }
  }

  const unsupported = metrics.unsupportedPropositions
  if (unsupported > 0) {
    return { stage: 'JUDGMENT_GROUNDING_FAILURE', detail: `unsupportedPropositions=${unsupported}` }
  }

  return { stage: 'NONE', detail: 'Unattributed quality gap.' }
}

export type StabilityRun = {
  runIndex: number
  funnel: PipelineFunnelSnapshot
  relationshipIds: string[]
  verified: ReasoningRelationship[]
  claims: ReasoningClaim[]
}

export type GoldRelationshipStability = {
  goldKey: string
  sources: [string, string]
  expectedType: BenchmarkGoldRelationship['type']
  fromClaimPattern: string
  toClaimPattern: string
  detectedRuns: number
  totalRuns: number
  consistency: 'STABLE' | 'UNSTABLE' | 'FAIL'
  consistencyLabel: string
  typeDrift: boolean
  detectedTypesPerRun: string[]
}

export type StabilityAnalysis = {
  claimCountVariance: number
  generationEligibleVariance: number
  candidateVariance: number
  relationshipConsistency: string
  relationshipConsistencyScore: number
  judgmentConsistency: string
  goldRelationshipStability: GoldRelationshipStability[]
  falseRelationshipRuns: number
  falseRelationshipCount: number
  flags: Array<
    | 'CLAIM_POPULATION_DRIFT'
    | 'RELEVANCE_COLLAPSE'
    | 'CANDIDATE_COLLAPSE'
    | 'RELATIONSHIP_DRIFT'
    | 'JUDGMENT_DRIFT'
  >
  stable: boolean
}

function variance(nums: number[]): number {
  if (nums.length <= 1) return 0
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length
  return Math.round(nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length)
}

function judgmentProposition(judgment?: string): string {
  if (!judgment) return ''
  return judgment
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 8)
    .join(' ')
}

function goldRelationshipKey(gold: BenchmarkGoldRelationship): string {
  const sources = [...gold.sources].sort().join('|')
  return `${sources}:${gold.type}:${gold.fromClaimPattern}↔${gold.toClaimPattern}`
}

function goldConsistencyFromDetection(
  detectedRuns: number,
  totalRuns: number,
): { consistency: GoldRelationshipStability['consistency']; label: string; score: number } {
  if (totalRuns === 0) {
    return { consistency: 'STABLE', label: 'N/A', score: 3 }
  }
  if (detectedRuns === totalRuns) {
    return { consistency: 'STABLE', label: `${detectedRuns}/${totalRuns} = STABLE`, score: 3 }
  }
  if (totalRuns === 3 && detectedRuns === 2) {
    return { consistency: 'UNSTABLE', label: `${detectedRuns}/${totalRuns} = UNSTABLE`, score: 2 }
  }
  if (totalRuns === 3 && detectedRuns <= 1) {
    return { consistency: 'FAIL', label: `${detectedRuns}/${totalRuns} = FAIL`, score: 1 }
  }
  if (detectedRuns >= totalRuns - 1 && detectedRuns >= 2) {
    return { consistency: 'UNSTABLE', label: `${detectedRuns}/${totalRuns} = UNSTABLE`, score: 2 }
  }
  return { consistency: 'FAIL', label: `${detectedRuns}/${totalRuns} = FAIL`, score: 1 }
}

function findGoldMatch(
  verified: ReasoningRelationship[],
  gold: BenchmarkGoldRelationship,
  claims: ReasoningClaim[],
): ReasoningRelationship | undefined {
  return verified.find((rel) => relationshipMatchesGold(rel, gold, claims))
}

function nonGoldVerifiedRelationships(
  verified: ReasoningRelationship[],
  requiredGold: BenchmarkGoldRelationship[],
  claims: ReasoningClaim[],
): ReasoningRelationship[] {
  return verified.filter(
    (rel) => !requiredGold.some((g) => relationshipMatchesGold(rel, g, claims)),
  )
}

export function analyzeStability(
  runs: StabilityRun[],
  gold: BenchmarkGoldExpectations,
): StabilityAnalysis {
  const flags: StabilityAnalysis['flags'] = []
  const claimCounts = runs.map((r) => r.funnel.extractedClaims)
  const genEligible = runs.map((r) => r.funnel.generationEligible)
  const candidates = runs.map((r) => r.funnel.candidatePairs)
  const relevance = runs.map((r) => r.funnel.relevanceUsable)
  const totalRuns = runs.length

  const claimVar = variance(claimCounts)
  const genVar = variance(genEligible)
  const candVar = variance(candidates)

  if (Math.max(...claimCounts) - Math.min(...claimCounts) >= 2) {
    flags.push('CLAIM_POPULATION_DRIFT')
  }
  const relMax = Math.max(...relevance)
  const relMin = Math.min(...relevance)
  if (relMax > 0 && relMin === 0) flags.push('RELEVANCE_COLLAPSE')
  const candMax = Math.max(...candidates)
  const candMin = Math.min(...candidates)
  if (candMax >= 2 && candMin === 0 && genEligible.some((g) => g > 0)) {
    flags.push('CANDIDATE_COLLAPSE')
  }

  const relSets = runs.map((r) => r.relationshipIds.join(';;'))
  const uniqueRelSets = new Set(relSets)
  if (uniqueRelSets.size > 1) flags.push('RELATIONSHIP_DRIFT')

  const judgments = runs.map((r) => judgmentProposition(r.funnel.finalJudgment))
  const uniqueJudgments = new Set(judgments.filter(Boolean))
  if (uniqueJudgments.size > 1) flags.push('JUDGMENT_DRIFT')

  const requiredGold = requiredGoldRelationships(gold)
  const goldRelationshipStability: GoldRelationshipStability[] = []
  const goldScores: number[] = []

  for (const g of requiredGold) {
    let detectedRuns = 0
    const detectedTypesPerRun: string[] = []
    for (const run of runs) {
      const match = findGoldMatch(run.verified, g, run.claims)
      if (match) {
        detectedRuns++
        detectedTypesPerRun.push(normalizeBenchmarkRelationshipType(match.type))
      } else {
        detectedTypesPerRun.push('NONE')
      }
    }
    const uniqueDetectedTypes = new Set(
      detectedTypesPerRun.filter((t) => t !== 'NONE'),
    )
    const typeDrift = uniqueDetectedTypes.size > 1
    const { consistency, label, score } = goldConsistencyFromDetection(detectedRuns, totalRuns)
    goldScores.push(score)
    goldRelationshipStability.push({
      goldKey: goldRelationshipKey(g),
      sources: g.sources,
      expectedType: g.type,
      fromClaimPattern: g.fromClaimPattern,
      toClaimPattern: g.toClaimPattern,
      detectedRuns,
      totalRuns,
      consistency,
      consistencyLabel: label,
      typeDrift,
      detectedTypesPerRun,
    })
  }

  let falseRelationshipCount = 0
  let falseRelationshipRuns = 0
  for (const run of runs) {
    const falseRels = nonGoldVerifiedRelationships(run.verified, requiredGold, run.claims)
    if (falseRels.length > 0) {
      falseRelationshipRuns++
      falseRelationshipCount += falseRels.length
      if (!flags.includes('RELATIONSHIP_DRIFT')) flags.push('RELATIONSHIP_DRIFT')
    }
  }

  let relationshipConsistencyScore: number
  let relationshipConsistency: string

  if (requiredGold.length > 0) {
    relationshipConsistencyScore = Math.min(...goldScores)
    const labels = goldRelationshipStability.map((g) => `${g.goldKey}: ${g.consistencyLabel}`)
    relationshipConsistency = labels.join('; ')
  } else if (uniqueRelSets.size === 1) {
    relationshipConsistencyScore = 3
    relationshipConsistency = `${totalRuns}/${totalRuns} = STABLE (no gold required)`
  } else if (uniqueRelSets.size === 2 && totalRuns === 3) {
    relationshipConsistencyScore = 2
    relationshipConsistency = '2/3 = UNSTABLE (no gold required)'
  } else {
    relationshipConsistencyScore = 1
    relationshipConsistency = '1/3 or less = FAIL (no gold required)'
  }

  const judgmentConsistency =
    uniqueJudgments.size <= 1 ? 'STABLE' : uniqueJudgments.size === 2 ? 'UNSTABLE' : 'FAIL'

  const goldStabilityPass =
    requiredGold.length === 0 ||
    goldRelationshipStability.every((g) => g.consistency === 'STABLE')

  return {
    claimCountVariance: claimVar,
    generationEligibleVariance: genVar,
    candidateVariance: candVar,
    relationshipConsistency,
    relationshipConsistencyScore,
    judgmentConsistency,
    goldRelationshipStability,
    falseRelationshipRuns,
    falseRelationshipCount,
    flags,
    stable:
      flags.length === 0 &&
      goldStabilityPass &&
      relationshipConsistencyScore >= 2,
  }
}
