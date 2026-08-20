export type StoryMode = 'insight' | 'debate' | 'funny' | 'story'

export type StoryBlockType =
  | 'hook'
  | 'context'
  | 'agreement'
  | 'disagreement'
  | 'contradiction'
  | 'parallel'
  | 'bridge'
  | 'question'
  | 'clip'
  | 'insight'
  | 'ending'

export type StoryBlock = {
  id: string
  type: StoryBlockType
  order: number
  /** Preview timeline (seconds) */
  start: number
  end: number
  topText?: string | null
  bottomText?: string | null
  /** Clip fields */
  sourceId?: string
  sourceVideoId?: string
  sourceTitle?: string
  channelName?: string
  originalUrl?: string
  thumbnail?: string
  sourceStart?: number
  sourceEnd?: number
  evidenceId?: string
  claimId?: string
  evidenceText?: string
}

export type StoryPlan = {
  mode: StoryMode
  title: string
  durationTarget: number
  blocks: StoryBlock[]
  qualityNote?: string | null
  sourceCount: number
}

export type StoryProject = {
  id: string
  synthesisId: string
  mode: StoryMode
  plan: StoryPlan
  status: 'draft' | 'ready'
  updatedAt: string
}

export const STORY_MODE_LABELS: Record<
  StoryMode,
  { title: string; description: string }
> = {
  insight: {
    title: 'Insight',
    description: 'Explain the new idea that emerged.',
  },
  debate: {
    title: 'Debate',
    description: 'Show where the voices disagree.',
  },
  funny: {
    title: 'Funny',
    description: 'Find irony, tension and unexpected contrast.',
  },
  story: {
    title: 'Story',
    description: 'Build the clearest narrative across the sources.',
  },
}
