export type VideoAnalyzeTiming = {
  videoId: string
  sourceId: string
  title: string
  analysisStartMs: number
  analysisEndMs: number
  durationMs: number
  fromCache: boolean
  transcriptCacheMs: number
  transcriptFetchMs: number
  normalizationMs: number
  openaiAnalysisMs: number
  storageMs: number
  lockWaitMs: number
  transcriptChars: number
  inputTokens: number | null
  outputTokens: number | null
  model: string | null
}

export function logVideoAnalyzeTiming(timing: VideoAnalyzeTiming): void {
  if (process.env.NODE_ENV === 'production' && process.env.AI_COST_DEBUG !== '1') return

  console.log(`[VIDEO ANALYZE] ${timing.videoId}`)
  console.log(`  title: ${timing.title.slice(0, 60)}`)
  console.log(`  wall: ${timing.analysisStartMs} → ${timing.analysisEndMs} (${timing.durationMs}ms)`)
  if (timing.fromCache) {
    console.log(`  cache_hit: true`)
    return
  }
  if (timing.lockWaitMs > 0) console.log(`  lock_wait: ${timing.lockWaitMs}ms`)
  console.log(`  transcript_cache_lookup: ${timing.transcriptCacheMs}ms`)
  console.log(`  transcript_fetch: ${timing.transcriptFetchMs}ms`)
  console.log(`  normalization: ${timing.normalizationMs}ms`)
  console.log(`  openai_analysis: ${timing.openaiAnalysisMs}ms`)
  console.log(`  storage: ${timing.storageMs}ms`)
  console.log(`  transcript_chars: ${timing.transcriptChars}`)
  if (timing.model) {
    console.log(
      `  tokens: in=${timing.inputTokens ?? '?'} out=${timing.outputTokens ?? '?'} model=${timing.model}`,
    )
  }
}
