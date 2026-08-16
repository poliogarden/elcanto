import { AI_CONFIG } from '@/lib/ai/config'
import { getAIProvider } from '@/lib/ai/openai'
import {
  getCachedAnalysis,
  getCachedTranscript,
  setCachedAnalysis,
  setCachedTranscript,
} from '@/lib/repositories/video-cache'
import type { VideoAnalysis } from '@/lib/types/analysis'
import { chunkTranscript, normalizeTranscript } from '@/lib/youtube/transcript'
import { getTranscriptProvider } from '@/lib/youtube/youtube-transcript-provider'

export type AnalyzeVideoParams = {
  youtubeId: string
  title: string
  channel: string
  voiceIndex: number
}

export type AnalyzeVideoOutcome =
  | { ok: true; analysis: VideoAnalysis }
  | { ok: false; code: string; message: string }

export async function analyzeVideoPipeline(
  params: AnalyzeVideoParams,
): Promise<AnalyzeVideoOutcome> {
  const cached = await getCachedAnalysis(params.youtubeId)
  if (cached) {
    return { ok: true, analysis: { ...cached, videoId: params.youtubeId } }
  }

  let segments = await getCachedTranscript(params.youtubeId)

  if (!segments) {
    const transcriptProvider = getTranscriptProvider()
    const transcriptResult = await transcriptProvider.getTranscript(params.youtubeId)

    if (!transcriptResult.ok) {
      return {
        ok: false,
        code: transcriptResult.code,
        message:
          transcriptResult.code === 'unavailable' || transcriptResult.code === 'disabled'
            ? 'TRANSCRIPT UNAVAILABLE'
            : transcriptResult.message,
      }
    }

    segments = normalizeTranscript(transcriptResult.segments)
    await setCachedTranscript(params.youtubeId, segments, transcriptResult.language)
  }

  const chunks = chunkTranscript(segments)
  if (chunks.length === 0) {
    return { ok: false, code: 'unavailable', message: 'TRANSCRIPT UNAVAILABLE' }
  }

  const ai = getAIProvider()
  const analysis = await ai.analyzeVideo({
    videoId: params.youtubeId,
    title: params.title,
    channel: params.channel,
    transcript: chunks,
  })

  analysis.videoId = params.youtubeId
  await setCachedAnalysis(params.youtubeId, analysis)

  return { ok: true, analysis }
}

export { AI_CONFIG }
