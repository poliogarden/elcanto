import { describe, expect, it } from 'vitest'
import {
  buildExplorerFromReasoning,
  buildExplorerFromSurvival,
  getAgreeRelationships,
  getDivideRelationships,
} from '@/lib/visualization/relationship-explorer-model'
import type { MultiSourceReasoning, RelationshipCluster } from '@/lib/reasoning/types'
import type { SurvivalAnalysis } from '@/lib/survival/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

const doc: SynthesisDocument = {
  id: 't',
  number: 'T',
  createdAt: new Date().toISOString(),
  status: 'complete',
  voices: [
    {
      voice: {
        id: 'v1',
        n: 1,
        youtubeId: 'yt1',
        url: '',
        title: 'MCP positive',
        channel: 'A',
        duration: '10:00',
        status: 'done',
      },
      source: { sourceId: 's1', videoId: 'yt1', voiceIndex: 1, title: 'MCP positive', channel: 'A', url: '' },
    },
    {
      voice: {
        id: 'v2',
        n: 2,
        youtubeId: 'yt2',
        url: '',
        title: 'MCP skeptical',
        channel: 'B',
        duration: '12:00',
        status: 'done',
      },
      source: { sourceId: 's2', videoId: 'yt2', voiceIndex: 2, title: 'MCP skeptical', channel: 'B', url: '' },
    },
    {
      voice: {
        id: 'v3',
        n: 3,
        youtubeId: 'yt3',
        url: '',
        title: 'Motivation',
        channel: 'C',
        duration: '5:00',
        status: 'done',
      },
      source: { sourceId: 's3', videoId: 'yt3', voiceIndex: 3, title: 'Motivation', channel: 'C', url: '' },
    },
  ],
}

function agreeCluster(memberRelId = 'r1'): RelationshipCluster {
  return {
    id: 'cluster_agree',
    canonicalClaim: 'Both discuss MCP adoption drivers.',
    label: 'MCP adoption drivers',
    type: 'AGREEMENT',
    dimension: 'adoption',
    memberRelationshipIds: [memberRelId],
    supportingClaimIds: ['c1', 'c2'],
    supportingSourceIds: ['s1', 's2'],
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
    childIds: [memberRelId],
  }
}

function baseReasoning(overrides: Partial<MultiSourceReasoning> = {}): MultiSourceReasoning {
  return {
    mode: 'multi',
    version: 'reasoning-v1',
    centralQuestion: 'Is MCP ready?',
    clusters: [
      {
        id: 'c1',
        label: 'MCP',
        centralQuestion: 'Is MCP ready?',
        sourceIds: ['s1', 's2'],
        relevance: 'primary',
      },
    ],
    excludedSources: [
      {
        sourceId: 's3',
        videoId: 'yt3',
        voiceIndex: 3,
        title: 'Motivation',
        reason: 'Off-topic',
      },
    ],
    claims: [
      {
        id: 'c1',
        sourceId: 's1',
        videoId: 'yt1',
        voiceIndex: 1,
        statement: 'MCP reduces integration complexity.',
        normalizedStatement: 'mcp reduces integration complexity.',
        evidenceIds: ['e1'],
        claimType: 'factual',
        confidence: 'strong',
        conceptIds: [],
      },
      {
        id: 'c2',
        sourceId: 's2',
        videoId: 'yt2',
        voiceIndex: 2,
        statement: 'MCP security is immature.',
        normalizedStatement: 'mcp security is immature.',
        evidenceIds: ['e2'],
        claimType: 'factual',
        confidence: 'moderate',
        conceptIds: [],
      },
    ],
    evidence: [
      {
        id: 'e1',
        sourceId: 's1',
        videoId: 'yt1',
        timestampStart: 120,
        timestampEnd: null,
        text: 'MCP simplifies integrations.',
        confidence: 0.9,
      },
      {
        id: 'e2',
        sourceId: 's2',
        videoId: 'yt2',
        timestampStart: 300,
        timestampEnd: null,
        text: 'Security concerns remain.',
        confidence: 0.8,
      },
    ],
    concepts: [],
    stances: [],
    assumptions: [],
    relationships: [
      {
        id: 'r1',
        type: 'AGREEMENT',
        fromClaimId: 'c1',
        toClaimId: 'c2',
        fromSourceId: 's1',
        toSourceId: 's2',
        fromVideoId: 'yt1',
        toVideoId: 'yt2',
        explanation: 'Both discuss MCP adoption drivers.',
        confidence: 'strong',
        verificationStatus: 'SUPPORTED',
      },
      {
        id: 'r_weak',
        type: 'AGREEMENT',
        fromClaimId: 'c1',
        toClaimId: 'c2',
        fromSourceId: 's1',
        toSourceId: 's2',
        fromVideoId: 'yt1',
        toVideoId: 'yt2',
        explanation: 'Weak link.',
        confidence: 'weak',
        verificationStatus: 'SUPPORTED',
      },
    ],
    rejectedRelationships: [],
    relationshipClusters: [agreeCluster()],
    significantRelationships: [agreeCluster()],
    patterns: [
      {
        id: 'p1',
        type: 'recurring_driver',
        title: 'Integration friction',
        description: 'Adoption follows reduced friction.',
        relationshipIds: ['r1'],
        claimIds: ['c1', 'c2'],
        sourceIds: ['s1', 's2'],
        confidence: 'strong',
        verificationStatus: 'SUPPORTED',
      },
    ],
    synthesis: null,
    judgment: {
      statement: 'MCP shows promise with security caveats.',
      whatIsSupported: 'Integration benefits.',
      whatIsUncertain: 'Security.',
      keyReason: 'Tension.',
      confidence: 'moderate',
      missingEvidence: [],
      verificationStatus: 'SUPPORTED',
    },
    insights: [],
    knowledgeGaps: [
      {
        id: 'g1',
        question: 'What are enterprise security controls?',
        whyItMatters: 'Blocks adoption conclusion.',
        linkedJudgmentAspect: 'Security readiness',
      },
    ],
    landscape: {
      agree: { countLabel: '1', cards: [] },
      divide: { countLabel: '0', cards: [] },
      unclear: { countLabel: '1', cards: [{ id: 'u1', title: 'Security', summary: 'Unknown' }] },
    },
    diagnostics: {
      survivalTest: {
        q1_crossSourceValue: true,
        q2_newRelationships: true,
        q3_beyondSummary: true,
        q4_trueEmergent: false,
        q5_tenSecondClarity: true,
        q6_noForcedLinks: true,
        q7_structurallyDifferent: true,
        notes: [],
      },
      rejectedRelationshipCount: 0,
      rejectedInsightCount: 0,
      clusterCount: 1,
      primaryClusterSourceCount: 2,
      passesRun: [],
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('buildExplorerFromReasoning', () => {
  it('TEST A: includes verified patterns and cross-source relationships', () => {
    const graph = buildExplorerFromReasoning(baseReasoning(), doc)
    expect(graph.patterns.length).toBeGreaterThan(0)
    expect(graph.relationships).toHaveLength(1)
    expect(graph.hasVerifiedRelationships).toBe(true)
    expect(getAgreeRelationships(graph)).toHaveLength(1)
  })

  it('TEST B: excludes off-topic sources from graph', () => {
    const graph = buildExplorerFromReasoning(baseReasoning(), doc)
    const excluded = graph.sources.filter((s) => s.excluded)
    expect(excluded).toHaveLength(1)
    expect(excluded[0].title).toContain('Motivation')
    expect(graph.claims.every((c) => c.sourceId !== 's3')).toBe(true)
  })

  it('TEST C: classifies tension as trade-off visual kind', () => {
    const tensionCluster: RelationshipCluster = {
      ...agreeCluster('r_tension'),
      id: 'cluster_tension',
      canonicalClaim: 'Speed vs security trade-off.',
      label: 'Speed vs security',
      type: 'TENSION',
      visualKind: 'trade-off',
      memberRelationshipIds: ['r_tension'],
      childIds: ['r_tension'],
    }
    const graph = buildExplorerFromReasoning(
      baseReasoning({
        relationships: [
          {
            id: 'r_tension',
            type: 'TENSION',
            fromClaimId: 'c1',
            toClaimId: 'c2',
            fromSourceId: 's1',
            toSourceId: 's2',
            fromVideoId: 'yt1',
            toVideoId: 'yt2',
            explanation: 'Speed vs security trade-off.',
            confidence: 'moderate',
            verificationStatus: 'SUPPORTED',
          },
        ],
        relationshipClusters: [tensionCluster],
        significantRelationships: [tensionCluster],
      }),
      doc,
    )
    expect(getDivideRelationships(graph)[0].visualKind).toBe('trade-off')
  })

  it('TEST D: empty graph when no verified relationships', () => {
    const graph = buildExplorerFromReasoning(
      baseReasoning({
        relationships: [],
        patterns: [],
        relationshipClusters: [],
        significantRelationships: [],
      }),
      doc,
    )
    expect(graph.hasVerifiedRelationships).toBe(false)
    expect(graph.emptyMessage).toMatch(/No verified/i)
  })

  it('filters weak relationships (precision > recall)', () => {
    const graph = buildExplorerFromReasoning(baseReasoning(), doc)
    expect(graph.relationships.every((r) => r.confidence !== 'weak')).toBe(true)
  })

  it('includes knowledge gaps with whyItMatters', () => {
    const graph = buildExplorerFromReasoning(baseReasoning(), doc)
    expect(graph.gaps.some((g) => g.whyItMatters?.includes('adoption'))).toBe(true)
  })
})

describe('buildExplorerFromSurvival', () => {
  it('builds fallback graph from legacy survival data', () => {
    const survival: SurvivalAnalysis = {
      version: 'survival-v1',
      sources: [
        {
          sourceId: 's1',
          videoId: 'yt1',
          voiceIndex: 1,
          title: 'A',
          channel: 'A',
          position: 'Pro MCP',
          includedInSynthesis: true,
        },
        {
          sourceId: 's2',
          videoId: 'yt2',
          voiceIndex: 2,
          title: 'B',
          channel: 'B',
          position: 'Skeptical',
          includedInSynthesis: true,
        },
      ],
      claims: [
        {
          claimId: 'c1',
          sourceId: 's1',
          videoId: 'yt1',
          voiceIndex: 1,
          claim: 'MCP is easy.',
          evidence: 'quote',
          timestamp: 60,
          confidence: 'strong',
        },
        {
          claimId: 'c2',
          sourceId: 's2',
          videoId: 'yt2',
          voiceIndex: 2,
          claim: 'MCP is risky.',
          evidence: 'quote2',
          timestamp: 90,
          confidence: 'moderate',
        },
      ],
      verifiedRelationships: [
        {
          id: 'r1',
          fromClaimId: 'c1',
          toClaimId: 'c2',
          fromVideoId: 'yt1',
          toVideoId: 'yt2',
          type: 'DISAGREEMENT',
          explanation: 'Different views.',
          confidence: 'moderate',
        },
      ],
      rejectedRelationships: [],
      consensus: [],
      disagreements: [],
      uncertainClaims: [],
      synthesis: {
        headline: 'Test judgment',
        explanation: 'Test',
        confidence: 'moderate',
      },
      emergentInsights: [],
      emergentInsightMissing: true,
      knowledgeGaps: [],
      landscape: {
        agree: { countLabel: '0', cards: [] },
        divide: { countLabel: '1', cards: [] },
        unclear: { countLabel: '0', cards: [] },
      },
      createdAt: new Date().toISOString(),
    }
    const graph = buildExplorerFromSurvival(survival)
    expect(graph.relationships).toHaveLength(1)
    expect(graph.judgmentStatement).toBe('Test judgment')
  })
})
