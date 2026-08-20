export type PersonalSignalSource =
  | 'youtube_subscription'
  | 'youtube_like'
  | 'youtube_playlist'
  | 'elcanto_added'
  | 'elcanto_synthesis'
  | 'elcanto_saved'

export type TasteWindow = '7d' | '30d' | '90d' | 'all'

export type PersonalSignal = {
  id: string
  source: PersonalSignalSource
  youtubeId?: string
  title: string
  channel?: string
  signalAt: string
  topics: string[]
  concepts: string[]
}

export type KnowledgeGraphNodeType =
  | 'source'
  | 'topic'
  | 'concept'
  | 'person'
  | 'claim'
  | 'question'

export type PersonalGraphNode = {
  id: string
  type: KnowledgeGraphNodeType
  label: string
  weight: number
  recent?: boolean
}

export type PersonalGraphEdge = {
  id: string
  from: string
  to: string
  label?: string
}

export type InterestTrend = {
  label: string
  changePercent: number
  window: TasteWindow
}

export type InterestShift = {
  fromTopics: string[]
  toTopics: string[]
  statement: string
}

export type PersonalCluster = {
  id: string
  label: string
  topic: string
  signalIds: string[]
  sourceCount: number
  videos: PersonalClusterVideo[]
}

export type PersonalClusterVideo = {
  signalId: string
  youtubeId: string
  title: string
  channel?: string
}

export type TasteWindowView = {
  window: TasteWindow
  signalCount: number
  emerging: InterestTrend[]
  declining: InterestTrend[]
  interestShift: InterestShift | null
}

export type BlindSpot = {
  id: string
  assumedPerspective: string
  missingPerspective: string
}

export type PersonalGap = {
  id: string
  explored: string
  notYetExplored: string
  question: string
}

export type PersonalRecommendation = {
  id: string
  type: 'go_deeper' | 'connect' | 'counter' | 'blind_spot' | 'new_direction'
  typeLabel: string
  searchQuery: string
  title: string
  reason: string
}

export type PersonalProfile = {
  userId: string
  youtubeConnected: boolean
  lastSyncedAt: string | null
  signalCount: number
  currentThread: string
  supportingInterests: string[]
  emerging: InterestTrend[]
  declining: InterestTrend[]
  interestShift: InterestShift | null
  tasteByWindow: Record<TasteWindow, TasteWindowView>
  clusters: PersonalCluster[]
  personalSynthesis: string
  graphNodes: PersonalGraphNode[]
  graphEdges: PersonalGraphEdge[]
  blindSpots: BlindSpot[]
  gaps: PersonalGap[]
  recommendations: PersonalRecommendation[]
  inferredPatterns: string[]
  importedPlaylists: ImportedPlaylist[]
}

export type ImportedPlaylist = {
  playlistId: string
  title: string
  videoCount: number
  importedAt: string
}

export type PersonalHomeSummary = {
  hasProfile: boolean
  currentThread: string
  threadNarrative: string | null
  emerging: string[]
  connection: string | null
  gap: PersonalGap | null
  lastSyncedAt: string | null
}
