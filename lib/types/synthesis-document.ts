import type { VideoAnalysis, SynthesisResult } from '@/lib/types/analysis'
import type { Voice } from '@/lib/types/voice'

export type SynthesisVoiceEntry = {
  voice: Voice
  analysis?: VideoAnalysis
  error?: string
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
    })),
  }
}

export function countReadyVoices(doc: SynthesisDocument): number {
  return doc.voices.filter((v) => v.analysis && !v.error).length
}

export function countFailedVoices(doc: SynthesisDocument): number {
  return doc.voices.filter((v) => v.error).length
}
