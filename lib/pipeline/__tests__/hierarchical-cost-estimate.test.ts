import { describe, expect, it } from 'vitest'
import { buildTranscriptSections } from '@/lib/pipeline/section-builder'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

/** Estimates hierarchical pipeline OpenAI call counts without calling APIs. */
function estimateCallsForDuration(durationMinutes: number, charsPerMinute = 800): {
  sections: number
  coverageCalls: number
  deepCalls: number
  totalVideoCalls: number
} {
  const charCount = durationMinutes * charsPerMinute
  const words = 'word '.repeat(Math.ceil(charCount / 5)).trim()
  const segmentCount = Math.max(20, Math.ceil(durationMinutes * 2))
  const segments: TranscriptSegment[] = []

  for (let i = 0; i < segmentCount; i += 1) {
    const slice = words.slice(
      Math.floor((i / segmentCount) * words.length),
      Math.floor(((i + 1) / segmentCount) * words.length),
    )
    segments.push({
      start: (i * durationMinutes * 60) / segmentCount,
      duration: (durationMinutes * 60) / segmentCount,
      text: slice || 'segment',
    })
  }

  const sections = buildTranscriptSections(segments)
  const deepCalls = sections.length <= 3 ? sections.length : Math.min(5, sections.length)
  const batchSize = 4
  const coverageCalls =
    sections.length <= 2 ? 0 : Math.ceil(sections.length / batchSize)

  return {
    sections: sections.length,
    coverageCalls,
    deepCalls: sections.length <= 2 ? 1 : deepCalls,
    totalVideoCalls: sections.length <= 2 ? 1 : sections.length + deepCalls,
  }
}

describe('hierarchical cost estimate', () => {
  it('covers full transcript for 50min with more calls than old 6-chunk sampling', () => {
    const est = estimateCallsForDuration(50)
    expect(est.sections).toBeGreaterThan(3)
    expect(est.coverageCalls).toBe(Math.ceil(est.sections / 4))
    expect(est.totalVideoCalls).toBeGreaterThan(6)
  })

  it('uses single deep pass for short videos', () => {
    const est = estimateCallsForDuration(5)
    expect(est.totalVideoCalls).toBeLessThanOrEqual(2)
  })

  it('5x50min first run scales linearly per video', () => {
    const perVideo = estimateCallsForDuration(50)
    const fiveVideos = perVideo.totalVideoCalls * 5
    const synthesisLayer = 3
    expect(fiveVideos + synthesisLayer).toBeGreaterThan(30)
  })
})
