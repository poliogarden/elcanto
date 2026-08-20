import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SynthesisPerfCollector } from '@/lib/synthesis/synthesis-perf'

describe('SynthesisPerfCollector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses total phase wall-clock, not sum of all phases', () => {
    const perf = new SynthesisPerfCollector()

    perf.start('relationship_analysis')
    vi.advanceTimersByTime(9000)
    perf.end('relationship_analysis')

    perf.start('emergent_insight')
    vi.advanceTimersByTime(25000)
    perf.end('emergent_insight')

    perf.start('fourth_idea')
    vi.advanceTimersByTime(4500)
    perf.end('fourth_idea')

    perf.start('total')
    vi.advanceTimersByTime(39500)
    perf.end('total')

    const summary = perf.summary([], undefined, 'abc12345')
    expect(summary.totalMs).toBe(39500)
    expect(summary.stagesMs).toBe(38500)
    expect(summary.pipelineRunId).toBe('abc12345')
  })
})
