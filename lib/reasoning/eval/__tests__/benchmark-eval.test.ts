import { describe, expect, it } from 'vitest'
import { getBenchmarkGold } from '@/lib/reasoning/eval/benchmark-gold'
import { computeGoldPrecisionRecall } from '@/lib/reasoning/eval/evaluate-benchmark'
import type { ReasoningClaim, ReasoningRelationship } from '@/lib/reasoning/types'

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
    conceptIds: ['c1'],
  }
}

function rel(
  id: string,
  from: ReasoningClaim,
  to: ReasoningClaim,
  type: ReasoningRelationship['type'],
): ReasoningRelationship {
  return {
    id,
    type,
    fromClaimId: from.id,
    toClaimId: to.id,
    fromSourceId: from.sourceId,
    toSourceId: to.sourceId,
    fromVideoId: from.videoId,
    toVideoId: to.videoId,
    explanation: 'benchmark test',
    confidence: 'strong',
    verificationStatus: 'SUPPORTED',
    discoveryLevel: 'DIRECT_MATCH',
  }
}

describe('benchmark gold precision/recall', () => {
  it('scores recall when verified pair matches clear-agreement gold', () => {
    const gold = getBenchmarkGold('clear-agreement')!
    const a = claim(
      'a',
      'source_1',
      'Remote work reduces the amount of time employees spend commuting to a physical workplace.',
    )
    const b = claim(
      'b',
      'source_2',
      'Working from home cuts much of the daily travel employees otherwise make to their office.',
    )
    const verified = [rel('r1', a, b, 'AGREEMENT')]
    const { recall, precision } = computeGoldPrecisionRecall(verified, [a, b], gold)
    expect(recall).toBeGreaterThan(0)
    expect(precision).toBe(1)
  })

  it('scores divide gold for opposing productivity claims', () => {
    const gold = getBenchmarkGold('clear-divide')!
    const a = claim('a', 'source_1', 'Remote work increases employee productivity when distractions are managed.')
    const b = claim('b', 'source_2', 'Remote work decreases employee productivity because home environments fragment focus.')
    const verified = [rel('r1', a, b, 'CONTRADICTION')]
    const { recall } = computeGoldPrecisionRecall(verified, [a, b], gold)
    expect(recall).toBe(1)
  })
})
