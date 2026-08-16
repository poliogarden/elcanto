/**
 * Transcript acquisition abstraction.
 *
 * YouTube Data API v3 does NOT provide a simple public endpoint to fetch
 * arbitrary video captions without OAuth tied to the video owner. For MVP we
 * use server-side caption track fetching (timedtext) via a Node-compatible
 * library — implemented in Phase 2.
 *
 * This interface keeps the synthesis engine independent of the fetch method.
 */

export type TranscriptSegment = {
  /** Start time in seconds */
  start: number
  /** Duration in seconds */
  duration: number
  text: string
}

export type TranscriptResult =
  | { ok: true; videoId: string; segments: TranscriptSegment[]; language?: string }
  | { ok: false; videoId: string; code: 'unavailable' | 'disabled' | 'error'; message: string }

export interface TranscriptProvider {
  getTranscript(videoId: string): Promise<TranscriptResult>
}

/** Normalize segments for chunking / AI input */
export function normalizeTranscript(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments
    .map((s) => ({
      ...s,
      text: s.text.replace(/\s+/g, ' ').trim(),
    }))
    .filter((s) => s.text.length > 0)
}

/** Simple fixed-window chunking for RAG (Phase 5) */
export function chunkTranscript(
  segments: TranscriptSegment[],
  maxChars = 1200,
): Array<{ start: number; text: string }> {
  const chunks: Array<{ start: number; text: string }> = []
  let buffer = ''
  let chunkStart = segments[0]?.start ?? 0

  for (const seg of segments) {
    if (!buffer) chunkStart = seg.start
    buffer += (buffer ? ' ' : '') + seg.text

    if (buffer.length >= maxChars) {
      chunks.push({ start: chunkStart, text: buffer })
      buffer = ''
    }
  }

  if (buffer) chunks.push({ start: chunkStart, text: buffer })
  return chunks
}
