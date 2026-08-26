import { describe, expect, it } from 'vitest'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import { resolveClaimsThroughRelevanceFunnel } from '@/lib/reasoning/claim-relevance'
import { applyClaimQualityGate } from '@/lib/reasoning/claim-quality'
import type { ReasoningClaim, ReasoningEvidence } from '@/lib/reasoning/types'

const CENTRAL_QUESTION =
  'What is MCP and how does it impact the AI industry?'

function claim(
  id: string,
  sourceId: string,
  statement: string,
  evidenceIds: string[] = [],
): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: `yt${sourceId.replace('source_', '')}`,
    voiceIndex: Number(sourceId.replace('source_', '')),
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds,
    claimType: 'factual',
    confidence: 'strong',
    conceptIds: ['concept_mcp'],
  }
}

function evidence(id: string, sourceId: string, text: string): ReasoningEvidence {
  return {
    id,
    sourceId,
    videoId: `yt${sourceId.replace('source_', '')}`,
    timestampStart: 30,
    timestampEnd: null,
    text,
    confidence: 0.9,
  }
}

function buildMcpFixture(): {
  allClaims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
} {
  const goodStatements = [
    'MCP provides a standardized interface for connecting AI tools.',
    'MCP can reduce integration complexity between applications and tools.',
    'Developers can connect tools more easily through MCP.',
    'MCP may accelerate AI tool adoption in teams.',
    'Traditional APIs require separate integrations for each tool.',
    'MCP standardizes how models access external data sources.',
    'Integration friction drops when teams adopt MCP.',
    'MCP does not necessarily replace every traditional API pattern.',
  ]

  const noiseStatements = [
    'Click subscribe for more content.',
    'This is why anyone can succeed regardless of age.',
    'Welcome back to the channel everyone.',
  ]

  const allClaims: ReasoningClaim[] = []
  const evidenceRecords: ReasoningEvidence[] = []

  for (const sourceId of ['source_1', 'source_2', 'source_3']) {
    let idx = 0
    for (const stmt of goodStatements) {
      const evId = `ev_${sourceId}_${idx}`
      evidenceRecords.push(
        evidence(evId, sourceId, stmt.replace('MCP', 'MCP').slice(0, 80)),
      )
      allClaims.push(claim(`${sourceId}_claim_${idx}`, sourceId, stmt, [evId]))
      idx++
    }
    for (const stmt of noiseStatements) {
      const evId = `ev_${sourceId}_n${idx}`
      evidenceRecords.push(evidence(evId, sourceId, 'Background filler transcript segment.'))
      allClaims.push(claim(`${sourceId}_claim_${idx}`, sourceId, stmt, [evId]))
      idx++
    }
  }

  return { allClaims, evidence: evidenceRecords }
}

describe('MCP relevance regression fixture', () => {
  const { allClaims, evidence: evidenceRecords } = buildMcpFixture()

  const sourceRelevance = [
    { sourceId: 'source_1', classification: 'direct' as const, score: 0.9, reason: 'MCP concept', relevantClaimIds: [] },
    { sourceId: 'source_2', classification: 'contrasting' as const, score: 0.85, reason: 'MCP vs API', relevantClaimIds: [] },
    { sourceId: 'source_3', classification: 'supporting' as const, score: 0.8, reason: 'MCP usage', relevantClaimIds: [] },
  ]

  it('extracted claims > 0', () => {
    expect(allClaims.length).toBeGreaterThan(0)
  })

  it('relevant claims > 1 when multiple MCP sources exist', () => {
    const synthesisIds = new Set(['source_1', 'source_2', 'source_3'])
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance,
    })

    expect(funnel.funnel.finalUsable).toBeGreaterThan(1)
    expect(funnel.funnel.primaryTier + funnel.funnel.supportingTier).toBeGreaterThan(1)
    expect(funnel.warnings.some((w) => w.code === 'ABNORMAL_RELEVANCE_COLLAPSE')).toBe(false)
  })

  it('mechanism claims pass without repeating central question wording', () => {
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims,
      synthesisSourceIds: new Set(['source_1', 'source_2']),
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance: sourceRelevance.slice(0, 2),
    })

    const texts = funnel.usableClaims.map((c) => c.statement)
    expect(texts.some((t) => t.includes('integration complexity'))).toBe(true)
    expect(texts.some((t) => t.includes('standardized interface'))).toBe(true)
  })

  it('candidate pairs > 0 when cross-source related claims exist', () => {
    const synthesisIds = new Set(['source_1', 'source_2', 'source_3'])
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance,
    })
    const quality = applyClaimQualityGate({
      claims: funnel.usableClaims,
      evidence: evidenceRecords,
      centralQuestion: CENTRAL_QUESTION,
    })
    const candidates = discoverHeuristicCandidates(quality.accepted).all

    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((c) => c.fromClaimId !== c.toClaimId)).toBe(true)
    const crossSource = quality.accepted.filter(
      (c, _, arr) => arr.some((o) => o.sourceId !== c.sourceId),
    )
    expect(crossSource.length).toBeGreaterThan(1)
  })

  it('no relationship candidate connects same-source-only pairs in discovery', () => {
    const synthesisIds = new Set(['source_1', 'source_2'])
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance: sourceRelevance.slice(0, 2),
    })
    const quality = applyClaimQualityGate({
      claims: funnel.usableClaims,
      evidence: evidenceRecords,
      centralQuestion: CENTRAL_QUESTION,
    })
    const candidates = discoverHeuristicCandidates(quality.accepted).all
    const claimById = new Map(quality.accepted.map((c) => [c.id, c]))
    for (const cand of candidates) {
      const from = claimById.get(cand.fromClaimId)
      const to = claimById.get(cand.toClaimId)
      expect(from && to && from.sourceId !== to.sourceId).toBe(true)
    }
  })

  it('off-topic source excluded from usable claims', () => {
    const locked = new Set(['source_3'])
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims,
      synthesisSourceIds: new Set(['source_1', 'source_2']),
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance: [
        ...sourceRelevance.slice(0, 2),
        { sourceId: 'source_3', classification: 'off_topic', score: 0.1, reason: 'Motivation', relevantClaimIds: [] },
      ],
      lockedOffTopicIds: locked,
    })
    expect(funnel.usableClaims.every((c) => c.sourceId !== 'source_3')).toBe(true)
  })

  it('flags abnormal collapse when funnel crushes high-volume extraction', () => {
    const bloated: ReasoningClaim[] = []
    const ev: ReasoningEvidence[] = []
    for (let i = 0; i < 50; i++) {
      const evId = `ev_f_${i}`
      ev.push(evidence(evId, 'source_1', `Yesterday I enjoyed coffee at the park on day ${i}.`))
      bloated.push(
        claim(
          `source_1_claim_${i}`,
          'source_1',
          `Yesterday I enjoyed coffee at the park on day ${i}.`,
          [evId],
        ),
      )
    }
    const result = resolveClaimsThroughRelevanceFunnel({
      allClaims: bloated,
      synthesisSourceIds: new Set(['source_1', 'source_2']),
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance: sourceRelevance.slice(0, 2),
    })
    expect(result.funnel.finalUsable).toBe(0)
    expect(result.warnings.some((w) => w.code === 'ABNORMAL_RELEVANCE_COLLAPSE')).toBe(true)
  })
})
