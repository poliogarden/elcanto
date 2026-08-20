import type { SynthesisResult } from '@/lib/types/analysis'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export type CompositionSectionType =
  | 'agreement'
  | 'disagreement'
  | 'evidence'
  | 'counterpoint'
  | 'insight'
  | 'conclusion'
  | 'common_ground'
  | 'split'
  | 'emerging'

export type CompositionClipRole =
  | 'common_ground'
  | 'counterpoint'
  | 'evidence'
  | 'synthesis'
  | 'context'
  | 'conclusion'

export type CompositionClip = {
  id: string
  sourceId: string
  voiceIndex: number
  youtubeId: string
  title: string
  channel: string
  thumbnail?: string
  startSeconds: number
  endSeconds: number
  quote: string
  reason: string
  role: CompositionClipRole
}

export type CompositionInterlude = {
  id: string
  text: string
  kind: 'interlude' | 'synthesis'
  durationSeconds: number
}

export type CompositionSection = {
  id: string
  type: CompositionSectionType
  title: string
  summary: string
  order: number
  items: CompositionTimelineItem[]
}

export type CompositionTimelineItem =
  | { kind: 'clip'; clip: CompositionClip }
  | { kind: 'interlude'; interlude: CompositionInterlude }

export type Composition = {
  title: string
  thesis: string
  sections: CompositionSection[]
  conclusion: string
  totalDurationSeconds: number
}

export type CompositionDocument = {
  id: string
  synthesisId: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'composing' | 'ready' | 'failed'
  instruction?: string
  synthesisTopic?: string
  voiceCount: number
  composition?: Composition
  error?: string
}

export type RenderJobStatus = 'queued' | 'processing' | 'complete' | 'failed'

export type RenderJob = {
  id: string
  compositionId: string
  status: RenderJobStatus
  createdAt: string
  completedAt?: string
  error?: string
  outputUrl?: string
  progress?: number
  progressLabel?: string
  message?: string
  manifestVersion?: number
  hasFfmpegScript?: boolean
}

export type ComposeRunInput = {
  synthesisId: string
  document: SynthesisDocument
  instruction?: string
}

export type ComposeSourceContext = {
  sourceId: string
  voiceIndex: number
  youtubeId: string
  title: string
  channel: string
  thumbnail?: string
  thesis: string
  summary: string
  segments: Array<{ start: number; duration: number; text: string }>
}

export const COMPOSE_LOADING_STEPS = [
  'READING SOURCES',
  'FINDING AGREEMENT',
  'TRACING DISAGREEMENT',
  'CONNECTING EVIDENCE',
  'A FOURTH IDEA IS FORMING',
  'COMPOSING THE THREAD',
] as const

export function flattenCompositionTimeline(composition: Composition): Array<{
  item: CompositionTimelineItem
  sectionTitle: string
  sectionType: CompositionSectionType
  startsAt: number
  endsAt: number
}> {
  const rows: Array<{
    item: CompositionTimelineItem
    sectionTitle: string
    sectionType: CompositionSectionType
    startsAt: number
    endsAt: number
  }> = []

  let cursor = 0
  for (const section of [...composition.sections].sort((a, b) => a.order - b.order)) {
    for (const item of section.items) {
      const duration =
        item.kind === 'clip'
          ? Math.max(1, item.clip.endSeconds - item.clip.startSeconds)
          : item.interlude.durationSeconds
      rows.push({
        item,
        sectionTitle: section.title,
        sectionType: section.type,
        startsAt: cursor,
        endsAt: cursor + duration,
      })
      cursor += duration
    }
  }

  return rows
}

export function getSynthesisHeadline(result: SynthesisResult): string {
  return result.synthesis.bottomLineHeadline?.join(' ') ?? result.synthesis.bottomLine
}
