import { describe, expect, it } from 'vitest'
import { calculateEstimatedCost, getKnownPricingModels } from '@/lib/ai/usage/cost-calculator'

describe('calculateEstimatedCost', () => {
  it('computes cost for gpt-4o-mini', () => {
    const cost = calculateEstimatedCost({
      model: 'gpt-4o-mini',
      inputTokens: 1_000_000,
      outputTokens: 0,
    })
    expect(cost).toBeCloseTo(0.15, 3)
  })

  it('returns null for unknown models', () => {
    const cost = calculateEstimatedCost({
      model: 'unknown-model-xyz',
      inputTokens: 1000,
      outputTokens: 500,
    })
    expect(cost).toBeNull()
  })

  it('lists known pricing models', () => {
    expect(getKnownPricingModels()).toContain('gpt-4o-mini')
  })
})
