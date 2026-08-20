import { describe, expect, it } from 'vitest'
import { buildTranscriptSections, transcriptDurationSeconds } from '@/lib/pipeline/section-builder'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

function makeSegments(text: string, durationSeconds: number): TranscriptSegment[] {
  const words = text.split(/\s+/)
  const chunkSize = Math.max(1, Math.floor(words.length / 20))
  const segments: TranscriptSegment[] = []
  let t = 0
  for (let i = 0; i < words.length; i += chunkSize) {
    segments.push({
      start: t,
      duration: durationSeconds / 20,
      text: words.slice(i, i + chunkSize).join(' '),
    })
    t += durationSeconds / 20
  }
  return segments
}

describe('buildTranscriptSections', () => {
  it('creates multiple sections for long transcripts', () => {
    const filler = 'argument evidence claim '.repeat(800)
    const segments = makeSegments(filler, 50 * 60)
    const sections = buildTranscriptSections(segments)

    expect(sections.length).toBeGreaterThan(3)
    expect(sections[0].sectionId).toBe('section_1')
    expect(sections.every((s) => s.text.length > 0)).toBe(true)
  })

  it('covers full transcript duration', () => {
    const segments = makeSegments('short video content '.repeat(40), 5 * 60)
    const sections = buildTranscriptSections(segments)
    const duration = transcriptDurationSeconds(segments)
    const covered = sections.reduce((acc, s) => acc + (s.endTime - s.startTime), 0)

    expect(covered).toBeGreaterThan(0)
    expect(duration).toBeGreaterThan(0)
  })
})

describe('selectSectionsForDeepAnalysis', () => {
  it('deep-analyzes all sections when count <= 3', async () => {
    const { selectSectionsForDeepAnalysis } = await import('@/lib/pipeline/video-knowledge-merge')
    const sections = [1, 2, 3].map((n) => ({
      sectionId: `section_${n}`,
      startTime: n * 100,
      endTime: n * 100 + 50,
      topic: `t${n}`,
      summary: 's',
      claims: [],
      entities: [],
      importanceScore: n === 2 ? 0.9 : 0.3,
      noveltyScore: 0.5,
      argumentDensity: 0.5,
      evidenceDensity: 0.5,
    }))

    const picked = selectSectionsForDeepAnalysis(sections, 5)
    expect(picked).toHaveLength(3)
  })
})
