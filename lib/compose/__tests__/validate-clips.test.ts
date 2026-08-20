import { describe, expect, it } from 'vitest'
import { validateAllClips, validateClipAgainstTranscript } from '@/lib/compose/validate-clips'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

const segments: TranscriptSegment[] = [
  { start: 0, duration: 10, text: 'Opening remarks about software.' },
  { start: 10, duration: 15, text: 'Developers will need new skills.' },
  { start: 25, duration: 20, text: 'AI writes more code every year.' },
]

describe('validateClipAgainstTranscript', () => {
  it('accepts clips within segment bounds', () => {
    const result = validateClipAgainstTranscript(
      {
        sourceId: 's1',
        startSeconds: 12,
        endSeconds: 22,
        quote: '',
        reason: 'test',
        role: 'evidence',
      },
      segments,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.clip.startSeconds).toBeGreaterThanOrEqual(0)
      expect(result.clip.endSeconds).toBeGreaterThan(result.clip.startSeconds)
    }
  })

  it('rejects clips when no transcript exists', () => {
    const result = validateClipAgainstTranscript(
      {
        sourceId: 's1',
        startSeconds: 1,
        endSeconds: 5,
        quote: '',
        reason: 'test',
        role: 'evidence',
      },
      [],
    )
    expect(result.ok).toBe(false)
  })
})

describe('validateAllClips', () => {
  it('filters invalid clips per source', () => {
    const map = new Map([['s1', segments]])
    const { clips, rejected } = validateAllClips(
      [
        {
          sourceId: 's1',
          startSeconds: 11,
          endSeconds: 24,
          quote: 'skills',
          reason: 'evidence',
          role: 'evidence',
        },
        {
          sourceId: 'missing',
          startSeconds: 0,
          endSeconds: 5,
          quote: 'nope',
          reason: 'bad',
          role: 'evidence',
        },
      ],
      map,
    )
    expect(clips).toHaveLength(1)
    expect(rejected).toHaveLength(1)
  })
})
