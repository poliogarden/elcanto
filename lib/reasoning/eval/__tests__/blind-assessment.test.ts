import { describe, expect, it } from 'vitest'
import { analyzeStability, type StabilityRun } from '@/lib/reasoning/eval/blind-assessment'
import type { BenchmarkGoldExpectations } from '@/lib/reasoning/eval/benchmark-gold'
import type { ReasoningClaim, ReasoningRelationship } from '@/lib/reasoning/types'

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
    conceptIds: ['c1'],
  }
}

function rel(
  id: string,
  type: string,
  from: ReasoningClaim,
  to: ReasoningClaim,
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
    explanation: 'test',
    confidence: 'strong',
    verificationStatus: 'SUPPORTED',
  }
}

function emptyFunnel(verified = 0) {
  return {
    extractedClaims: 2,
    evidenceSupportedClaims: 2,
    relevanceUsable: 2,
    generationEligible: 2,
    candidatePairs: 1,
    verifiedRelationships: verified,
    agreement: verified,
    divide: 0,
    complementary: 0,
    judgmentConfidence: 'N/A',
  }
}

const goldA: BenchmarkGoldExpectations = {
  fixtureId: 'test',
  label: 'Test',
  category: 'benchmark',
  expectedRelationships: [
    {
      type: 'AGREEMENT',
      sources: ['source_1', 'source_2'],
      fromClaimPattern: 'alpha claim one',
      toClaimPattern: 'alpha claim two',
      normalizedProposition: 'shared alpha',
      required: true,
    },
  ],
  requireEvidenceIntegrity: true,
}

const claimA1 = claim('c1', 'source_1', 'Alpha claim one about topic.')
const claimA2 = claim('c2', 'source_2', 'Alpha claim two about topic.')
const goldRelA = rel('r1', 'AGREEMENT', claimA1, claimA2)

const claimB1 = claim('c3', 'source_1', 'Beta claim one distinct.')
const claimB2 = claim('c4', 'source_2', 'Beta claim two distinct.')
const falseRelB = rel('r2', 'AGREEMENT', claimB1, claimB2)

function makeRuns(
  perRunVerified: ReasoningRelationship[][],
  claims: ReasoningClaim[],
): StabilityRun[] {
  return perRunVerified.map((verified, i) => ({
    runIndex: i + 1,
    funnel: emptyFunnel(verified.length),
    relationshipIds: verified.map(
      (r) => `${r.fromSourceId}|${r.toSourceId}:${r.type}:${r.fromClaimId}:${r.toClaimId}`,
    ),
    verified,
    claims,
  }))
}

describe('analyzeStability gold identity', () => {
  it('1. same gold relationship 3/3 → STABLE', () => {
    const runs = makeRuns([[goldRelA], [goldRelA], [goldRelA]], [claimA1, claimA2])
    const result = analyzeStability(runs, goldA)
    expect(result.goldRelationshipStability[0].detectedRuns).toBe(3)
    expect(result.goldRelationshipStability[0].consistency).toBe('STABLE')
    expect(result.relationshipConsistencyScore).toBe(3)
    expect(result.flags).not.toContain('RELATIONSHIP_DRIFT')
  })

  it('2. same gold relationship 2/3 → UNSTABLE', () => {
    const runs = makeRuns([[goldRelA], [goldRelA], []], [claimA1, claimA2])
    const result = analyzeStability(runs, goldA)
    expect(result.goldRelationshipStability[0].detectedRuns).toBe(2)
    expect(result.goldRelationshipStability[0].consistency).toBe('UNSTABLE')
    expect(result.relationshipConsistencyScore).toBe(2)
  })

  it('3. same gold relationship 1/3 → FAIL', () => {
    const runs = makeRuns([[goldRelA], [], []], [claimA1, claimA2])
    const result = analyzeStability(runs, goldA)
    expect(result.goldRelationshipStability[0].detectedRuns).toBe(1)
    expect(result.goldRelationshipStability[0].consistency).toBe('FAIL')
    expect(result.relationshipConsistencyScore).toBe(1)
  })

  it('4. each run count=1 but different identity → FAIL', () => {
    const relX = rel('rx', 'AGREEMENT', claimB1, claimA2)
    const relY = rel('ry', 'AGREEMENT', claimA1, claimB2)
    const relZ = rel('rz', 'AGREEMENT', claimB1, claimB2)
    const runs = makeRuns([[relX], [relY], [relZ]], [claimA1, claimA2, claimB1, claimB2])
    const result = analyzeStability(runs, goldA)
    expect(result.goldRelationshipStability[0].detectedRuns).toBe(0)
    expect(result.goldRelationshipStability[0].consistency).toBe('FAIL')
    expect(result.relationshipConsistencyScore).toBe(1)
    expect(result.flags).toContain('RELATIONSHIP_DRIFT')
  })

  it('5. gold 3/3 but false relationship in one run → gold STABLE + RELATIONSHIP_DRIFT', () => {
    const runs = makeRuns(
      [[goldRelA], [goldRelA, falseRelB], [goldRelA]],
      [claimA1, claimA2, claimB1, claimB2],
    )
    const result = analyzeStability(runs, goldA)
    expect(result.goldRelationshipStability[0].detectedRuns).toBe(3)
    expect(result.goldRelationshipStability[0].consistency).toBe('STABLE')
    expect(result.falseRelationshipRuns).toBe(1)
    expect(result.falseRelationshipCount).toBe(1)
    expect(result.flags).toContain('RELATIONSHIP_DRIFT')
    expect(result.stable).toBe(false)
  })

  it('6. complex fixture two gold relationships computed independently', () => {
    const claimC1 = claim('c5', 'source_1', 'Gamma access expanded rural.')
    const claimC2 = claim('c6', 'source_2', 'Gamma rural access gained.')
    const claimD1 = claim('c7', 'source_1', 'Delta readmissions reduced.')
    const claimD2 = claim('c8', 'source_2', 'Delta readmissions rose.')
    const goldAgree = rel('ga', 'AGREEMENT', claimC1, claimC2)
    const goldDivide = rel('gd', 'CONTRADICTION', claimD1, claimD2)

    const complexGold: BenchmarkGoldExpectations = {
      fixtureId: 'complex',
      label: 'Complex',
      category: 'benchmark',
      expectedRelationships: [
        {
          type: 'AGREEMENT',
          sources: ['source_1', 'source_2'],
          fromClaimPattern: 'access expanded rural',
          toClaimPattern: 'rural access gained',
          normalizedProposition: 'rural access',
          required: true,
        },
        {
          type: 'DIVIDE',
          sources: ['source_1', 'source_2'],
          fromClaimPattern: 'readmissions reduced',
          toClaimPattern: 'readmissions rose',
          normalizedProposition: 'readmission impact',
          required: true,
        },
      ],
      requireEvidenceIntegrity: true,
    }

    const claims = [claimC1, claimC2, claimD1, claimD2]
    const runs = makeRuns(
      [[goldAgree], [goldAgree, goldDivide], [goldAgree]],
      claims,
    )
    const result = analyzeStability(runs, complexGold)

    expect(result.goldRelationshipStability).toHaveLength(2)
    const agreeGold = result.goldRelationshipStability.find((g) => g.expectedType === 'AGREEMENT')
    const divideGold = result.goldRelationshipStability.find((g) => g.expectedType === 'DIVIDE')
    expect(agreeGold?.detectedRuns).toBe(3)
    expect(agreeGold?.consistency).toBe('STABLE')
    expect(divideGold?.detectedRuns).toBe(1)
    expect(divideGold?.consistency).toBe('FAIL')
    expect(result.relationshipConsistencyScore).toBe(1)
  })
})
