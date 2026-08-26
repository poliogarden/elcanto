import { describe, expect, it } from 'vitest'
import { discoverHeuristicCandidates } from '@/lib/reasoning/candidate-discovery'
import { applyClaimQualityGate } from '@/lib/reasoning/claim-quality'
import { resolveClaimsThroughRelevanceFunnel } from '@/lib/reasoning/claim-relevance'
import {
  enhanceSourceRelevance,
  synthesisIdsFromEnhanced,
} from '@/lib/reasoning/source-relevance-enhance'
import {
  filterHighSignalClaims,
  ingestSourceUnderstanding,
} from '@/lib/reasoning/source-ingest'
import { passesVerificationPreGate } from '@/lib/reasoning/verification-alignment'
import type { SourceAnalysis } from '@/lib/types/source'

const CENTRAL = 'What is MCP and how does it impact the AI industry?'

const BASE = [
  'MCP provides a standardized interface for connecting AI tools.',
  'MCP can reduce integration complexity between applications and tools.',
  'Developers can connect tools more easily through MCP.',
  'Traditional APIs require separate integrations for each tool.',
  'MCP offers a more user-friendly experience than API, which leads to faster adoption.',
  "MCP integrated solutions can be deployed more quickly than disparate API systems.",
  'The protocol enables models to call external tools through a common layer.',
  'Security boundaries matter when models access external systems.',
]

function buildSources(): SourceAnalysis[] {
  return [1, 2, 3].map((s) => {
    const sourceId = `source_${s}`
    return {
      sourceId,
      videoId: `yt${s}`,
      voiceIndex: s,
      title: `MCP ${s}`,
      channel: `C${s}`,
      url: `https://youtube.com/watch?v=v${s}`,
      summary: 'MCP',
      thesis: 'MCP integration',
      topics: ['MCP', 'AI tools'],
      claims: BASE.map((statement, i) => ({
        id: `${sourceId}_claim_${i + 1}`,
        statement: `${statement} (v${s})`,
        confidence: 0.85,
        evidenceSummary: 'segment',
      })),
      entities: [],
      conclusions: [],
      implications: [],
      evidence: BASE.map((statement, i) => ({
        id: `${sourceId}_ev_${i + 1}`,
        text: statement.slice(0, 60),
        timestamp: i * 10,
      })),
      stance: 'supportive',
      assumptions: [],
      counterArguments: [],
      limitations: [],
      keyArguments: [],
      importantConcepts: ['MCP'],
      uniquePerspective: '',
      coverage: { percent: 80, segments: 10 },
    }
  })
}

describe('MCP verification pre-gate funnel', () => {
  it('passes semantic/complementary candidates that previously failed isDiscoveryCandidate', () => {
    const sources = buildSources()
    const ingested = ingestSourceUnderstanding(sources)
    const extracted = filterHighSignalClaims(ingested.claims)
    const enhanced = enhanceSourceRelevance({
      sources,
      claims: extracted,
      evidence: ingested.evidence,
      centralQuestion: CENTRAL,
      existing: sources.map((s) => ({
        sourceId: s.sourceId,
        classification: 'direct' as const,
        score: 0.9,
        reason: 'MCP',
        relevantClaimIds: [],
      })),
    })
    const synthesisIds = synthesisIdsFromEnhanced(enhanced)
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims: extracted,
      synthesisSourceIds: synthesisIds,
      centralQuestion: CENTRAL,
      sourceRelevance: enhanced,
    })
    const quality = applyClaimQualityGate({
      claims: funnel.usableClaims,
      evidence: ingested.evidence,
      centralQuestion: CENTRAL,
    })
    const heuristic = discoverHeuristicCandidates(quality.accepted)

    let prePass = 0
    const claimById = new Map(quality.accepted.map((c) => [c.id, c]))
    for (const cand of heuristic.all) {
      const from = claimById.get(cand.fromClaimId)
      const to = claimById.get(cand.toClaimId)
      if (!from || !to) continue
      const scores = passesVerificationPreGate(from, to, cand.type)
      if (scores.passed) prePass++
    }

    expect(extracted.length).toBeGreaterThan(20)
    expect(quality.accepted.length).toBeGreaterThan(10)
    expect(heuristic.all.length).toBeGreaterThan(0)
    expect(prePass).toBeGreaterThan(0)
    expect(prePass).toBeGreaterThanOrEqual(
      Math.min(3, heuristic.all.length),
    )
  })
})
