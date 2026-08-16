import { createHash } from 'crypto'
import { AI_CONFIG } from '@/lib/ai/config'

/** Stable cache key for YouTube metadata / transcript / analysis */
export function videoCacheKey(youtubeId: string, kind: 'metadata' | 'transcript' | 'analysis'): string {
  return `yt:${kind}:${youtubeId}`
}

/** Collection fingerprint for synthesis cache */
export function synthesisCollectionKey(videoIds: string[]): string {
  const sorted = [...videoIds].sort()
  const payload = `${AI_CONFIG.synthesisVersion}:${sorted.join(',')}`
  return createHash('sha256').update(payload).digest('hex')
}
