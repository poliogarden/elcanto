import { describe, expect, it } from 'vitest'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import {
  countPossibleCrossSourcePairs,
  enrichClaimsForCrossSourceCandidates,
  participatingSourceCount,
} from '@/lib/reasoning/candidate-funnel'
import { applyClaimQualityGate } from '@/lib/reasoning/claim-quality'
import { buildComparableClaimPool } from '@/lib/reasoning/comparable-claim-pool'
import { resolveClaimsThroughRelevanceFunnel } from '@/lib/reasoning/claim-relevance'
import type { ReasoningClaim, ReasoningEvidence } from '@/lib/reasoning/types'

const CENTRAL_QUESTION = 'What is MCP and how does it impact the AI industry?'

function claim(
  id: string,
  sourceId: string,
  statement: string,
  evidenceIds: string[] = [],
  claimType: ReasoningClaim['claimType'] = 'factual',
): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: `yt${sourceId.replace('source_', '')}`,
    voiceIndex: Number(sourceId.replace('source_', '')),
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds,
    claimType,
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

function runComparablePipeline(
  allClaims: ReasoningClaim[],
  evidenceRecords: ReasoningEvidence[],
  synthesisIds: Set<string>,
  sourceRelevance: Array<{
    sourceId: string
    classification: 'direct' | 'contrasting' | 'supporting'
    score: number
    reason: string
    relevantClaimIds: string[]
  }>,
) {
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
  return { funnel, pool, enriched }
}

describe('comparable claim pool regression', () => {
  const mcpFixture = buildMcpFixture()
  const mcpSourceRelevance = [
    { sourceId: 'source_1', classification: 'direct' as const, score: 0.9, reason: 'MCP', relevantClaimIds: [] },
    { sourceId: 'source_2', classification: 'contrasting' as const, score: 0.85, reason: 'MCP vs API', relevantClaimIds: [] },
    { sourceId: 'source_3', classification: 'supporting' as const, score: 0.8, reason: 'MCP usage', relevantClaimIds: [] },
  ]

  it('TEST A — MCP 3-source: multi-source generation and candidates', () => {
    const synthesisIds = new Set(['source_1', 'source_2', 'source_3'])
    const { pool, enriched } = runComparablePipeline(
      mcpFixture.allClaims,
      mcpFixture.evidence,
      synthesisIds,
      mcpSourceRelevance,
    )

    expect(pool.stats.comparable).toBeGreaterThan(1)
    expect(pool.stats.generationEligible).toBeGreaterThan(1)
    expect(participatingSourceCount(enriched.claims)).toBeGreaterThanOrEqual(2)
    expect(countPossibleCrossSourcePairs(enriched.claims)).toBeGreaterThan(0)

    const heuristic = discoverHeuristicCandidates(enriched.claims)
    expect(heuristic.all.length).toBeGreaterThan(0)
  })

  it('TEST B — unrelated sources excluded from cross-source pairing', () => {
    const cooking = claim('cook_1', 'source_cook', 'Pasta requires boiling water for ten minutes.', ['ev_cook'])
    const travel = claim('trav_1', 'source_travel', 'Tokyo has excellent public transit for tourists.', ['ev_trav'])
    const evCook = evidence('ev_cook', 'source_cook', 'Boil water before adding pasta.')
    const evTrav = evidence('ev_trav', 'source_travel', 'Tokyo subway is efficient.')

    const allClaims = [...mcpFixture.allClaims.slice(0, 6), cooking, travel]
    const evidenceRecords = [...mcpFixture.evidence.slice(0, 6), evCook, evTrav]

    const synthesisIds = new Set(['source_1', 'source_cook', 'source_travel'])
    const sourceRelevance = [
      { sourceId: 'source_1', classification: 'direct' as const, score: 0.9, reason: 'MCP', relevantClaimIds: [] },
      { sourceId: 'source_cook', classification: 'supporting' as const, score: 0.1, reason: 'cooking', relevantClaimIds: [] },
      { sourceId: 'source_travel', classification: 'supporting' as const, score: 0.1, reason: 'travel', relevantClaimIds: [] },
    ]

    const { pool, enriched } = runComparablePipeline(
      allClaims,
      evidenceRecords,
      synthesisIds,
      sourceRelevance,
    )

    const mcpComparable = pool.comparableClaims.filter((c) => c.sourceId === 'source_1').length
    expect(mcpComparable).toBeGreaterThan(0)

    const heuristic = discoverHeuristicCandidates(enriched.claims)
    for (const cand of heuristic.all) {
      const from = enriched.claims.find((c) => c.id === cand.fromClaimId)
      const to = enriched.claims.find((c) => c.id === cand.toClaimId)
      if (from?.sourceId === 'source_1' && to?.sourceId !== 'source_1') {
        expect(['source_cook', 'source_travel']).not.toContain(to?.sourceId)
      }
    }
  })

  it('TEST C — same topic different dimensions remain comparable', () => {
    const install = claim(
      'install_1',
      'source_install',
      'MCP server installation requires configuring environment variables.',
      ['ev_install'],
    )
    const market = claim(
      'market_1',
      'source_market',
      'MCP market adoption is growing among enterprise AI teams.',
      ['ev_market'],
    )
    const evInstall = evidence('ev_install', 'source_install', 'Set API keys in env before starting MCP server.')
    const evMarket = evidence('ev_market', 'source_market', 'Enterprise teams are piloting MCP integrations.')

    const allClaims = [...mcpFixture.allClaims.slice(0, 4), install, market]
    const evidenceRecords = [...mcpFixture.evidence.slice(0, 4), evInstall, evMarket]

    const synthesisIds = new Set(['source_1', 'source_install', 'source_market'])
    const sourceRelevance = [
      { sourceId: 'source_1', classification: 'direct' as const, score: 0.9, reason: 'MCP', relevantClaimIds: [] },
      { sourceId: 'source_install', classification: 'supporting' as const, score: 0.75, reason: 'install', relevantClaimIds: [] },
      { sourceId: 'source_market', classification: 'supporting' as const, score: 0.8, reason: 'market', relevantClaimIds: [] },
    ]

    const { pool } = runComparablePipeline(allClaims, evidenceRecords, synthesisIds, sourceRelevance)
    expect(pool.stats.comparable).toBeGreaterThan(2)
    expect(pool.comparableClaims.some((c) => c.sourceId === 'source_install')).toBe(true)
    expect(pool.comparableClaims.some((c) => c.sourceId === 'source_market')).toBe(true)
  })

  it('TEST D — NO_EVIDENCE claims excluded; weak context evidence still generates', () => {
    const noEvA = claim('nea', 'source_1', 'MCP reduces integration complexity for AI toolchains.', [])
    const noEvB = claim('neb', 'source_2', 'MCP simplifies connecting AI tools across applications.', [])
    const weakA = claim(
      'weak_a',
      'source_1',
      'MCP can help teams connect external tools to models.',
      ['ev_weak_a'],
    )
    const weakB = claim(
      'weak_b',
      'source_2',
      'MCP may reduce some integration work for developers.',
      ['ev_weak_b'],
    )
    const evWeakA = evidence(
      'ev_weak_a',
      'source_1',
      'We talked about connecting tools and models in our stack.',
    )
    const evWeakB = evidence(
      'ev_weak_b',
      'source_2',
      'Developers mentioned integration friction during the demo.',
    )

    const allClaims = [...mcpFixture.allClaims.slice(0, 4), noEvA, noEvB, weakA, weakB]
    const evidenceRecords = [...mcpFixture.evidence.slice(0, 4), evWeakA, evWeakB]

    const synthesisIds = new Set(['source_1', 'source_2'])
    const sourceRelevance = [
      { sourceId: 'source_1', classification: 'direct' as const, score: 0.9, reason: 'MCP', relevantClaimIds: [] },
      { sourceId: 'source_2', classification: 'supporting' as const, score: 0.85, reason: 'MCP', relevantClaimIds: [] },
    ]

    const { pool, enriched } = runComparablePipeline(
      allClaims,
      evidenceRecords,
      synthesisIds,
      sourceRelevance,
    )

    const noEvRecordA = pool.records.find((r) => r.claimId === 'nea')
    const noEvRecordB = pool.records.find((r) => r.claimId === 'neb')
    expect(noEvRecordA?.poolDropReason).toBe('NO_EVIDENCE_REASONING_INELIGIBLE')
    expect(noEvRecordB?.poolDropReason).toBe('NO_EVIDENCE_REASONING_INELIGIBLE')
    expect(pool.comparableClaims.some((c) => c.id === 'nea')).toBe(false)
    expect(pool.comparableClaims.some((c) => c.id === 'neb')).toBe(false)

    const weakInPool = pool.comparableClaims.filter((c) => c.id === 'weak_a' || c.id === 'weak_b')
    expect(weakInPool.length).toBeGreaterThan(0)
    expect(weakInPool.every((c) => c.evidenceStatus !== 'NO_EVIDENCE')).toBe(true)

    const heuristic = discoverHeuristicCandidates(enriched.claims)
    expect(heuristic.all.length).toBeGreaterThan(0)
    expect(enriched.claims.every((c) => c.evidenceStatus !== 'NO_EVIDENCE')).toBe(true)
  })

  it('TEST E — hype claims limited but not deleted', () => {
    const hype = claim(
      'hype_1',
      'source_1',
      'MCP will completely revolutionize the AI industry.',
      [],
      'predictive',
    )
    const conservative = claim(
      'cons_1',
      'source_2',
      'MCP adoption is promising but operationally immature for many teams.',
      ['ev_cons'],
    )
    const evCons = evidence('ev_cons', 'source_2', 'Teams still struggle with MCP operational maturity.')

    const allClaims = [hype, conservative]
    const evidenceRecords = [evCons]

    const synthesisIds = new Set(['source_1', 'source_2'])
    const sourceRelevance = [
      { sourceId: 'source_1', classification: 'direct' as const, score: 0.9, reason: 'MCP', relevantClaimIds: [] },
      { sourceId: 'source_2', classification: 'contrasting' as const, score: 0.85, reason: 'MCP maturity', relevantClaimIds: [] },
    ]

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

    const hypeRecord = pool.records.find((r) => r.claimId === 'hype_1')
    expect(hypeRecord?.comparisonEligibility).toBe('EXCLUDED')
    expect(hypeRecord?.claimQualityClass).toBe('HYPE')
    expect(hypeRecord?.poolDropReason).toBe('NO_EVIDENCE_REASONING_INELIGIBLE')
    expect(pool.comparableClaims.some((c) => c.id === 'hype_1')).toBe(false)

    const enriched = enrichClaimsForCrossSourceCandidates({
      acceptedClaims: pool.generationClaims,
      supplementalClaims: [],
      synthesisSourceIds: synthesisIds,
      minPerSource: 1,
      maxTotal: 10,
    })
    expect(enriched.claims.some((c) => c.id === 'hype_1')).toBe(false)
    expect(enriched.claims.some((c) => c.id === 'cons_1')).toBe(true)
  })

  it('reports BEFORE/AFTER funnel simulating NO_EVIDENCE regression', () => {
    const synthesisIds = new Set(['source_1', 'source_2', 'source_3'])
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims: mcpFixture.allClaims,
      synthesisSourceIds: synthesisIds,
      centralQuestion: CENTRAL_QUESTION,
      sourceRelevance: mcpSourceRelevance,
    })
    const regressionUsable = funnel.usableClaims.map((c) => ({ ...c, evidenceIds: [] }))
    const strictQuality = applyClaimQualityGate({
      claims: regressionUsable,
      evidence: mcpFixture.evidence,
      centralQuestion: CENTRAL_QUESTION,
    })
    const pool = buildComparableClaimPool({
      usableClaims: regressionUsable,
      evidence: mcpFixture.evidence,
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
    const heuristic = discoverHeuristicCandidates(enriched.claims)

    const report = {
      scenario: 'NO_EVIDENCE regression simulation',
      before: {
        extracted: mcpFixture.allClaims.length,
        relevanceUsable: funnel.funnel.finalUsable,
        qualityAccepted: strictQuality.accepted.length,
        generationClaims: strictQuality.accepted.length,
        participatingSources: new Set(strictQuality.accepted.map((c) => c.sourceId)).size,
        candidatePairs: 0,
      },
      after: {
        comparable: pool.stats.comparable,
        generationEligible: pool.stats.generationEligible,
        candidatePairs: heuristic.all.length,
        semanticCandidates: heuristic.semantic.length,
        participatingSources: participatingSourceCount(enriched.claims),
        strictQualityAccepted: strictQuality.accepted.length,
      },
    }
    // eslint-disable-next-line no-console
    console.log('MCP_FUNNEL_REPORT', JSON.stringify(report))

    expect(strictQuality.accepted.length).toBe(0)
    expect(pool.stats.generationEligible).toBe(0)

    const { pool: poolWithEvidence, enriched: enrichedWithEvidence } = runComparablePipeline(
      mcpFixture.allClaims,
      mcpFixture.evidence,
      synthesisIds,
      mcpSourceRelevance,
    )
    const heuristicWithEvidence = discoverHeuristicCandidates(enrichedWithEvidence.claims)

    expect(poolWithEvidence.stats.generationEligible).toBeGreaterThan(1)
    expect(participatingSourceCount(enrichedWithEvidence.claims)).toBeGreaterThanOrEqual(2)
    expect(heuristicWithEvidence.all.length).toBeGreaterThan(0)
  })
})
