import { AI_CONFIG } from '@/lib/ai/config'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

export type TranscriptSection = {
  sectionId: string
  startTime: number
  endTime: number
  text: string
  charCount: number
  segmentCount: number
}

function sectionEndTime(seg: TranscriptSegment): number {
  return seg.start + (seg.duration > 0 ? seg.duration : 0.5)
}

function isGapBoundary(prev: TranscriptSegment, next: TranscriptSegment): boolean {
  const gap = next.start - sectionEndTime(prev)
  return gap >= AI_CONFIG.segmentGapBoundarySeconds
}

/**
 * Group transcript into semantic sections using time windows, char limits, and caption gaps.
 */
export function buildTranscriptSections(segments: TranscriptSegment[]): TranscriptSection[] {
  if (segments.length === 0) return []

  const sections: TranscriptSection[] = []
  let buffer = ''
  let sectionStart = segments[0].start
  let sectionEnd = sectionEndTime(segments[0])
  let segmentCount = 0
  let index = 0

  const flush = () => {
    const text = buffer.trim()
    if (!text) return
    index += 1
    sections.push({
      sectionId: `section_${index}`,
      startTime: sectionStart,
      endTime: sectionEnd,
      text,
      charCount: text.length,
      segmentCount,
    })
    buffer = ''
    segmentCount = 0
  }

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]
    const segText = seg.text.trim()
    if (!segText) continue

    if (!buffer) {
      sectionStart = seg.start
    }

    const prev = i > 0 ? segments[i - 1] : null
    const durationSoFar = sectionEnd - sectionStart
    const wouldExceedChars =
      buffer.length > 0 && buffer.length + segText.length + 1 > AI_CONFIG.maxSectionChars
    const wouldExceedDuration =
      buffer.length > 0 && durationSoFar >= AI_CONFIG.targetSectionDurationSeconds
    const gapBreak = prev && isGapBoundary(prev, seg)

    if (buffer && (wouldExceedChars || wouldExceedDuration || gapBreak)) {
      flush()
      sectionStart = seg.start
    }

    buffer += (buffer ? ' ' : '') + segText
    sectionEnd = Math.max(sectionEnd, sectionEndTime(seg))
    segmentCount += 1
  }

  flush()
  return sections
}

export function transcriptDurationSeconds(segments: TranscriptSegment[]): number {
  if (segments.length === 0) return 0
  const last = segments[segments.length - 1]
  return Math.ceil(sectionEndTime(last))
}

export function sectionDurationSeconds(section: TranscriptSection): number {
  return Math.max(1, Math.ceil(section.endTime - section.startTime))
}
