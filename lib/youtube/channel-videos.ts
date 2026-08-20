import { MemoryCache } from '@/lib/cache/memory'
import type { VideoSourceItem } from '@/lib/types/selected-source'

const channelCache = new MemoryCache<VideoSourceItem[]>(1000 * 60 * 15)

/** Fetch recent uploads for a channel via public Data API */
export async function fetchChannelRecentVideos(
  channelId: string,
  maxResults = 24,
): Promise<VideoSourceItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YouTube API key is not configured.')
  }

  const cacheKey = `channel:${channelId}:${maxResults}`
  const cached = channelCache.get(cacheKey)
  if (cached) return cached

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search')
  endpoint.searchParams.set('part', 'snippet')
  endpoint.searchParams.set('channelId', channelId)
  endpoint.searchParams.set('type', 'video')
  endpoint.searchParams.set('order', 'date')
  endpoint.searchParams.set('maxResults', String(maxResults))
  endpoint.searchParams.set('key', apiKey)

  const res = await fetch(endpoint.toString(), { next: { revalidate: 900 } })
  if (!res.ok) {
    throw new Error('Could not load channel videos.')
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: { videoId?: string }
      snippet?: {
        title?: string
        channelTitle?: string
        publishedAt?: string
        thumbnails?: { medium?: { url?: string }; high?: { url?: string } }
      }
    }>
  }

  const items: VideoSourceItem[] = []

  for (const item of data.items ?? []) {
    const videoId = item.id.videoId
    if (!videoId) continue
    items.push({
      videoId,
      title: item.snippet?.title ?? 'Untitled',
      channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
      thumbnail:
        item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url,
      publishedAt: item.snippet?.publishedAt,
      sourceType: 'subscription',
      url: `https://www.youtube.com/watch?v=${videoId}`,
    })
  }

  channelCache.set(cacheKey, items)
  return items
}
