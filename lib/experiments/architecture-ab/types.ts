import type { SourceAnalysis } from '@/lib/types/source'

export type AbSetType =
  | 'agreement'
  | 'divide'
  | 'complementary'
  | 'mixed'
  | 'complex'
  | 'mismatch'

export type FrozenExperimentInput = {
  caseId: string
  setType: AbSetType
  label: string
  centralQuestion: string
  outputLanguage: 'ko' | 'en'
  sources: SourceAnalysis[]
  frozenAt: string
  fixtureId?: string
  isRealYouTube: boolean
}

export type ArchitectureAResult = {
  architecture: 'reasoning_v2.2'
  centralQuestion: string
  judgmentStatement: string | null
  synthesisSummary: string | null
  agreementCount: number
  divideCount: number
  complementaryCount: number
  verifiedRelationshipCount: number
  rejectedRelationshipCount: number
  goodZero: boolean
  noRelationshipReason?: string
  pipelineStats?: Record<string, unknown>
  timingMs: {
    reasoningMs: number
    totalMs: number
  }
  costSummary: {
    llmCalls: number
    inputTokens: number
    outputTokens: number
    totalEstimatedCostUsd: number | null
  }
  raw: unknown
}

export type ArchitectureBResult = {
  architecture: 'direct_baseline'
  centralQuestion: string
  finalAnswer: string
  agreementCount: number
  divideCount: number
  complementaryCount: number
  nonComparableCount: number
  evidencePrecision: number
  hallucinationCount: number
  goodZero: boolean
  timingMs: {
    perSourceAnswerMs: number
    crossSourceMs: number
    validationMs: number
    totalMs: number
  }
  costSummary: {
    llmCalls: number
    inputTokens: number
    outputTokens: number
    totalEstimatedCostUsd: number | null
  }
  raw: unknown
}

export type DimensionScores = {
  questionAnswerQuality: number
  crossSourceValue: number
  agreementAccuracy: number
  divideAccuracy: number
  importantRelationshipRecall: number
  evidenceGrounding: number
  noForcedRelationship: number
  finalJudgmentQuality: number
  clarity: number
  userValue: number
}

export type CaseEvaluation = {
  caseId: string
  setType: AbSetType
  blindLabelA: 'Result X' | 'Result Y'
  blindLabelB: 'Result X' | 'Result Y'
  architectureA: ArchitectureAResult
  architectureB: ArchitectureBResult
  scoresA: DimensionScores
  scoresB: DimensionScores
  weightedScoreA: number
  weightedScoreB: number
  userPreference: 'A' | 'B' | 'TIE' | 'NEITHER'
  timeSaving: 'YES' | 'PARTIAL' | 'NO'
  wouldReuse: 'YES' | 'MAYBE' | 'NO'
  relationshipPrecisionA: number
  relationshipPrecisionB: number
  relationshipRecallA: number
  relationshipRecallB: number
  goodZeroA: boolean
  goodZeroB: boolean
  inventedRelationshipA: boolean
  inventedRelationshipB: boolean
  hallucinationPenaltyB: number
}

export type AbExperimentSummary = {
  runAt: string
  cases: CaseEvaluation[]
  aggregate: {
    aWins: number
    bWins: number
    ties: number
    neither: number
    avgWeightedA: number
    avgWeightedB: number
    avgPrecisionA: number
    avgPrecisionB: number
    avgRecallA: number
    avgRecallB: number
    avgLatencyA: number
    avgLatencyB: number
    avgCostA: number
    avgCostB: number
  }
  complexity: {
    architectureA: ComplexityAudit
    architectureB: ComplexityAudit
  }
  decision: ArchitectureDecision
}

export type ComplexityAudit = {
  pipelineStages: number
  reasoningModules: number
  llmCallsTypical3Source: number
  heuristicGates: number
  failureStates: string[]
}

export type ArchitectureDecision = {
  decision: 'KEEP_V2' | 'SIMPLIFY' | 'HYBRID'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  provisional: boolean
  why: string[]
  whatABetter: string[]
  whatBBetter: string[]
  nextArchitecture: string
  realSetsRun: number
  syntheticSetsRun: number
}
