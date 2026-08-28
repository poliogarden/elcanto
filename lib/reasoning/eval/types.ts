import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SourceAnalysis } from '@/lib/types/source'
import type { ExtractionCoverageDiagnostics } from '@/lib/pipeline/extraction-diagnostics'

export type EvalPipelineMode = 'LIVE' | 'DETERMINISTIC_TEST'

export type RegressionCaseResult = {
  name: string
  result: 'PASS' | 'FAIL' | 'NOT_IMPLEMENTED'
  notes?: string
}

export type E2eQualityCriteria = {
  relevantSources: number
  candidatePairs: number
  verifiedRelationships: number
  relationshipClusters: number
  agreementDivideComplementary: number
  verificationCollapse: boolean
  unsupportedJudgmentPropositions: number
}

export type E2eEvalResult = {
  fixtureId: string
  result: 'PASS' | 'FAIL' | 'DEGRADED' | 'INVALID' | 'NOT_EVALUATED'
  infrastructureResult?: 'PASS' | 'FAIL'
  reasoningQualityResult?: 'PASS' | 'FAIL' | 'DEGRADED' | 'NOT_EVALUATED'
  reason?: string
  failureReasons?: string[]
  qualityCriteria?: E2eQualityCriteria
}

export type ReasoningEvalSnapshot = {
  meta: {
    generatedAt: string
    engineVersion: string
    schemaVersion: number | null
    fixtureId: string
    question: string
    inputSourceCount: number
    commit: string
    pipelineMode: EvalPipelineMode
    pipelineError?: string
    e2eQualityValid: boolean
  }
  sources: Array<{
    sourceId: string
    videoId: string
    voiceIndex: number
    title: string
    url?: string
  }>
  reasoning: MultiSourceReasoning | null
  unitRegression: RegressionCaseResult[]
  e2eEvaluation: E2eEvalResult
  extractionCoverage?: ExtractionCoverageDiagnostics
  /** Refreshed source analyses when refreshClaimExtraction is enabled */
  refreshedSources?: SourceAnalysis[]
}

export const REPORT_DIR = 'reports'
export const REPORT_MD_PATH = 'reports/reasoning-eval-report.md'
export const REPORT_RAW_PATH = 'reports/reasoning-eval-raw.json'
export const SUITE_REPORT_MD_PATH = 'reports/reasoning-suite-report.md'
export const SUITE_REPORT_RAW_PATH = 'reports/reasoning-suite-raw.json'

export const INVALID_QUALITY_LABEL = 'INVALID / NOT EVALUATED'

export type ReasoningSuiteSnapshot = {
  generatedAt: string
  commit: string
  engineVersion: string
  pipelineMode: EvalPipelineMode
  results: Array<{
    fixtureId: string
    label: string
    result: 'PASS' | 'FAIL'
    infrastructureResult: 'PASS' | 'FAIL'
    failureReasons: string[]
    blockers: string[]
    v2Backlog: string[]
    pipelineDiagnosis: string[]
    metrics: import('@/lib/reasoning/eval/evaluate-benchmark').BenchmarkMetrics
    pipelineError?: string
    mcpRegression?: { result: 'PASS' | 'FAIL'; failureReasons: string[] }
  }>
  unitRegression: RegressionCaseResult[]
  v1ExitStatus: 'NOT READY' | 'READY FOR BLIND TEST'
  aggregatePrecision: number
  aggregateRecall: number
  suiteBlockers: string[]
  suiteV2Backlog: string[]
  overallFalseAgreement: number
  overallFalseDivide: number
  overallFalseComplementary: number
  overallMissedGold: number
  judgmentSupported: number
  judgmentUnsupported: number
  falseRelationshipsInJudgment: number
  mcpRegressionResult: 'PASS' | 'FAIL'
  largestFailure?: string
  reproducibility?: {
    standaloneBefore?: import('@/lib/reasoning/eval/reproducibility').McpReproducibilitySnapshot
    suiteMcp?: import('@/lib/reasoning/eval/reproducibility').McpReproducibilitySnapshot
    standaloneAfter?: import('@/lib/reasoning/eval/reproducibility').McpReproducibilitySnapshot
    standaloneBeforeVsSuiteDiffs?: string[]
    standaloneBeforeVsAfterDiffs?: string[]
    suiteVsStandaloneAfterDiffs?: string[]
  }
  goldRecallTraces?: import('@/lib/reasoning/eval/gold-recall-trace').GoldRecallTraceEntry[]
  precisionRegressionGuard?: {
    sameTopicPass: boolean
    falseAgreement: number
    falseDivide: number
    falseComplementary: number
    result: 'PASS' | 'FAIL'
  }
}
