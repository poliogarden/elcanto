import { describe, expect, it } from 'vitest'
import { moveTimelineItem, updateClipInComposition } from '@/lib/compose/reorder-composition'
import type { Composition } from '@/lib/types/composition'

const composition: Composition = {
  title: 'Thread',
  thesis: 'Test',
  conclusion: '',
  totalDurationSeconds: 20,
  sections: [
    {
      id: 's1',
      type: 'agreement',
      title: 'A',
      summary: '',
      order: 0,
      items: [
        {
          kind: 'clip',
          clip: {
            id: 'c1',
            sourceId: 'src1',
            voiceIndex: 1,
            youtubeId: 'a',
            title: 'A',
            channel: 'Ch',
            startSeconds: 0,
            endSeconds: 10,
            quote: 'q',
            reason: 'r',
            role: 'evidence',
          },
        },
        {
          kind: 'interlude',
          interlude: { id: 'i1', text: 'bridge', kind: 'interlude', durationSeconds: 5 },
        },
      ],
    },
  ],
}

describe('moveTimelineItem', () => {
  it('reorders items within a section', () => {
    const next = moveTimelineItem(
      composition,
      { sectionId: 's1', itemIndex: 0 },
      { sectionId: 's1', itemIndex: 1 },
    )
    expect(next.sections[0].items[0].kind).toBe('interlude')
    expect(next.sections[0].items[1].kind).toBe('clip')
  })
})

describe('updateClipInComposition', () => {
  it('patches clip timestamps', () => {
    const next = updateClipInComposition(composition, 'c1', {
      startSeconds: 2,
      endSeconds: 8,
    })
    const clip = next.sections[0].items.find((i) => i.kind === 'clip')
    expect(clip?.kind).toBe('clip')
    if (clip?.kind === 'clip') {
      expect(clip.clip.startSeconds).toBe(2)
      expect(clip.clip.endSeconds).toBe(8)
    }
    expect(next.totalDurationSeconds).toBe(11)
  })
})
