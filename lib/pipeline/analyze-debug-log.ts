/**
 * Structured debug trace for per-video analyze pipeline.
 * Logs one JSON line per video — grep for [ANALYZE_DEBUG].
 */
export type AnalyzeDebugTrace = {
  videoId: string
  title: string
  metadataSuccess: boolean
  transcriptSuccess: boolean
  transcriptLength: number
  transcriptLanguage: string | null
  transcriptSource: 'cache' | 'fetch' | 'none'
  isAnalyzable: boolean
  failureReason: string | null
  /** Extra context for root-cause triage */
  stage?: string
  failureCode?: string
  normalizedSegmentCount?: number
  fromCache?: boolean
}

export function logAnalyzeDebug(trace: AnalyzeDebugTrace): void {
  console.log('[ANALYZE_DEBUG]', JSON.stringify(trace))
}
