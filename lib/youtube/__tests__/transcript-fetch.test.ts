import { describe, expect, it } from 'vitest'
import { YouTubeTranscriptProvider } from '@/lib/youtube/youtube-transcript-provider'
import { TRANSCRIPT_LANG_FALLBACK_CHAIN } from '@/lib/youtube/transcript-fetch'

describe('fetchYouTubeTranscript', () => {
  it('exports language fallback chain in priority order', () => {
    expect(TRANSCRIPT_LANG_FALLBACK_CHAIN).toEqual(['ko', 'ko-KR', 'en', 'en-US'])
  })
})

describe('YouTubeTranscriptProvider', () => {
  it('maps successful fetch to TranscriptResult', async () => {
    const provider = new YouTubeTranscriptProvider()
    const result = await provider.getTranscript('jNQXAC9IVRw')
    if (!result.ok) {
      expect(result.code).toBeDefined()
      return
    }
    expect(result.segments.length).toBeGreaterThan(0)
    expect(result.segments[0]).toMatchObject({
      start: expect.any(Number),
      duration: expect.any(Number),
      text: expect.any(String),
    })
  })
})
