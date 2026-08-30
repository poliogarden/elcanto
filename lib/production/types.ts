import type { SynthesisPerfSummary } from '@/lib/synthesis/synthesis-perf'
import type { SynthesisCostSummary } from '@/lib/ai/usage/types'

export type AcceptanceRating = 'good' | 'partial' | 'bad'

export type AcceptanceFailureCategory =
  | 'INGEST_FAILURE'
  | 'TRANSCRIPT_FAILURE'
  | 'EXTRACTION_FAILURE'
  | 'EVIDENCE_FAILURE'
  | 'RELEVANCE_FAILURE'
  | 'RELATIONSHIP_MISS'
  | 'FALSE_RELATIONSHIP'
  | 'JUDGMENT_FAILURE'
  | 'UX_COMPREHENSION_FAILURE'
  | 'PERFORMANCE_FAILURE'
  | 'NONE'

export type ProductAcceptanceRecord = {
  synthesisId: string
  sourceCount: number
  testSetLabel?: string
  analysisQuality: AcceptanceRating
  agreementQuality: AcceptanceRating
  divideQuality: AcceptanceRating
  complementaryQuality: AcceptanceRating
  evidenceQuality: AcceptanceRating
  synthesisQuality: AcceptanceRating
  missedRelationship: boolean
  falseRelationship: boolean
  timeSaving: AcceptanceRating
  wouldReuse: AcceptanceRating
  notes?: string
  failureCategories?: AcceptanceFailureCategory[]
  zeroRelationshipResult?: AcceptanceRating
  engineVersion?: string
  createdAt: string
  updatedAt: string
}

export type PerSourcePipelineDiagnostic = {
  sourceId: string
  videoId: string
  title: string
  status: 'analyzed' | 'failed' | 'excluded'
  failureCode?: string
  failureMessage?: string
  transcriptOk?: boolean
  claimsExtracted?: number
  evidenceSupported?: number
}

export type ProductionPipelineDiagnostics = {
  requestedSources: number
  analyzedSources: number
  failedSources: number
  excludedSources: number
  funnel: {
    claimsExtracted: number
    relevanceUsable: number
    generationEligible: number
    candidatePairs: number
    verifiedRelationships: number
    agreement: number
    divide: number
    complementary: number
  }
  perSource: PerSourcePipelineDiagnostic[]
  judgmentPresent: boolean
  evidenceIntegrityPass?: boolean
  deepSynthesis?: {
    synthesisModel?: string
    userQuestion?: string
    sourceCount?: number
    totalInputCharacters?: number
    contextExceeded?: boolean
    candidateInsightCount?: number
    validatedInsightCount?: number
    removedInsightCount?: number
    partiallyGroundedCount?: number
    transcriptCharsPerSource?: Array<{
      sourceId: string
      characterCount: number
      segmentCount: number
      transcriptSource: string
    }>
    evidenceCountPerInsight?: Array<{ insightId: string; count: number }>
  }
}

export type ProductionMeta = {
  reasoningEngine?: 'direct' | 'legacy-v2'
  reasoningEngineVersion?: string
  analysisVersion?: string
  analysisSchemaVersion?: string
  analysisModel?: string
  synthesisModel?: string
  pipelineRunAt: string
  analyzedCount: number
  failedCount: number
  requestedCount: number
  diagnostics?: ProductionPipelineDiagnostics
  costSummary?: SynthesisCostSummary
  perfSummary?: SynthesisPerfSummary
}
