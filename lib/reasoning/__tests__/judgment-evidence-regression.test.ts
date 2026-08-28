import { describe, expect, it } from 'vitest'
import {
  computeJudgmentEvidenceProfile,
  formatSourceCoverageNote,
} from '@/lib/reasoning/judgment-evidence-profile'
import { validateAndCalibrateJudgment } from '@/lib/reasoning/judgment-validator'
import type { ReasoningClaim, ReasoningRelationship, RelationshipCluster } from '@/lib/reasoning/types'

function claim(
  id: string,
  sourceId: string,
  statement: string,
  opts: Partial<ReasoningClaim> = {},
): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: sourceId,
    voiceIndex: 1,
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: opts.evidenceIds ?? ['ev1'],
    claimType: opts.claimType ?? 'factual',
    confidence: 'strong',
    conceptIds: ['mcp'],
    evidenceStrength: opts.evidenceStrength,
    claimQualityClass: opts.claimQualityClass,
    ...opts,
  }
}

function cluster(
  id: string,
  canonical: string,
  sourceIds: string[],
  claimIds: string[],
): RelationshipCluster {
  return {
    id,
    canonicalClaim: canonical,
    label: 'integration',
    type: 'AGREEMENT',
    dimension: 'integration',
    memberRelationshipIds: ['r1'],
    supportingClaimIds: claimIds,
    supportingSourceIds: sourceIds,
    sourceCount: sourceIds.length,
    sourcePairCount: 1,
    evidenceCount: claimIds.length,
    confidence: 'moderate',
    significanceScore: 0.55,
    noveltyScore: 0.4,
    evidenceStrength: 0.35,
    genericnessScore: 0.1,
    visualKind: 'agree',
    parentIds: [],
    childIds: ['r1'],
  }
}

function baseJudgment(statement: string) {
  return {
    statement,
    whatIsSupported: 'MCP relates to tool integration.',
    whatIsUncertain: 'Broader industry impact.',
    keyReason: 'Verified overlap on integration.',
    confidence: 'moderate' as const,
    missingEvidence: [],
    verificationStatus: 'SUPPORTED' as const,
  }
}

describe('judgment evidence calibration regression', () => {
  it('TEST A — 3 sources / 2 supporting: partial coverage in profile and calibration', () => {
    const c1 = claim('c1', 'source_1', 'MCP simplifies tool integration.')
    const c2 = claim('c2', 'source_2', 'MCP reduces integration friction.')
    const cl = cluster('cl1', 'MCP simplifies tool integration.', ['source_1', 'source_2'], ['c1', 'c2'])

    const profile = computeJudgmentEvidenceProfile({
      totalSourceCount: 3,
      significantClusters: [cl],
      verifiedRelationships: [
        {
          id: 'r1',
          type: 'AGREEMENT',
          fromClaimId: 'c1',
          toClaimId: 'c2',
          fromSourceId: 'source_1',
          toSourceId: 'source_2',
          fromVideoId: 'v1',
          toVideoId: 'v2',
          explanation: 'Integration agreement',
          confidence: 'moderate',
          verificationStatus: 'SUPPORTED',
          discoveryLevel: 'DIRECT_MATCH',
        },
      ],
      claims: [c1, c2],
      evidence: [],
    })

    expect(profile.totalSources).toBe(3)
    expect(profile.participatingSources).toBe(2)
    expect(profile.sourceCoverage).toBe('PARTIAL')
    expect(formatSourceCoverageNote(profile)).toContain('2 of 3')

    const inflated = baseJudgment(
      'All sources agree that MCP is fundamentally transforming AI operations.',
    )
    const { judgment, adjustments } = validateAndCalibrateJudgment(inflated, profile)
    expect(adjustments.some((a) => a.code === 'SOURCE_SCOPE_INFLATION')).toBe(true)
    expect(judgment.statement.toLowerCase()).not.toMatch(/^all sources agree/)
    expect(judgment.statement).not.toMatch(/fundamentally transforming/i)
  })

  it('TEST B — 3 sources / 3 supporting / strong evidence: stronger ceiling', () => {
    const claims = [
      claim('c1', 'source_1', 'MCP standardizes tool connections.', { evidenceStrength: 'STRONG' }),
      claim('c2', 'source_2', 'MCP standardizes AI tool access.', { evidenceStrength: 'STRONG' }),
      claim('c3', 'source_3', 'MCP provides a common tool layer.', { evidenceStrength: 'STRONG' }),
    ]
    const cl = cluster(
      'cl1',
      'MCP standardizes tool connections.',
      ['source_1', 'source_2', 'source_3'],
      ['c1', 'c2', 'c3'],
    )

    const profile = computeJudgmentEvidenceProfile({
      totalSourceCount: 3,
      significantClusters: [cl],
      verifiedRelationships: [] as ReasoningRelationship[],
      claims,
      evidence: [],
    })

    expect(profile.participatingSources).toBe(3)
    expect(profile.sourceCoverage).toBe('FULL')
    expect(['HIGH', 'MODERATE']).toContain(profile.confidenceCeiling)
  })

  it('TEST C — 2 supporting / weak evidence: weak calibrated judgment', () => {
    const c1 = claim('c1', 'source_1', 'MCP may help with tools.', {
      evidenceIds: [],
      evidenceStrength: 'NONE',
    })
    const c2 = claim('c2', 'source_2', 'MCP could simplify integration.', {
      evidenceIds: [],
      evidenceStrength: 'NONE',
    })
    const cl = cluster('cl1', 'MCP may help with tools.', ['source_1', 'source_2'], ['c1', 'c2'])

    const profile = computeJudgmentEvidenceProfile({
      totalSourceCount: 3,
      significantClusters: [cl],
      verifiedRelationships: [],
      claims: [c1, c2],
      evidence: [],
    })

    expect(profile.evidenceStrength).toBe('NONE')
    expect(profile.confidenceCeiling).toBe('WEAK')

    const { judgment } = validateAndCalibrateJudgment(
      baseJudgment('MCP clearly demonstrates a fundamental transformation of AI.'),
      profile,
    )
    expect(judgment.confidence).toBe('low')
    expect(judgment.statement).not.toMatch(/clearly demonstrates/i)
    expect(judgment.statement).not.toMatch(/fundamental transformation/i)
  })

  it('TEST D — NO_EVIDENCE only: profile marks weak support', () => {
    const c1 = claim('c1', 'source_1', 'MCP reduces integration complexity.', {
      evidenceIds: [],
      evidenceStrength: 'NONE',
    })
    const c2 = claim('c2', 'source_2', 'MCP simplifies connecting AI tools.', {
      evidenceIds: [],
      evidenceStrength: 'NONE',
    })
    const cl = cluster('cl1', 'MCP reduces integration complexity.', ['source_1', 'source_2'], ['c1', 'c2'])

    const profile = computeJudgmentEvidenceProfile({
      totalSourceCount: 3,
      significantClusters: [cl],
      verifiedRelationships: [],
      claims: [c1, c2],
      evidence: [],
    })

    expect(profile.noEvidenceClaims).toBe(2)
    expect(profile.directEvidenceClaims).toBe(0)
    expect(profile.verifiedPropositions[0].noDirectEvidence).toBe(true)

    const { judgment } = validateAndCalibrateJudgment(
      baseJudgment('MCP establishes a new industry standard for AI.'),
      profile,
    )
    expect(judgment.statement).not.toMatch(/\bestablishes\b/i)
  })

  it('TEST E — HYPE claims: attribution preserved', () => {
    const c1 = claim('c1', 'source_1', 'MCP will revolutionize the AI industry.', {
      claimQualityClass: 'HYPE',
      claimType: 'predictive',
      evidenceIds: [],
    })
    const c2 = claim('c2', 'source_2', 'MCP adoption is promising but operationally immature.', {
      claimType: 'interpretive',
    })
    const cl = cluster('cl1', 'MCP importance for integration.', ['source_1', 'source_2'], ['c1', 'c2'])

    const profile = computeJudgmentEvidenceProfile({
      totalSourceCount: 3,
      significantClusters: [cl],
      verifiedRelationships: [],
      claims: [c1, c2],
      evidence: [],
    })

    expect(profile.verifiedPropositions[0].hypeOrInterpretive).toBe(true)

    const { judgment, adjustments } = validateAndCalibrateJudgment(
      baseJudgment('MCP is a transformative force reshaping AI.'),
      profile,
    )
    expect(
      adjustments.some((a) => a.code === 'ATTRIBUTION_LOSS') ||
        /sources?|characterize/i.test(judgment.statement),
    ).toBe(true)
    expect(judgment.statement).not.toMatch(/^MCP is a transformative force/i)
  })
})
