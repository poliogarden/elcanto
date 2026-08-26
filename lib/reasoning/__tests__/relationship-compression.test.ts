import { describe, expect, it } from 'vitest'
import { assessGenericness } from '@/lib/reasoning/relationship-semantics'
import {
  compressVerifiedRelationships,
  strictifyPartialAgreements,
} from '@/lib/reasoning/relationship-compression'
import { filterInsightsForIntegrity, validateJudgmentGrounding } from '@/lib/reasoning/evidence-integrity'
import type { ReasoningClaim, ReasoningRelationship } from '@/lib/reasoning/types'

function claim(
  id: string,
  sourceId: string,
  statement: string,
  opts?: Partial<ReasoningClaim>,
): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: sourceId,
    voiceIndex: Number(sourceId.replace(/\D/g, '') || 1),
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: opts?.evidenceIds ?? ['ev1'],
    claimType: 'factual',
    confidence: 'strong',
    conceptIds: ['mcp'],
    relevanceScore: 0.8,
    ...opts,
  }
}

function rel(
  id: string,
  from: ReasoningClaim,
  to: ReasoningClaim,
  type: ReasoningRelationship['type'],
  explanation: string,
): ReasoningRelationship {
  return {
    id,
    type,
    fromClaimId: from.id,
    toClaimId: to.id,
    fromSourceId: from.sourceId,
    toSourceId: to.sourceId,
    fromVideoId: from.videoId,
    toVideoId: to.videoId,
    explanation,
    confidence: 'moderate',
    verificationStatus: 'SUPPORTED',
    discoveryLevel: 'DIRECT_MATCH',
  }
}

describe('Relationship Engine v2.1', () => {
  describe('CASE A — similar videos, redundant agreements', () => {
    const c1 = claim('c1', 'source_1', 'MCP standardizes tool communication across AI systems.')
    const c2 = claim('c2', 'source_2', 'MCP provides a common protocol for AI tool integration.')
    const c3 = claim('c3', 'source_3', 'MCP simplifies connecting AI tools via a shared interface.')

    const verified = [
      rel('r1', c1, c2, 'AGREEMENT', 'Both describe MCP as standardizing integration.'),
      rel('r2', c1, c3, 'AGREEMENT', 'Both claim MCP simplifies tool connection.'),
      rel('r3', c2, c3, 'PARTIAL_AGREEMENT', 'MCP integration is easier with a common protocol.'),
    ]

    it('compresses many agreements into few clusters', () => {
      const { clusters, significantClusters, stats } = compressVerifiedRelationships({
        verified,
        claims: [c1, c2, c3],
        evidence: [],
        centralQuestion: 'What is MCP and why is it significant?',
      })
      expect(stats.verifiedInput).toBe(3)
      expect(clusters.length).toBeLessThan(verified.length)
      expect(significantClusters.length).toBeLessThanOrEqual(verified.length)
      expect(stats.duplicateRelationshipsMerged).toBeGreaterThan(0)
    })
  })

  describe('CASE F — same proposition repeated', () => {
    const a = claim('a', 'source_1', 'MCP improves interoperability across tools.')
    const b = claim('b', 'source_2', 'MCP makes AI tools easier to integrate.')
    const c = claim('c', 'source_1', 'MCP reduces custom integration code.')
    const d = claim('d', 'source_2', 'MCP standardizes how tools connect.')

    const verified = [
      rel('r1', a, b, 'AGREEMENT', 'Integration interoperability'),
      rel('r2', c, b, 'AGREEMENT', 'Integration interoperability'),
      rel('r3', a, d, 'AGREEMENT', 'Integration interoperability'),
      rel('r4', c, d, 'AGREEMENT', 'Integration interoperability'),
    ]

    it('merges into one cluster with multiple evidence links', () => {
      const { clusters, significantClusters } = compressVerifiedRelationships({
        verified,
        claims: [a, b, c, d],
        evidence: [],
        centralQuestion: 'How does MCP affect integration?',
      })
      expect(clusters.length).toBe(1)
      expect(clusters[0].memberRelationshipIds.length).toBe(4)
      expect(clusters[0].evidenceCount).toBeGreaterThan(0)
      expect(significantClusters.length).toBe(1)
    })
  })

  describe('CASE E — knowledge gap must not ground judgment', () => {
    it('rejects judgment grounded only in gap terms', () => {
      const gaps = [
        {
          id: 'g1',
          question: 'How does MCP compare with other emerging API technologies?',
          whyItMatters: 'Competitive context',
          linkedJudgmentAspect: 'comparison',
        },
      ]
      const judgment = {
        statement: "MCP's competitive position against emerging API technologies remains unclear.",
        whatIsSupported: '',
        whatIsUncertain: '',
        keyReason: '',
        confidence: 'low' as const,
        missingEvidence: [],
        verificationStatus: 'SUPPORTED' as const,
      }
      const { judgment: out, unsupportedRemoved } = validateJudgmentGrounding({
        judgment,
        significantClusters: [],
        patterns: [],
        knowledgeGaps: gaps,
      })
      expect(out).toBeNull()
      expect(unsupportedRemoved).toBe(1)
    })
  })

  describe('genericness filter', () => {
    it('flags vague importance statements', () => {
      const g = assessGenericness('MCP is important in the industry.')
      expect(g.generic).toBe(true)
    })

    it('allows specific mechanism statements', () => {
      const g = assessGenericness(
        'MCP is important because standardization removes tool-specific integration layers.',
      )
      expect(g.hasMechanism).toBe(true)
      expect(g.generic).toBe(false)
    })
  })

  describe('PARTIAL_AGREEMENT strict', () => {
    it('rejects partial agreement on different dimensions', () => {
      const a = claim('a', 'source_1', 'MCP improves integration.')
      const b = claim('b', 'source_2', 'MCP is receiving industry attention.')
      const verified = [
        rel('r1', a, b, 'PARTIAL_AGREEMENT', 'Both mention MCP but different points.'),
      ]
      const { verified: out, partialRejected } = strictifyPartialAgreements({
        verified,
        rejected: [],
        claims: [a, b],
      })
      expect(out.length).toBe(0)
      expect(partialRejected).toBe(1)
    })
  })

  describe('emergent insight integrity', () => {
    it('filters insights without significant relationship backing', () => {
      const insights = [
        {
          id: 'i1',
          type: 'combined_implication' as const,
          statement: 'MCP may dominate all APIs.',
          explanation: 'Speculation',
          sourceIds: ['source_1', 'source_2'],
          claimIds: ['c1'],
          relationshipIds: ['rel_unknown'],
          patternIds: [],
          evidencePath: [
            { step: 'claim' as const, refId: 'c1', label: 'c1' },
            { step: 'relationship' as const, refId: 'rel_unknown', label: 'r' },
            { step: 'inference' as const, refId: 'i1', label: 'i' },
          ],
          confidence: 'low' as const,
          verificationStatus: 'SUPPORTED' as const,
        },
      ]
      const filtered = filterInsightsForIntegrity({
        insights,
        significantClusterIds: new Set(['cluster_1']),
        significantRelationshipIds: new Set(['rel_1']),
        patternIds: new Set(),
        knowledgeGaps: [],
      })
      expect(filtered.length).toBe(0)
    })
  })
})
