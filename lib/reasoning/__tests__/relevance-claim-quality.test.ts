import { describe, expect, it } from 'vitest'
import {
  applyClaimQualityGate,
  assessClaimQuality,
  buildLockedOffTopicSourceIds,
  hasSemanticInflation,
  isHypeClaim,
} from '@/lib/reasoning/claim-quality'
import { resolveUsableClaims } from '@/lib/reasoning/relevance-scoring'
import {
  buildExcludedSources,
  resolveSynthesisSourceIds,
} from '@/lib/reasoning/relevance'
import {
  enhanceSourceRelevance,
  synthesisIdsFromEnhanced,
} from '@/lib/reasoning/source-relevance-enhance'
import type { ReasoningClaim, ReasoningEvidence } from '@/lib/reasoning/types'

function claim(
  id: string,
  sourceId: string,
  statement: string,
  evidenceIds: string[] = [],
): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: `yt${sourceId.split('_')[1] ?? '1'}`,
    voiceIndex: Number(sourceId.split('_')[1] ?? 1),
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds,
    claimType: 'factual',
    confidence: 'strong',
    conceptIds: [],
  }
}

function evidence(id: string, sourceId: string, text: string): ReasoningEvidence {
  return {
    id,
    sourceId,
    videoId: `yt${sourceId.split('_')[1] ?? '1'}`,
    timestampStart: 42,
    timestampEnd: null,
    text,
    confidence: 0.9,
  }
}

describe('TEST A — off-topic source exclusion', () => {
  const centralQuestion = 'What is MCP and why has it gained attention in the AI industry?'

  const sourceRelevance = [
    {
      sourceId: 'source_1',
      classification: 'direct' as const,
      score: 0.9,
      reason: 'Defines MCP',
      relevantClaimIds: [],
    },
    {
      sourceId: 'source_2',
      classification: 'contrasting' as const,
      score: 0.85,
      reason: 'MCP vs API',
      relevantClaimIds: [],
    },
    {
      sourceId: 'source_3',
      classification: 'off_topic' as const,
      score: 0.1,
      reason: 'Motivational shorts unrelated to MCP',
      relevantClaimIds: [],
    },
  ]

  const offTopicClusters = [
    {
      id: 'c_off',
      label: 'Motivation',
      sourceIds: ['source_3'],
    },
  ]

  const motivationalClaims: ReasoningClaim[] = [
    claim('source_3_claim_1', 'source_3', 'AI is capable of working independently now.', ['ev_m1']),
    claim(
      'source_3_claim_2',
      'source_3',
      'This is why anyone can succeed regardless of age.',
      ['ev_m2'],
    ),
    claim(
      'source_3_claim_3',
      'source_3',
      'The industry is transforming because of artificial intelligence tools.',
      ['ev_m3'],
    ),
  ]

  const mcpClaims: ReasoningClaim[] = [
    claim(
      'source_1_claim_1',
      'source_1',
      'MCP provides a standardized interface for connecting AI tools.',
      ['ev_1'],
    ),
    claim(
      'source_2_claim_1',
      'source_2',
      'MCP can reduce integration complexity compared to traditional APIs.',
      ['ev_2'],
    ),
  ]

  const allClaims = [...mcpClaims, ...motivationalClaims]
  const allEvidence = [
    evidence('ev_1', 'source_1', 'MCP standardizes how models connect to tools.'),
    evidence('ev_2', 'source_2', 'Integration complexity drops with MCP.'),
    evidence('ev_m1', 'source_3', 'AI tools are getting more autonomous.'),
    evidence('ev_m2', 'source_3', 'No matter your age you can learn new skills.'),
    evidence('ev_m3', 'source_3', 'AI is changing many industries.'),
  ]

  it('locks off-topic source and keeps synthesis at 2 relevant sources', () => {
    const locked = buildLockedOffTopicSourceIds({
      sourceRelevance,
      offTopicClusters,
      legacyExcluded: [],
    })
    expect(locked.has('source_3')).toBe(true)

    const enhanced = enhanceSourceRelevance({
      sources: [{ sourceId: 'source_1' }, { sourceId: 'source_2' }, { sourceId: 'source_3' }],
      claims: allClaims,
      evidence: allEvidence,
      centralQuestion,
      existing: sourceRelevance,
      lockedOffTopicIds: locked,
    })

    const synthesisIds = synthesisIdsFromEnhanced(enhanced)
    expect(synthesisIds.size).toBe(2)
    expect(synthesisIds.has('source_1')).toBe(true)
    expect(synthesisIds.has('source_2')).toBe(true)
    expect(synthesisIds.has('source_3')).toBe(false)

    const excluded = buildExcludedSources({
      sources: [
        { sourceId: 'source_1', videoId: 'yt1', voiceIndex: 1, title: 'MCP intro' },
        { sourceId: 'source_2', videoId: 'yt2', voiceIndex: 2, title: 'MCP vs API' },
        { sourceId: 'source_3', videoId: 'yt3', voiceIndex: 3, title: 'Motivation shorts' },
      ],
      sourceRelevance: enhanced,
      synthesisSourceIds: synthesisIds,
      legacyExcluded: [],
      offTopicClusters,
    })

    expect(excluded.length).toBe(1)
    expect(excluded[0].sourceId).toBe('source_3')
  })

  it('excluded source claims do not enter relationship candidate pool', () => {
    const locked = buildLockedOffTopicSourceIds({
      sourceRelevance,
      offTopicClusters,
      legacyExcluded: [],
    })
    const enhanced = enhanceSourceRelevance({
      sources: [{ sourceId: 'source_1' }, { sourceId: 'source_2' }, { sourceId: 'source_3' }],
      claims: allClaims.filter((c) => !locked.has(c.sourceId)),
      evidence: allEvidence,
      centralQuestion,
      existing: sourceRelevance,
      lockedOffTopicIds: locked,
    })
    const synthesisIds = synthesisIdsFromEnhanced(enhanced)

    const usable = resolveUsableClaims({
      allClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion,
      sourceRelevance: enhanced,
    })
    const quality = applyClaimQualityGate({
      claims: usable,
      evidence: allEvidence,
      excludedSourceIds: new Set(['source_3']),
    })

    expect(quality.accepted.every((c) => c.sourceId !== 'source_3')).toBe(true)
    expect(quality.rejected.some((r) => r.claim.sourceId === 'source_3')).toBe(false)
  })
})

describe('TEST B — same topic different dimensions', () => {
  it('keeps both MCP videos relevant without merging all claims as agreement', () => {
    const ids = resolveSynthesisSourceIds({
      sources: [{ sourceId: 's1' }, { sourceId: 's2' }],
      sourceRelevance: [
        { sourceId: 's1', classification: 'direct', score: 0.9, reason: 'Concept', relevantClaimIds: [] },
        { sourceId: 's2', classification: 'contrasting', score: 0.85, reason: 'Comparison', relevantClaimIds: [] },
      ],
      clusters: [],
    })
    expect(ids.size).toBe(2)
  })
})

describe('TEST C — duplicate claims within source', () => {
  it('merges near duplicates within one source but keeps cross-source propositions', () => {
    const ev = evidence('ev_1', 'source_1', 'MCP makes integration easier.')
    const claims = [
      claim('c1', 'source_1', 'MCP makes integration easier.', ['ev_1']),
      claim('c2', 'source_1', 'MCP makes integration easier.', ['ev_1']),
      claim('c3', 'source_2', 'MCP makes integration easier.', ['ev_2']),
    ]
    const ev2 = evidence('ev_2', 'source_2', 'Integration is easier with MCP.')
    const result = applyClaimQualityGate({
      claims,
      evidence: [ev, ev2],
    })
    expect(result.stats.duplicatesMerged).toBe(1)
    expect(result.accepted.filter((c) => c.sourceId === 'source_1').length).toBe(1)
    expect(result.accepted.filter((c) => c.sourceId === 'source_2').length).toBe(1)
  })
})

describe('TEST D — semantic inflation', () => {
  it('rejects inflated claim when evidence is weaker', () => {
    const ev = evidence(
      'ev_1',
      'source_1',
      'MCP may make some integrations easier for developers.',
    )
    const c = claim(
      'c1',
      'source_1',
      'MCP dramatically transforms how teams integrate AI tools.',
      ['ev_1'],
    )
    expect(hasSemanticInflation(c.statement, ev.text)).toBe(true)
    expect(assessClaimQuality(c, new Map([['ev_1', ev]]))).toBe('SEMANTIC_INFLATION')
  })

  it('rejects hype claims without support', () => {
    expect(isHypeClaim('MCP is a transformative force in the AI ecosystem.')).toBe(true)
  })
})

describe('TEST E — emergent not forced', () => {
  it('does not add emergent insight requirements to claim gate', () => {
    const result = applyClaimQualityGate({ claims: [], evidence: [] })
    expect(result.accepted).toHaveLength(0)
  })
})

describe('fixture simulation — bloated claim pool', () => {
  it('filters hype and inflation from a large noisy claim set', () => {
    const hypeStatements = [
      'MCP is a transformative force in the AI ecosystem.',
      'The rise of MCP has generated major discussions in the AI industry.',
      'MCP is viewed as a game-changer for developers and end-users alike.',
      'AI is capable of working independently now.',
      'This is why anyone can succeed regardless of age.',
    ]
    const goodStatements = [
      'MCP provides a standardized interface for connecting tools.',
      'MCP can reduce integration complexity compared to APIs.',
      'Traditional APIs require custom integration code for each tool.',
    ]

    const evidenceRecords: ReasoningEvidence[] = [
      evidence('ev_g1', 'source_1', 'MCP standardizes tool connections.'),
      evidence('ev_g2', 'source_2', 'Integration complexity drops with MCP.'),
      evidence('ev_g3', 'source_2', 'APIs need bespoke integration work.'),
      ...hypeStatements.map((_, i) =>
        evidence(`ev_h${i}`, 'source_3', 'No matter your age you can learn new skills.'),
      ),
    ]

    const noisyClaims: ReasoningClaim[] = [
      ...goodStatements.map((s, i) =>
        claim(`source_${i < 2 ? 1 : 2}_claim_${i}`, `source_${i < 2 ? 1 : 2}`, s, [
          evidenceRecords[i].id,
        ]),
      ),
      ...hypeStatements.map((s, i) =>
        claim(`source_3_claim_${i}`, 'source_3', s, [`ev_h${i}`]),
      ),
    ]

    const locked = new Set(['source_3'])
    const enhanced = enhanceSourceRelevance({
      sources: [{ sourceId: 'source_1' }, { sourceId: 'source_2' }, { sourceId: 'source_3' }],
      claims: noisyClaims.filter((c) => !locked.has(c.sourceId)),
      evidence: evidenceRecords,
      centralQuestion: 'What is MCP and how does it impact the AI ecosystem?',
      existing: [
        { sourceId: 'source_1', classification: 'direct', score: 0.9, reason: '', relevantClaimIds: [] },
        { sourceId: 'source_2', classification: 'contrasting', score: 0.85, reason: '', relevantClaimIds: [] },
        { sourceId: 'source_3', classification: 'off_topic', score: 0.1, reason: 'Motivation', relevantClaimIds: [] },
      ],
      lockedOffTopicIds: locked,
    })
    const synthesisIds = synthesisIdsFromEnhanced(enhanced)
    expect(synthesisIds.has('source_3')).toBe(false)
    expect(synthesisIds.size).toBeGreaterThanOrEqual(1)

    const usable = resolveUsableClaims({
      allClaims: noisyClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion: 'What is MCP and how does it impact the AI ecosystem?',
      sourceRelevance: enhanced,
    })
    const quality = applyClaimQualityGate({
      claims: noisyClaims,
      evidence: evidenceRecords,
      excludedSourceIds: locked,
    })

    expect(quality.accepted.length).toBeLessThan(noisyClaims.length)
    expect(quality.accepted.every((c) => c.sourceId !== 'source_3')).toBe(true)
    expect(quality.stats.rejected).toBeGreaterThan(0)
    expect(quality.accepted.every((c) => c.evidenceIds.length > 0)).toBe(true)
    expect(usable.every((c) => c.sourceId !== 'source_3')).toBe(true)
  })
})

describe('resolveSynthesisSourceIds', () => {
  it('does not fallback to all sources when clusters are empty', () => {
    const ids = resolveSynthesisSourceIds({
      sources: [{ sourceId: 'a' }, { sourceId: 'b' }, { sourceId: 'c' }],
      sourceRelevance: [],
      clusters: [
        { sourceIds: ['a', 'b'], relevance: 'primary' },
        { sourceIds: ['c'], relevance: 'off_topic' },
      ],
    })
    expect(ids.has('a')).toBe(true)
    expect(ids.has('b')).toBe(true)
    expect(ids.has('c')).toBe(false)
  })
})
