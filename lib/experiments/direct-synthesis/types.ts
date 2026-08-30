import { z } from 'zod'

export const DirectSourceAnswerSchema = z.object({
  sourceId: z.string(),
  answerability: z.enum(['DIRECT', 'PARTIAL', 'CONTEXT_ONLY', 'NOT_RELEVANT']),
  position: z.string().nullable(),
  keyPoints: z.array(z.string()),
  evidence: z.array(
    z.object({
      evidenceRef: z.string(),
      text: z.string(),
      startTime: z.number().nullable(),
      endTime: z.number().nullable(),
    }),
  ),
  confidence: z.number().min(0).max(1),
})

export const DirectSourceAnswersSchema = z.object({
  answers: z.array(DirectSourceAnswerSchema),
})

export const DirectSynthesisSchema = z.object({
  agreements: z.array(
    z.object({
      statement: z.string(),
      sourceIds: z.array(z.string()),
      evidenceRefs: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  disagreements: z.array(
    z.object({
      issue: z.string(),
      positions: z.array(
        z.object({
          sourceId: z.string(),
          position: z.string(),
          evidenceRefs: z.array(z.string()),
        }),
      ),
      confidence: z.number().min(0).max(1),
    }),
  ),
  complementaryViews: z.array(
    z.object({
      statement: z.string(),
      sourceIds: z.array(z.string()),
      evidenceRefs: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  nonComparableSources: z.array(
    z.object({
      sourceId: z.string(),
      reason: z.string(),
    }),
  ),
  uncertainties: z.array(z.string()),
  finalAnswer: z.string(),
  confidence: z.number().min(0).max(1),
})

export type DirectSourceAnswer = z.infer<typeof DirectSourceAnswerSchema>
export type DirectSynthesisPayload = z.infer<typeof DirectSynthesisSchema>

export type DirectEvidenceRef = {
  ref: string
  sourceId: string
  text: string
  startTime?: number
  endTime?: number
}

export type DirectSynthesisResult = {
  architecture: 'direct_cross_source'
  version: 'direct-baseline-1.0'
  centralQuestion: string
  sourceAnswers: DirectSourceAnswer[]
  agreements: DirectSynthesisPayload['agreements']
  disagreements: DirectSynthesisPayload['disagreements']
  complementaryViews: DirectSynthesisPayload['complementaryViews']
  nonComparableSources: DirectSynthesisPayload['nonComparableSources']
  uncertainties: string[]
  finalAnswer: string
  confidence: number
  evidenceCatalog: DirectEvidenceRef[]
  validation: DirectValidationSummary
  timingMs: {
    evidenceRetrievalMs: number
    perSourceAnswerMs: number
    crossSourceMs: number
    validationMs: number
    totalMs: number
  }
}

export type EvidenceValidationStatus = 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED'

export type DirectValidationSummary = {
  agreementSupported: number
  agreementUnsupported: number
  disagreementSupported: number
  disagreementUnsupported: number
  complementarySupported: number
  complementaryUnsupported: number
  sourcePositionSupported: number
  sourcePositionUnsupported: number
  hallucinationFlags: string[]
  filteredAgreements: DirectSynthesisPayload['agreements']
  filteredDisagreements: DirectSynthesisPayload['disagreements']
  filteredComplementary: DirectSynthesisPayload['complementaryViews']
}
