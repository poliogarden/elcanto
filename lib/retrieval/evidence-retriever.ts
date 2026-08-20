import type { TranscriptChunk } from '@/lib/ai/provider'
import type { SourceAnalysis } from '@/lib/types/source'
import { getCachedTranscript } from '@/lib/repositories/video-cache'
import { chunkTranscript } from '@/lib/youtube/transcript'

export type RetrievedEvidence = {
  sourceId: string
  videoId: string
  chunks: TranscriptChunk[]
}

export interface EvidenceRetriever {
  retrieve(question: string, sources: SourceAnalysis[]): Promise<RetrievedEvidence[]>
}

function scoreChunk(question: string, text: string): number {
  const q = question.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
  const t = text.toLowerCase()
  return q.reduce((acc, word) => (t.includes(word) ? acc + 1 : acc), 0)
}

/** Keyword-based retriever — swappable with vector retrieval later. */
export class KeywordEvidenceRetriever implements EvidenceRetriever {
  constructor(
    private readonly chunkSize = 800,
    private readonly topK = 3,
  ) {}

  async retrieve(question: string, sources: SourceAnalysis[]): Promise<RetrievedEvidence[]> {
    const results: RetrievedEvidence[] = []

    for (const source of sources) {
      const segments = await getCachedTranscript(source.videoId)
      if (!segments) continue

      const chunks = chunkTranscript(segments, this.chunkSize)
      const ranked = chunks
        .map((c) => ({ ...c, score: scoreChunk(question, c.text) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, this.topK)
        .map(({ start, text }) => ({ start, text }))

      if (ranked.length > 0) {
        results.push({ sourceId: source.sourceId, videoId: source.videoId, chunks: ranked })
      }
    }

    return results
  }
}

let defaultRetriever: EvidenceRetriever | null = null

export function getEvidenceRetriever(): EvidenceRetriever {
  if (!defaultRetriever) defaultRetriever = new KeywordEvidenceRetriever()
  return defaultRetriever
}

export async function retrieveEvidenceForQuestion(
  question: string,
  sources: SourceAnalysis[],
): Promise<RetrievedEvidence[]> {
  return getEvidenceRetriever().retrieve(question, sources)
}
