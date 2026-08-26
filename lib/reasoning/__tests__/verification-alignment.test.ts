import { describe, expect, it } from 'vitest'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import {
  AGREEMENT_RELATIONSHIP_TYPES,
  assessVerificationAlignment,
  passesVerificationPreGate,
  passesVerificationPostGate,
} from '@/lib/reasoning/verification-alignment'
import type { ReasoningClaim } from '@/lib/reasoning/types'

function claim(
  id: string,
  sourceId: string,
  statement: string,
  conceptIds: string[] = ['concept_mcp'],
): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: `yt${sourceId.split('_')[1] ?? '1'}`,
    voiceIndex: Number(sourceId.split('_')[1] ?? 1),
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: ['ev1'],
    claimType: 'factual',
    confidence: 'strong',
    conceptIds,
  }
}

describe('relationship verification alignment fixtures', () => {
  it('CASE A — AGREEMENT accepted at pre-gate', () => {
    const a = claim('a', 'source_1', 'MCP reduces integration complexity.')
    const b = claim('b', 'source_2', 'MCP simplifies integration between AI applications.')
    const scores = passesVerificationPreGate(a, b, 'AGREEMENT')
    expect(scores.passed).toBe(true)
    expect(scores.failedConditions).toHaveLength(0)
  })

  it('CASE B — COMPLEMENTARY accepted at pre-gate', () => {
    const a = claim('a', 'source_1', 'MCP reduces integration complexity.')
    const b = claim(
      'b',
      'source_2',
      'Reduced integration complexity can accelerate deployment.',
    )
    const scores = passesVerificationPreGate(a, b, 'COMPLEMENTARY')
    expect(scores.passed).toBe(true)
  })

  it('CASE C — CONTRADICTION accepted at pre-gate', () => {
    const a = claim('a', 'source_1', 'MCP significantly reduces integration complexity.')
    const b = claim('b', 'source_2', 'MCP adds substantial integration complexity.')
    const scores = passesVerificationPreGate(a, b, 'CONTRADICTION')
    expect(scores.passed).toBe(true)
    expect(scores.polarity).toBe('OPPOSE')
  })

  it('CASE D — unrelated pair rejected', () => {
    const a = claim('a', 'source_1', 'MCP reduces integration complexity.')
    const b = claim('b', 'source_2', 'YouTube videos about AI are becoming popular.')
    const scores = passesVerificationPreGate(a, b, 'AGREEMENT')
    expect(scores.passed).toBe(false)
    expect(scores.failedConditions.length).toBeGreaterThan(0)
  })

  it('CASE E — superficial MCP overlap not AGREEMENT', () => {
    const a = claim(
      'a',
      'source_1',
      'MCP server installation requires a desktop application.',
    )
    const b = claim(
      'b',
      'source_2',
      'MCP is becoming an important AI industry standard.',
    )
    const pre = passesVerificationPreGate(a, b, 'AGREEMENT')
    const post = passesVerificationPostGate(a, b, 'AGREEMENT')
    expect(AGREEMENT_RELATIONSHIP_TYPES.has('AGREEMENT')).toBe(true)
    expect(post.passed).toBe(false)
  })

  it('user friction / deployment speed complementary pair passes pre-gate', () => {
    const a = claim(
      'a',
      'source_1',
      'MCP offers a more user-friendly experience than API, which leads to faster adoption.',
    )
    const b = claim(
      'b',
      'source_2',
      "MCP integrated solutions can be deployed more quickly than disparate API systems.",
    )
    const scores = assessVerificationAlignment(a, b, 'COMPLEMENTARY')
    expect(scores.passed).toBe(true)
    const heuristic = discoverHeuristicCandidates([a, b])
    expect(heuristic.all.length).toBeGreaterThan(0)
  })
})
