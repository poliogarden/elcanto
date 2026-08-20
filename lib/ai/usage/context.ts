import { AsyncLocalStorage } from 'async_hooks'
import type { AIUsageRecord, SynthesisCostSummary } from '@/lib/ai/usage/types'

export type AIRequestContext = {
  requestId?: string
  userId?: string
  synthesisId?: string
  youtubeVideoId?: string
  /** Collect usage records for synthesis cost summary */
  costAccumulator?: AIUsageRecord[]
}

const storage = new AsyncLocalStorage<AIRequestContext>()

export function getAIContext(): AIRequestContext {
  return storage.getStore() ?? {}
}

export function runWithAIContext<T>(ctx: AIRequestContext, fn: () => T): T {
  const parent = storage.getStore() ?? {}
  const merged: AIRequestContext = {
    ...parent,
    ...ctx,
    costAccumulator: ctx.costAccumulator ?? parent.costAccumulator,
  }
  return storage.run(merged, fn)
}

export function appendUsageRecord(record: AIUsageRecord): void {
  const store = storage.getStore()
  if (store?.costAccumulator) {
    store.costAccumulator.push(record)
  }
}

export function buildSynthesisCostSummary(
  records: AIUsageRecord[],
  videoCount: number,
): SynthesisCostSummary {
  const byOperation: SynthesisCostSummary['byOperation'] = {}

  for (const r of records) {
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

  const totalInputTokens = records.reduce((n, r) => n + (r.inputTokens ?? 0), 0)
  const totalOutputTokens = records.reduce((n, r) => n + (r.outputTokens ?? 0), 0)
  const costs = records.map((r) => r.estimatedCostUsd).filter((c): c is number => c != null)
  const totalEstimatedCostUsd =
    costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : null

  return {
    videoCount,
    byOperation,
    totalInputTokens,
    totalOutputTokens,
    totalEstimatedCostUsd,
    records,
  }
}
