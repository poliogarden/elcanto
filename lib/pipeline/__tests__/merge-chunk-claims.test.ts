import { describe, expect, it } from 'vitest'
import { mergeChunkAnalyses } from '@/lib/pipeline/merge-chunk-claims'
import type { SourceAnalysis } from '@/lib/types/source'

describe('mergeChunkAnalyses', () => {
  it('deduplicates overlapping claims', () => {
    const base = { sourceId: 'source_1', videoId: 'v', voiceIndex: 1, title: 'T' }
    const merged = mergeChunkAnalyses(
      [
        {
          ...base,
          summary: 'part 1',
          thesis: 'thesis 1',
          topics: ['ai'],
          claims: [
            { id: 'c1', sourceId: 'source_1', statement: 'AI lowers development cost', topic: 'ai', confidence: 0.8 },
          ],
          entities: [],
          conclusions: [],
          implications: [],
          evidence: [{ id: 'e1', timestamp: 10, text: 'cost' }],
          stance: null,
        },
        {
          ...base,
          summary: 'part 2 longer summary',
          thesis: 'thesis 2',
          topics: ['jobs'],
          claims: [
            { id: 'c2', sourceId: 'source_1', statement: 'AI lowers development cost significantly', topic: 'ai', confidence: 0.9 },
            { id: 'c3', sourceId: 'source_1', statement: 'Jobs will change', topic: 'jobs', confidence: 0.7 },
          ],
          entities: [],
          conclusions: [],
          implications: [],
          evidence: [{ id: 'e2', timestamp: 20, text: 'jobs' }],
          stance: null,
        },
      ],
      base,
    )

    expect(merged.claims.length).toBeLessThanOrEqual(2)
    expect(merged.summary).toContain('longer')
  })
})
