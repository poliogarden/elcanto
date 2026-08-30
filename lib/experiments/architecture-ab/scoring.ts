import type {
  ArchitectureAResult,
  ArchitectureBResult,
  DimensionScores,
  AbSetType,
} from '@/lib/experiments/architecture-ab/types'

const WEIGHTS = {
  questionAnswerQuality: 0.2,
  crossSourceValue: 0.15,
  importantRelationshipRecall: 0.15,
  evidenceGrounding: 0.15,
  relationshipPrecision: 0.1,
  finalJudgmentQuality: 0.1,
  noForcedRelationship: 0.05,
  clarity: 0.05,
  latency: 0.025,
  cost: 0.025,
}

function clamp(n: number, min = 1, max = 5): number {
  return Math.max(min, Math.min(max, n))
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3))
  const tb = b.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
  if (ta.size === 0 || tb.length === 0) return 0
  let hit = 0
  for (const w of tb) if (ta.has(w)) hit++
  return hit / tb.length
}

function scoreTextQuality(text: string | null, question: string): number {
  if (!text) return 1
  const overlap = tokenOverlap(text, question)
  const len = text.length
  const clarity = len > 40 && len < 1200 ? 4 : 3
  return clamp(2 + overlap * 3 + (clarity === 4 ? 0.5 : 0))
}

function recallScore(
  setType: AbSetType,
  agreement: number,
  divide: number,
  complementary: number,
  goodZero: boolean,
): number {
  switch (setType) {
    case 'agreement':
      return agreement >= 1 ? 5 : goodZero ? 2 : 1
    case 'divide':
      return divide >= 1 ? 5 : 2
    case 'complementary':
      return complementary >= 1 ? 5 : agreement + divide >= 1 ? 3 : 2
    case 'mixed':
    case 'mismatch':
      return goodZero && agreement + divide + complementary <= 1 ? 5 : agreement + divide > 2 ? 2 : 3
    case 'complex':
      return agreement + divide + complementary >= 1 ? 4 : 2
    default:
      return 3
  }
}

function noForcedScore(
  setType: AbSetType,
  totalRels: number,
  goodZero: boolean,
): number {
  if (setType === 'mixed' || setType === 'mismatch') {
    if (goodZero && totalRels <= 1) return 5
    if (totalRels > 2) return 1
    return 3
  }
  if (totalRels > 8) return 2
  return 4
}

export function scoreArchitectureA(
  result: ArchitectureAResult,
  setType: AbSetType,
  baselineMs: number,
  baselineCost: number,
): DimensionScores {
  const text = result.judgmentStatement ?? result.synthesisSummary ?? ''
  const totalRels = result.agreementCount + result.divideCount + result.complementaryCount
  const precision =
    totalRels > 0 ? result.verifiedRelationshipCount / (totalRels + result.rejectedRelationshipCount) : 1

  return {
    questionAnswerQuality: scoreTextQuality(text, result.centralQuestion),
    crossSourceValue: clamp(2 + Math.min(totalRels, 3)),
    agreementAccuracy: setType === 'agreement' ? clamp(result.agreementCount * 2 + 2) : 3,
    divideAccuracy: setType === 'divide' ? clamp(result.divideCount * 2 + 2) : 3,
    importantRelationshipRecall: recallScore(
      setType,
      result.agreementCount,
      result.divideCount,
      result.complementaryCount,
      result.goodZero,
    ),
    evidenceGrounding: clamp(2 + precision * 3),
    noForcedRelationship: noForcedScore(setType, totalRels, result.goodZero),
    finalJudgmentQuality: scoreTextQuality(text, result.centralQuestion),
    clarity: text.length > 30 && text.length < 900 ? 4 : 3,
    userValue: clamp(
      scoreTextQuality(text, result.centralQuestion) +
        (totalRels > 0 ? 0.5 : result.goodZero ? 0.3 : -0.5),
    ),
  }
}

export function scoreArchitectureB(
  result: ArchitectureBResult,
  setType: AbSetType,
  baselineMs: number,
  baselineCost: number,
): DimensionScores {
  const totalRels = result.agreementCount + result.divideCount + result.complementaryCount
  const precision = result.evidencePrecision

  return {
    questionAnswerQuality: scoreTextQuality(result.finalAnswer, result.centralQuestion),
    crossSourceValue: clamp(2 + Math.min(totalRels, 3)),
    agreementAccuracy: setType === 'agreement' ? clamp(result.agreementCount * 2 + 2) : 3,
    divideAccuracy: setType === 'divide' ? clamp(result.divideCount * 2 + 2) : 3,
    importantRelationshipRecall: recallScore(
      setType,
      result.agreementCount,
      result.divideCount,
      result.complementaryCount,
      result.goodZero,
    ),
    evidenceGrounding: clamp(2 + precision * 3 - result.hallucinationCount * 0.5),
    noForcedRelationship: noForcedScore(setType, totalRels, result.goodZero),
    finalJudgmentQuality: scoreTextQuality(result.finalAnswer, result.centralQuestion),
    clarity: result.finalAnswer.length > 30 && result.finalAnswer.length < 900 ? 4 : 3,
    userValue: clamp(
      scoreTextQuality(result.finalAnswer, result.centralQuestion) +
        (totalRels > 0 ? 0.5 : result.goodZero ? 0.3 : -0.5) -
        result.hallucinationCount * 0.3,
    ),
  }
}

export function weightedProductScore(scores: DimensionScores, latencyMs: number, costUsd: number): number {
  const latencyScore = latencyMs < 60000 ? 5 : latencyMs < 120000 ? 4 : 3
  const costScore = costUsd < 0.05 ? 5 : costUsd < 0.15 ? 4 : 3

  return (
    scores.questionAnswerQuality * WEIGHTS.questionAnswerQuality +
    scores.crossSourceValue * WEIGHTS.crossSourceValue +
    scores.importantRelationshipRecall * WEIGHTS.importantRelationshipRecall +
    scores.evidenceGrounding * WEIGHTS.evidenceGrounding +
    ((scores.agreementAccuracy + scores.divideAccuracy) / 2) * WEIGHTS.relationshipPrecision +
    scores.finalJudgmentQuality * WEIGHTS.finalJudgmentQuality +
    scores.noForcedRelationship * WEIGHTS.noForcedRelationship +
    scores.clarity * WEIGHTS.clarity +
    latencyScore * WEIGHTS.latency +
    costScore * WEIGHTS.cost
  )
}

export function relationshipPrecisionA(result: ArchitectureAResult): number {
  const displayed = result.agreementCount + result.divideCount + result.complementaryCount
  if (displayed === 0) return 1
  return result.verifiedRelationshipCount / displayed
}

export function relationshipRecallA(result: ArchitectureAResult, setType: AbSetType): number {
  return recallScore(
    setType,
    result.agreementCount,
    result.divideCount,
    result.complementaryCount,
    result.goodZero,
  ) / 5
}

export function userPreferenceFromScores(
  weightedA: number,
  weightedB: number,
): 'A' | 'B' | 'TIE' | 'NEITHER' {
  const diff = weightedA - weightedB
  if (Math.abs(diff) < 0.15) return 'TIE'
  if (weightedA < 2.5 && weightedB < 2.5) return 'NEITHER'
  return diff > 0 ? 'A' : 'B'
}
