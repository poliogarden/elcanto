import { YoutubeTranscript } from 'youtube-transcript'
import type { TranscriptSegment } from '@/lib/youtube/transcript'

export const TRANSCRIPT_LANG_FALLBACK_CHAIN = ['ko', 'ko-KR', 'en', 'en-US'] as const

const RATE_LIMIT_RETRY_MS = 2500
const MAX_RATE_LIMIT_RETRIES = 2

export type TranscriptFetchSuccess = {
  segments: TranscriptSegment[]
  language: string | null
  transcriptSource: 'default' | 'lang_fallback'
  requestedLang?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return (
    message.includes('too many requests') ||
    message.includes('captcha') ||
    message.includes('rate limit')
  )
}

function isLanguageUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return message.includes('no transcripts are available in')
}

function mapItems(
  items: Array<{ offset: number; duration: number; text: string; lang?: string }>,
): TranscriptSegment[] {
  return items.map((item) => ({
    start: item.offset,
    duration: item.duration,
    text: item.text,
  }))
}

async function fetchTranscriptAttempt(
  videoId: string,
  lang?: string,
): Promise<Array<{ offset: number; duration: number; text: string; lang?: string }>> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    try {
      return await YoutubeTranscript.fetchTranscript(
        videoId,
        lang ? { lang } : undefined,
      )
    } catch (error) {
      lastError = error
      if (isRateLimitError(error) && attempt < MAX_RATE_LIMIT_RETRIES) {
        await sleep(RATE_LIMIT_RETRY_MS * (attempt + 1))
        continue
      }
      throw error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Transcript fetch failed.')
}

/** Fetch captions: default track first, then ko → ko-KR → en → en-US. Retries on rate limit. */
export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptFetchSuccess> {
  let lastError: unknown

  try {
    const items = await fetchTranscriptAttempt(videoId)
    if (items.length > 0) {
      return {
        segments: mapItems(items),
        language: items[0]?.lang ?? null,
        transcriptSource: 'default',
      }
    }
  } catch (error) {
    lastError = error
    if (!isLanguageUnavailableError(error) && !isRateLimitError(error)) {
      // fall through to language chain for some unavailable cases
      if (
        !(
          error instanceof Error &&
          (error.message.includes('No transcripts are available') ||
            error.message.includes('Transcript is disabled'))
        )
      ) {
        throw error
      }
    }
  }

  for (const lang of TRANSCRIPT_LANG_FALLBACK_CHAIN) {
    try {
      const items = await fetchTranscriptAttempt(videoId, lang)
      if (items.length > 0) {
        return {
          segments: mapItems(items),
          language: items[0]?.lang ?? lang,
          transcriptSource: 'lang_fallback',
          requestedLang: lang,
        }
      }
    } catch (error) {
      lastError = error
      if (isLanguageUnavailableError(error)) continue
      if (
        error instanceof Error &&
        (error.message.includes('No transcripts are available') ||
          error.message.includes('Transcript is disabled'))
      ) {
        continue
      }
      throw error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Transcript unavailable for this video.')
}
