import { describe, expect, it } from 'vitest'
import {
  countPossibleCrossSourcePairs,
  enrichClaimsForCrossSourceCandidates,
  evaluateCandidateCollapseWarning,
  participatingSourceCount,
} from '@/lib/reasoning/candidate-funnel'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import { resolveClaimsThroughRelevanceFunnel } from '@/lib/reasoning/claim-relevance'
import { buildComparableClaimPool } from '@/lib/reasoning/comparable-claim-pool'
import type { ReasoningClaim, ReasoningEvidence } from '@/lib/reasoning/types'

const CENTRAL_QUESTION = 'What is MCP and how does it impact the AI industry?'

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

function buildMcpFixture() {
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
      evidenceRecords.push(evidence(evId, sourceId, stmt.slice(0, 80)))
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

describe('MCP cross-source candidate regression', () => {
  const { allClaims, evidence: evidenceRecords } = buildMcpFixture()

  const sourceRelevance = [
    { sourceId: 'source_1', classification: 'direct' as const, score: 0.9, reason: 'MCP concept', relevantClaimIds: [] },
    { sourceId: 'source_2', classification: 'contrasting' as const, score: 0.85, reason: 'MCP vs API', relevantClaimIds: [] },
    { sourceId: 'source_3', classification: 'supporting' as const, score: 0.8, reason: 'MCP usage', relevantClaimIds: [] },
  ]

  function pipelineClaims() {
    const synthesisIds = new Set(['source_1', 'source_2', 'source_3'])
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance,
    })
    const pool = buildComparableClaimPool({
      usableClaims: funnel.usableClaims,
      evidence: evidenceRecords,
      relevanceDiagnostics: funnel.diagnostics,
      centralQuestion: CENTRAL_QUESTION,
      synthesisSourceIds: synthesisIds,
    })
    const enriched = enrichClaimsForCrossSourceCandidates({
      acceptedClaims: pool.generationClaims,
      supplementalClaims: funnel.peripheralClaims,
      synthesisSourceIds: synthesisIds,
      minPerSource: 2,
      maxTotal: 28,
    })
    return { funnel, pool, enriched, synthesisIds }
  }

  it('structural invariant: multiple sources yield possible cross-source pairs', () => {
    const { enriched } = pipelineClaims()
    expect(allClaims.length).toBeGreaterThan(0)
    expect(enriched.claims.length).toBeGreaterThan(0)
    expect(participatingSourceCount(enriched.claims)).toBeGreaterThanOrEqual(2)
    expect(countPossibleCrossSourcePairs(enriched.claims)).toBeGreaterThan(0)
  })

  it('MCP fixture produces candidate pairs (recall stage)', () => {
    const { enriched } = pipelineClaims()
    const heuristic = discoverHeuristicCandidates(enriched.claims)
    expect(heuristic.all.length).toBeGreaterThan(0)
    expect(heuristic.bridge.length).toBeGreaterThan(0)

    const claimById = new Map(enriched.claims.map((c) => [c.id, c]))
    for (const cand of heuristic.all) {
      const from = claimById.get(cand.fromClaimId)
      const to = claimById.get(cand.toClaimId)
      expect(from && to && from.sourceId !== to.sourceId).toBe(true)
    }
  })

  it('flags collapse when pairs exist but candidates would be zero', () => {
    const warning = evaluateCandidateCollapseWarning({
      participatingSourceCount: 3,
      possibleCrossSourcePairs: 12,
      candidatePairs: 0,
    })
    expect(warning?.code).toBe('CROSS_SOURCE_CANDIDATE_COLLAPSE')
  })

  it('single-source dominance can be augmented from peripheral claims', () => {
    const synthesisIds = new Set(['source_1', 'source_2', 'source_3'])
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance,
    })
    const quality = buildComparableClaimPool({
      usableClaims: funnel.usableClaims,
      evidence: evidenceRecords,
      relevanceDiagnostics: funnel.diagnostics,
      centralQuestion: CENTRAL_QUESTION,
      synthesisSourceIds: synthesisIds,
    })
    const onlySource1 = quality.comparableClaims.filter((c) => c.sourceId === 'source_1')
    const enriched = enrichClaimsForCrossSourceCandidates({
      acceptedClaims: onlySource1,
      supplementalClaims: funnel.peripheralClaims,
      synthesisSourceIds: synthesisIds,
      minPerSource: 1,
      maxTotal: 24,
    })
    if (funnel.peripheralClaims.some((c) => c.sourceId !== 'source_1')) {
      expect(participatingSourceCount(enriched.claims)).toBeGreaterThan(1)
      expect(enriched.augmentedFromSupplemental).toBeGreaterThan(0)
    }
  })
})
