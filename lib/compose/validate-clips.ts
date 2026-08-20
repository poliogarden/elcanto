import type { TranscriptSegment } from '@/lib/youtube/transcript'

export type ValidatedClip = {
  sourceId: string
  startSeconds: number
  endSeconds: number
  quote: string
  reason: string
  role: string
}

export type ClipValidationResult =
  | { ok: true; clip: ValidatedClip }
  | { ok: false; error: string; clip: ValidatedClip }

function segmentEnd(seg: TranscriptSegment): number {
  return seg.start + seg.duration
}

function findSegmentAt(segments: TranscriptSegment[], seconds: number): TranscriptSegment | null {
  for (const seg of segments) {
    if (seconds >= seg.start && seconds <= segmentEnd(seg)) return seg
  }
  return null
}

function snapToSegment(segments: TranscriptSegment[], seconds: number): number {
  if (segments.length === 0) return seconds
  let best = segments[0].start
  let bestDist = Math.abs(seconds - best)
  for (const seg of segments) {
    for (const candidate of [seg.start, segmentEnd(seg)]) {
      const dist = Math.abs(seconds - candidate)
      if (dist < bestDist) {
        bestDist = dist
        best = candidate
      }
    }
  }
  return best
}

function quoteFromRange(segments: TranscriptSegment[], start: number, end: number): string {
  const parts = segments
    .filter((seg) => segmentEnd(seg) > start && seg.start < end)
    .map((seg) => seg.text.trim())
    .filter(Boolean)
  return parts.join(' ').slice(0, 280)
}

export function validateClipAgainstTranscript(
  clip: ValidatedClip,
  segments: TranscriptSegment[],
): ClipValidationResult {
  if (segments.length === 0) {
    return { ok: false, error: 'No transcript segments for source.', clip }
  }

  let start = clip.startSeconds
  let end = clip.endSeconds

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { ok: false, error: 'Invalid clip range.', clip }
  }

  const startSeg = findSegmentAt(segments, start)
  const endSeg = findSegmentAt(segments, end)

  if (!startSeg) start = snapToSegment(segments, start)
  if (!endSeg) end = snapToSegment(segments, end)

  if (end <= start) {
    const seg = findSegmentAt(segments, start) ?? segments[0]
    start = seg.start
    end = Math.min(segmentEnd(seg), start + 18)
  }

  const maxEnd = segments.reduce((max, seg) => Math.max(max, segmentEnd(seg)), 0)
  start = Math.max(0, Math.min(start, maxEnd))
  end = Math.max(start + 3, Math.min(end, maxEnd))

  const corrected: ValidatedClip = {
    ...clip,
    startSeconds: Math.round(start * 10) / 10,
    endSeconds: Math.round(end * 10) / 10,
    quote: clip.quote?.trim() || quoteFromRange(segments, start, end),
  }

  const validStart = findSegmentAt(segments, corrected.startSeconds)
  const validEnd = findSegmentAt(segments, corrected.endSeconds)

  if (!validStart || !validEnd) {
    return { ok: false, error: 'Timestamp outside transcript segments.', clip: corrected }
  }

  return { ok: true, clip: corrected }
}

export function validateAllClips(
  clips: ValidatedClip[],
  transcriptsBySource: Map<string, TranscriptSegment[]>,
): { clips: ValidatedClip[]; rejected: Array<{ clip: ValidatedClip; error: string }> } {
  const accepted: ValidatedClip[] = []
  const rejected: Array<{ clip: ValidatedClip; error: string }> = []

  for (const clip of clips) {
    const segments = transcriptsBySource.get(clip.sourceId) ?? []
    const result = validateClipAgainstTranscript(clip, segments)
    if (result.ok) accepted.push(result.clip)
    else rejected.push({ clip: result.clip, error: result.error })
  }

  return { clips: accepted, rejected }
}
