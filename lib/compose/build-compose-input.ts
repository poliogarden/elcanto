import type { ComposeSourceContext } from '@/lib/types/composition'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { TranscriptSegment } from '@/lib/youtube/transcript'
import { getCachedTranscript } from '@/lib/repositories/video-cache'

export async function buildComposeSourceContexts(
  document: SynthesisDocument,
): Promise<ComposeSourceContext[]> {
  const contexts: ComposeSourceContext[] = []

  for (const entry of document.voices) {
    if (!entry.analysis || entry.error) continue

    const segments = (await getCachedTranscript(entry.voice.youtubeId)) ?? []

    contexts.push({
      sourceId: entry.analysis.sourceId,
      voiceIndex: entry.voice.n,
      youtubeId: entry.voice.youtubeId,
      title: entry.voice.title,
      channel: entry.voice.channel,
      thumbnail: entry.voice.thumbnail,
      thesis: entry.analysis.thesis,
      summary: entry.analysis.summary,
      segments: compactSegments(segments),
    })
  }

  return contexts
}

function compactSegments(segments: TranscriptSegment[], max = 120): TranscriptSegment[] {
  if (segments.length <= max) return segments

  const step = Math.ceil(segments.length / max)
  const sampled: TranscriptSegment[] = []
  for (let i = 0; i < segments.length; i += step) {
    sampled.push(segments[i])
  }
  return sampled
}

export function transcriptPayloadForAi(sources: ComposeSourceContext[]): unknown[] {
  return sources.map((s) => ({
    sourceId: s.sourceId,
    voiceIndex: s.voiceIndex,
    title: s.title,
    channel: s.channel,
    thesis: s.thesis,
    summary: s.summary,
    segments: s.segments.map((seg) => ({
      start: seg.start,
      duration: seg.duration,
      text: seg.text.slice(0, 240),
    })),
  }))
}
