import { MemoryCache } from '@/lib/cache/memory'
import { videoCacheKey } from '@/lib/cache/keys'
import type { VideoAnalysis } from '@/lib/types/analysis'
import type { TranscriptSegment } from '@/lib/youtube/transcript'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const transcriptCache = new MemoryCache<TranscriptSegment[]>(1000 * 60 * 60 * 24)
const analysisCache = new MemoryCache<VideoAnalysis>(1000 * 60 * 60 * 24)

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function getCachedTranscript(youtubeId: string): Promise<TranscriptSegment[] | null> {
  const mem = transcriptCache.get(videoCacheKey(youtubeId, 'transcript'))
  if (mem) return mem

  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { data } = await supabase
    .from('transcripts')
    .select('segments')
    .eq('youtube_id', youtubeId)
    .maybeSingle()

  if (data?.segments) {
    const segments = data.segments as TranscriptSegment[]
    transcriptCache.set(videoCacheKey(youtubeId, 'transcript'), segments)
    return segments
  }

  return null
}

export async function setCachedTranscript(
  youtubeId: string,
  segments: TranscriptSegment[],
  language?: string,
): Promise<void> {
  transcriptCache.set(videoCacheKey(youtubeId, 'transcript'), segments)

  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase.from('transcripts').upsert({
    youtube_id: youtubeId,
    segments,
    language: language ?? null,
    cached_at: new Date().toISOString(),
  })
}

export async function getCachedAnalysis(youtubeId: string): Promise<VideoAnalysis | null> {
  const mem = analysisCache.get(videoCacheKey(youtubeId, 'analysis'))
  if (mem) return mem

  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  const { data } = await supabase
    .from('video_analyses')
    .select('analysis')
    .eq('youtube_id', youtubeId)
    .maybeSingle()

  if (data?.analysis) {
    const analysis = data.analysis as VideoAnalysis
    analysisCache.set(videoCacheKey(youtubeId, 'analysis'), analysis)
    return analysis
  }

  return null
}

export async function setCachedAnalysis(youtubeId: string, analysis: VideoAnalysis): Promise<void> {
  analysisCache.set(videoCacheKey(youtubeId, 'analysis'), analysis)

  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase.from('video_analyses').upsert({
    youtube_id: youtubeId,
    analysis,
    model_version: process.env.OPENAI_MODEL_ANALYSIS ?? 'default',
    cached_at: new Date().toISOString(),
  })
}

export async function cacheVideoMetadata(
  youtubeId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase.from('videos').upsert({
    youtube_id: youtubeId,
    ...metadata,
    cached_at: new Date().toISOString(),
  })
}
