import { describe, expect, it } from 'vitest'
import { assessJudgmentGate } from '@/lib/reasoning/judgment-gate'
import {
  buildExcludedSources,
  isExcluded,
  isSynthesisCandidate,
  resolveSynthesisSourceIds,
} from '@/lib/reasoning/relevance'

describe('relevance classification', () => {
  it('treats direct/supporting/contrasting/contextual/weak as synthesis candidates', () => {
    expect(isSynthesisCandidate('direct')).toBe(true)
    expect(isSynthesisCandidate('contextual')).toBe(true)
    expect(isSynthesisCandidate('weak')).toBe(true)
    expect(isExcluded('off_topic')).toBe(true)
  })

  it('CASE MCP: concept, comparison, and usage videos are synthesis candidates', () => {
    const sourceRelevance = [
      { sourceId: 'a', classification: 'direct' as const, score: 0.9, reason: 'Defines MCP', relevantClaimIds: [] },
      { sourceId: 'b', classification: 'contrasting' as const, score: 0.85, reason: 'MCP vs API', relevantClaimIds: [] },
      { sourceId: 'c', classification: 'contextual' as const, score: 0.7, reason: 'Usage tutorial', relevantClaimIds: [] },
      { sourceId: 'd', classification: 'off_topic' as const, score: 0.1, reason: 'Motivational', relevantClaimIds: [] },
    ]
    const synthesisIds = resolveSynthesisSourceIds({
      sources: [{ sourceId: 'a' }, { sourceId: 'b' }, { sourceId: 'c' }, { sourceId: 'd' }],
      sourceRelevance,
      clusters: [],
    })
    expect(synthesisIds.has('a')).toBe(true)
    expect(synthesisIds.has('b')).toBe(true)
    expect(synthesisIds.has('c')).toBe(true)
    expect(synthesisIds.has('d')).toBe(false)
  })

  it('does not exclude sources that are in synthesis set (bug A fix)', () => {
    const synthesisIds = new Set(['s1', 's2'])
    const excluded = buildExcludedSources({
      sources: [
        { sourceId: 's1', videoId: 'v1', voiceIndex: 1, title: 'A' },
        { sourceId: 's2', videoId: 'v2', voiceIndex: 2, title: 'B' },
      ],
      sourceRelevance: [
        { sourceId: 's1', classification: 'direct', score: 0.9, reason: '', relevantClaimIds: [] },
        { sourceId: 's2', classification: 'supporting', score: 0.8, reason: '', relevantClaimIds: [] },
      ],
      synthesisSourceIds: synthesisIds,
      legacyExcluded: [{ sourceId: 's1', reason: 'stale exclusion' }],
      offTopicClusters: [],
    })
    expect(excluded).toHaveLength(0)
  })
})

describe('judgment gate', () => {
  it('RULE 1: blocks judgment with 0 relevant sources', () => {
    const gate = assessJudgmentGate({
      synthesisSourceCount: 0,
      claims: [],
      relationships: [],
      patternsCount: 0,
    })
    expect(gate.canGenerate).toBe(false)
  })

  it('allows judgment with verified cross-source evidence', () => {
    const gate = assessJudgmentGate({
      synthesisSourceCount: 3,
      claims: [{ id: 'c1' } as never],
      relationships: [{ verificationStatus: 'SUPPORTED' } as never],
      patternsCount: 1,
    })
    expect(gate.canGenerate).toBe(true)
    expect(gate.status).toBe('ready')
  })
})
