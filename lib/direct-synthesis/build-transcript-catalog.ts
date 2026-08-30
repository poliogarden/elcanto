import { fetchYouTubeTranscript } from '@/lib/youtube/transcript-fetch'
import type { SourceAnalysis } from '@/lib/types/source'
import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'

export const DEEP_SYNTHESIS_MAX_INPUT_CHARS = Number(
  process.env.DEEP_SYNTHESIS_MAX_INPUT_CHARS ?? '400000',
)

export type TranscriptSourceKind = 'youtube_captions' | 'analysis_evidence_fallback'

export type TranscriptPerSourceStats = {
  sourceId: string
  videoId: string
  segmentCount: number
  characterCount: number
  transcriptSource: TranscriptSourceKind
}

export type FormattedSourceTranscript = {
  sourceId: string
  sourceTitle: string
  text: string
}

export type TranscriptCatalogBuild = {
  snippets: EvidenceSnippet[]
  perSource: TranscriptPerSourceStats[]
  formattedTranscripts: FormattedSourceTranscript[]
  totalCharacters: number
  contextExceeded: boolean
  contextLimitChars: number
}

function formatSegment(start: number, text: string): string {
  return `[${Math.floor(start)}s] ${text}`
}

export async function buildTranscriptCatalog(
  sources: SourceAnalysis[],
): Promise<TranscriptCatalogBuild> {
  const snippets: EvidenceSnippet[] = []
  const perSource: TranscriptPerSourceStats[] = []
  const formattedTranscripts: FormattedSourceTranscript[] = []
  let totalCharacters = 0

  for (const source of sources) {
    let segments: Array<{ start: number; text: string }> = []
    let transcriptSource: TranscriptSourceKind = 'youtube_captions'

    try {
      const fetched = await fetchYouTubeTranscript(source.videoId)
      if (fetched.segments.length > 0) {
        segments = fetched.segments.map((s) => ({
          start: s.start,
          text: s.text,
        }))
      }
    } catch {
      // fall through to analysis evidence
    }

    if (segments.length === 0) {
      transcriptSource = 'analysis_evidence_fallback'
      segments = (source.evidence ?? [])
        .filter((e) => e.text?.trim())
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
        .map((e) => ({
          start: e.timestamp ?? 0,
          text: e.text,
        }))
    }

    const header = `=== ${source.sourceId}: ${source.title} (${source.videoId}) ===\n`
    const body = segments.map((s) => formatSegment(s.start, s.text)).join('\n')
    const formatted = header + body
    formattedTranscripts.push({
      sourceId: source.sourceId,
      sourceTitle: source.title,
      text: formatted,
    })
    totalCharacters += formatted.length

    for (let index = 0; index < segments.length; index++) {
      const seg = segments[index]
      snippets.push({
        ref: `${source.sourceId}:t_${index}`,
        sourceId: source.sourceId,
        videoId: source.videoId,
        text: seg.text,
        startTime: seg.start,
      })
    }

    perSource.push({
      sourceId: source.sourceId,
      videoId: source.videoId,
      segmentCount: segments.length,
      characterCount: formatted.length,
      transcriptSource,
    })
  }

  const contextLimitChars = DEEP_SYNTHESIS_MAX_INPUT_CHARS
  const contextExceeded = totalCharacters > contextLimitChars

  return {
    snippets,
    perSource,
    formattedTranscripts,
    totalCharacters,
    contextExceeded,
    contextLimitChars,
  }
}
