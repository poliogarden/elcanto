import { describe, expect, it } from 'vitest'
import { reasoningToSurvival } from '@/lib/reasoning/adapter-survival'
import {
  alignReasoningEvidenceDisplay,
  buildEvidenceLineageReport,
  verifyLineageInvariants,
} from '@/lib/reasoning/evidence-lineage-audit'
import { deriveLandscapeFromEvidence } from '@/lib/reasoning/landscape-from-evidence'
import { normalizeClaimId } from '@/lib/reasoning/source-ingest'
import type { MultiSourceReasoning, RelationshipCluster } from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

function agreementCluster(): RelationshipCluster {
  return {
    id: 'cluster_1',
    canonicalClaim: 'MCP is a significant factor in the AI ecosystem.',
    label: 'MCP significance across sources',
    type: 'AGREEMENT',
    dimension: 'significance',
    memberRelationshipIds: ['rel_1'],
    supportingClaimIds: ['source_1_claim_3', 'source_2_claim_3'],
    supportingSourceIds: ['source_1', 'source_2'],
    sourceCount: 2,
    sourcePairCount: 1,
    evidenceCount: 2,
    confidence: 'strong',
    significanceScore: 0.45,
    noveltyScore: 0.5,
    evidenceStrength: 0.8,
    genericnessScore: 0.2,
    visualKind: 'agree',
    parentIds: [],
    childIds: ['rel_1'],
  }
}

function baseDoc(): SynthesisDocument {
  return {
    id: 'lineage-test',
    number: 'LT',
    createdAt: new Date().toISOString(),
    status: 'complete',
    voices: [
      {
        voice: {
          id: 'v1',
          n: 1,
          youtubeId: 'yt1',
          url: '',
          title: 'MCP intro',
          channel: 'A',
          duration: '10:00',
          status: 'done',
        },
        source: {
          sourceId: 'source_1',
          videoId: 'yt1',
          voiceIndex: 1,
          title: 'MCP intro',
          channel: 'A',
          url: '',
        },
      },
      {
        voice: {
          id: 'v2',
          n: 2,
          youtubeId: 'yt2',
          url: '',
          title: 'MCP vs API',
          channel: 'B',
          duration: '12:00',
          status: 'done',
        },
        source: {
          sourceId: 'source_2',
          videoId: 'yt2',
          voiceIndex: 2,
          title: 'MCP vs API',
          channel: 'B',
          url: '',
        },
      },
      {
        voice: {
          id: 'v3',
          n: 3,
          youtubeId: 'yt3',
          url: '',
          title: 'Motivation shorts',
          channel: 'C',
          duration: '5:00',
          status: 'done',
        },
        source: {
          sourceId: 'source_3',
          videoId: 'yt3',
          voiceIndex: 3,
          title: 'Motivation shorts',
          channel: 'C',
          url: '',
        },
      },
    ],
  }
}

function reasoningWithWrongLandscape(): MultiSourceReasoning {
  const cluster = agreementCluster()
  return {
    mode: 'multi',
    version: 'reasoning-v2.1',
    centralQuestion: 'What is MCP and why does it matter for AI integration?',
    clusters: [
      {
        id: 'c1',
        label: 'MCP',
        centralQuestion: 'What is MCP?',
        sourceIds: ['source_1', 'source_2'],
        relevance: 'primary',
      },
    ],
    excludedSources: [
      {
        sourceId: 'source_3',
        videoId: 'yt3',
        voiceIndex: 3,
        title: 'Motivation shorts',
        reason: 'Transcript evidence: off-topic for MCP integration question',
        clusterId: 'c_off',
      },
    ],
    claims: [
      {
        id: 'source_1_claim_3',
        sourceId: 'source_1',
        videoId: 'yt1',
        voiceIndex: 1,
        statement: 'MCP is a transformative force in the AI ecosystem.',
        normalizedStatement: 'mcp is a transformative force in the ai ecosystem.',
        evidenceIds: ['source_1_ev_1'],
        claimType: 'factual',
        confidence: 'strong',
      },
      {
        id: 'source_2_claim_3',
        sourceId: 'source_2',
        videoId: 'yt2',
        voiceIndex: 2,
        statement: 'MCP is a game-changer for AI tool integration.',
        normalizedStatement: 'mcp is a game-changer for ai tool integration.',
        evidenceIds: ['source_2_ev_1'],
        claimType: 'factual',
        confidence: 'strong',
      },
    ],
    evidence: [
      {
        id: 'source_1_ev_1',
        sourceId: 'source_1',
        videoId: 'yt1',
        timestampStart: 10,
        timestampEnd: null,
        text: 'MCP changes how AI connects to tools.',
        confidence: 0.9,
      },
      {
        id: 'source_2_ev_1',
        sourceId: 'source_2',
        videoId: 'yt2',
        timestampStart: 20,
        timestampEnd: null,
        text: 'MCP is reshaping AI integration.',
        confidence: 0.9,
      },
    ],
    concepts: [],
    stances: [],
    assumptions: [],
    relationships: [
      {
        id: 'rel_1',
        type: 'AGREEMENT',
        fromClaimId: 'source_1_claim_3',
        toClaimId: 'source_2_claim_3',
        fromSourceId: 'source_1',
        toSourceId: 'source_2',
        fromVideoId: 'yt1',
        toVideoId: 'yt2',
        explanation: cluster.canonicalClaim,
        confidence: 'strong',
        verificationStatus: 'SUPPORTED',
        discoveryLevel: 'DIRECT_MATCH',
        reasoningBridge: null,
      },
    ],
    rejectedRelationships: [],
    relationshipClusters: [cluster],
    significantRelationships: [cluster],
    patterns: [
      {
        id: 'pattern_1',
        type: 'shared_theme',
        title: 'MCP as a Catalyst for Change in AI',
        description: 'Both sources emphasize MCP impact.',
        claimIds: ['source_1_claim_3', 'source_2_claim_3'],
        sourceIds: ['source_1', 'source_2'],
        relationshipIds: ['rel_1'],
        confidence: 'strong',
        verificationStatus: 'SUPPORTED',
      },
    ],
    synthesis: {
      statement: 'MCP is a significant integration standard across sources.',
      explanation: 'Verified agreement on MCP impact.',
      confidence: 'moderate',
    },
    judgment: {
      statement:
        "MCP's role is significant, but its dependency may limit the flexibility of integration strategies.",
      whatIsSupported: 'Cross-source agreement on MCP significance.',
      whatIsUncertain: 'Long-term differentiation from APIs.',
      keyReason: 'Verified agreement cluster rel_1.',
      missingEvidence: [],
      confidence: 'moderate',
    },
    insights: [],
    knowledgeGaps: [
      {
        id: 'gap_1',
        question: 'How does MCP API comparison affect long-term differentiation?',
        whyItMatters: 'API comparison is insufficient evidence.',
        linkedJudgmentAspect: 'differentiation',
      },
    ],
    landscape: {
      agree: {
        countLabel: '4 sources agree on MCP positive impact',
        cards: [
          { id: 'bad_1', title: 'Wrong', summary: 'LLM hallucinated card' },
        ],
      },
      divide: {
        countLabel: '2 sources express concerns about dependency',
        cards: [
          { id: 'bad_div', title: 'Dependency concern', summary: 'No verified divide' },
        ],
      },
      unclear: {
        countLabel: '2',
        cards: [],
      },
    },
    diagnostics: {
      survivalTest: {
        q1_crossSourceValue: false,
        q2_newRelationships: false,
        q3_beyondSummary: false,
        q4_trueEmergent: false,
        q5_tenSecondClarity: false,
        q6_noForcedLinks: false,
        q7_structurallyDifferent: false,
        notes: [],
      },
      rejectedRelationshipCount: 0,
      rejectedInsightCount: 0,
      clusterCount: 1,
      primaryClusterSourceCount: 2,
      passesRun: [],
      pipelineStats: {
        sourcesCount: 3,
        claimsExtracted: 2,
        relevantClaims: 2,
        candidatePairs: 1,
        directCandidates: 1,
        semanticCandidates: 0,
        inferenceCandidates: 0,
        verifiedRelationships: 1,
        rejectedRelationships: 0,
        emergentCandidates: 0,
        verifiedEmergentInsights: 0,
        discoveryPassesCompleted: [],
      },
    },
    createdAt: new Date().toISOString(),
  }
}

describe('evidence lineage regression', () => {
  it('normalizes claim ids that use wrong source prefix', () => {
    expect(normalizeClaimId('source_1_claim_1', 'source_3', 1)).toBe('source_3_claim_1')
    expect(normalizeClaimId('source_3_claim_2', 'source_3', 2)).toBe('source_3_claim_2')
  })

  it('replaces LLM landscape with evidence-derived source counts', () => {
    const reasoning = reasoningWithWrongLandscape()
    const aligned = alignReasoningEvidenceDisplay(reasoning)

    expect(aligned.landscape.agree.countLabel).toBe('1')
    expect(aligned.landscape.divide.countLabel).toBe('0')
    expect(aligned.landscape.divide.cards).toHaveLength(0)
    expect(aligned.landscape.agree.cards[0]?.id).toBe('cluster_1')
  })

  it('removes emergent inference from judgment when no insights and no divide evidence', () => {
    const reasoning = reasoningWithWrongLandscape()
    const aligned = alignReasoningEvidenceDisplay(reasoning)

    expect(aligned.judgment?.statement).not.toMatch(/may limit/i)
    expect(aligned.judgment?.statement).toMatch(/MCP/i)
  })

  it('survival adapter matches landscape and source counts', () => {
    const doc = baseDoc()
    const survival = reasoningToSurvival(reasoningWithWrongLandscape(), doc)

    expect(survival.submittedVideoCount).toBe(3)
    expect(survival.analyzedVideoCount).toBe(2)
    expect(survival.excludedVideoCount).toBe(1)
    expect(survival.landscape.agree.countLabel).toBe('1')
    expect(survival.landscape.divide.countLabel).toBe('0')
  })

  it('passes lineage invariants for corrected reasoning', () => {
    const doc = baseDoc()
    const reasoning = reasoningWithWrongLandscape()
    const report = buildEvidenceLineageReport(reasoning, doc)

    expect(report.agreementSourceCount).toBe(2)
    expect(report.divideSourceCount).toBe(0)
    expect(report.invariants.ok).toBe(true)
    expect(report.judgmentPropositions.every((p) => p.supportStatus !== 'UNSUPPORTED')).toBe(true)
  })

  it('deriveLandscape never produces divide cards when divide source count is zero', () => {
    const landscape = deriveLandscapeFromEvidence({
      significantClusters: [agreementCluster()],
      knowledgeGaps: [],
    })
    expect(landscape.divide.cards).toHaveLength(0)
    expect(landscape.divide.countLabel).toBe('0')
  })

  it('flags violations when landscape countLabel disagrees with graph', () => {
    const reasoning = reasoningWithWrongLandscape()
    const bad = verifyLineageInvariants({
      reasoning,
      sourceCounts: {
        submittedSourceCount: 3,
        analyzedSourceCount: 3,
        relevantSourceCount: 2,
        excludedSourceCount: 1,
      },
      propositions: [],
    })
    expect(bad.ok).toBe(false)
    expect(bad.violations.some((v) => v.includes('countLabel'))).toBe(true)
  })
})
