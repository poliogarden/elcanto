import { MemoryCache } from '@/lib/cache/memory'
import { videoCacheKey } from '@/lib/cache/keys'
import {
  AI_CONFIG,
  ANALYSIS_SCHEMA_VERSION,
  ANALYSIS_VERSION,
  isAnalysisCacheCompatible,
} from '@/lib/ai/config'
import { logCacheBatch, logCacheEvent } from '@/lib/ai/cache-log'
import type { SourceAnalysis } from '@/lib/types/source'
import type { TranscriptSegment } from '@/lib/youtube/transcript'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  loadVideoAnalysisLocal,
  saveVideoAnalysisLocal,
} from '@/lib/repositories/video-analysis-store'

const transcriptCache = new MemoryCache<TranscriptSegment[]>(1000 * 60 * 60 * 24)
const analysisCache = new MemoryCache<SourceAnalysis>(1000 * 60 * 60 * 24)

const PROCESSING_STALE_MS = 5 * 60 * 1000

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function getCachedTranscript(youtubeId: string): Promise<TranscriptSegment[] | null> {
  const mem = transcriptCache.get(videoCacheKey(youtubeId, 'transcript'))
  if (mem) {
    logCacheEvent({
      layer: 'TRANSCRIPT',
      key: youtubeId,
      result: 'HIT',
      youtubeVideoId: youtubeId,
    })
    return mem
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    logCacheEvent({
      layer: 'TRANSCRIPT',
      key: youtubeId,
      result: 'MISS',
      youtubeVideoId: youtubeId,
    })
    return null
  }

  const { data } = await supabase
    .from('transcripts')
    .select('segments')
    .eq('youtube_id', youtubeId)
    .maybeSingle()

  if (data?.segments) {
    const segments = data.segments as TranscriptSegment[]
    transcriptCache.set(videoCacheKey(youtubeId, 'transcript'), segments)
    logCacheEvent({
      layer: 'TRANSCRIPT',
      key: youtubeId,
      result: 'HIT',
      youtubeVideoId: youtubeId,
    })
    return segments
  }

  logCacheEvent({
    layer: 'TRANSCRIPT',
    key: youtubeId,
    result: 'MISS',
    youtubeVideoId: youtubeId,
  })
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

type StoredAnalysisRow = {
  analysis: SourceAnalysis
  analysis_version?: string | null
  schema_version?: string | null
  model_version?: string | null
  status?: string | null
  processing_started_at?: string | null
}

function isProcessingStale(row: StoredAnalysisRow): boolean {
  if (row.status !== 'processing' || !row.processing_started_at) return true
  const started = new Date(row.processing_started_at).getTime()
  return Date.now() - started > PROCESSING_STALE_MS
}

export async function getCachedAnalysis(youtubeId: string): Promise<SourceAnalysis | null> {
  const mem = analysisCache.get(videoCacheKey(youtubeId, 'analysis'))
  if (mem?.coverage || mem?.claims?.length) {
    logCacheBatch(youtubeId, { transcript: 'HIT', video_knowledge: 'HIT' })
    return mem
  }

  const local = await loadVideoAnalysisLocal(youtubeId)
  if (local) {
    analysisCache.set(videoCacheKey(youtubeId, 'analysis'), local)
    logCacheBatch(youtubeId, { video_knowledge: 'HIT' })
    return local
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    logCacheBatch(youtubeId, { video_knowledge: 'MISS' })
    return mem ?? null
  }

  const { data } = await supabase
    .from('video_analyses')
    .select('analysis, analysis_version, schema_version, model_version, status, processing_started_at')
    .eq('youtube_id', youtubeId)
    .maybeSingle()

  if (!data?.analysis) {
    logCacheBatch(youtubeId, { video_knowledge: 'MISS' })
    return null
  }

  const row = data as StoredAnalysisRow
  if (row.status === 'processing' && !isProcessingStale(row)) {
    return null
  }

  if (!isAnalysisCacheCompatible(row)) {
    logCacheBatch(youtubeId, { video_knowledge: 'MISS' })
    return null
  }

  const analysis = row.analysis as SourceAnalysis
  analysisCache.set(videoCacheKey(youtubeId, 'analysis'), analysis)
  logCacheBatch(youtubeId, { video_knowledge: 'HIT' })
  return analysis
}

export async function tryAcquireAnalysisLock(youtubeId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return true

  const { data } = await supabase
    .from('video_analyses')
    .select('analysis, status, processing_started_at')
    .eq('youtube_id', youtubeId)
    .maybeSingle()

  if (data?.status === 'processing' && !isProcessingStale(data as StoredAnalysisRow)) {
    return false
  }

  await supabase.from('video_analyses').upsert({
    youtube_id: youtubeId,
    analysis: (data as StoredAnalysisRow | null)?.analysis ?? { _processing: true },
    status: 'processing',
    processing_started_at: new Date().toISOString(),
    analysis_version: ANALYSIS_VERSION,
    schema_version: ANALYSIS_SCHEMA_VERSION,
  })

  return true
}

export async function waitForCachedAnalysis(
  youtubeId: string,
  maxWaitMs = 120_000,
): Promise<SourceAnalysis | null> {
  const started = Date.now()
  while (Date.now() - started < maxWaitMs) {
    const cached = await getCachedAnalysis(youtubeId)
    if (cached) return cached
    await new Promise((r) => setTimeout(r, 1500))
  }
  return null
}

export async function setCachedAnalysis(youtubeId: string, analysis: SourceAnalysis): Promise<void> {
  if (analysis.videoKnowledge) {
    analysis.videoKnowledge.analysisVersion = ANALYSIS_VERSION
    analysis.videoKnowledge.schemaVersion = ANALYSIS_SCHEMA_VERSION
  }

  analysisCache.set(videoCacheKey(youtubeId, 'analysis'), analysis)

  await saveVideoAnalysisLocal(youtubeId, analysis)

  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase.from('video_analyses').upsert({
    youtube_id: youtubeId,
    analysis,
    model_version: process.env.OPENAI_MODEL_ANALYSIS ?? 'default',
    analysis_version: ANALYSIS_VERSION,
    schema_version: ANALYSIS_SCHEMA_VERSION,
    prompt_version: AI_CONFIG.coveragePromptVersion,
    status: 'ready',
    processing_started_at: null,
    cached_at: new Date().toISOString(),
  })
}

export async function markAnalysisFailed(youtubeId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase
    .from('video_analyses')
    .update({ status: 'failed', processing_started_at: null })
    .eq('youtube_id', youtubeId)
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
