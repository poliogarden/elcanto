import type { AIUsageRecord } from '@/lib/ai/usage/types'

const MAX_RECORDS = 300
const buffer: AIUsageRecord[] = []

export function pushAIUsageMemory(record: AIUsageRecord): void {
  buffer.push(record)
  if (buffer.length > MAX_RECORDS) {
    buffer.splice(0, buffer.length - MAX_RECORDS)
  }
}

export function getRecentAIUsage(limit = 100): AIUsageRecord[] {
  return buffer.slice(-limit)
}

export function clearAIUsageMemory(): void {
  buffer.length = 0
}

export function summarizeRecentAIUsage(records = getRecentAIUsage()): {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalEstimatedCostUsd: number | null
  byOperation: Record<string, { calls: number; inputTokens: number; outputTokens: number; costUsd: number | null }>
} {
  const byOperation: Record<
    string,
    { calls: number; inputTokens: number; outputTokens: number; costUsd: number | null }
  > = {}

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let costSum = 0
  let hasCost = false

  for (const r of records) {
    totalInputTokens += r.inputTokens ?? 0
    totalOutputTokens += r.outputTokens ?? 0
    if (r.estimatedCostUsd != null) {
      costSum += r.estimatedCostUsd
      hasCost = true
    }

    const bucket = byOperation[r.operation] ?? {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    }
    bucket.calls += 1
    bucket.inputTokens += r.inputTokens ?? 0
    bucket.outputTokens += r.outputTokens ?? 0
    if (r.estimatedCostUsd != null) {
      bucket.costUsd = (bucket.costUsd ?? 0) + r.estimatedCostUsd
    }
    byOperation[r.operation] = bucket
  }

  return {
    totalCalls: records.length,
    totalInputTokens,
    totalOutputTokens,
    totalEstimatedCostUsd: hasCost ? costSum : null,
    byOperation,
  }
}
