import { extractYouTubeId } from '@/lib/youtube/url'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import type { DraftVoiceInput } from '@/lib/types/synthesis-document'
import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'

export function isValidYouTubeVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id.trim())
}

export function normalizeYouTubeVideoId(raw: string): string | null {
  const trimmed = raw.trim()
  if (isValidYouTubeVideoId(trimmed)) return trimmed
  return extractYouTubeId(trimmed)
}

export function normalizeChannelName(channel?: string | null): string {
  const trimmed = channel?.trim()
  return trimmed || 'Unknown channel'
}

export function normalizeVideoTitle(title?: string | null): string {
  const trimmed = title?.trim()
  return trimmed || 'Untitled video'
}

export function voiceFromSourceItem(item: VideoSourceItem, n: number): Voice {
  const youtubeId = normalizeYouTubeVideoId(item.videoId) ?? item.videoId.trim()
  return {
    id: createVoiceId(),
    n,
    youtubeId,
    url: item.url ?? `https://www.youtube.com/watch?v=${youtubeId}`,
    title: normalizeVideoTitle(item.title),
    channel: normalizeChannelName(item.channelTitle),
    thumbnail: resolveVideoThumbnail(youtubeId, item.thumbnail),
    duration: item.duration ?? '—',
    durationSeconds: item.durationSeconds,
    status: 'ready',
  }
}

export function createVoiceId(): string {
  return crypto.randomUUID()
}

export function normalizeDraftVoice(v: DraftVoiceInput): DraftVoiceInput | null {
  const youtubeId = normalizeYouTubeVideoId(v.youtubeId)
  if (!youtubeId || !isValidYouTubeVideoId(youtubeId)) return null

  const n = Number(v.n)
  if (!Number.isFinite(n) || n < 1) return null

  return {
    ...v,
    n,
    youtubeId,
    title: normalizeVideoTitle(v.title),
    channel: normalizeChannelName(v.channel),
    url: v.url?.trim() || `https://www.youtube.com/watch?v=${youtubeId}`,
    duration: v.duration?.trim() || '—',
  }
}

export function normalizeVoiceForAnalyze(voice: Voice): {
  youtubeId: string
  title: string
  channel: string
  url: string
  voiceIndex: number
} | null {
  const youtubeId = normalizeYouTubeVideoId(voice.youtubeId)
  if (!youtubeId || !isValidYouTubeVideoId(youtubeId)) return null

  const voiceIndex = Number(voice.n)
  if (!Number.isFinite(voiceIndex) || voiceIndex < 1) return null

  return {
    youtubeId,
    title: normalizeVideoTitle(voice.title),
    channel: normalizeChannelName(voice.channel),
    url: voice.url?.trim() || `https://www.youtube.com/watch?v=${youtubeId}`,
    voiceIndex,
  }
}
