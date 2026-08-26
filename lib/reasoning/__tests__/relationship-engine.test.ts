import { describe, expect, it } from 'vitest'
import {
  discoverDirectMatchCandidates,
  discoverHeuristicCandidates,
  discoverInferenceCandidates,
  discoverSemanticCandidates,
} from '@/lib/reasoning/candidate-discovery'
import { classifyClaimRole, filterReasoningClaims } from '@/lib/reasoning/claim-normalization'
import { scoreClaimRelevance } from '@/lib/reasoning/relevance-scoring'
import type { ReasoningClaim } from '@/lib/reasoning/types'

function makeClaim(
  id: string,
  sourceId: string,
  statement: string,
  opts?: Partial<ReasoningClaim>,
): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: sourceId,
    voiceIndex: Number(sourceId.replace(/\D/g, '') || '1'),
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: opts?.evidenceIds ?? ['ev1'],
    claimType: opts?.claimType ?? 'factual',
    confidence: opts?.confidence ?? 'strong',
    conceptIds: opts?.conceptIds ?? ['concept_mcp'],
    ...opts,
  }
}

describe('Relationship Engine v2 regression fixtures', () => {
  describe('CASE A — obvious agreement', () => {
    const a = makeClaim('a', 'source_1', 'MCP reduces integration complexity.')
    const b = makeClaim('b', 'source_2', 'MCP simplifies connecting AI tools.')

    it('discovers direct match candidate', () => {
      const candidates = discoverDirectMatchCandidates([a, b])
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates.some((c) => c.type === 'AGREEMENT' || c.type === 'PARTIAL_AGREEMENT')).toBe(
        true,
      )
    })
  })

  describe('CASE B — obvious contradiction', () => {
    const a = makeClaim('a', 'source_1', 'MCP makes implementation easier.')
    const b = makeClaim('b', 'source_2', 'MCP increases operational complexity.')

    it('discovers tension/contradiction candidate', () => {
      const candidates = discoverDirectMatchCandidates([a, b])
      expect(
        candidates.some((c) => c.type === 'CONTRADICTION' || c.type === 'TENSION'),
      ).toBe(true)
    })
  })

  describe('CASE C — problem solution', () => {
    const a = makeClaim('a', 'source_1', 'Developers struggle with fragmented APIs.')
    const b = makeClaim('b', 'source_2', 'MCP creates a common protocol for tools.')

    it('discovers problem_solution semantic candidate', () => {
      const candidates = discoverSemanticCandidates([a, b])
      expect(candidates.some((c) => c.type === 'PROBLEM_SOLUTION')).toBe(true)
    })
  })

  describe('CASE D — mechanism outcome', () => {
    const a = makeClaim('a', 'source_1', 'MCP standardizes tool communication.')
    const b = makeClaim('b', 'source_2', 'Developers need less custom integration code.')

    it('discovers mechanism_outcome candidate', () => {
      const candidates = discoverSemanticCandidates([a, b])
      expect(candidates.some((c) => c.type === 'MECHANISM_OUTCOME')).toBe(true)
    })
  })

  describe('CASE E — topic similarity only', () => {
    const a = makeClaim('a', 'source_1', 'MCP was announced recently.')
    const b = makeClaim('b', 'source_2', 'MCP documentation is available online.')

    it('does not produce strong direct match', () => {
      const heuristic = discoverHeuristicCandidates([a, b])
      const strongDirect = heuristic.direct.filter((c) => c.confidence === 'strong')
      expect(strongDirect.length).toBe(0)
    })
  })

  describe('CASE F — unrelated', () => {
    const a = makeClaim('a', 'source_1', 'MCP improves AI integration.')
    const b = makeClaim(
      'b',
      'source_2',
      'Anyone can achieve their dreams regardless of age.',
      { conceptIds: ['concept_other'] },
    )

    it('does not discover meaningful candidates', () => {
      const heuristic = discoverHeuristicCandidates([a, b])
      expect(heuristic.all.length).toBe(0)
    })
  })

  describe('CASE G — cross-source inference', () => {
    const a = makeClaim('a', 'source_1', 'MCP reduces integration friction.')
    const b = makeClaim(
      'b',
      'source_2',
      'Teams resist tools requiring workflow changes.',
      { conceptIds: ['concept_org'] },
    )

    it('discovers inference candidate for adoption friction', () => {
      const candidates = discoverInferenceCandidates([a, b])
      expect(candidates.length).toBeGreaterThan(0)
      expect(
        candidates.some(
          (c) =>
            c.discoveryLevel === 'CROSS_SOURCE_INFERENCE' &&
            (c.type === 'ENABLER' || c.type === 'ADOPTION_BARRIER'),
        ),
      ).toBe(true)
    })
  })

  describe('CASE H — partial source relevance', () => {
    const tutorial = makeClaim('t1', 'source_1', 'Users should click edit to open settings.')
    const apiKey = makeClaim('t2', 'source_1', 'API key is displayed in the middle of the screen.')
    const arch = makeClaim(
      't3',
      'source_1',
      'MCP standardizes communication between AI tools and applications.',
    )

    it('classifies procedural claims separately from core arguments', () => {
      expect(classifyClaimRole(tutorial.statement)).toBe('PROCEDURAL')
      expect(classifyClaimRole(apiKey.statement)).toBe('PROCEDURAL')
      expect(classifyClaimRole(arch.statement)).toBe('CORE_ARGUMENT')
    })

    it('keeps architecture claim for reasoning, excludes procedural', () => {
      const filtered = filterReasoningClaims([tutorial, apiKey, arch], 'What is MCP?')
      expect(filtered.some((c) => c.id === 't3')).toBe(true)
      expect(filtered.some((c) => c.id === 't1')).toBe(false)
    })

    it('scores architecture claim highly for MCP question', () => {
      const score = scoreClaimRelevance(arch, 'What is MCP and why is it significant?')
      expect(score).toBeGreaterThan(0.3)
    })
  })
})
