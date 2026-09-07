import { describe, expect, it } from 'vitest'
import { enrichOpportunities, computeOpportunityStrength } from '@/lib/creator/intelligence/opportunity-engine'
import { buildPositionHistory } from '@/lib/creator/intelligence/position-history'
import { detectContradictions } from '@/lib/creator/intelligence/context-retrieval'
import { DEMO_BRAIN, DEMO_OPPORTUNITIES } from '@/lib/creator/sample/demo-channel'
import { DEMO_AUDIENCE, DEMO_LEARNINGS } from '@/lib/creator/sample/demo-memory'
import type { ChannelMemory } from '@/lib/creator/intelligence/types'

const memory: ChannelMemory = {
  channelId: 'demo',
  positionHistory: [],
  audienceQuestions: DEMO_AUDIENCE,
  learnings: DEMO_LEARNINGS,
  updatedAt: new Date().toISOString(),
}

describe('opportunity-engine', () => {
  it('enriches opportunities with signals and diversity', () => {
    const result = enrichOpportunities(DEMO_OPPORTUNITIES, memory, DEMO_BRAIN.positions)
    expect(result[0].signals?.OPEN_LOOP).toBeGreaterThan(0.5)
    expect(result[0].whyExplanation?.positions.length).toBeGreaterThan(0)
    const strengths = result.map((r) => r.strength)
    expect(strengths[0]).toBeGreaterThanOrEqual(strengths[1] ?? 0)
  })

  it('scores are bounded 0-1', () => {
    const signals = { OPEN_LOOP: 0.8, REPETITION_RISK: 0.2 }
    const score = computeOpportunityStrength(signals)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})

describe('position-history', () => {
  it('builds timeline with change kinds', () => {
    const history = buildPositionHistory(DEMO_BRAIN, DEMO_BRAIN.positions)
    expect(history.length).toBe(3)
    expect(history.some((h) => h.evidence.timestampStart > 0)).toBe(true)
  })
})

describe('contradiction-detector', () => {
  it('flags skeptical past vs bullish current script', () => {
    const project = {
      id: 'p1',
      channelId: DEMO_BRAIN.channelId,
      userId: 'u',
      topic: 'test',
      objective: null,
      stage: 'script' as const,
      status: 'draft' as const,
      format: '16:9' as const,
      research: null,
      angle: null,
      outline: null,
      script: { hook: 'AI investment has always been sustainable', sections: [], conclusion: '' },
      scenes: [],
      visualAssets: [],
      renderJobs: [],
      renderVersions: [],
      linkedVideos: [],
      linkedPositionIds: [],
      linkedClaims: [],
      decisions: [],
      createdAt: '',
      updatedAt: '',
    }
    const alerts = detectContradictions(project, DEMO_BRAIN)
    expect(alerts.length).toBeGreaterThan(0)
  })
})
