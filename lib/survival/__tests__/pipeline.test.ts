import { describe, expect, it } from 'vitest'
import { runSurvivalPipeline } from '@/lib/survival/pipeline'

describe('runSurvivalPipeline', () => {
  it('requires at least 2 videos', async () => {
    await expect(
      runSurvivalPipeline({
        sources: [
          {
            sourceId: 'source_1',
            videoId: 'a',
            voiceIndex: 1,
            title: 'A',
            summary: '',
            thesis: '',
            topics: [],
            claims: [],
            entities: [],
            conclusions: [],
            implications: [],
            evidence: [],
            stance: null,
          },
        ],
        voices: [{ channel: 'c' }],
      }),
    ).rejects.toThrow(/at least 2/)
  })
})
