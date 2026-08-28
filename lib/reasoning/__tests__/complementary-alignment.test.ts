import { describe, expect, it } from 'vitest'
import {
  MCP_VALID_AGREEMENT_FIXTURE,
  MCP_FALSE_COMPLEMENTARY_FIXTURE,
} from '@/evals/fixtures/mcp-complementary-precision'
import { assessMinimumSharedProposition } from '@/lib/reasoning/proposition-alignment'
import { assessComplementarySharedExplanation } from '@/lib/reasoning/complementary-alignment'
import type { ReasoningClaim } from '@/lib/reasoning/types'

function claim(id: string, sourceId: string, statement: string): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: sourceId,
    voiceIndex: 1,
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: ['ev1'],
    claimType: 'factual',
    confidence: 'strong',
    conceptIds: ['concept_mcp'],
  }
}

describe('complementary alignment closure', () => {
  it('rejects protocol/interaction vs marketplace discourse false complementary', () => {
    const a = claim(
      'a',
      'source_1',
      'MCP facilitates interaction between AI systems as a standard protocol.',
    )
    const b = claim(
      'b',
      'source_2',
      'There is a persistence of discourse around MCP in the marketplace.',
    )
    const result = assessComplementarySharedExplanation(
      a,
      b,
      'Both claims speak to different facets of MCP, which can be seen as interlinked concepts.',
    )
    expect(result.passed).toBe(false)
    expect(result.rejectionReason).toBe('DIFFERENT_DIMENSION')
  })

  it('accepts mechanism + outcome integration complementary pair', () => {
    const a = claim('a', 'source_1', 'MCP standardizes tool interfaces.')
    const b = claim(
      'b',
      'source_2',
      'This reduces the need to implement separate integrations.',
    )
    const result = assessComplementarySharedExplanation(a, b)
    expect(result.passed).toBe(true)
    expect(result.addedInference).toBe(false)
  })

  it('preserves valid agreement fixture', () => {
    const a = claim('a', 'source_1', MCP_VALID_AGREEMENT_FIXTURE.fromClaimText)
    const b = claim('b', 'source_2', MCP_VALID_AGREEMENT_FIXTURE.toClaimText)
    const result = assessMinimumSharedProposition(a, b)
    expect(result.passed).toBe(true)
  })

  it('flags false complementary fixture as DIFFERENT_DIMENSION', () => {
    const a = claim('a', 'source_1', MCP_FALSE_COMPLEMENTARY_FIXTURE.fromClaimText)
    const b = claim('b', 'source_2', MCP_FALSE_COMPLEMENTARY_FIXTURE.toClaimText)
    const result = assessComplementarySharedExplanation(
      a,
      b,
      MCP_FALSE_COMPLEMENTARY_FIXTURE.explanation,
    )
    expect(result.passed).toBe(false)
    expect(MCP_FALSE_COMPLEMENTARY_FIXTURE.expectedAudit).toBe('FALSE_COMPLEMENTARY')
  })
})
