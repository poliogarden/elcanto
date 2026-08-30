import { z } from 'zod'
import type { QuestionMode } from '@/lib/direct-synthesis/question-mode'

export const AnswerabilitySchema = z.enum([
  'DIRECT',
  'PARTIAL',
  'CONTEXT_ONLY',
  'NOT_RELEVANT',
])

export const KeyEvidenceSchema = z.object({
  text: z.string(),
  startTime: z.number().nullable(),
  endTime: z.number().nullable(),
})

export const DirectSourceAnswerSchema = z.object({
  sourceId: z.string(),
  sourceTitle: z.string(),
  answerability: AnswerabilitySchema,
  answer: z.string().nullable(),
  keyEvidence: z.array(KeyEvidenceSchema),
  uncertainty: z.string().nullable(),
  confidence: z.number().min(0).max(1),
})

export const DirectEvidenceSchema = z.object({
  ref: z.string(),
  sourceId: z.string(),
  videoId: z.string(),
  evidenceText: z.string(),
  timestamp: z.number().optional(),
  endTime: z.number().optional(),
})

export const CrossSourceRelationSchema = z.object({
  statement: z.string(),
  sourceIds: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
})

export const CrossSourceInsightSchema = z.object({
  statement: z.string(),
  sourceIds: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
})

export const SourceConceptSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  label: z.string(),
  summary: z.string().nullable(),
  evidenceRefs: z.array(z.string()),
})

export const ConnectionConceptSchema = z.object({
  id: z.string(),
  label: z.string(),
  explanation: z.string(),
  derivedFromConceptIds: z.array(z.string()),
})

export const DirectInsightSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  explanation: z.string().nullable(),
  sourceIds: z.array(z.string()),
  sourceConcepts: z.array(SourceConceptSchema),
  connectionConcepts: z.array(ConnectionConceptSchema),
  evidenceRefs: z.array(z.string()),
})

export const SourceInteractionRoleSchema = z.enum([
  'establishes',
  'challenges',
  'extends',
  'reframes',
  'contradicts',
  'consequence',
  'inversion',
])

export const SourceInteractionSchema = z.object({
  sourceId: z.string(),
  proposition: z.string(),
  role: SourceInteractionRoleSchema.nullable(),
})

export const CandidateInsightSchema = z.object({
  id: z.string(),
  title: z.string(),
  thesis: z.string(),
  explanation: z.string().nullable(),
  sourceInteractions: z.array(SourceInteractionSchema),
})

export const DeepSynthesisSchema = z.object({
  candidateInsights: z.array(CandidateInsightSchema).default([]),
  directAnswer: z.string(),
  agreements: z.array(CrossSourceRelationSchema).default([]),
  disagreements: z.array(CrossSourceRelationSchema).default([]),
  complementaryViews: z.array(CrossSourceRelationSchema).default([]),
  uniqueViews: z.array(CrossSourceRelationSchema).default([]),
  nonComparableSources: z.array(
    z.object({
      sourceId: z.string(),
      reason: z.string(),
    }),
  ).default([]),
  uncertainty: z.array(z.string()).default([]),
})

export type SourceInteractionRole = z.infer<typeof SourceInteractionRoleSchema>
export type SourceInteraction = z.infer<typeof SourceInteractionSchema>
export type CandidateInsight = z.infer<typeof CandidateInsightSchema>
export type DeepSynthesisPayload = z.infer<typeof DeepSynthesisSchema>

export const CrossSourceSynthesisSchema = z.object({
  directAnswer: z.string(),
  sourceContributions: z.array(
    z.object({
      sourceId: z.string(),
      contribution: z.string(),
      answerability: z.string(),
      evidenceRefs: z.array(z.string()),
    }),
  ),
  agreements: z.array(CrossSourceRelationSchema),
  disagreements: z.array(CrossSourceRelationSchema),
  complementaryViews: z.array(CrossSourceRelationSchema),
  uniqueViews: z.array(CrossSourceRelationSchema),
  insights: z.array(DirectInsightSchema).max(4).default([]),
  insight: CrossSourceInsightSchema.nullable(),
  nonComparableSources: z.array(
    z.object({
      sourceId: z.string(),
      reason: z.string(),
    }),
  ),
  uncertainty: z.array(z.string()),
})

export type DirectSourceAnswer = z.infer<typeof DirectSourceAnswerSchema>
export type DirectEvidence = z.infer<typeof DirectEvidenceSchema>
export type CrossSourceRelation = z.infer<typeof CrossSourceRelationSchema>
export type CrossSourceInsight = z.infer<typeof CrossSourceInsightSchema>
export type SourceConcept = z.infer<typeof SourceConceptSchema> & { origin: 'SOURCE' }
export type ConnectionConcept = z.infer<typeof ConnectionConceptSchema> & { origin: 'AI_DERIVED' }
export type DirectInsight = {
  id: string
  title: string
  summary: string
  explanation?: string | null
  sourceIds: string[]
  sourceConcepts: SourceConcept[]
  connectionConcepts: ConnectionConcept[]
  evidenceRefs: string[]
}

export type DirectSynthesisResult = {
  centralQuestion: string
  questionMode: QuestionMode
  directAnswer: string
  sourceAnswers: DirectSourceAnswer[]
  sourceContributions: CrossSourceSynthesisPayload['sourceContributions']
  agreements: CrossSourceSynthesisPayload['agreements']
  disagreements: CrossSourceSynthesisPayload['disagreements']
  complementaryViews: CrossSourceSynthesisPayload['complementaryViews']
  uniqueViews: CrossSourceSynthesisPayload['uniqueViews']
  insights: DirectInsight[]
  insight: CrossSourceSynthesisPayload['insight']
  nonComparableSources: CrossSourceSynthesisPayload['nonComparableSources']
  uncertainty: string[]
  evidence: DirectEvidence[]
  removedUnsupported: {
    agreements: number
    disagreements: number
    complementaryViews: number
    uniqueViews: number
    insights: number
    insight: number
  }
}

export type CrossSourceSynthesisPayload = z.infer<typeof CrossSourceSynthesisSchema>

export type EvidenceValidationStatus = 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED'

export type DirectPipelineCost = {
  llmCalls: number
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number | null
}

export type DeepSynthesisDiagnostics = {
  synthesisModel: string
  userQuestion: string
  sourceCount: number
  transcriptCharsPerSource: Array<{
    sourceId: string
    characterCount: number
    segmentCount: number
    transcriptSource: string
  }>
  totalInputCharacters: number
  contextExceeded: boolean
  candidateInsightCount: number
  validatedInsightCount: number
  removedInsightCount: number
  partiallyGroundedCount: number
  evidenceCountPerInsight: Array<{ insightId: string; count: number }>
  removedCandidates?: Array<{
    id: string
    title: string
    reason: string
  }>
}

export type DirectPipelineRun = {
  version: 'direct-experiment-1.0'
  synthesisMode: 'deep-direct'
  result: DirectSynthesisResult
  timingMs: {
    evidenceRetrievalMs: number
    perSourceAnswerMs: number
    crossSourceMs: number
    validationMs: number
    finalizeMs: number
    totalMs: number
  }
  cost: DirectPipelineCost
  deepSynthesisDiagnostics?: DeepSynthesisDiagnostics
}

export type HumanComparePreference =
  | 'CURRENT_V2'
  | 'DIRECT'
  | 'BOTH_HAVE_VALUE'
  | 'NEITHER'

export type ComparePreferenceRecord = {
  caseSlug: string
  preference: HumanComparePreference
  note?: string
  updatedAt: string
}
