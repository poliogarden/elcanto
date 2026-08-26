import { describe, expect, it } from 'vitest'
import { buildAnalysisResult } from '@/lib/reasoning/analysis-result'
import { reasoningToSurvival } from '@/lib/reasoning/adapter-survival'
import { buildArtifactPlan } from '@/lib/reasoning/artifact-plan'
import { combineReasoningNodes } from '@/lib/reasoning/combine-nodes'
import { runEmergentQualityGate } from '@/lib/reasoning/emergent-gate'
import {
  containsOvergeneralization,
  evidenceRefFromRecord,
  isCrossSourceRelationship,
} from '@/lib/reasoning/provenance'
import type { MultiSourceReasoning, ReasoningRelationship } from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

function baseDoc(voiceCount = 3): SynthesisDocument {
  const voices = Array.from({ length: voiceCount }, (_, i) => ({
    voice: {
      id: `v${i + 1}`,
      n: i + 1,
      youtubeId: `yt${i + 1}`,
      url: '',
      title: `Video ${i + 1}`,
      channel: 'C',
      duration: '10:00',
      status: 'done' as const,
    },
    source: {
      sourceId: `source_${i + 1}`,
      videoId: `yt${i + 1}`,
      voiceIndex: i + 1,
      title: `Video ${i + 1}`,
      channel: 'C',
      url: '',
    },
  }))
  return {
    id: 'test-analysis',
    number: 'T',
    createdAt: new Date().toISOString(),
    status: 'complete',
    voices,
  }
}

function supportedRel(
  id: string,
  fromSource: string,
  toSource: string,
  fromClaim: string,
  toClaim: string,
): ReasoningRelationship {
  return {
    id,
    type: 'AGREEMENT',
    fromClaimId: fromClaim,
    toClaimId: toClaim,
    fromSourceId: fromSource,
    toSourceId: toSource,
    fromVideoId: `yt${fromSource.split('_')[1]}`,
    toVideoId: `yt${toSource.split('_')[1]}`,
    explanation: 'Both sources indicate MCP reduces integration friction.',
    confidence: 'strong',
    verificationStatus: 'SUPPORTED',
    discoveryLevel: 'DIRECT_MATCH',
  }
}

function multiBase(overrides: Partial<MultiSourceReasoning> = {}): MultiSourceReasoning {
  return {
    mode: 'multi',
    version: 'reasoning-v2.1',
    schemaVersion: 3,
    centralQuestion: 'What is MCP?',
    clusters: [],
    excludedSources: [],
    claims: [
      {
        id: 'source_1_claim_1',
        sourceId: 'source_1',
        videoId: 'yt1',
        voiceIndex: 1,
        statement: 'MCP reduces integration friction.',
        normalizedStatement: 'mcp reduces integration friction.',
        evidenceIds: ['ev_1'],
        claimType: 'factual',
        confidence: 'strong',
        conceptIds: [],
      },
      {
        id: 'source_2_claim_1',
        sourceId: 'source_2',
        videoId: 'yt2',
        voiceIndex: 2,
        statement: 'MCP makes integration easier.',
        normalizedStatement: 'mcp makes integration easier.',
        evidenceIds: ['ev_2'],
        claimType: 'factual',
        confidence: 'strong',
        conceptIds: [],
      },
    ],
    evidence: [
      {
        id: 'ev_1',
        sourceId: 'source_1',
        videoId: 'yt1',
        timestampStart: 42,
        timestampEnd: null,
        text: 'MCP simplifies integrations.',
        confidence: 0.9,
      },
      {
        id: 'ev_2',
        sourceId: 'source_2',
        videoId: 'yt2',
        timestampStart: 0,
        timestampEnd: null,
        text: 'Integration is easier with MCP.',
        confidence: 0.9,
      },
    ],
    concepts: [],
    stances: [],
    assumptions: [],
    relationships: [
      supportedRel('rel_1', 'source_1', 'source_2', 'source_1_claim_1', 'source_2_claim_1'),
    ],
    rejectedRelationships: [],
    relationshipClusters: [],
    significantRelationships: [],
    patterns: [],
    synthesis: null,
    judgment: {
      statement: 'Within the analyzed sources, MCP reduces integration friction.',
      whatIsSupported: 'Cross-source agreement on integration.',
      whatIsUncertain: 'Long-term impact.',
      keyReason: 'Verified agreement.',
      missingEvidence: [],
      confidence: 'moderate',
      verificationStatus: 'SUPPORTED',
    },
    insights: [],
    knowledgeGaps: [],
    landscape: {
      agree: { countLabel: '2', cards: [] },
      divide: { countLabel: '0', cards: [] },
      unclear: { countLabel: '0', cards: [] },
    },
    diagnostics: {
      survivalTest: {
        q1_crossSourceValue: true,
        q2_newRelationships: true,
        q3_beyondSummary: true,
        q4_trueEmergent: false,
        q5_tenSecondClarity: true,
        q6_noForcedLinks: true,
        q7_structurallyDifferent: false,
        notes: [],
      },
      rejectedRelationshipCount: 0,
      rejectedInsightCount: 0,
      clusterCount: 0,
      primaryClusterSourceCount: 2,
      passesRun: [],
      pipelineStats: {
        sourcesCount: 2,
        inputSources: 2,
        relevantSources: 2,
        excludedSources: 0,
        synthesizedSources: 2,
        claimsExtracted: 2,
        relevantClaims: 2,
        candidatePairs: 1,
        directCandidates: 1,
        semanticCandidates: 0,
        inferenceCandidates: 0,
        verifiedRelationships: 1,
        crossSourceVerifiedRelationships: 1,
        rejectedRelationships: 0,
        emergentCandidates: 0,
        verifiedEmergentInsights: 0,
        discoveryPassesCompleted: [],
      },
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('engine finalization CASE A — source counts', () => {
  it('3 input, 2 relevant, 1 excluded, 2 synthesized', () => {
    const reasoning = multiBase({
      excludedSources: [
        {
          sourceId: 'source_3',
          videoId: 'yt3',
          voiceIndex: 3,
          title: 'Off topic',
          reason: 'Off-topic',
        },
      ],
      diagnostics: {
        ...multiBase().diagnostics,
        pipelineStats: {
          ...multiBase().diagnostics.pipelineStats!,
          sourcesCount: 3,
          inputSources: 3,
          relevantSources: 2,
          excludedSources: 1,
          synthesizedSources: 2,
        },
      },
    })
    const analysis = buildAnalysisResult(reasoning, baseDoc(3))
    expect(analysis.counts.inputSources).toBe(3)
    expect(analysis.counts.relevantSources).toBe(2)
    expect(analysis.counts.excludedSources).toBe(1)
    expect(analysis.counts.synthesizedSources).toBe(2)
  })
})

describe('engine finalization CASE B — agreement', () => {
  it('creates cross-source agreement with evidence', () => {
    const analysis = buildAnalysisResult(multiBase(), baseDoc(2))
    expect(analysis.verifiedRelationships.length).toBe(1)
    expect(isCrossSourceRelationship(analysis.verifiedRelationships[0])).toBe(true)
    const prov = analysis.relationshipProvenance.rel_1
    expect(prov.evidenceRefs.length).toBeGreaterThan(0)
    expect(prov.reasoningLevel).toMatch(/SUPPORTED|SYNTHESIZED/)
  })
})

describe('engine finalization CASE C — same-source not cross-source', () => {
  it('does not count same-source pair as cross-source', () => {
    const rel = supportedRel('rel_same', 'source_1', 'source_1', 'source_1_claim_1', 'source_1_claim_2')
    expect(isCrossSourceRelationship(rel)).toBe(false)
  })
})

describe('engine finalization CASE D — duplicate suppression', () => {
  it('significant clusters fewer than raw verified', () => {
    const rels = Array.from({ length: 5 }, (_, i) =>
      supportedRel(`rel_${i}`, 'source_1', 'source_2', 'source_1_claim_1', 'source_2_claim_1'),
    )
    const reasoning = multiBase({
      relationships: rels,
      significantRelationships: [
        {
          id: 'cluster_1',
          canonicalClaim: 'MCP reduces friction',
          label: 'Integration friction',
          type: 'AGREEMENT',
          dimension: 'integration',
          memberRelationshipIds: rels.map((r) => r.id),
          supportingClaimIds: ['source_1_claim_1', 'source_2_claim_1'],
          supportingSourceIds: ['source_1', 'source_2'],
          sourceCount: 2,
          sourcePairCount: 1,
          evidenceCount: 2,
          confidence: 'strong',
          significanceScore: 0.5,
          noveltyScore: 0.5,
          evidenceStrength: 0.8,
          genericnessScore: 0.2,
          visualKind: 'agree',
          parentIds: [],
          childIds: rels.map((r) => r.id),
        },
      ],
    })
    const analysis = buildAnalysisResult(reasoning, baseDoc(2))
    expect(analysis.counts.verifiedRelationships).toBe(5)
    expect(analysis.counts.significantRelationships).toBe(1)
  })
})

describe('engine finalization CASE E — emergent rejection', () => {
  it('rejects market prediction without relationship evidence', () => {
    const gate = runEmergentQualityGate({
      insights: [
        {
          id: 'ins_1',
          type: 'future_implication',
          statement: 'Traditional APIs will become irrelevant.',
          explanation: 'Speculation',
          sourceIds: ['source_1', 'source_2'],
          claimIds: ['source_1_claim_1', 'source_2_claim_1'],
          relationshipIds: [],
          patternIds: [],
          evidencePath: [
            { step: 'claim', refId: 'source_1_claim_1', label: 'a' },
            { step: 'claim', refId: 'source_2_claim_1', label: 'b' },
          ],
          confidence: 'low',
          verificationStatus: 'SUPPORTED',
        },
      ],
      claimStatements: ['MCP reduces friction', 'MCP is easier'],
      knowledgeGaps: [],
      synthesizedSourceCount: 2,
    })
    expect(gate.accepted.length).toBe(0)
    expect(
      gate.rejected.some(
        (r) => r.reason === 'MARKET_PREDICTION' || r.reason === 'OVERGENERALIZATION',
      ),
    ).toBe(true)
  })
})

describe('engine finalization CASE F — overgeneralization', () => {
  it('flags industry consensus with 2 sources', () => {
    expect(
      containsOvergeneralization('There is strong industry consensus on MCP.', 2),
    ).toBe(true)
  })
})

describe('engine finalization CASE G — timestamps', () => {
  it('marks unavailable timestamp without fabricating', () => {
    const ref = evidenceRefFromRecord({
      id: 'ev_2',
      sourceId: 'source_2',
      videoId: 'yt2',
      timestampStart: 0,
      timestampEnd: null,
      text: 'text',
      confidence: 0.9,
    })
    expect(ref.timestampAvailability).toBe('unavailable')
    expect(ref.timestampStart).toBe(0)
  })
})

describe('engine finalization CASE H — count consistency', () => {
  it('survival adapter matches analysis verified count and list', () => {
    const rels = Array.from({ length: 5 }, (_, i) =>
      supportedRel(`rel_${i}`, 'source_1', 'source_2', 'source_1_claim_1', 'source_2_claim_1'),
    )
    const reasoning = multiBase({ relationships: rels })
    const doc = baseDoc(2)
    const analysis = buildAnalysisResult(reasoning, doc)
    const survival = reasoningToSurvival(reasoning, doc)
    expect(analysis.counts.verifiedRelationships).toBe(5)
    expect(survival.verifiedRelationships.length).toBe(5)
    expect(survival.claims.length).toBe(analysis.counts.displayedClaims)
  })
})

describe('node composition readiness', () => {
  it('combineReasoningNodes preserves evidence refs', () => {
    const analysis = buildAnalysisResult(multiBase(), baseDoc(2))
    const combined = combineReasoningNodes(analysis, ['claim_source_1_claim_1'])
    expect(combined).not.toBeNull()
    expect(combined!.sourceIds).toContain('source_1')
    expect(combined!.evidenceRefs.length).toBeGreaterThan(0)
  })

  it('buildArtifactPlan never fabricates timestamps', () => {
    const analysis = buildAnalysisResult(multiBase(), baseDoc(2))
    const plan = buildArtifactPlan(analysis, ['claim_source_2_claim_1'])
    const unavailable = plan.sourceSegments.find((s) => s.timestampAvailability === 'unavailable')
    expect(unavailable).toBeDefined()
    expect(plan.missingTimestampRefs.length).toBeGreaterThan(0)
  })
})
