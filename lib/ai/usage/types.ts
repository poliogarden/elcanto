export const AI_OPERATIONS = [
  'VIDEO_COVERAGE',
  'VIDEO_ANALYSIS',
  'VIDEO_DEEP_ANALYSIS',
  'RELATIONSHIP',
  'SYNTHESIS',
  'COMBINED_SYNTHESIS',
  'FOURTH_IDEA',
  'KNOWLEDGE_EXTENSION',
  'ASK',
  'STORY',
  'PERSONAL_INSIGHT',
  'PERSONAL_ASK',
  'COMPOSE',
  'TTS',
] as const

export type AIOperation = (typeof AI_OPERATIONS)[number]

export type AIUsageRecord = {
  id: string
  requestId?: string
  userId?: string
  synthesisId?: string
  youtubeVideoId?: string
  operation: AIOperation
  model: string
  inputTokens: number | null
  outputTokens: number | null
  cachedInputTokens: number | null
  reasoningTokens: number | null
  estimatedCostUsd: number | null
  durationMs: number
  success: boolean
  retryCount: number
  createdAt: string
  /** Profiling — prompt sizes at call time */
  promptCharLength?: number | null
  systemCharLength?: number | null
  contextObjectSize?: number | null
  maxOutputTokens?: number | null
  reasoningEffort?: string | null
}

export type SynthesisCostSummary = {
  videoCount: number
  byOperation: Record<string, { calls: number; inputTokens: number; outputTokens: number; costUsd: number | null }>
  totalInputTokens: number
  totalOutputTokens: number
  totalEstimatedCostUsd: number | null
  records: AIUsageRecord[]
}
