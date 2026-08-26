import { describe, expect, it } from 'vitest'
import {
  deriveConsensusFromRelationships,
  filterEmergentInsights,
  filterSurvivalClaims,
  filterVerifiedRelationships,
  isTopicLabelClaim,
} from '@/lib/survival/quality'
import type { EmergentInsight, SurvivalClaim, SurvivalRelationship } from '@/lib/survival/types'

const claim = (overrides: Partial<SurvivalClaim> & { claimId: string }): SurvivalClaim => ({
  videoId: 'v1',
  sourceId: 's1',
  voiceIndex: 1,
  claim: 'MCP reduces integration complexity between AI tools.',
  evidence: 'They said MCP simplifies tool connections.',
  timestamp: 120,
  confidence: 'strong',
  ...overrides,
})

describe('filterSurvivalClaims', () => {
  it('drops topic labels and weak claims', () => {
    const claims = filterSurvivalClaims([
      claim({ claimId: 'c1' }),
      claim({ claimId: 'c2', claim: 'MCP', confidence: 'strong' }),
      claim({
        claimId: 'c3',
        claim: 'Weak claim without enough substance.',
        confidence: 'weak',
      }),
    ])
    expect(claims).toHaveLength(1)
    expect(claims[0].claimId).toBe('c1')
  })

  it('deduplicates similar claims', () => {
    const claims = filterSurvivalClaims([
      claim({ claimId: 'c1' }),
      claim({
        claimId: 'c2',
        claim: '  mcp reduces integration complexity between ai tools. ',
      }),
    ])
    expect(claims).toHaveLength(1)
  })
})

describe('isTopicLabelClaim', () => {
  it('flags short topic-like strings', () => {
    expect(isTopicLabelClaim('MCP ecosystem')).toBe(true)
    expect(isTopicLabelClaim('MCP reduces integration complexity between AI tools.')).toBe(false)
  })
})

describe('filterVerifiedRelationships', () => {
  it('removes INDEPENDENT and same-video pairs', () => {
    const claims = new Map([
      ['a', claim({ claimId: 'a', videoId: 'v1' })],
      ['b', claim({ claimId: 'b', videoId: 'v2', sourceId: 's2' })],
    ])
    const verified = filterVerifiedRelationships(
      [
        {
          id: 'r1',
          fromClaimId: 'a',
          toClaimId: 'b',
          fromVideoId: 'v1',
          toVideoId: 'v2',
          type: 'AGREEMENT',
          explanation: 'Both argue MCP simplifies integrations for developers.',
          confidence: 'strong',
        },
        {
          id: 'r2',
          fromClaimId: 'a',
          toClaimId: 'b',
          fromVideoId: 'v1',
          toVideoId: 'v2',
          type: 'INDEPENDENT',
          explanation: 'Different topics',
          confidence: 'strong',
        },
      ],
      claims,
    )
    expect(verified).toHaveLength(1)
    expect(verified[0].type).toBe('AGREEMENT')
  })
})

describe('deriveConsensusFromRelationships', () => {
  it('builds consensus from verified agreement relationships', () => {
    const claims = new Map([
      ['a', claim({ claimId: 'a', videoId: 'v1' })],
      ['b', claim({ claimId: 'b', videoId: 'v2', sourceId: 's2' })],
    ])
    const consensus = deriveConsensusFromRelationships(
      [
        {
          id: 'r1',
          fromClaimId: 'a',
          toClaimId: 'b',
          fromVideoId: 'v1',
          toVideoId: 'v2',
          type: 'AGREEMENT',
          explanation: 'Both claim MCP reduces glue code.',
          confidence: 'moderate',
        },
      ],
      claims,
      [],
    )
    expect(consensus).toHaveLength(1)
    expect(consensus[0].supportingVideoIds).toEqual(['v1', 'v2'])
  })
})

describe('filterEmergentInsights', () => {
  it('requires cross-video reasoning path', () => {
    const claims = [
      claim({ claimId: 'a', videoId: 'v1' }),
      claim({ claimId: 'b', videoId: 'v2', sourceId: 's2' }),
    ]
    const claimById = new Map(claims.map((c) => [c.claimId, c]))
    const rel: SurvivalRelationship = {
      id: 'rel_1',
      fromClaimId: 'a',
      toClaimId: 'b',
      fromVideoId: 'v1',
      toVideoId: 'v2',
      type: 'COMPLEMENTARY',
      explanation: 'Together they show adoption is early but promising.',
      confidence: 'moderate',
    }
    const insight: EmergentInsight = {
      id: 'e1',
      statement:
        'Adopting MCP for developer tooling is reasonable now, but production infra should wait for security standards.',
      confidence: 'moderate',
      reasoningPath: [
        { step: 'claim', refId: 'a', label: 'MCP reduces integration complexity' },
        { step: 'relationship', refId: 'rel_1', label: 'Complements security caution' },
        { step: 'claim', refId: 'b', label: 'Security standards are immature' },
      ],
    }
    const filtered = filterEmergentInsights(
      [insight],
      claims,
      claimById,
      new Map([['rel_1', rel]]),
    )
    expect(filtered).toHaveLength(1)
  })
})
