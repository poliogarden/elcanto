import { describe, expect, it } from 'vitest'
import type { ReasoningClaim } from '@/lib/reasoning/types'
import { filterCandidatesByComparability } from '@/lib/reasoning/v2/candidate-quality-gate'
import { classifyClaimQuestionAlignment } from '@/lib/reasoning/v2/claim-question-alignment'
import { probeSharedProposition } from '@/lib/reasoning/v2/shared-proposition-probe'
import { extractQuestionIntent } from '@/lib/reasoning/v2/question-intent'
import { detectClaimShapeIssue } from '@/lib/reasoning/v2/claim-shape-guards'

function claim(id: string, sourceId: string, statement: string): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: sourceId,
    voiceIndex: 1,
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: ['ev1'],
    claimType: 'factual',
    confidence: 'strong',
    conceptIds: [],
  }
}

describe('question alignment recovery', () => {
  const centralQuestion =
    'Does achieving 53% accuracy in decision-making really mean exceptional ability?'
  const intent = extractQuestionIntent(centralQuestion)

  it('rejects nonsensical cross-source pairs (debate vs personal strength)', () => {
    const a = claim('c1', 'source_1', 'Debate is one of the arenas where competition occurs.')
    const b = claim('c2', 'source_2', 'One should find the thing they are uniquely good at.')
    const probe = probeSharedProposition(a, b)
    expect(probe.candidateAllowed).toBe(false)
    expect(['TOPIC_ONLY', 'DIFFERENT_DIMENSION', 'UNRELATED']).toContain(probe.class)
  })

  it('rejects 53% accuracy vs marketing values pair', () => {
    const a = claim('c1', 'source_1', "You're right about 53% of the time.")
    const b = claim('c2', 'source_3', 'Marketing is about values.')
    const probe = probeSharedProposition(a, b)
    expect(probe.candidateAllowed).toBe(false)
  })

  it('filters candidate list before verification', () => {
    const a = claim('c1', 'source_1', 'Debate is one of the arenas where competition occurs.')
    const b = claim('c2', 'source_2', 'One should find the thing they are uniquely good at.')
    const c = claim('c3', 'source_3', 'Marketing is about values and brand strategy.')
    const claimById = new Map([a, b, c].map((x) => [x.id, x]))
    const alignments = [a, b, c].map((cl) =>
      classifyClaimQuestionAlignment({
        claim: cl,
        intent,
        sourceTier: 'SECONDARY',
      }),
    )
    const filtered = filterCandidatesByComparability({
      candidates: [
        {
          fromClaimId: a.id,
          toClaimId: b.id,
          type: 'COMPLEMENTARY',
          rationale: 'test',
          confidence: 'weak',
          discoveryLevel: 'SEMANTIC_RELATIONSHIP',
        },
        {
          fromClaimId: a.id,
          toClaimId: c.id,
          type: 'AGREEMENT',
          rationale: 'test',
          confidence: 'weak',
          discoveryLevel: 'DIRECT_MATCH',
        },
      ],
      claimById,
      alignments,
    })
    expect(filtered.candidates.length).toBe(0)
    expect(filtered.rejections.length).toBe(2)
  })

  it('marks transcript fragments as malformed', () => {
    const fragment = claim(
      'f1',
      'source_1',
      'The speaker observes: that we live in. Failure And we are not going to get a chance to.',
    )
    expect(detectClaimShapeIssue(fragment)).not.toBe('NONE')
  })

  it('classifies marketing claim as contextual for accuracy question', () => {
    const marketing = claim('m1', 'source_3', 'Marketing is about values and the Got Milk campaign.')
    const row = classifyClaimQuestionAlignment({
      claim: marketing,
      intent,
      sourceTier: 'SECONDARY',
    })
    expect(['CONTEXTUAL', 'UNRELATED']).toContain(row.alignment)
  })
})
