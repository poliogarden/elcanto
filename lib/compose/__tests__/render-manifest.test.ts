import { describe, expect, it } from 'vitest'
import {
  buildFfmpegConcatScript,
  buildRenderManifest,
  updateClipTimestamps,
} from '@/lib/compose/render-manifest'
import type { Composition } from '@/lib/types/composition'

const composition: Composition = {
  title: 'Test thread',
  thesis: 'A fourth idea emerges.',
  conclusion: 'Therefore…',
  totalDurationSeconds: 30,
  sections: [
    {
      id: 'sec-1',
      type: 'agreement',
      title: 'Agreement',
      summary: 'They agree on pace.',
      order: 0,
      items: [
        {
          kind: 'clip',
          clip: {
            id: 'c1',
            sourceId: 's1',
            voiceIndex: 1,
            youtubeId: 'abc123',
            title: 'Video A',
            channel: 'Channel A',
            startSeconds: 10,
            endSeconds: 25,
            quote: 'Developers adapt.',
            reason: 'evidence',
            role: 'evidence',
          },
        },
        {
          kind: 'interlude',
          interlude: {
            id: 'i1',
            text: 'But disagreement follows.',
            kind: 'interlude',
            durationSeconds: 5,
          },
        },
      ],
    },
  ],
}

describe('buildRenderManifest', () => {
  it('flattens clips and interludes with attribution', () => {
    const manifest = buildRenderManifest('syn-1', composition)
    expect(manifest.clips).toHaveLength(1)
    expect(manifest.interludes).toHaveLength(1)
    expect(manifest.clips[0].durationSeconds).toBe(15)
    expect(manifest.attribution).toHaveLength(1)
    expect(manifest.attribution[0].youtubeId).toBe('abc123')
  })
})

describe('buildFfmpegConcatScript', () => {
  it('includes clip markers and concat instructions', () => {
    const manifest = buildRenderManifest('syn-1', composition)
    const script = buildFfmpegConcatScript(manifest)
    expect(script).toContain('CLIP 01')
    expect(script).toContain('abc123')
    expect(script).toContain('ffconcat')
  })
})

describe('updateClipTimestamps', () => {
  it('normalizes start/end order', () => {
    const clip = composition.sections[0].items[0].kind === 'clip'
      ? composition.sections[0].items[0].clip
      : null
    expect(clip).toBeTruthy()
    if (!clip) return

    const updated = updateClipTimestamps(clip, 50, 12)
    expect(updated.endSeconds).toBeGreaterThan(updated.startSeconds)
  })
})
