import { describe, expect, it } from 'vitest'
import {
  summarizeAcceptanceBacklog,
  type AcceptanceBacklogSummary,
} from '@/lib/production/product-acceptance-store'
import type { ProductAcceptanceRecord } from '@/lib/production/types'

function record(partial: Partial<ProductAcceptanceRecord>): ProductAcceptanceRecord {
  return {
    synthesisId: partial.synthesisId ?? 's1',
    sourceCount: partial.sourceCount ?? 3,
    analysisQuality: 'good',
    agreementQuality: 'good',
    divideQuality: 'good',
    complementaryQuality: 'good',
    evidenceQuality: 'good',
    synthesisQuality: 'good',
    missedRelationship: false,
    falseRelationship: false,
    timeSaving: 'good',
    wouldReuse: 'good',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('summarizeAcceptanceBacklog', () => {
  it('counts failure categories and reuse signals', () => {
    const records = [
      record({
        synthesisId: 'a',
        missedRelationship: true,
        failureCategories: ['RELATIONSHIP_MISS', 'UX_COMPREHENSION_FAILURE'],
        wouldReuse: 'partial',
      }),
      record({
        synthesisId: 'b',
        falseRelationship: true,
        failureCategories: ['FALSE_RELATIONSHIP'],
        wouldReuse: 'bad',
      }),
    ]

    const summary = summarizeAcceptanceBacklog(records)

    expect(summary.totalRated).toBe(2)
    expect(summary.missedRelationshipCount).toBe(1)
    expect(summary.falseRelationshipCount).toBe(1)
    expect(summary.byCategory.RELATIONSHIP_MISS).toBe(1)
    expect(summary.byCategory.UX_COMPREHENSION_FAILURE).toBe(1)
    expect(summary.wouldReusePartial).toBe(1)
    expect(summary.wouldReuseBad).toBe(1)
  })

  it('returns zeroed categories when empty', () => {
    const summary: AcceptanceBacklogSummary = summarizeAcceptanceBacklog([])
    expect(summary.totalRated).toBe(0)
    expect(summary.byCategory.EXTRACTION_FAILURE).toBe(0)
  })
})
