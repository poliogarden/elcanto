import type { VideoSourceItem } from '@/lib/types/selected-source'

export type LibraryItem = {
  id: string
  userId: string
  youtubeId: string
  sourceUrl?: string
  title: string
  channelName?: string
  thumbnailUrl?: string
  duration?: string
  durationSeconds?: number
  savedAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export type LibraryFilter = 'all' | 'saved' | 'unfiled'

export function libraryItemToVideoSource(item: LibraryItem): VideoSourceItem {
  return {
    videoId: item.youtubeId,
    title: item.title,
    channelTitle: item.channelName ?? 'Unknown channel',
    thumbnail: item.thumbnailUrl,
    duration: item.duration,
    durationSeconds: item.durationSeconds,
    sourceType: 'url',
    url: item.sourceUrl ?? `https://www.youtube.com/watch?v=${item.youtubeId}`,
  }
}

export function videoSourceToLibraryInput(item: VideoSourceItem): {
  youtubeId: string
  sourceUrl?: string
  title: string
  channelName?: string
  thumbnailUrl?: string
  duration?: string
  durationSeconds?: number
} {
  return {
    youtubeId: item.videoId,
    sourceUrl: item.url,
    title: item.title,
    channelName: item.channelTitle,
    thumbnailUrl: item.thumbnail,
    duration: item.duration,
    durationSeconds: item.durationSeconds,
  }
}
