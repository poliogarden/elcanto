import { describe, it, expect } from 'vitest'
import {
  groundCandidateInsights,
  groundProposition,
} from '@/lib/direct-synthesis/ground-candidate-insights'
import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'
import type { DirectSourceAnswer } from '@/lib/direct-synthesis/types'

const catalog: EvidenceSnippet[] = [
  {
    ref: 'source_1:t_0',
    sourceId: 'source_1',
    videoId: 'a',
    text: 'delete unnecessary requirements before you try to optimize or automate',
    startTime: 10,
  },
  {
    ref: 'source_2:t_0',
    sourceId: 'source_2',
    videoId: 'b',
    text: 'AI may replace cognitive work and society must decide what stays human',
    startTime: 20,
  },
]

const sourceAnswers: DirectSourceAnswer[] = [
  {
    sourceId: 'source_1',
    sourceTitle: 'S1',
    answerability: 'CONTEXT_ONLY',
    answer: 'optimize process',
    keyEvidence: [],
    uncertainty: null,
    confidence: 0.8,
  },
  {
    sourceId: 'source_2',
    sourceTitle: 'S2',
    answerability: 'CONTEXT_ONLY',
    answer: 'AI jobs',
    keyEvidence: [],
    uncertainty: null,
    confidence: 0.8,
  },
]

describe('groundProposition', () => {
  it('stores original transcript text via evidence ref, not paraphrase as evidence', () => {
    const grounded = groundProposition(
      'remove unnecessary requirements before automation',
      'source_1',
      catalog,
    )
    expect(grounded.status).not.toBe('UNSUPPORTED')
    expect(grounded.ref).toBe('source_1:t_0')
    expect(grounded.evidenceText).toContain('delete unnecessary requirements')
    expect(grounded.evidenceText).not.toBe('remove unnecessary requirements before automation')
  })

  it('marks over-inference as unsupported', () => {
    const grounded = groundProposition(
      'unnecessary steps equal people',
      'source_1',
      catalog,
    )
    expect(grounded.status).toBe('UNSUPPORTED')
  })
})

describe('groundCandidateInsights', () => {
  it('removes insight when no interaction grounds to transcript', () => {
    const result = groundCandidateInsights({
      candidates: [
        {
          id: 'insight_1',
          title: 'Bad',
          thesis: 'People are unnecessary steps',
          explanation: 'Over inference',
          sourceInteractions: [
            {
              sourceId: 'source_1',
              proposition: 'unnecessary steps equal people',
              role: 'establishes',
            },
            {
              sourceId: 'source_2',
              proposition: 'completely fabricated unrelated claim about mars',
              role: 'extends',
            },
          ],
        },
      ],
      evidenceCatalog: catalog,
      sourceAnswers,
    })
    expect(result.insights).toHaveLength(0)
    expect(result.removed).toBe(1)
  })

  it('keeps insight with two grounded sources', () => {
    const result = groundCandidateInsights({
      candidates: [
        {
          id: 'insight_1',
          title: 'Automation vs human work',
          thesis: 'Automation philosophy meets AI displacement',
          explanation: 'Cross-source tension',
          sourceInteractions: [
            {
              sourceId: 'source_1',
              proposition: 'delete unnecessary requirements before automation',
              role: 'establishes',
            },
            {
              sourceId: 'source_2',
              proposition: 'AI may replace cognitive work',
              role: 'challenges',
            },
          ],
        },
      ],
      evidenceCatalog: catalog,
      sourceAnswers,
    })
    expect(result.insights).toHaveLength(1)
    expect(result.insights[0].sourceIds).toEqual(['source_1', 'source_2'])
    expect(
      result.insights[0].evidenceRefs.every((r) => catalog.some((c) => c.ref === r)),
    ).toBe(true)
    const storedTexts = result.insights[0].sourceConcepts.map((sc) => sc.label)
    expect(storedTexts.some((t) => t.includes('delete unnecessary'))).toBe(true)
  })

  it('allows zero insights', () => {
    const result = groundCandidateInsights({
      candidates: [],
      evidenceCatalog: catalog,
      sourceAnswers,
    })
    expect(result.insights).toHaveLength(0)
    expect(result.removed).toBe(0)
  })
})
