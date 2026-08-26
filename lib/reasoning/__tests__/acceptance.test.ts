import { describe, expect, it } from 'vitest'
import { reasoningToSurvival } from '@/lib/reasoning/adapter-survival'
import { computeSurvivalDiagnostics } from '@/lib/reasoning/diagnostics'
import { runSingleSourceReasoning } from '@/lib/reasoning/single-source'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SourceAnalysis } from '@/lib/types/source'

const baseDoc = (): SynthesisDocument => ({
  id: 'acc-test',
  number: 'ACC',
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
        title: 'Motivation shorts',
        channel: 'C',
        duration: '5:00',
        status: 'done',
      },
      source: { sourceId: 's3', videoId: 'yt3', voiceIndex: 3, title: 'Motivation shorts', channel: 'C', url: '' },
    },
  ],
})

function multiReasoning(overrides: Partial<MultiSourceReasoning> = {}): MultiSourceReasoning {
  return {
    mode: 'multi',
    version: 'reasoning-v1',
    centralQuestion: 'Is MCP ready for production?',
    clusters: [
      {
        id: 'c1',
        label: 'MCP adoption',
        centralQuestion: 'Is MCP ready for production?',
        sourceIds: ['s1', 's2'],
        relevance: 'primary',
      },
      {
        id: 'c2',
        label: 'Motivation',
        centralQuestion: 'How to stay motivated?',
        sourceIds: ['s3'],
        relevance: 'off_topic',
      },
    ],
    excludedSources: [
      {
        sourceId: 's3',
        videoId: 'yt3',
        voiceIndex: 3,
        title: 'Motivation shorts',
        reason: 'Off-topic cluster: Motivation',
        clusterId: 'c2',
      },
    ],
    claims: [],
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
    judgment: {
      statement: 'MCP shows integration benefits but enterprise readiness is unproven.',
      whatIsSupported: 'Developer tooling gains.',
      whatIsUncertain: 'Security maturity.',
      keyReason: 'Tension between speed and security.',
      confidence: 'moderate',
      missingEvidence: ['Enterprise audit data'],
      verificationStatus: 'SUPPORTED',
    },
    insights: [],
    knowledgeGaps: [],
    landscape: {
      agree: { countLabel: '1', cards: [] },
      divide: { countLabel: '1', cards: [] },
      unclear: { countLabel: '0', cards: [] },
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
      clusterCount: 2,
      primaryClusterSourceCount: 2,
      passesRun: [],
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('Acceptance TEST A — same topic, similar opinion', () => {
  it('maps agreement landscape when relationships are supportive', () => {
    const reasoning = multiReasoning({
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
          explanation: 'Both argue MCP reduces integration friction.',
          confidence: 'strong',
          verificationStatus: 'SUPPORTED',
        },
      ],
      patterns: [
        {
          id: 'p1',
          type: 'recurring_driver',
          title: 'Integration friction drives adoption',
          description: 'Multiple sources cite reduced friction as the main benefit.',
          relationshipIds: ['r1'],
          claimIds: ['c1', 'c2'],
          sourceIds: ['s1', 's2'],
          confidence: 'strong',
          verificationStatus: 'SUPPORTED',
        },
      ],
      relationshipClusters: [
        {
          id: 'cluster_r1',
          canonicalClaim: 'Both argue MCP reduces integration friction.',
          label: 'Integration friction reduction',
          type: 'AGREEMENT',
          dimension: 'integration',
          memberRelationshipIds: ['r1'],
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
          childIds: ['r1'],
        },
      ],
      significantRelationships: [
        {
          id: 'cluster_r1',
          canonicalClaim: 'Both argue MCP reduces integration friction.',
          label: 'Integration friction reduction',
          type: 'AGREEMENT',
          dimension: 'integration',
          memberRelationshipIds: ['r1'],
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
          childIds: ['r1'],
        },
      ],
      landscape: {
        agree: { countLabel: '2', cards: [{ id: 'a1', title: 'Friction reduction', summary: '' }] },
        divide: { countLabel: '0', cards: [] },
        unclear: { countLabel: '0', cards: [] },
      },
    })
    const survival = reasoningToSurvival(reasoning, baseDoc())
    expect(survival.landscape.agree.countLabel).toBe('1')
    expect(survival.verifiedRelationships[0].type).toBe('AGREEMENT')
    expect(survival.consensus.length).toBeGreaterThan(0)
  })
})

describe('Acceptance TEST C — mixed related/unrelated videos', () => {
  it('excludes off-topic sources without forcing synthesis', () => {
    const reasoning = multiReasoning()
    const survival = reasoningToSurvival(reasoning, baseDoc())
    expect(survival.excludedSources).toHaveLength(1)
    expect(survival.excludedSources![0].title).toContain('Motivation')
    expect(survival.analyzedVideoCount).toBe(2)
    expect(survival.excludedVideoCount).toBe(1)
  })
})

describe('Acceptance TEST D — fully unrelated videos', () => {
  it('allows no-coherent-synthesis judgment', () => {
    const reasoning = multiReasoning({
      judgment: {
        statement: 'No coherent cross-source synthesis — sources address largely independent topics.',
        whatIsSupported: 'Individual videos may still be valuable separately.',
        whatIsUncertain: 'Whether a shared question exists.',
        keyReason: 'Only 1 source in primary cluster.',
        confidence: 'low',
        missingEvidence: ['At least 2 on-topic sources.'],
        verificationStatus: 'SUPPORTED',
      },
      relationships: [],
      patterns: [],
      excludedSources: [
        { sourceId: 's1', videoId: 'yt1', voiceIndex: 1, title: 'AI', reason: 'Independent' },
        { sourceId: 's2', videoId: 'yt2', voiceIndex: 2, title: 'Travel', reason: 'Independent' },
        { sourceId: 's3', videoId: 'yt3', voiceIndex: 3, title: 'Cooking', reason: 'Independent' },
      ],
    })
    const d = computeSurvivalDiagnostics(reasoning)
    expect(reasoning.judgment?.statement).toMatch(/No coherent cross-source/i)
    expect(d.survivalTest.q6_noForcedLinks).toBe(true)
    expect(d.rejectedRelationshipCount).toBe(0)
  })
})

describe('Acceptance TEST E — single video', () => {
  const source: SourceAnalysis = {
    sourceId: 's1',
    videoId: 'yt1',
    voiceIndex: 1,
    title: 'Solo video',
    summary: 'A deep dive into MCP.',
    thesis: 'MCP simplifies tool integration.',
    topics: ['MCP'],
    claims: [
      {
        id: 'c1',
        sourceId: 's1',
        statement: 'MCP reduces integration complexity.',
        topic: 'MCP',
        confidence: 0.9,
      },
    ],
    entities: [],
    conclusions: [],
    implications: [],
    evidence: [{ id: 'e1', timestamp: 30, text: 'MCP is easier to integrate.' }],
    stance: 'supportive',
  }

  it('runs single-source mode without cross-source fields', () => {
    const result = runSingleSourceReasoning({ source })
    expect(result.mode).toBe('single')
    expect(result.claims.length).toBeGreaterThan(0)
    expect(result.summary).toBeTruthy()
    expect('relationships' in result).toBe(false)
  })
})

describe('Acceptance TEST F — semantic similarity without real relationship', () => {
  it('diagnostics note when no verified relationships exist', () => {
    const reasoning = multiReasoning({ relationships: [], rejectedRelationships: [] })
    const d = computeSurvivalDiagnostics(reasoning)
    expect(d.survivalTest.q2_newRelationships).toBe(false)
    expect(d.survivalTest.notes.some((n) => n.includes('No verified'))).toBe(true)
  })
})
