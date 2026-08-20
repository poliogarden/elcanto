import { describe, expect, it } from 'vitest'
import { selectFourthIdea } from '@/lib/synthesis/fourth-idea-engine'
import type { Insight, SynthesisConclusion } from '@/lib/types/relationship'

const baseSynthesis: SynthesisConclusion = {
  synthesisType: 'mixed',
  topic: 'AI and software',
  bottomLine: 'Building is becoming cheap.',
  overallConclusion: 'Cross-source synthesis.',
  emergentStatement: '',
  sections: [],
  usedSourceIds: ['source_1', 'source_2'],
  sourceContributions: [],
  noStrongRelationship: false,
}

const goodInsight: Insight = {
  id: 'insight_1',
  statement:
    'The valuable skill may no longer be writing code itself, but knowing what remains worth building when production becomes cheap.',
  type: 'cross_source_inference',
  sourceIds: ['source_1', 'source_2'],
  claimIds: ['claim_1', 'claim_2'],
  relationshipIds: ['rel_1'],
  patternIds: ['pattern_1'],
  noveltyScore: 0.82,
  confidence: 0.76,
  derivation:
    'Source 1 argues production cost falls while Source 2 argues judgment becomes scarce; together they imply a shift in what developers optimize for.',
}

const genericInsight: Insight = {
  ...goodInsight,
  id: 'insight_generic',
  statement: 'Technology is changing both industries and creating new opportunities.',
  noveltyScore: 0.3,
}

describe('selectFourthIdea', () => {
  it('selects a quality cross-source insight as fourth idea', () => {
    const result = selectFourthIdea({
      insights: [goodInsight],
      synthesis: baseSynthesis,
      patterns: [
        {
          id: 'pattern_1',
          label: 'Production constraint shift',
          description: 'Technology lowers production constraints.',
          relationshipIds: ['rel_1'],
          sourceIds: ['source_1', 'source_2'],
          confidence: 0.7,
        },
      ],
      noStrongRelationship: false,
    })

    expect(result.fourthIdea?.statement).toContain('writing code')
    expect(result.fourthIdea?.sourceIds.length).toBeGreaterThanOrEqual(2)
  })

  it('rejects generic insights', () => {
    const result = selectFourthIdea({
      insights: [genericInsight],
      synthesis: baseSynthesis,
      patterns: [],
      noStrongRelationship: false,
    })

    expect(result.fourthIdea).toBeNull()
    expect(result.rejected.length).toBeGreaterThan(0)
  })

  it('returns null for mostly independent sources', () => {
    const result = selectFourthIdea({
      insights: [goodInsight],
      synthesis: { ...baseSynthesis, synthesisType: 'mostly_independent' },
      patterns: [],
      noStrongRelationship: true,
    })

    expect(result.fourthIdea).toBeNull()
    expect(result.noStrongRelationship).toBe(true)
  })
})
