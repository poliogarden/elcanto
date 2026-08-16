import type { AskAnswer, SynthesisResult, VideoAnalysis } from '@/lib/types/analysis'

export type TranscriptChunk = {
  start: number
  text: string
}

export type AnalyzeVideoInput = {
  videoId: string
  title: string
  channel: string
  transcript: TranscriptChunk[]
}

export type SynthesizeVideosInput = {
  topic?: string
  analyses: Array<VideoAnalysis & { voiceIndex: number }>
}

export type AnswerAcrossVideosInput = {
  question: string
  synthesis: SynthesisResult
  analyses: VideoAnalysis[]
  relevantChunks: Array<{ videoId: string; chunks: TranscriptChunk[] }>
}

/** Server-side AI abstraction — OpenAI is the only provider for MVP */
export interface AIProvider {
  analyzeVideo(input: AnalyzeVideoInput): Promise<VideoAnalysis>
  synthesizeVideos(input: SynthesizeVideosInput): Promise<SynthesisResult>
  answerAcrossVideos(input: AnswerAcrossVideosInput): Promise<AskAnswer>
}
