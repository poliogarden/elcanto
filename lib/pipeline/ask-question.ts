import { getAIProvider } from '@/lib/ai/openai'
import { getCachedTranscript } from '@/lib/repositories/video-cache'
import type { AskAnswer, SynthesisResult, VideoAnalysis } from '@/lib/types/analysis'
import { chunkTranscript } from '@/lib/youtube/transcript'

export type AskQuestionInput = {
  question: string
  synthesis: SynthesisResult
  analyses: VideoAnalysis[]
  youtubeIds: string[]
}

function scoreChunk(question: string, text: string): number {
  const q = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
  const t = text.toLowerCase()
  return q.reduce((acc, word) => (t.includes(word) ? acc + 1 : acc), 0)
}

export async function askAcrossVideos(input: AskQuestionInput): Promise<AskAnswer> {
  const relevantChunks: Array<{ videoId: string; chunks: Array<{ start: number; text: string }> }> =
    []

  for (const youtubeId of input.youtubeIds) {
    const segments = await getCachedTranscript(youtubeId)
    if (!segments) continue

    const chunks = chunkTranscript(segments, 800)
    const ranked = chunks
      .map((c) => ({ ...c, score: scoreChunk(input.question, c.text) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ start, text }) => ({ start, text }))

    if (ranked.length > 0) {
      relevantChunks.push({ videoId: youtubeId, chunks: ranked })
    }
  }

  const ai = getAIProvider()
  return ai.answerAcrossVideos({
    question: input.question,
    synthesis: input.synthesis,
    analyses: input.analyses,
    relevantChunks,
  })
}
