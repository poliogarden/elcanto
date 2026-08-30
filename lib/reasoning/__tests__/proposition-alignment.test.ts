import { describe, expect, it } from 'vitest'
import {
  MCP_VERIFIED_RELATIONSHIP_PRECISION_FIXTURE,
  buildPrecisionExpectationMap,
  buildPrecisionFixtureClaims,
} from '@/evals/fixtures/mcp-verified-relationships-precision'
import {
  assessMinimumSharedProposition,
  assessRelationshipPropositionFidelity,
  auditRelationshipPrecision,
} from '@/lib/reasoning/proposition-alignment'
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

describe('proposition alignment precision', () => {
  describe('false agreement rejection', () => {
    it('rejects limitations/history vs YouTube media dominance', () => {
      const a = claim(
        'a',
        'source_1',
        'The emergence of MCP highlights previous limitations of AI and contrasts current capabilities with past constraints.',
      )
      const b = claim(
        'b',
        'source_2',
        'MCP stories dominate the landscape of YouTube content, suggesting their significant influence in current media discussions.',
      )
      const result = assessMinimumSharedProposition(a, b)
      expect(result.passed).toBe(false)
      expect(result.rejectionReason).toBe('DIFFERENT_DIMENSION')
    })

    it('rejects limitations/history vs ongoing tool development', () => {
      const a = claim(
        'a',
        'source_1',
        'The emergence of MCP highlights previous limitations of AI and contrasts current capabilities with past constraints.',
      )
      const b = claim(
        'b',
        'source_2',
        'MCP tools are in ongoing development, with a release status being discussed.',
      )
      const result = assessMinimumSharedProposition(a, b)
      expect(result.passed).toBe(false)
      expect(result.rejectionReason).toBe('DIFFERENT_DIMENSION')
    })

    it('rejects relationship proposition hallucination in media storytelling explanation', () => {
      const a = claim(
        'a',
        'source_1',
        'The emergence of MCP highlights previous limitations of AI and contrasts current capabilities with past constraints.',
      )
      const b = claim(
        'b',
        'source_2',
        'MCP stories dominate the landscape of YouTube content, suggesting their significant influence in current media discussions.',
      )
      const fidelity = assessRelationshipPropositionFidelity(
        a,
        b,
        'Each claim discusses the dominance of MCP storytelling in media, signifying its impactful role in current narratives within the AI sector.',
      )
      expect(fidelity.pass).toBe(false)
      expect(fidelity.reason).toBe('RELATIONSHIP_PROPOSITION_HALLUCINATION')
    })
  })

  describe('genuine agreement preservation', () => {
    it('accepts stir in AI industry vs attention in tech community', () => {
      const a = claim(
        'a',
        'source_1',
        'MCP has created a stir in the AI industry.',
      )
      const b = claim(
        'b',
        'source_2',
        'MCP has gained significant attention in the tech community.',
      )
      const result = assessMinimumSharedProposition(a, b)
      expect(result.passed).toBe(true)
      expect(result.entailedByA).toBe(true)
      expect(result.entailedByB).toBe(true)
      expect(result.abstractionLevel).not.toBe('GENERIC_TOPIC')
    })

    it('accepts breakthrough vs gained attention paraphrase', () => {
      const a = claim(
        'a',
        'source_1',
        'MCP represents a significant breakthrough in the AI industry.',
      )
      const b = claim(
        'b',
        'source_2',
        'MCP has gained significant attention in the tech community.',
      )
      const result = assessMinimumSharedProposition(a, b)
      expect(result.passed).toBe(true)
    })

    it('accepts attic insulation R-49 agreement without abstract cold-climate proposition', () => {
      const a = claim(
        'a',
        'source_1',
        'Building codes in cold climates recommend attic insulation with an R-value of at least R-49 for retrofit projects.',
      )
      const b = claim(
        'b',
        'source_2',
        'Attic retrofits in northern regions typically target R-49 to R-60 insulation levels to minimize heat loss.',
      )
      const result = assessMinimumSharedProposition(
        a,
        b,
        'Both claims agree that attic retrofits use high R-value insulation in cold regions.',
      )
      expect(result.passed).toBe(true)
      expect(result.entailedByA).toBe(true)
      expect(result.entailedByB).toBe(true)
      expect(result.addedInference).toBe(false)
      expect(result.sharedProposition).toBe('attic retrofit insulation levels target R-49')
    })
  })

  describe('MCP verified relationship precision fixture', () => {
    it('flags known false agreements and preserves valid attention paraphrase', () => {
      const claims = buildPrecisionFixtureClaims()
      const relationships = MCP_VERIFIED_RELATIONSHIP_PRECISION_FIXTURE.map((row) => ({
        id: row.relationshipId,
        type: row.type,
        fromClaimId: row.fromClaimId,
        toClaimId: row.toClaimId,
        explanation: row.explanation,
      }))
      const audit = auditRelationshipPrecision(
        relationships,
        claims,
        buildPrecisionExpectationMap(),
      )

      expect(audit.falseAgreement).toBeGreaterThanOrEqual(8)
      expect(audit.auditedValid).toBe(1)
      expect(audit.regressionFailures).toHaveLength(0)

      const rel4 = audit.entries.find((e) => e.relationshipId === 'rel_4')
      expect(rel4?.assessedLabel).toBe('VALID')

      const rel8 = audit.entries.find((e) => e.relationshipId === 'rel_8')
      expect(rel8?.assessedLabel).toBe('FALSE_AGREEMENT')
    })
  })
})
