import { describe, it, expect } from 'vitest'
import { validateAndFilterSynthesis } from '@/lib/direct-synthesis/validate-evidence'
import type { CrossSourceSynthesisPayload } from '@/lib/direct-synthesis/types'

describe('cross-source validation', () => {
  const catalog = [
    {
      ref: 'source_1:e1',
      sourceId: 'source_1',
      videoId: 'v1',
      text: 'remote work reduces commuting time for employees',
      startTime: 10,
    },
    {
      ref: 'source_2:e1',
      sourceId: 'source_2',
      videoId: 'v2',
      text: 'employees save daily travel when working remotely',
      startTime: 20,
    },
  ]

  const sourceAnswers = [
    {
      sourceId: 'source_1',
      sourceTitle: 'A',
      answerability: 'DIRECT' as const,
      answer: 'Remote work cuts commuting.',
      keyEvidence: [],
      uncertainty: null,
      confidence: 0.9,
    },
    {
      sourceId: 'source_2',
      sourceTitle: 'B',
      answerability: 'DIRECT' as const,
      answer: 'Less daily travel.',
      keyEvidence: [],
      uncertainty: null,
      confidence: 0.9,
    },
    {
      sourceId: 'source_3',
      sourceTitle: 'C',
      answerability: 'NOT_RELEVANT' as const,
      answer: null,
      keyEvidence: [],
      uncertainty: null,
      confidence: 0,
    },
  ]

  it('requires two sources for agreements', () => {
    const synthesis: CrossSourceSynthesisPayload = {
      directAnswer: 'test',
      sourceContributions: [],
      agreements: [
        {
          statement: 'remote work reduces commuting',
          sourceIds: ['source_1'],
          evidenceRefs: ['source_1:e1'],
        },
      ],
      disagreements: [],
      complementaryViews: [],
      uniqueViews: [],
      insights: [],
      insight: null,
      nonComparableSources: [],
      uncertainty: [],
    }

    const result = validateAndFilterSynthesis({
      synthesis,
      sourceAnswers,
      evidenceCatalog: catalog,
    })

    expect(result.agreements).toHaveLength(0)
    expect(result.removedUnsupported.agreements).toBe(1)
  })

  it('drops insight when only one source is cited', () => {
    const synthesis: CrossSourceSynthesisPayload = {
      directAnswer: 'test',
      sourceContributions: [],
      agreements: [],
      disagreements: [],
      complementaryViews: [],
      uniqueViews: [],
      insights: [],
      insight: {
        statement: 'forced insight',
        sourceIds: ['source_1'],
        evidenceRefs: ['source_1:e1'],
      },
      nonComparableSources: [],
      uncertainty: [],
    }

    const result = validateAndFilterSynthesis({
      synthesis,
      sourceAnswers,
      evidenceCatalog: catalog,
    })

    expect(result.insight).toBeNull()
    expect(result.removedUnsupported.insight).toBe(1)
  })
})
