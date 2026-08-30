import { describe, it, expect } from 'vitest'
import { validateInsights } from '@/lib/direct-synthesis/validate-insights'
import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'
import type { DirectSourceAnswer } from '@/lib/direct-synthesis/types'

const catalog = new Map<string, EvidenceSnippet>([
  [
    'source_1:ev_1',
    {
      ref: 'source_1:ev_1',
      sourceId: 'source_1',
      videoId: 'a',
      text: 'remote work eliminates daily commuting time for employees',
      startTime: 10,
      endTime: 20,
    },
  ],
  [
    'source_2:ev_1',
    {
      ref: 'source_2:ev_1',
      sourceId: 'source_2',
      videoId: 'b',
      text: 'working from home removes the need to travel to office daily',
      startTime: 30,
      endTime: 40,
    },
  ],
  [
    'source_3:ev_1',
    {
      ref: 'source_3:ev_1',
      sourceId: 'source_3',
      videoId: 'c',
      text: 'unrelated marketing degree content',
      startTime: 5,
      endTime: 15,
    },
  ],
])

const sourceAnswers: DirectSourceAnswer[] = [
  {
    sourceId: 'source_1',
    sourceTitle: 'S1',
    answerability: 'DIRECT',
    answer: 'yes',
    keyEvidence: [],
    uncertainty: null,
    confidence: 0.8,
  },
  {
    sourceId: 'source_2',
    sourceTitle: 'S2',
    answerability: 'DIRECT',
    answer: 'yes',
    keyEvidence: [],
    uncertainty: null,
    confidence: 0.8,
  },
  {
    sourceId: 'source_3',
    sourceTitle: 'S3',
    answerability: 'NOT_RELEVANT',
    answer: null,
    keyEvidence: [],
    uncertainty: null,
    confidence: 0,
  },
]

describe('validateInsights', () => {
  it('returns empty when no insights provided', () => {
    const result = validateInsights([], catalog, sourceAnswers)
    expect(result.insights).toHaveLength(0)
    expect(result.removed).toBe(0)
  })

  it('keeps insight with two grounded sources', () => {
    const result = validateInsights(
      [
        {
          id: 'insight_1',
          title: 'Less commuting',
          summary: 'Both sources agree commuting drops with remote work.',
          sourceIds: ['source_1', 'source_2'],
          sourceConcepts: [
            {
              id: 'sc_1',
              sourceId: 'source_1',
              label: 'No commute',
              evidenceRefs: ['source_1:ev_1'],
            },
            {
              id: 'sc_2',
              sourceId: 'source_2',
              label: 'Home work',
              evidenceRefs: ['source_2:ev_1'],
            },
          ],
          connectionConcepts: [
            {
              id: 'conn_1',
              label: 'Commute reduction',
              explanation: 'Shared theme across sources.',
              derivedFromConceptIds: ['sc_1', 'sc_2'],
            },
          ],
          evidenceRefs: ['source_1:ev_1', 'source_2:ev_1'],
        },
      ],
      catalog,
      sourceAnswers,
    )
    expect(result.insights).toHaveLength(1)
    expect(result.insights[0].sourceIds).toEqual(['source_1', 'source_2'])
    expect(result.insights[0].sourceConcepts[0].origin).toBe('SOURCE')
    expect(result.insights[0].connectionConcepts[0].origin).toBe('AI_DERIVED')
  })

  it('removes insight when only one grounded source remains', () => {
    const result = validateInsights(
      [
        {
          id: 'insight_1',
          title: 'Weak',
          summary: 'Only one source grounded.',
          sourceIds: ['source_1', 'source_2'],
          sourceConcepts: [
            {
              id: 'sc_1',
              sourceId: 'source_1',
              label: 'Only one',
              evidenceRefs: ['source_1:ev_1'],
            },
            {
              id: 'sc_2',
              sourceId: 'source_2',
              label: 'Bad ref',
              evidenceRefs: ['missing'],
            },
          ],
          connectionConcepts: [],
          evidenceRefs: [],
        },
      ],
      catalog,
      sourceAnswers,
    )
    expect(result.insights).toHaveLength(0)
    expect(result.removed).toBe(1)
  })
})
