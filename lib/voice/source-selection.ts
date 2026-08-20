import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice, YouTubeMetadata } from '@/lib/types/voice'
import {
  createVoiceId,
  normalizeChannelName,
  normalizeVideoTitle,
  normalizeYouTubeVideoId,
  voiceFromSourceItem,
} from '@/lib/voice/normalize-voice'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'

export { createVoiceId, voiceFromSourceItem }

export function reindexVoices(voices: Voice[]): Voice[] {
  return voices.map((v, i) => ({ ...v, n: i + 1 }))
}

export function toggleVoiceForItem(voices: Voice[], item: VideoSourceItem): Voice[] {
  const youtubeId = normalizeYouTubeVideoId(item.videoId)
  if (!youtubeId) return voices

  const existing = voices.find((v) => v.youtubeId === youtubeId)
  if (existing) {
    return reindexVoices(voices.filter((v) => v.id !== existing.id))
  }
  return [...voices, voiceFromSourceItem({ ...item, videoId: youtubeId }, voices.length + 1)]
}

export function isVideoSelected(voices: Voice[], videoId: string): boolean {
  const id = normalizeYouTubeVideoId(videoId)
  if (!id) return false
  return voices.some((v) => v.youtubeId === id)
}

export function selectedVideoIds(voices: Voice[]): Set<string> {
  return new Set(voices.map((v) => v.youtubeId))
}

export function metadataToVideoSource(
  data: YouTubeMetadata,
  sourceType: VideoSourceItem['sourceType'] = 'url',
): VideoSourceItem {
  return {
    videoId: data.youtubeId,
    title: normalizeVideoTitle(data.title),
    channelTitle: normalizeChannelName(data.channel),
    thumbnail: resolveVideoThumbnail(data.youtubeId, data.thumbnail),
    duration: data.duration,
    durationSeconds: data.durationSeconds,
    sourceType,
    url: data.url,
  }
}
