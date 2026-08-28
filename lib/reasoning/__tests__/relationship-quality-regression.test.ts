import { describe, expect, it } from 'vitest'
import { alignJudgmentPropositions } from '@/lib/reasoning/judgment-lineage'
import { computeJudgmentConfidence } from '@/lib/reasoning/judgment-confidence'
import {
  compressVerifiedRelationships,
  strictifyPartialAgreements,
} from '@/lib/reasoning/relationship-compression'
import { assessGenericness } from '@/lib/reasoning/relationship-semantics'
import type { ReasoningClaim, ReasoningRelationship, RelationshipCluster } from '@/lib/reasoning/types'

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
    conceptIds: ['mcp'],
    relevanceScore: 0.8,
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

describe('relationship quality regression', () => {
  describe('Fixture A — duplicate agreement', () => {
    const c1 = claim('c1', 'source_1', 'MCP can be deployed effectively in production.')
    const c2 = claim('c2', 'source_2', 'MCP enables rapid deployment of AI tools.')
    const c3 = claim('c3', 'source_3', 'MCP has effective deployment capabilities.')

    const verified = [
      rel('r1', c1, c2, 'AGREEMENT', 'Both support practical MCP deployment.'),
      rel('r2', c1, c3, 'AGREEMENT', 'MCP deployment effectiveness.'),
      rel('r3', c2, c3, 'AGREEMENT', 'Rapid and effective MCP deployment.'),
    ]

    it('merges verified pairs into one relationship cluster', () => {
      const { clusters, significantClusters, stats } = compressVerifiedRelationships({
        verified,
        claims: [c1, c2, c3],
        evidence: [],
        centralQuestion: 'What is MCP and how significant is it?',
      })
      expect(stats.verifiedInput).toBe(3)
      expect(stats.normalizedPropositions).toBeLessThan(verified.length)
      expect(clusters.length).toBe(1)
      expect(significantClusters.length).toBe(1)
      expect(clusters[0].memberRelationshipIds.length).toBe(3)
    })
  })

  describe('Fixture B — genuine divide', () => {
    const a = claim('a', 'source_1', 'MCP reduces integration complexity.')
    const b = claim('b', 'source_2', 'MCP increases integration complexity compared with existing APIs.')

    it('preserves divide-type relationship in compression', () => {
      const verified = [
        rel('r1', a, b, 'CONTRADICTION', 'Opposing claims on integration complexity.'),
      ]
      const { significantClusters } = compressVerifiedRelationships({
        verified,
        claims: [a, b],
        evidence: [],
        centralQuestion: 'How does MCP affect integration?',
      })
      expect(significantClusters.some((c) => c.visualKind === 'divide')).toBe(true)
    })
  })

  describe('Fixture C — different dimension', () => {
    const a = claim('a', 'source_1', 'MCP is easy to use after installation.')
    const b = claim('b', 'source_2', 'Installing MCP requires API keys and configuration.')

    it('does not force contradiction on setup vs usability', () => {
      const verified = [
        rel('r1', a, b, 'COMPLEMENTARY', 'Setup work vs post-setup usability.'),
      ]
      const { verified: out } = strictifyPartialAgreements({
        verified,
        rejected: [],
        claims: [a, b],
      })
      expect(out.length).toBe(1)
      expect(out[0].type).not.toBe('CONTRADICTION')
    })
  })

  describe('Fixture D — unsupported judgment', () => {
    const cluster: RelationshipCluster = {
      id: 'cluster_1',
      canonicalClaim: 'MCP simplifies tool integration.',
      label: 'integration',
      type: 'AGREEMENT',
      dimension: 'integration',
      memberRelationshipIds: ['r1'],
      supportingClaimIds: ['c1', 'c2'],
      supportingSourceIds: ['source_1', 'source_2'],
      sourceCount: 2,
      sourcePairCount: 1,
      evidenceCount: 2,
      confidence: 'moderate',
      significanceScore: 0.6,
      noveltyScore: 0.5,
      evidenceStrength: 0.4,
      genericnessScore: 0.1,
      visualKind: 'agree',
      parentIds: [],
      childIds: ['r1'],
    }

    it('rejects unsupported market dominance proposition', () => {
      const judgment = {
        statement: 'MCP will dominate the AI market and penetrate faster than competitors.',
        whatIsSupported: 'MCP simplifies tool integration.',
        whatIsUncertain: '',
        keyReason: 'Verified integration cluster.',
        confidence: 'moderate' as const,
        missingEvidence: [],
        verificationStatus: 'SUPPORTED' as const,
      }
      const { judgment: out, propositions } = alignJudgmentPropositions({
        judgment,
        synthesis: null,
        significantClusters: [cluster],
        patterns: [],
        insights: [],
        knowledgeGaps: [],
        claims: [],
        evidence: [],
      })
      expect(out?.statement).toMatch(/integration/i)
      expect(out?.statement).not.toMatch(/dominate the ai market/i)
    })
  })

  describe('generic agreement suppression', () => {
    it('flags vague importance statements as generic', () => {
      expect(assessGenericness('MCP is important.').generic).toBe(true)
      expect(assessGenericness('MCP is significant in technology.').generic).toBe(true)
    })

    it('suppresses generic-only clusters from significant output', () => {
      const c1 = claim('c1', 'source_1', 'MCP is important.')
      const c2 = claim('c2', 'source_2', 'MCP is significant.')
      const verified = [
        rel('r1', c1, c2, 'AGREEMENT', 'Both say MCP is important.'),
      ]
      const { significantClusters, stats } = compressVerifiedRelationships({
        verified,
        claims: [c1, c2],
        evidence: [],
        centralQuestion: 'What is MCP?',
      })
      expect(significantClusters.length).toBe(0)
      expect(stats.genericRelationshipsSuppressed).toBeGreaterThan(0)
    })
  })

  describe('judgment confidence', () => {
    it('penalizes confidence when many pairs collapse to one cluster', () => {
      const cluster: RelationshipCluster = {
        id: 'cluster_1',
        canonicalClaim: 'MCP supports practical deployment.',
        label: 'deployment',
        type: 'AGREEMENT',
        dimension: 'adoption',
        memberRelationshipIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
        supportingClaimIds: ['c1', 'c2', 'c3'],
        supportingSourceIds: ['source_1', 'source_2'],
        sourceCount: 2,
        sourcePairCount: 3,
        evidenceCount: 4,
        confidence: 'moderate',
        significanceScore: 0.55,
        noveltyScore: 0.4,
        evidenceStrength: 0.3,
        genericnessScore: 0.2,
        visualKind: 'agree',
        parentIds: [],
        childIds: [],
      }
      const { confidence, factors } = computeJudgmentConfidence({
        judgment: {
          statement: 'MCP supports practical deployment.',
          whatIsSupported: 'Deployment usability.',
          whatIsUncertain: 'Market adoption.',
          keyReason: 'Cluster evidence.',
          confidence: 'high',
          missingEvidence: [],
          verificationStatus: 'SUPPORTED',
        },
        significantClusters: [cluster],
        relevantSourceCount: 3,
        verifiedPairCount: 7,
        propositions: [
          {
            proposition: 'MCP supports practical deployment.',
            supportStatus: 'SUPPORTED',
            clusterIds: ['cluster_1'],
            relationshipIds: ['r1'],
            claimIds: ['c1'],
            sourceIds: ['source_1'],
            evidenceIds: [],
          },
        ],
        knowledgeGaps: [{ id: 'g1', question: 'Market adoption?', whyItMatters: 'Scope', linkedJudgmentAspect: 'adoption' }],
        centralQuestion: 'What is MCP?',
      })
      expect(factors?.pairInflationPenalty).toBeGreaterThan(0)
      expect(confidence).not.toBe('high')
    })
  })
})
