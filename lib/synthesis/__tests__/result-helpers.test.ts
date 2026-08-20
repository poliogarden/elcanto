import { describe, expect, it } from 'vitest'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import {
  formatSourceMetaLine,
  getHeroStatement,
  getTopShapedRelationships,
  hasStrongEmergence,
} from '@/lib/synthesis/result-helpers'

function minimalView(overrides: Partial<SynthesisViewModel> = {}): SynthesisViewModel {
  return {
    id: 'test',
    number: '001',
    question: 'Test',
    synthesisType: 'mixed',
    synthesisTypeLabel: 'Mixed',
    workspaceMode: 'small',
    voiceCount: 3,
    readyVoiceCount: 3,
    totalDuration: '1h 20m',
    date: '2026-01-01',
    bottomLineLabel: '',
    bottomLineHeadline: [],
    bottomLine: [],
    emergentStatement: '',
    noStrongIntersection: false,
    noStrongRelationship: false,
    sourceReasoning: [],
    relationships: [],
    meaningfulRelationships: [],
    independentRelationships: [],
    patterns: [],
    clusters: [],
    twoSourceView: null,
    intersections: [],
    differences: [],
    contradictions: [],
    sections: [],
    insights: [],
    knowledgeGaps: [],
    recommendations: [],
    rejectedInsights: [],
    evidence: [],
    inspectStats: {
      sourceCount: 3,
      claimsExtracted: 12,
      relationshipsTested: 5,
      meaningfulRelationships: 3,
      strong: 1,
      moderate: 2,
      weak: 0,
      independent: 0,
      agreements: 2,
      contradictions: 1,
      structuralParallels: 0,
      patterns: 1,
      insights: 2,
      rejectedInsights: 0,
      knowledgeGaps: 0,
      clusters: 0,
    },
    fourthIdea: null,
    understandingChange: null,
    whatNext: null,
    theAnswer: { paragraphs: [], metadataLine: '' },
    themes: [],
    editorialAgreements: [],
    editorialDisagreements: [],
    findings: [],
    questionsWorthAsking: [],
    allEvidence: [],
    voices: [],
    suggestedQuestions: [],
    insightGraph: null,
    graphSummary: {
      voiceCount: 3,
      connectionCount: 2,
      disagreementCount: 1,
      insightCount: 1,
    },
    ...overrides,
  }
}

describe('result-helpers', () => {
  it('prefers fourth idea for hero statement', () => {
    const view = minimalView({
      fourthIdea: {
        id: 'fi1',
        statement: 'Judgment becomes scarce.',
        explanation: 'Because creation is cheap.',
        voices: [1, 2, 3],
        derivationSteps: [],
        noveltyScore: 0.8,
        specificityScore: 0.7,
        confidence: 0.9,
      },
      insights: [{ id: 'i1', statement: 'Other', type: 'direct', typeLabel: '', derivation: '', derivationSteps: [], voices: [1], claimIds: [], relationshipIds: [], patternIds: [], noveltyScore: 0.2, confidence: 0.5 }],
    })
    expect(getHeroStatement(view)).toBe('Judgment becomes scarce.')
    expect(hasStrongEmergence(view)).toBe(true)
  })

  it('formats compact source meta line', () => {
    const view = minimalView()
    expect(formatSourceMetaLine(view)).toBe('3 VIDEOS · 1H 20M · 12 CLAIMS')
  })

  it('returns at most three shaped relationships', () => {
    const view = minimalView({
      editorialAgreements: [
        {
          id: 'a1',
          kind: 'agreement',
          title: 'AI boosts productivity',
          sideA: { label: 'A', voice: 1, sourceId: 's1', title: 'T1', statement: 'x', claimId: 'c1' },
          sideB: { label: 'B', voice: 2, sourceId: 's2', title: 'T2', statement: 'y', claimId: 'c2' },
          whyItMatters: '',
          relationshipId: 'r1',
          claimIds: [],
        },
      ],
      editorialDisagreements: [
        {
          id: 'd1',
          kind: 'disagreement',
          title: 'Jobs impact unclear',
          sideA: { label: 'A', voice: 2, sourceId: 's2', title: 'T2', statement: 'x', claimId: 'c3' },
          sideB: { label: 'B', voice: 3, sourceId: 's3', title: 'T3', statement: 'y', claimId: 'c4' },
          whyItMatters: '',
          relationshipId: 'r2',
          claimIds: [],
        },
      ],
      fourthIdea: {
        id: 'fi1',
        statement: 'Judgment wins.',
        explanation: '',
        voices: [1, 2, 3],
        derivationSteps: [],
        noveltyScore: 1,
        specificityScore: 1,
        confidence: 1,
      },
    })
    expect(getTopShapedRelationships(view, 3)).toHaveLength(3)
  })
})
