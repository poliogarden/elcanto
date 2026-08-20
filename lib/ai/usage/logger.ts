import { calculateEstimatedCost } from '@/lib/ai/usage/cost-calculator'
import { appendUsageRecord, getAIContext } from '@/lib/ai/usage/context'
import type { AIOperation, AIUsageRecord } from '@/lib/ai/usage/types'
import { persistAIUsage } from '@/lib/ai/usage/repository'

type UsageFromCompletion = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  prompt_tokens_details?: { cached_tokens?: number }
  completion_tokens_details?: { reasoning_tokens?: number }
}

export function extractTokenUsage(usage: UsageFromCompletion | undefined | null): {
  inputTokens: number | null
  outputTokens: number | null
  cachedInputTokens: number | null
  reasoningTokens: number | null
} {
  if (!usage) {
    return {
      inputTokens: null,
      outputTokens: null,
      cachedInputTokens: null,
      reasoningTokens: null,
    }
  }

  return {
    inputTokens: usage.prompt_tokens ?? null,
    outputTokens: usage.completion_tokens ?? null,
    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? null,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? null,
  }
}

export async function recordAIUsage(input: {
  operation: AIOperation
  model: string
  usage?: UsageFromCompletion | null
  durationMs: number
  success: boolean
  retryCount?: number
  youtubeVideoId?: string
  promptCharLength?: number | null
  systemCharLength?: number | null
  contextObjectSize?: number | null
  maxOutputTokens?: number | null
  reasoningEffort?: string | null
}): Promise<AIUsageRecord> {
  const ctx = getAIContext()
  const tokens = extractTokenUsage(input.usage)
  const estimatedCostUsd = calculateEstimatedCost({
    model: input.model,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    cachedInputTokens: tokens.cachedInputTokens,
  })

  const record: AIUsageRecord = {
    id: crypto.randomUUID(),
    requestId: ctx.requestId,
    userId: ctx.userId,
    synthesisId: ctx.synthesisId,
    youtubeVideoId: input.youtubeVideoId ?? ctx.youtubeVideoId,
    operation: input.operation,
    model: input.model,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    cachedInputTokens: tokens.cachedInputTokens,
    reasoningTokens: tokens.reasoningTokens,
    estimatedCostUsd,
    durationMs: input.durationMs,
    success: input.success,
    retryCount: input.retryCount ?? 0,
    createdAt: new Date().toISOString(),
    promptCharLength: input.promptCharLength ?? null,
    systemCharLength: input.systemCharLength ?? null,
    contextObjectSize: input.contextObjectSize ?? null,
    maxOutputTokens: input.maxOutputTokens ?? null,
    reasoningEffort: input.reasoningEffort ?? null,
  }

  appendUsageRecord(record)

  if (process.env.NODE_ENV !== 'production' || process.env.AI_COST_DEBUG === '1') {
    const cost =
      estimatedCostUsd != null ? `$${estimatedCostUsd.toFixed(6)}` : 'unknown'
    console.log(
      `[AI COST] operation=${record.operation} model=${record.model} ` +
        `input=${record.inputTokens ?? '?'} output=${record.outputTokens ?? '?'} ` +
        `cached=${record.cachedInputTokens ?? 0} cost=${cost} duration=${(record.durationMs / 1000).toFixed(2)}s`,
    )
  }

  await persistAIUsage(record)
  return record
}
