import { YoutubeTranscript } from 'youtube-transcript'
import type { TranscriptProvider, TranscriptResult, TranscriptSegment } from '@/lib/youtube/transcript'

export class YouTubeTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string): Promise<TranscriptResult> {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId)

      if (!items || items.length === 0) {
        return {
          ok: false,
          videoId,
          code: 'unavailable',
          message: 'Transcript unavailable for this video.',
        }
      }

      const segments: TranscriptSegment[] = items.map((item) => ({
        start: item.offset,
        duration: item.duration,
        text: item.text,
      }))

      return { ok: true, videoId, segments }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcript fetch failed.'
      const disabled =
        message.toLowerCase().includes('disabled') ||
        message.toLowerCase().includes('not available')

      return {
        ok: false,
        videoId,
        code: disabled ? 'disabled' : 'error',
        message: disabled ? 'Transcript is disabled for this video.' : message,
      }
    }
  }
}

let provider: TranscriptProvider | null = null

export function getTranscriptProvider(): TranscriptProvider {
  if (!provider) provider = new YouTubeTranscriptProvider()
  return provider
}
