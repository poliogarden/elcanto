import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { shouldUseCombinedSynthesis } from '@/lib/synthesis/combined-synthesis-engine'

describe('shouldUseCombinedSynthesis', () => {
  const original = process.env.SYNTHESIS_COMBINED

  afterEach(() => {
    if (original === undefined) delete process.env.SYNTHESIS_COMBINED
    else process.env.SYNTHESIS_COMBINED = original
    delete process.env.SYNTHESIS_COMBINED_MAX_SOURCES
  })

  it('disables combined mode by default (staged pipeline preferred)', () => {
    expect(shouldUseCombinedSynthesis(2)).toBe(false)
    expect(shouldUseCombinedSynthesis(5)).toBe(false)
    expect(shouldUseCombinedSynthesis(8)).toBe(false)
  })

  it('disables for single source', () => {
    expect(shouldUseCombinedSynthesis(1)).toBe(false)
  })

  it('enables when SYNTHESIS_COMBINED=1', () => {
    process.env.SYNTHESIS_COMBINED = '1'
    expect(shouldUseCombinedSynthesis(2)).toBe(true)
    expect(shouldUseCombinedSynthesis(5)).toBe(true)
    expect(shouldUseCombinedSynthesis(8)).toBe(true)
  })

  it('respects max source limit', () => {
    process.env.SYNTHESIS_COMBINED = '1'
    process.env.SYNTHESIS_COMBINED_MAX_SOURCES = '4'
    expect(shouldUseCombinedSynthesis(4)).toBe(true)
    expect(shouldUseCombinedSynthesis(5)).toBe(false)
  })
})

describe('synthesisStepFromPhase', () => {
  it('maps backend phases to UI steps', async () => {
    const { synthesisStepFromPhase } = await import('@/lib/synthesis/synthesis-stream-client')
    expect(
      synthesisStepFromPhase({ type: 'phase', phase: 'relationship', status: 'start' }),
    ).toBe(0)
    expect(
      synthesisStepFromPhase({ type: 'phase', phase: 'emergent_insight', status: 'complete' }),
    ).toBe(2)
    expect(
      synthesisStepFromPhase({ type: 'phase', phase: 'insight_map', status: 'start' }),
    ).toBe(2)
  })
})
