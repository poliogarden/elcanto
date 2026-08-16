export type VoiceProcessingStatus =
  | 'pending'
  | 'fetching_metadata'
  | 'ready'
  | 'fetching_transcript'
  | 'analyzing'
  | 'done'
  | 'failed'

export type Voice = {
  /** Display index: VOICE 01, 02, … */
  n: number
  /** Internal stable id within a synthesis session */
  id: string
  youtubeId: string
  url: string
  title: string
  channel: string
  thumbnail?: string
  duration: string
  durationSeconds?: number
  status: VoiceProcessingStatus
  error?: string
}

export type YouTubeMetadata = {
  youtubeId: string
  url: string
  title: string
  channel: string
  thumbnail?: string
  duration: string
  durationSeconds?: number
}
