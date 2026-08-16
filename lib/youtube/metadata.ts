import { MemoryCache } from '@/lib/cache/memory'
import { videoCacheKey } from '@/lib/cache/keys'
import { formatDuration } from '@/lib/youtube/url'
import type { YouTubeMetadata } from '@/lib/types/voice'

type OEmbedResponse = {
  title?: string
  author_name?: string
  thumbnail_url?: string
}

type DataApiItem = {
  snippet?: {
    title?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: { high?: { url?: string }; medium?: { url?: string } }
  }
  contentDetails?: { duration?: string }
}

const metadataCache = new MemoryCache<YouTubeMetadata>(1000 * 60 * 60) // 1h

function parseIso8601Duration(iso: string): number | undefined {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return undefined
  const h = Number(match[1] ?? 0)
  const m = Number(match[2] ?? 0)
  const s = Number(match[3] ?? 0)
  return h * 3600 + m * 60 + s
}

async function fetchOEmbed(canonicalUrl: string): Promise<OEmbedResponse> {
  const endpoint = new URL('https://www.youtube.com/oembed')
  endpoint.searchParams.set('url', canonicalUrl)
  endpoint.searchParams.set('format', 'json')

  const res = await fetch(endpoint.toString(), { next: { revalidate: 3600 } })

  if (!res.ok) {
    if (res.status === 404) throw new Error('Video not found or is private.')
    throw new Error('Could not fetch video metadata.')
  }

  return res.json() as Promise<OEmbedResponse>
}

async function fetchDataApiMetadata(youtubeId: string): Promise<YouTubeMetadata | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos')
  endpoint.searchParams.set('part', 'snippet,contentDetails')
  endpoint.searchParams.set('id', youtubeId)
  endpoint.searchParams.set('key', apiKey)

  const res = await fetch(endpoint.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return null

  const data = (await res.json()) as { items?: DataApiItem[] }
  const item = data.items?.[0]
  if (!item?.snippet?.title) return null

  const durationSeconds = item.contentDetails?.duration
    ? parseIso8601Duration(item.contentDetails.duration)
    : undefined

  const thumbnail =
    item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url

  return {
    youtubeId,
    url: `https://www.youtube.com/watch?v=${youtubeId}`,
    title: item.snippet.title,
    channel: item.snippet.channelTitle ?? 'Unknown channel',
    thumbnail,
    duration: durationSeconds !== undefined ? formatDuration(durationSeconds) : '—',
    durationSeconds,
  }
}

export async function fetchYouTubeMetadata(
  youtubeId: string,
  canonicalUrl: string,
): Promise<YouTubeMetadata> {
  const cacheKey = videoCacheKey(youtubeId, 'metadata')
  const cached = metadataCache.get(cacheKey)
  if (cached) return cached

  const fromApi = await fetchDataApiMetadata(youtubeId)
  if (fromApi) {
    metadataCache.set(cacheKey, fromApi)
    return fromApi
  }

  const [oembed, durationSeconds] = await Promise.all([
    fetchOEmbed(canonicalUrl),
    fetchDataApiMetadata(youtubeId).then((m) => m?.durationSeconds),
  ])

  if (!oembed.title) {
    throw new Error('Video not found or is private.')
  }

  const metadata: YouTubeMetadata = {
    youtubeId,
    url: canonicalUrl,
    title: oembed.title,
    channel: oembed.author_name ?? 'Unknown channel',
    thumbnail: oembed.thumbnail_url,
    duration: durationSeconds !== undefined ? formatDuration(durationSeconds) : '—',
    durationSeconds,
  }

  metadataCache.set(cacheKey, metadata)
  return metadata
}
