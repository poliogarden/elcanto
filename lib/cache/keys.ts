import { createHash } from 'crypto'
import { AI_CONFIG } from '@/lib/ai/config'

export function videoCacheKey(
  youtubeId: string,
  kind: 'metadata' | 'transcript' | 'analysis',
): string {
  if (kind === 'analysis') {
    return `yt:analysis:${youtubeId}:v${AI_CONFIG.analysisVersion}`
  }
  return `yt:${kind}:${youtubeId}`
}

/** Synthesis cache — must include all source IDs + optional question */
export function synthesisCollectionKey(
  sourceIds: string[],
  question?: string,
): string {
  const sorted = [...sourceIds].sort()
  const q = (question ?? '').trim().toLowerCase()
  const payload = `${AI_CONFIG.synthesisVersion}:${sorted.join(',')}:${q}`
  return createHash('sha256').update(payload).digest('hex')
}
