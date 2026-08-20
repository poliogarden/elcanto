import { describe, expect, it } from 'vitest'
import { enrichVideoItems } from '@/lib/youtube/enrich-videos'
import { youtubeThumbnailUrl } from '@/lib/youtube/thumbnail'

describe('youtubeThumbnailUrl', () => {
  it('builds CDN url for valid ids', () => {
    expect(youtubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    )
  })

  it('rejects invalid ids', () => {
    expect(youtubeThumbnailUrl('sample_1')).toBeUndefined()
  })
})

describe('enrichVideoItems', () => {
  it('falls back to CDN thumbnail without API key', async () => {
    const prev = process.env.YOUTUBE_API_KEY
    delete process.env.YOUTUBE_API_KEY

    const items = await enrichVideoItems([
      {
        videoId: 'dQw4w9WgXcQ',
        title: 'Test',
        channelTitle: 'Channel',
        sourceType: 'recent',
      },
    ])

    expect(items[0]?.thumbnail).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg')

    process.env.YOUTUBE_API_KEY = prev
  })
})
