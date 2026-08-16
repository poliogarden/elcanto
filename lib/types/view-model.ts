import type { Voice } from '@/lib/types/voice'

export type ConsensusView = {
  index: string
  agreeCount: number
  total: number
  claim: string
  voices: number[]
}

export type DisagreementView = {
  question: string
  yes: { label: string; count: number; summary: string; voices: number[] }
  no: { label: string; count: number; summary: string; voices: number[] }
}

export type EvidenceView = {
  voice: number
  youtubeId: string
  title: string
  timestamp: string
  excerpt: string
  watchUrl: string
}

export type SynthesisViewModel = {
  id: string
  number: string
  question: string
  voiceCount: number
  readyVoiceCount: number
  totalDuration: string
  date: string
  bottomLineLabel: string
  bottomLineHeadline: string[]
  bottomLine: string[]
  consensus: ConsensusView[]
  disagreement: DisagreementView | null
  minority: {
    mentionedBy: number
    total: number
    claim: string
    detail: string
  } | null
  evidence: EvidenceView[]
  voices: Voice[]
  suggestedQuestions: string[]
}
