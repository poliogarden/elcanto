import type { SynthesisResult } from '@/lib/types/analysis'
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
  status: SynthesisStatus
  voices: SynthesisVoiceEntry[]
  result?: SynthesisResult
  synthesisError?: string
  savedToArchive?: boolean
  userId?: string
  /** Preserved when re-synthesizing after adding sources */
  previousFourthIdea?: SynthesisResult['fourthIdea']
  /** Synthesis mode — defaults to discover */
  mode?: import('@/lib/types/synthesis-mode').SynthesisMode
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
