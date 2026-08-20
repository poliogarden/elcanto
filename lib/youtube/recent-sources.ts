import { getPersonalSignals } from '@/lib/personal/signals-repository'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import { enrichVideoItems } from '@/lib/youtube/enrich-videos'
import type { VideoSourceItem } from '@/lib/types/selected-source'

const RECENT_SOURCES = new Set(['elcanto_added', 'elcanto_synthesis', 'elcanto_saved'])

/** Recent videos used in elcanto — not YouTube watch history */
export async function fetchRecentElcantoSources(limit = 24): Promise<VideoSourceItem[]> {
  const ctx = await resolvePersonalUser()
  const signals = await getPersonalSignals(ctx.userId, { useSupabase: ctx.useSupabase })

  const seen = new Set<string>()
  const partial: Array<Pick<VideoSourceItem, 'videoId' | 'title' | 'channelTitle' | 'publishedAt' | 'sourceType'>> = []

  for (const signal of signals) {
    if (!RECENT_SOURCES.has(signal.source)) continue
    if (!signal.youtubeId || seen.has(signal.youtubeId)) continue
    seen.add(signal.youtubeId)
    partial.push({
      videoId: signal.youtubeId,
      title: signal.title,
      channelTitle: signal.channel ?? 'Unknown channel',
      publishedAt: signal.signalAt,
      sourceType: 'recent',
    })
    if (partial.length >= limit) break
  }

  return enrichVideoItems(partial)
}
