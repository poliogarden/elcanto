import type { SynthesisResult } from '@/lib/types/analysis'
import { getSynthesisTopic } from '@/lib/types/analysis'
import { sourceFromVoice } from '@/lib/types/source'
import type { Source, SourceAnalysis, SourceFailure } from '@/lib/types/source'
import type { Voice } from '@/lib/types/voice'

export type SynthesisVoiceEntry = {
  voice: Voice
  source?: Source
  analysis?: SourceAnalysis
  error?: string
  failure?: SourceFailure
}

export type SynthesisStatus =
  | 'draft'
  | 'analyzing'
  | 'synthesizing'
  | 'complete'
  | 'failed'

export type SynthesisDocument = {
  id: string
  number: string
  createdAt: string
  topic?: string
  /** User's ask prompt from the workspace tray */
  userQuestion?: string
  status: SynthesisStatus
  voices: SynthesisVoiceEntry[]
  result?: SynthesisResult
  /** Survival Test cross-video analysis (2–6 videos) — legacy */
  survival?: import('@/lib/survival/types').SurvivalAnalysis
  /** Multi-source reasoning engine output */
  reasoning?: import('@/lib/reasoning/types').ReasoningAnalysis
  /** Live survival pipeline phase during job processing */
  survivalProgressPhase?: import('@/lib/survival/pipeline').SurvivalProgressPhase
  synthesisError?: string
  savedToArchive?: boolean
  userId?: string
  /** Preserved when re-synthesizing after adding sources */
  previousFourthIdea?: SynthesisResult['fourthIdea']
  /** Synthesis mode — defaults to discover */
  mode?: import('@/lib/types/synthesis-mode').SynthesisMode
  /** Browser cache tier — slim docs need server hydration for full board data */
  storageTier?: import('@/lib/storage/synthesis-document-storage').SynthesisStorageTier
}

export type DraftVoiceInput = {
  id: string
  n: number
  youtubeId: string
  url: string
  title: string
  channel: string
  thumbnail?: string
  duration: string
  durationSeconds?: number
}

export function createSynthesisDocument(id: string, voices: DraftVoiceInput[]): SynthesisDocument {
  return {
    id,
    number: `SYNTHESIS ${id.slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: 'draft',
    voices: voices.map((v) => ({
      voice: {
        ...v,
        status: 'pending',
      },
      source: sourceFromVoice(v),
    })),
  }
}

export function countReadyVoices(doc: SynthesisDocument): number {
  return doc.voices.filter((v) => v.analysis && !v.error).length
}

export function countFailedVoices(doc: SynthesisDocument): number {
  return doc.voices.filter((v) => v.error).length
}

export function isCompleteDocument(doc: SynthesisDocument): boolean {
  return doc.status === 'complete' && Boolean(doc.result ?? doc.survival ?? doc.reasoning)
}

export function getDocumentTopic(doc: SynthesisDocument): string {
  if (doc.reasoning?.mode === 'multi' && doc.reasoning.judgment?.statement) {
    return doc.reasoning.judgment.statement
  }
  if (doc.reasoning?.mode === 'single') {
    return doc.reasoning.keyInsight ?? doc.reasoning.summary
  }
  if (doc.survival?.synthesis.headline) return doc.survival.synthesis.headline
  if (doc.topic) return doc.topic
  if (doc.result) return getSynthesisTopic(doc.result)
  if (doc.userQuestion) return doc.userQuestion
  return doc.number
}
