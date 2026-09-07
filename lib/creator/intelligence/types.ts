import { z } from 'zod'
import { PositionChangeKindSchema } from '@/lib/creator/types'

export const OpportunityTypeSchema = z.enum([
  'FOLLOW_UP',
  'COUNTER_ARGUMENT',
  'UPDATE',
  'AUDIENCE_REQUEST',
  'SERIES_CONTINUATION',
  'NEW_DIRECTION',
  'REVISIT_PREDICTION',
])

export const OpportunitySignalsSchema = z.object({
  CHANNEL_HISTORY: z.number().min(0).max(1).optional(),
  OPEN_LOOP: z.number().min(0).max(1).optional(),
  AUDIENCE_DEMAND: z.number().min(0).max(1).optional(),
  PERFORMANCE: z.number().min(0).max(1).optional(),
  POSITION_CHANGE: z.number().min(0).max(1).optional(),
  SERIES_CONTINUITY: z.number().min(0).max(1).optional(),
  NEW_EVIDENCE: z.number().min(0).max(1).optional(),
  MARKET_TIMING: z.number().min(0).max(1).optional(),
  REPETITION_RISK: z.number().min(0).max(1).optional(),
})

export const PositionHistoryEntrySchema = z.object({
  id: z.string(),
  topicId: z.string(),
  positionId: z.string(),
  label: z.string(),
  statement: z.string(),
  videoId: z.string(),
  evidenceRef: z.string(),
  timestamp: z.number(),
  publishedAt: z.string(),
  changeFromPrevious: PositionChangeKindSchema.nullable().optional(),
  changeConfidence: z.enum(['strong', 'moderate', 'weak']).optional(),
  evidence: z.object({
    videoId: z.string(),
    timestampStart: z.number(),
    timestampEnd: z.number().optional(),
    transcriptExcerpt: z.string().optional(),
    publishedAt: z.string().optional(),
  }),
})

export const AudienceQuestionSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  label: z.string(),
  frequency: z.number(),
  videoIds: z.array(z.string()),
  trend: z.enum(['rising', 'stable', 'falling']).optional(),
  representativePhrases: z.array(z.string()).default([]),
})

export const CreatorLearningSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  statement: z.string(),
  confidence: z.enum(['strong_evidence', 'some_evidence', 'early_signal', 'insufficient']),
  supportingOutcomes: z.array(z.string()).default([]),
  contradictingOutcomes: z.array(z.string()).default([]),
  linkedDecisionIds: z.array(z.string()).default([]),
  createdAt: z.string(),
})

export const CreatorDecisionSchema = z.object({
  id: z.string(),
  type: z.string(),
  what: z.string(),
  why: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  source: z.enum(['user', 'ai', 'system']).default('user'),
  timestamp: z.string(),
})

export const ArtifactVersionSchema = z.object({
  id: z.string(),
  artifact: z.string(),
  label: z.string(),
  snapshot: z.unknown(),
  createdAt: z.string(),
  reason: z.string().optional(),
})

export const ChannelMemorySchema = z.object({
  channelId: z.string(),
  positionHistory: z.array(PositionHistoryEntrySchema).default([]),
  audienceQuestions: z.array(AudienceQuestionSchema).default([]),
  learnings: z.array(CreatorLearningSchema).default([]),
  performanceBaseline: z
    .object({
      avgViewsPerDay: z.number().optional(),
      avgCtr: z.number().optional(),
      avgRetention30s: z.number().optional(),
    })
    .optional(),
  updatedAt: z.string(),
})

export type OpportunitySignals = z.infer<typeof OpportunitySignalsSchema>
export type PositionHistoryEntry = z.infer<typeof PositionHistoryEntrySchema>
export type AudienceQuestion = z.infer<typeof AudienceQuestionSchema>
export type CreatorLearning = z.infer<typeof CreatorLearningSchema>
export type CreatorDecision = z.infer<typeof CreatorDecisionSchema>
export type ArtifactVersion = z.infer<typeof ArtifactVersionSchema>
export type ChannelMemory = z.infer<typeof ChannelMemorySchema>
