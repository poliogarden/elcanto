import { describe, expect, it } from 'vitest'
import {
  getRecentAIUsage,
  pushAIUsageMemory,
  summarizeRecentAIUsage,
} from '@/lib/ai/usage/memory-store'
import type { AIUsageRecord } from '@/lib/ai/usage/types'

function sampleRecord(operation: AIUsageRecord['operation']): AIUsageRecord {
  return {
    id: crypto.randomUUID(),
    operation,
    model: 'gpt-4o-mini',
    inputTokens: 1000,
    outputTokens: 200,
    cachedInputTokens: 0,
    reasoningTokens: null,
    estimatedCostUsd: 0.00027,
    durationMs: 500,
    success: true,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  }
}

describe('AI usage memory store', () => {
  it('summarizes recent calls by operation', () => {
    pushAIUsageMemory(sampleRecord('VIDEO_COVERAGE'))
    pushAIUsageMemory(sampleRecord('VIDEO_DEEP_ANALYSIS'))

    const summary = summarizeRecentAIUsage(getRecentAIUsage())
    expect(summary.totalCalls).toBeGreaterThanOrEqual(2)
    expect(summary.byOperation.VIDEO_COVERAGE?.calls).toBeGreaterThanOrEqual(1)
  })
})
