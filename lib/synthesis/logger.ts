import type { PipelineCoverage } from '@/lib/types/source'

type LogPayload = Record<string, string | number | boolean | undefined>

export function synthesisLog(stage: string, payload: LogPayload): void {
  if (process.env.NODE_ENV === 'production' && process.env.SYNTHESIS_DEBUG !== '1') return

  const parts = Object.entries(payload)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')

  console.log(`[SYNTHESIS] ${stage} ${parts}`)
}

export function logCoverage(coverage: PipelineCoverage): void {
  synthesisLog('coverage', {
    requestedSources: coverage.requestedSourceCount,
    loadedSources: coverage.loadedSourceCount,
    analyzedSources: coverage.analyzedSourceCount,
    synthesizedSources: coverage.synthesizedSourceCount,
    failed: coverage.failedSourceIds.length,
  })
}

export function logSourceAnalysis(
  sourceId: string,
  title: string,
  transcriptChars: number,
  complete: boolean,
): void {
  synthesisLog('source', {
    sourceId,
    title: title.slice(0, 60),
    transcriptChars,
    analysisComplete: complete,
  })
}
