import type { DraftVoiceInput } from '@/lib/types/synthesis-document'
import type { PersonalCluster } from '@/lib/types/personal'

const MAX_CLUSTER_SYNTHESIS_VIDEOS = 8

export function clusterToDraftVoices(cluster: PersonalCluster): DraftVoiceInput[] {
  const seen = new Set<string>()

  return cluster.videos
    .filter((v) => {
      if (seen.has(v.youtubeId)) return false
      seen.add(v.youtubeId)
      return true
    })
    .slice(0, MAX_CLUSTER_SYNTHESIS_VIDEOS)
    .map((v, i) => ({
      id: crypto.randomUUID(),
      n: i + 1,
      youtubeId: v.youtubeId,
      url: `https://www.youtube.com/watch?v=${v.youtubeId}`,
      title: v.title,
      channel: v.channel ?? 'Unknown channel',
      duration: '—',
    }))
}
