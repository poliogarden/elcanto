import { loadVideoAnalysisLocal } from '@/lib/repositories/video-analysis-store'
import { fetchYouTubeTranscript } from '@/lib/youtube/transcript-fetch'
import type { TranscriptSegment } from '@/lib/youtube/transcript'
import type { RawExperimentSource } from '@/lib/experiments/raw-deep-synthesis/sources'

export type LoadedRawTranscript = {
  label: string
  videoId: string
  url: string
  title?: string
  transcriptSource: 'youtube_captions' | 'elcanto_analysis_cache_unavailable'
  analysisCachePresent: boolean
  segmentCount: number
  characterCount: number
  segments: TranscriptSegment[]
  formattedTranscript: string
}

function formatTranscriptForPrompt(segments: TranscriptSegment[]): string {
  return segments
    .map((segment) => `[${Math.floor(segment.start)}s] ${segment.text}`)
    .join('\n')
}

/**
 * Load full caption transcript for experiment input.
 * Uses the same YouTube caption fetch path as elcanto ingestion (not claims/evidence retrieval).
 */
export async function loadFullTranscriptForExperiment(
  source: RawExperimentSource,
): Promise<LoadedRawTranscript> {
  const cachedAnalysis = await loadVideoAnalysisLocal(source.videoId)

  const fetched = await fetchYouTubeTranscript(source.videoId)
  if (!fetched.segments.length) {
    throw new Error(
      `No transcript segments for ${source.label} (${source.videoId}). Cannot run raw experiment.`,
    )
  }

  const formatted = formatTranscriptForPrompt(fetched.segments)
  const characterCount = formatted.length

  return {
    label: source.label,
    videoId: source.videoId,
    url: source.url,
    title: cachedAnalysis?.title,
    transcriptSource: 'youtube_captions',
    analysisCachePresent: Boolean(cachedAnalysis),
    segmentCount: fetched.segments.length,
    characterCount,
    segments: fetched.segments,
    formattedTranscript: formatted,
  }
}
