import { describe, expect, it } from 'vitest'
import { alignJudgmentPropositions } from '@/lib/reasoning/judgment-lineage'
import type { ReasoningClaim, ReasoningRelationship, RelationshipCluster } from '@/lib/reasoning/types'

describe('judgment lineage provenance', () => {
  it('preserves both source ids from verified cross-source relationship', () => {
    const claims: ReasoningClaim[] = [
      {
        id: 'source_1_claim_1',
        sourceId: 'source_1',
        statement: 'MCP has created a stir in the AI industry.',
        normalizedStatement: 'mcp has created a stir in the ai industry',
        evidenceIds: ['ev1'],
        claimType: 'factual',
        confidence: 'moderate',
        conceptIds: [],
      },
      {
        id: 'source_2_claim_1',
        sourceId: 'source_2',
        statement: 'MCP has become a hot topic of discussion recently.',
        normalizedStatement: 'mcp has become a hot topic of discussion recently',
        evidenceIds: ['ev2'],
        claimType: 'factual',
        confidence: 'moderate',
        conceptIds: [],
      },
    ]

    const verified: ReasoningRelationship[] = [
      {
        id: 'rel_1',
        type: 'AGREEMENT',
        fromClaimId: 'source_1_claim_1',
        toClaimId: 'source_2_claim_1',
        fromSourceId: 'source_1',
        toSourceId: 'source_2',
        explanation: 'Both describe MCP attention in the industry.',
        confidence: 'moderate',
      },
    ]

    const clusters: RelationshipCluster[] = [
      {
        id: 'cluster_1',
        canonicalClaim: 'MCP has created a stir in the AI industry.',
        memberRelationshipIds: ['rel_1'],
        supportingClaimIds: ['source_2_claim_1'],
        supportingSourceIds: ['source_2'],
        sourceCount: 2,
        relationshipType: 'AGREEMENT',
        significanceScore: 0.5,
        visualKind: 'agreement',
        confidence: 'moderate',
      },
    ]

    const { propositions } = alignJudgmentPropositions({
      judgment: {
        statement: 'MCP has created a stir in the AI industry.',
        confidence: 'moderate',
        whatIsSupported: '',
        keyReason: '',
        whatIsUncertain: '',
        missingEvidence: [],
        reasoningSteps: [],
        limitations: [],
      },
      synthesis: null,
      significantClusters: clusters,
      patterns: [],
      insights: [],
      knowledgeGaps: [],
      claims,
      evidence: [],
      verifiedRelationships: verified,
    })

    const stmtProp = propositions[0]
    expect(stmtProp?.sourceIds).toContain('source_1')
    expect(stmtProp?.sourceIds).toContain('source_2')
    expect(stmtProp?.claimIds).toContain('source_1_claim_1')
    expect(stmtProp?.claimIds).toContain('source_2_claim_1')
  })
})
