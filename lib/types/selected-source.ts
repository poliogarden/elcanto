export type VideoSourceType =
  | 'search'
  | 'recent'
  | 'liked'
  | 'playlist'
  | 'subscription'
  | 'url'
  | 'sample'

/** Normalized video item for source discovery picker */
export type VideoSourceItem = {
  videoId: string
  title: string
  channelTitle: string
  thumbnail?: string
  duration?: string
  durationSeconds?: number
  publishedAt?: string
  sourceType: VideoSourceType
  url?: string
  sample?: boolean
}

export type SelectedSource = VideoSourceItem & {
  voiceId?: string
}

export type SourcePickerTab = 'search' | 'recent' | 'likes' | 'playlists' | 'channels'

export type PlaylistListItem = {
  playlistId: string
  title: string
  itemCount?: number
  thumbnail?: string
}

export type ChannelListItem = {
  channelId: string
  title: string
  thumbnail?: string
}
