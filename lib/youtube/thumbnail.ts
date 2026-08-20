import { isValidYouTubeVideoId } from '@/lib/voice/normalize-voice'

/** Public YouTube CDN thumbnail — works without Data API key */
export function youtubeThumbnailUrl(videoId: string, quality: 'default' | 'mq' | 'hq' = 'mq'): string | undefined {
  if (!isValidYouTubeVideoId(videoId)) return undefined
  const file = quality === 'hq' ? 'hqdefault.jpg' : quality === 'mq' ? 'mqdefault.jpg' : 'default.jpg'
  return `https://i.ytimg.com/vi/${videoId}/${file}`
}

export function resolveVideoThumbnail(
  videoId: string,
  thumbnail?: string | null,
): string | undefined {
  const trimmed = thumbnail?.trim()
  if (trimmed) return trimmed
  return youtubeThumbnailUrl(videoId)
}
