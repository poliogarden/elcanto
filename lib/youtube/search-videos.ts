import { MemoryCache } from '@/lib/cache/memory'
import { enrichVideoItems } from '@/lib/youtube/enrich-videos'
import type { VideoSourceItem } from '@/lib/types/selected-source'

const searchCache = new MemoryCache<VideoSourceItem[]>(1000 * 60 * 10)

export async function searchYouTubeVideos(
  query: string,
  options?: { maxResults?: number; pageToken?: string },
): Promise<{ items: VideoSourceItem[]; nextPageToken?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YouTube search is not configured (YOUTUBE_API_KEY missing).')
  }

  const maxResults = options?.maxResults ?? 20
  const cacheKey = `search:${query}:${maxResults}:${options?.pageToken ?? ''}`
  const cached = searchCache.get(cacheKey)
  if (cached) return { items: cached }

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search')
  endpoint.searchParams.set('part', 'snippet')
  endpoint.searchParams.set('type', 'video')
  endpoint.searchParams.set('q', query)
  endpoint.searchParams.set('maxResults', String(maxResults))
  endpoint.searchParams.set('key', apiKey)
  if (options?.pageToken) endpoint.searchParams.set('pageToken', options.pageToken)

  const res = await fetch(endpoint.toString(), { next: { revalidate: 600 } })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube search failed: ${text}`)
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
    nextPageToken?: string
  }

  const partial = (data.items ?? [])
    .map((item) => {
      const videoId = item.id.videoId
      if (!videoId) return null
      return {
        videoId,
        title: item.snippet?.title ?? 'Untitled',
        channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
        thumbnail:
          item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url,
        publishedAt: item.snippet?.publishedAt,
        sourceType: 'search' as const,
      }
    })
    .filter((i): i is NonNullable<typeof i> => i !== null)

  const items = await enrichVideoItems(partial)
  searchCache.set(cacheKey, items)

  return { items, nextPageToken: data.nextPageToken }
}
