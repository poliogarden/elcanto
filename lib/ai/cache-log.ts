export type CacheLayer = 'TRANSCRIPT' | 'VIDEO_KNOWLEDGE' | 'RELATIONSHIP' | 'SYNTHESIS' | 'KNOWLEDGE_EXTENSION'
export type CacheResult = 'HIT' | 'MISS'

export function logCacheEvent(input: {
  layer: CacheLayer
  key: string
  result: CacheResult
  youtubeVideoId?: string
}): void {
  if (process.env.NODE_ENV === 'production' && process.env.AI_COST_DEBUG !== '1') return

  const id = input.youtubeVideoId ? ` video=${input.youtubeVideoId}` : ''
  console.log(`[CACHE]${id} ${input.layer}=${input.result} key=${input.key.slice(0, 16)}`)
}

export function logCacheBatch(
  youtubeVideoId: string,
  events: Partial<Record<Lowercase<CacheLayer>, CacheResult>>,
): void {
  if (process.env.NODE_ENV === 'production' && process.env.AI_COST_DEBUG !== '1') return

  const parts = Object.entries(events)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
  console.log(`[CACHE] video=${youtubeVideoId} ${parts}`)
}
