import { describe, expect, it } from 'vitest'
import { reasoningToSurvival } from '@/lib/reasoning/adapter-survival'
import type { MultiSourceReasoning } from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

const doc: SynthesisDocument = {
  id: 'test',
  number: 'SYNTHESIS TEST',
  createdAt: new Date().toISOString(),
  status: 'complete',
  voices: [
    {
      voice: {
        id: 'v1',
        n: 1,
        youtubeId: 'yt1',
        url: '',
        title: 'Video 1',
        channel: 'A',
        duration: '10:00',
        status: 'done',
      },
      source: {
        sourceId: 'source_1',
        videoId: 'yt1',
        voiceIndex: 1,
        title: 'Video 1',
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
        title: 'Video 2',
        channel: 'B',
        duration: '12:00',
        status: 'done',
      },
      source: {
        sourceId: 'source_2',
        videoId: 'yt2',
        voiceIndex: 2,
        title: 'Video 2',
        channel: 'B',
        url: '',
      },
    },
  ],
}

const reasoning: MultiSourceReasoning = {
  mode: 'multi',
  version: 'reasoning-v1',
  centralQuestion: 'Is MCP ready?',
  clusters: [
    {
      id: 'c1',
      label: 'MCP adoption',
      centralQuestion: 'Is MCP ready?',
      sourceIds: ['source_1', 'source_2'],
      relevance: 'primary',
    },
  ],
  excludedSources: [],
  claims: [
    {
      id: 'c1',
      sourceId: 'source_1',
      videoId: 'yt1',
      voiceIndex: 1,
      statement: 'MCP reduces integration complexity.',
      normalizedStatement: 'mcp reduces integration complexity.',
      evidenceIds: [],
      claimType: 'factual',
      confidence: 'strong',
      conceptIds: [],
    },
    {
      id: 'c2',
      sourceId: 'source_2',
      videoId: 'yt2',
      voiceIndex: 2,
      statement: 'MCP security standards are immature.',
      normalizedStatement: 'mcp security standards are immature.',
      evidenceIds: [],
      claimType: 'factual',
      confidence: 'moderate',
      conceptIds: [],
    },
  ],
  evidence: [],
  concepts: [],
  stances: [],
  assumptions: [],
  relationships: [
    {
      id: 'r1',
      type: 'TENSION',
      fromClaimId: 'c1',
      toClaimId: 'c2',
      fromSourceId: 'source_1',
      toSourceId: 'source_2',
      fromVideoId: 'yt1',
      toVideoId: 'yt2',
      explanation: 'Speed vs security trade-off.',
      confidence: 'moderate',
      verificationStatus: 'SUPPORTED',
    },
  ],
  rejectedRelationships: [],
  relationshipClusters: [],
  significantRelationships: [],
  patterns: [
    {
      id: 'p1',
      type: 'trade_off',
      title: 'Integration speed vs security maturity',
      description: 'Sources agree on benefits but disagree on readiness.',
      relationshipIds: ['r1'],
      claimIds: ['c1', 'c2'],
      sourceIds: ['source_1', 'source_2'],
      confidence: 'moderate',
      verificationStatus: 'SUPPORTED',
    },
  ],
  synthesis: {
    statement: 'MCP offers integration gains but security remains unresolved.',
    explanation: 'Pattern across sources.',
    patternIds: ['p1'],
    confidence: 'moderate',
    verificationStatus: 'SUPPORTED',
  },
  judgment: {
    statement: 'Adopt MCP for developer tooling first, not production infra.',
    whatIsSupported: 'Integration friction reduction.',
    whatIsUncertain: 'Enterprise security readiness.',
    keyReason: 'Tension between speed and security claims.',
    confidence: 'moderate',
    missingEvidence: ['Enterprise security audit data'],
    verificationStatus: 'SUPPORTED',
  },
  insights: [],
  knowledgeGaps: [],
  landscape: {
    agree: { countLabel: '1', cards: [{ id: 'a1', title: 'Integration benefit', summary: '' }] },
    divide: { countLabel: '1', cards: [{ id: 'd1', title: 'Security readiness', summary: '' }] },
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
}

describe('reasoningToSurvival', () => {
  it('maps judgment to survival headline (TEST B)', () => {
    const survival = reasoningToSurvival(reasoning, doc)
    expect(survival.synthesis.headline).toContain('Adopt MCP')
    expect(survival.disagreements.length).toBeGreaterThan(0)
    expect(survival.verifiedRelationships).toHaveLength(1)
  })
})
