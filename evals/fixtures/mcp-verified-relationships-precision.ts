import type { ReasoningClaim } from '@/lib/reasoning/types'

export type VerifiedRelationshipPrecisionExpectation = {
  relationshipId: string
  fromClaimId: string
  toClaimId: string
  fromClaimText: string
  toClaimText: string
  type: string
  explanation: string
  expectedAudit: 'VALID' | 'FALSE_AGREEMENT' | 'UNCERTAIN'
}

export const MCP_VERIFIED_RELATIONSHIP_PRECISION_FIXTURE: VerifiedRelationshipPrecisionExpectation[] = [
  {
    relationshipId: 'rel_3',
    fromClaimId: 'source_1_sec9_claim_1',
    toClaimId: 'source_2_sec8_claim_1',
    fromClaimText: 'MCP represents a significant breakthrough in the AI industry.',
    toClaimText:
      'MCP stories dominate the landscape of YouTube content, suggesting their significant influence in current media discussions.',
    type: 'AGREEMENT',
    explanation:
      'The agreement stems from both claims recognizing the prominence of MCP in media discussions, reflecting its significant influence.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
  {
    relationshipId: 'rel_4',
    fromClaimId: 'source_1_sec9_claim_1',
    toClaimId: 'source_2_sec10_claim_1',
    fromClaimText: 'MCP represents a significant breakthrough in the AI industry.',
    toClaimText:
      'MCP has gained significant attention in the tech community, highlighting a shift in market interests toward MCP.',
    type: 'AGREEMENT',
    explanation:
      'Both claims highlight the surging attention and significance of MCP within the tech community, indicating a similar recognition of its status.',
    expectedAudit: 'VALID',
  },
  {
    relationshipId: 'rel_6',
    fromClaimId: 'source_1_sec4_claim_1',
    toClaimId: 'source_2_sec9_claim_1',
    fromClaimText:
      'The emergence of MCP highlights previous limitations of AI and contrasts current capabilities with past constraints.',
    toClaimText: 'MCP has foundational aspects that are significant in the current market context.',
    type: 'AGREEMENT',
    explanation:
      'Both claims convey a message about the relevance of MCP as a breakthrough in the AI industry and its importance in the market discussion.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
  {
    relationshipId: 'rel_7',
    fromClaimId: 'source_1_sec4_claim_1',
    toClaimId: 'source_2_sec43_claim_1',
    fromClaimText:
      'The emergence of MCP highlights previous limitations of AI and contrasts current capabilities with past constraints.',
    toClaimText:
      'MCP tools are significant in the context of the discussion, though no specific tools are mentioned.',
    type: 'AGREEMENT',
    explanation:
      'Both claims recognize the significance of MCP tools in their respective discussions, emphasizing their impact within the AI framework.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
  {
    relationshipId: 'rel_8',
    fromClaimId: 'source_1_sec4_claim_1',
    toClaimId: 'source_2_sec8_claim_1',
    fromClaimText:
      'The emergence of MCP highlights previous limitations of AI and contrasts current capabilities with past constraints.',
    toClaimText:
      'MCP stories dominate the landscape of YouTube content, suggesting their significant influence in current media discussions.',
    type: 'AGREEMENT',
    explanation:
      'Each claim discusses the dominance of MCP storytelling in media, signifying its impactful role in current narratives within the AI sector.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
  {
    relationshipId: 'rel_9',
    fromClaimId: 'source_1_sec4_claim_1',
    toClaimId: 'source_2_sec36_claim_1',
    fromClaimText:
      'The emergence of MCP highlights previous limitations of AI and contrasts current capabilities with past constraints.',
    toClaimText:
      'The segment introduces MCP tools, suggesting their significance in the context of previous discussions about AI or market strategies.',
    type: 'AGREEMENT',
    explanation:
      'Both claims refer to the significance of MCP tools in the context of AI discussions, reinforcing their relevance in ongoing dialogues.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
  {
    relationshipId: 'rel_10',
    fromClaimId: 'source_1_sec4_claim_1',
    toClaimId: 'source_2_sec42_claim_1',
    fromClaimText:
      'The emergence of MCP highlights previous limitations of AI and contrasts current capabilities with past constraints.',
    toClaimText: 'MCP tools are in ongoing development, with a release status being discussed.',
    type: 'AGREEMENT',
    explanation:
      'This relationship highlights that both claims speak to the ongoing development and relevance of MCP, given its prominence in the current discussion.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
  {
    relationshipId: 'rel_11',
    fromClaimId: 'source_1_sec3_claim_1',
    toClaimId: 'source_2_sec9_claim_1',
    fromClaimText:
      'The speaker observes: This section introduces MCP as a pivotal element in the AI ecosystem that has recently emerged. It emphasizes the significance of this development and its potential implications for the future of AI.',
    toClaimText: 'MCP has foundational aspects that are significant in the current market context.',
    type: 'AGREEMENT',
    explanation:
      'Both claims recognize MCP as a critical breakthrough and its relevance in the current market framework, emphasizing its significance in AI development.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
  {
    relationshipId: 'rel_12',
    fromClaimId: 'source_1_sec3_claim_1',
    toClaimId: 'source_2_sec43_claim_1',
    fromClaimText:
      'The speaker observes: This section introduces MCP as a pivotal element in the AI ecosystem that has recently emerged. It emphasizes the significance of this development and its potential implications for the future of AI.',
    toClaimText:
      'MCP tools are significant in the context of the discussion, though no specific tools are mentioned.',
    type: 'AGREEMENT',
    explanation:
      'Both claims confirm the importance of MCP tools in conversations about AI, reinforcing their essential role within the technology sector discussion.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
  {
    relationshipId: 'rel_13',
    fromClaimId: 'source_1_sec3_claim_1',
    toClaimId: 'source_2_sec36_claim_1',
    fromClaimText:
      'The speaker observes: This section introduces MCP as a pivotal element in the AI ecosystem that has recently emerged. It emphasizes the significance of this development and its potential implications for the future of AI.',
    toClaimText:
      'The segment introduces MCP tools, suggesting their significance in the context of previous discussions about AI or market strategies.',
    type: 'AGREEMENT',
    explanation:
      'Both claims bring attention to MCP, highlighting its emerging significance in the landscape of AI technologies and discussions.',
    expectedAudit: 'FALSE_AGREEMENT',
  },
]

export function buildPrecisionFixtureClaims(): ReasoningClaim[] {
  const entries = new Map<string, ReasoningClaim>()
  for (const row of MCP_VERIFIED_RELATIONSHIP_PRECISION_FIXTURE) {
    if (!entries.has(row.fromClaimId)) {
      entries.set(row.fromClaimId, {
        id: row.fromClaimId,
        sourceId: row.fromClaimId.startsWith('source_1') ? 'source_1' : 'source_2',
        videoId: 'fixture',
        voiceIndex: 1,
        statement: row.fromClaimText,
        normalizedStatement: row.fromClaimText.toLowerCase(),
        evidenceIds: ['ev1'],
        claimType: 'factual',
        confidence: 'strong',
        conceptIds: ['concept_mcp'],
      })
    }
    if (!entries.has(row.toClaimId)) {
      entries.set(row.toClaimId, {
        id: row.toClaimId,
        sourceId: row.toClaimId.startsWith('source_1') ? 'source_1' : 'source_2',
        videoId: 'fixture',
        voiceIndex: 2,
        statement: row.toClaimText,
        normalizedStatement: row.toClaimText.toLowerCase(),
        evidenceIds: ['ev2'],
        claimType: 'factual',
        confidence: 'strong',
        conceptIds: ['concept_mcp'],
      })
    }
  }
  return [...entries.values()]
}

export function buildPrecisionExpectationMap(): Map<string, 'VALID' | 'FALSE_AGREEMENT' | 'UNCERTAIN'> {
  return new Map(
    MCP_VERIFIED_RELATIONSHIP_PRECISION_FIXTURE.map((row) => [row.relationshipId, row.expectedAudit]),
  )
}
