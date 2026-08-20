import { fetchYouTubeTranscript } from '@/lib/youtube/transcript-fetch'
import type { TranscriptProvider, TranscriptResult } from '@/lib/youtube/transcript'

export class YouTubeTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string): Promise<TranscriptResult> {
    try {
      const fetched = await fetchYouTubeTranscript(videoId)

      if (!fetched.segments.length) {
        return {
          ok: false,
          videoId,
          code: 'unavailable',
          message: 'Transcript unavailable for this video.',
        }
      }

      return {
        ok: true,
        videoId,
        segments: fetched.segments,
        language: fetched.language ?? undefined,
        transcriptSource: fetched.transcriptSource,
        requestedLang: fetched.requestedLang,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcript fetch failed.'
      const lower = message.toLowerCase()
      const disabled =
        lower.includes('disabled') ||
        lower.includes('not available') ||
        lower.includes('feature is disabled')
      const rateLimited =
        lower.includes('too many requests') || lower.includes('captcha')

      return {
        ok: false,
        videoId,
        code: disabled ? 'disabled' : rateLimited ? 'error' : 'error',
        message: rateLimited
          ? 'YouTube transcript rate limit — retry later.'
          : disabled
            ? 'Transcript is disabled for this video.'
            : message,
      }
    }
  }
}

let provider: TranscriptProvider | null = null

export function getTranscriptProvider(): TranscriptProvider {
  if (!provider) provider = new YouTubeTranscriptProvider()
  return provider
}
