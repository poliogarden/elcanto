import { describe, expect, it } from 'vitest'
import {
  clusterSignals,
  computeInterestShift,
  computeInterestTrends,
  extractTopicsFromText,
  filterSignalsByWindow,
  inferCurrentThread,
} from '@/lib/personal/taste-engine'
import type { PersonalSignal } from '@/lib/types/personal'

function signal(
  partial: Partial<PersonalSignal> & Pick<PersonalSignal, 'id' | 'title'>,
): PersonalSignal {
  return {
    source: 'youtube_like',
    signalAt: new Date().toISOString(),
    topics: [],
    concepts: [],
    ...partial,
  }
}

describe('personal taste engine', () => {
  it('extracts domain topics from titles', () => {
    const topics = extractTopicsFromText('How AI coding agents will change startups forever')
    expect(topics).toContain('ai')
    expect(topics.some((t) => t.includes('agent') || t.includes('coding') || t.includes('startup'))).toBe(true)
  })

  it('computes emerging interests when signal is sufficient', () => {
    const now = Date.now()
    const signals: PersonalSignal[] = [
      signal({ id: '1', title: 'AI agents for coding', signalAt: new Date(now - 86400000).toISOString() }),
      signal({ id: '2', title: 'AI agent startups', signalAt: new Date(now - 2 * 86400000).toISOString() }),
      signal({ id: '3', title: 'LLM agents productivity', signalAt: new Date(now - 3 * 86400000).toISOString() }),
      signal({ id: '4', title: 'Cooking pasta basics', signalAt: new Date(now - 60 * 86400000).toISOString() }),
      signal({ id: '5', title: 'Italian recipes', signalAt: new Date(now - 70 * 86400000).toISOString() }),
    ]

    const { emerging } = computeInterestTrends(signals, '30d')
    expect(emerging.length).toBeGreaterThan(0)
  })

  it('detects interest shift', () => {
    const now = Date.now()
    const signals: PersonalSignal[] = [
      ...Array.from({ length: 4 }, (_, i) =>
        signal({
          id: `new_${i}`,
          title: 'AI agents and startup leverage',
          signalAt: new Date(now - i * 86400000).toISOString(),
        }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        signal({
          id: `old_${i}`,
          title: 'LLM model performance benchmarks',
          signalAt: new Date(now - (40 + i) * 86400000).toISOString(),
        }),
      ),
    ]

    const shift = computeInterestShift(signals)
    expect(shift).not.toBeNull()
    expect(shift?.statement).toContain('shifting')
  })

  it('clusters signals by topic', () => {
    const signals = [
      signal({ id: '1', title: 'AI infrastructure GPUs' }),
      signal({ id: '2', title: 'NVIDIA data center AI' }),
      signal({ id: '3', title: 'Startup fundraising tips' }),
    ]
    const clusters = clusterSignals(signals)
    expect(clusters.length).toBeGreaterThan(0)
  })

  it('infers current thread from AI-related signals', () => {
    const signals = [
      signal({ id: '1', title: 'AI coding agents' }),
      signal({ id: '2', title: 'Small team startups with AI' }),
    ]
    const { thread } = inferCurrentThread(signals, clusterSignals(signals))
    expect(thread.toLowerCase()).toContain('team')
  })

  it('filters signals by window', () => {
    const signals = [
      signal({ id: '1', title: 'Recent', signalAt: new Date().toISOString() }),
      signal({ id: '2', title: 'Old', signalAt: new Date(Date.now() - 100 * 86400000).toISOString() }),
    ]
    const recent = filterSignalsByWindow(signals, '30d')
    expect(recent).toHaveLength(1)
  })
})
