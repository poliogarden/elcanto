import { MemoryCache } from '@/lib/cache/memory'
import { formatDuration } from '@/lib/youtube/url'
import { youtubeThumbnailUrl } from '@/lib/youtube/thumbnail'
import type { VideoSourceItem } from '@/lib/types/selected-source'

type DataApiItem = {
  id: string
  snippet?: {
    title?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: { medium?: { url?: string }; high?: { url?: string } }
  }
  contentDetails?: { duration?: string }
}

const enrichCache = new MemoryCache<VideoSourceItem[]>(1000 * 60 * 30)

function parseIso8601Duration(iso: string): number | undefined {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return undefined
  const h = Number(match[1] ?? 0)
  const m = Number(match[2] ?? 0)
  const s = Number(match[3] ?? 0)
  return h * 3600 + m * 60 + s
}

/** Batch-enrich video items with duration + thumbnails via Data API */
export async function enrichVideoItems(
  items: VideoSourceItem[],
): Promise<VideoSourceItem[]> {
  if (items.length === 0) return []

  const apiKey = process.env.YOUTUBE_API_KEY
  const ids = items.map((i) => i.videoId).join(',')
  const cacheKey = `enrich:${ids}`
  const cached = enrichCache.get(cacheKey)
  if (cached) return cached

  const byId = new Map<string, VideoSourceItem>(
    items.map((i) => [i.videoId, { ...i, url: i.url ?? `https://www.youtube.com/watch?v=${i.videoId}` }]),
  )

  if (apiKey) {
    const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos')
    endpoint.searchParams.set('part', 'snippet,contentDetails')
    endpoint.searchParams.set('id', ids)
    endpoint.searchParams.set('key', apiKey)

    try {
      const res = await fetch(endpoint.toString(), { next: { revalidate: 1800 } })
      if (res.ok) {
        const data = (await res.json()) as { items?: DataApiItem[] }
        for (const item of data.items ?? []) {
          const base = byId.get(item.id)
          if (!base) continue
          const durationSeconds = item.contentDetails?.duration
            ? parseIso8601Duration(item.contentDetails.duration)
            : undefined
          byId.set(item.id, {
            videoId: item.id,
            title: item.snippet?.title ?? base.title,
            channelTitle: item.snippet?.channelTitle ?? base.channelTitle,
            thumbnail:
              item.snippet?.thumbnails?.high?.url ??
              item.snippet?.thumbnails?.medium?.url ??
              base.thumbnail,
            publishedAt: item.snippet?.publishedAt ?? base.publishedAt,
            duration: durationSeconds !== undefined ? formatDuration(durationSeconds) : base.duration,
            durationSeconds,
            sourceType: base.sourceType,
            url: `https://www.youtube.com/watch?v=${item.id}`,
          })
        }
      }
    } catch {
      // fall through with partial data
    }
  }

  const enriched = items.map((item) => {
    const full = byId.get(item.videoId) ?? item
    return {
      ...item,
      ...full,
      thumbnail: full.thumbnail ?? youtubeThumbnailUrl(item.videoId),
      url: full.url ?? `https://www.youtube.com/watch?v=${item.videoId}`,
    }
  })

  enrichCache.set(cacheKey, enriched)
  return enriched
}
