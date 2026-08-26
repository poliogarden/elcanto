import { describe, expect, it } from 'vitest'
import { resolveClaimsThroughRelevanceFunnel } from '@/lib/reasoning/claim-relevance'
import { applyClaimQualityGate } from '@/lib/reasoning/claim-quality'
import { computeSurvivalDiagnostics } from '@/lib/reasoning/diagnostics'
import {
  enhanceSourceRelevance,
  synthesisIdsFromEnhanced,
} from '@/lib/reasoning/source-relevance-enhance'
import {
  filterHighSignalClaims,
  ingestSourceUnderstanding,
} from '@/lib/reasoning/source-ingest'
import type { SourceAnalysis } from '@/lib/types/source'

const CENTRAL = 'What is MCP and how does it impact the AI industry?'

const BASE_STATEMENTS = [
  'MCP provides a standardized interface for connecting AI tools.',
  'MCP can reduce integration complexity between applications and tools.',
  'Developers can connect tools more easily through MCP.',
  'Traditional APIs require separate integrations for each tool.',
  'The protocol enables models to call external tools through a common layer.',
  'Tool vendors can expose capabilities without custom glue code for each model.',
  'Standard interfaces reduce the maintenance burden for developer teams.',
  'Without a standard layer, each integration is a one-off project.',
  'Security boundaries matter when models access external systems.',
  'Authentication and permissions must be enforced at the tool boundary.',
  'Some teams still prefer direct API calls for legacy systems.',
  'Adoption depends on ecosystem support from major AI platforms.',
  'Latency and reliability vary depending on how tools are hosted.',
  'Open standards tend to spread when big vendors align on them.',
  'The AI industry is watching whether MCP becomes a default integration path.',
]

function mcpSources(variant: 'identical' | 'distinct'): SourceAnalysis[] {
  return [1, 2, 3].map((s) => {
    const sourceId = `source_${s}`
    const claims = BASE_STATEMENTS.map((statement, i) => ({
      id: `${sourceId}_claim_${i + 1}`,
      statement:
        variant === 'distinct' ? `${statement} (voice ${s})` : statement,
      confidence: 0.85,
      evidenceSummary: 'transcript segment',
    }))
    const evidence = BASE_STATEMENTS.map((statement, i) => ({
      id: `${sourceId}_ev_${i + 1}`,
      text:
        variant === 'distinct'
          ? `Yeah, ${statement.split(' ').slice(0, 5).join(' ')}`
          : `Yeah, ${statement.split(' ').slice(0, 5).join(' ')}`,
      timestamp: i * 12,
    }))
    return {
      sourceId,
      videoId: `yt${s}`,
      voiceIndex: s,
      title: `MCP Video ${s}`,
      channel: `Channel ${s}`,
      url: `https://youtube.com/watch?v=vid${s}`,
      summary: 'MCP overview',
      thesis: 'MCP changes integration',
      topics: ['MCP', 'AI tools'],
      claims,
      entities: [],
      conclusions: ['MCP matters'],
      implications: ['More integrations'],
      evidence,
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

function runTrace(sources: SourceAnalysis[]) {
  const ingested = ingestSourceUnderstanding(sources)
  const extracted = filterHighSignalClaims(ingested.claims)
  const clusteredRelevance = sources.map((s) => ({
    sourceId: s.sourceId,
    classification: 'direct' as const,
    score: 0.9,
    reason: 'MCP',
    relevantClaimIds: [],
  }))
  const enhanced = enhanceSourceRelevance({
    sources,
    claims: extracted,
    evidence: ingested.evidence,
    centralQuestion: CENTRAL,
    existing: clusteredRelevance,
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
  return { extracted, enhanced, synthesisIds, funnel, quality }
}

describe('pipeline runtime relevance trace (MCP fixture)', () => {
  it('keeps per-source claims when statements match across videos', () => {
    const { extracted, enhanced, synthesisIds } = runTrace(mcpSources('identical'))
    expect(extracted.length).toBe(BASE_STATEMENTS.length * 3)
    expect(synthesisIds.size).toBe(3)
    expect(enhanced.filter((e) => e.tier === 'PRIMARY').length).toBe(3)
  })

  it('does not collapse 45+ extracted claims to a single usable claim', () => {
    const { extracted, funnel, quality } = runTrace(mcpSources('distinct'))
    expect(extracted.length).toBeGreaterThan(40)
    expect(funnel.funnel.finalUsable).toBeGreaterThan(10)
    expect(quality.accepted.length).toBeGreaterThan(10)
    expect(funnel.funnel.primaryTier + funnel.funnel.supportingTier).toBeGreaterThan(10)
  })

  it('preserves relevance funnel through computeSurvivalDiagnostics', () => {
    const { funnel, quality } = runTrace(mcpSources('distinct'))
    const reasoning = {
      mode: 'multi' as const,
      version: 'reasoning-v2.1',
      centralQuestion: CENTRAL,
      clusters: [],
      sourceRelevance: [],
      excludedSources: [],
      claims: quality.accepted,
      evidence: [],
      concepts: [],
      stances: [],
      assumptions: [],
      relationships: [],
      rejectedRelationships: [],
      relationshipClusters: [],
      significantRelationships: [],
      patterns: [],
      synthesis: null,
      judgment: null,
      insights: [],
      knowledgeGaps: [],
      landscape: {
        agree: { countLabel: '0', cards: [] },
        divide: { countLabel: '0', cards: [] },
        unclear: { countLabel: '0', cards: [] },
      },
      diagnostics: {
        survivalTest: {
          q1_crossSourceValue: false,
          q2_newRelationships: false,
          q3_beyondSummary: false,
          q4_trueEmergent: false,
          q5_tenSecondClarity: false,
          q6_noForcedLinks: true,
          q7_structurallyDifferent: false,
          notes: [],
        },
        rejectedRelationshipCount: 0,
        rejectedInsightCount: 0,
        clusterCount: 0,
        primaryClusterSourceCount: 3,
        passesRun: [],
        pipelineStats: {
          sourcesCount: 3,
          claimsExtracted: 45,
          relevantClaims: quality.accepted.length,
          funnelFinalUsable: funnel.funnel.finalUsable,
          candidatePairs: 0,
          directCandidates: 0,
          semanticCandidates: 0,
          inferenceCandidates: 0,
          verifiedRelationships: 0,
          rejectedRelationships: 0,
          emergentCandidates: 0,
          verifiedEmergentInsights: 0,
          discoveryPassesCompleted: [],
        },
        relevanceFunnel: funnel.funnel,
        pipelineWarnings: [],
      },
      createdAt: new Date().toISOString(),
    }
    const diag = computeSurvivalDiagnostics(reasoning)
    expect(diag.relevanceFunnel?.finalUsable).toBe(funnel.funnel.finalUsable)
    expect(diag.pipelineStats?.funnelFinalUsable).toBe(funnel.funnel.finalUsable)
  })

  it('flags collapse when quality gate crushes funnel output', () => {
    const sources = mcpSources('distinct')
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
    const funnel = resolveClaimsThroughRelevanceFunnel({
      allClaims: extracted,
      synthesisSourceIds: synthesisIdsFromEnhanced(enhanced),
      centralQuestion: CENTRAL,
      sourceRelevance: enhanced,
    })
    expect(funnel.funnel.finalUsable).toBeGreaterThan(5)

    const bloated = funnel.usableClaims.map((c) => ({
      ...c,
      evidenceIds: [],
    }))
    const quality = applyClaimQualityGate({
      claims: bloated,
      evidence: ingested.evidence,
      centralQuestion: CENTRAL,
    })
    expect(quality.accepted.length).toBe(0)

    const warnings = [...funnel.warnings]
    if (
      extracted.length >= 20 &&
      quality.accepted.length / extracted.length < 0.05 &&
      enhanced.filter((e) => e.tier !== 'OFF_TOPIC').length >= 2
    ) {
      warnings.push({
        code: 'ABNORMAL_RELEVANCE_COLLAPSE',
        message: 'test',
        extractedClaims: extracted.length,
        relevantClaims: quality.accepted.length,
        relevantSources: 3,
      })
    }
    expect(warnings.some((w) => w.code === 'ABNORMAL_RELEVANCE_COLLAPSE')).toBe(true)
  })
})
