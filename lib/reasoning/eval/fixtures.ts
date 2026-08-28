import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isBenchmarkFixture, loadBenchmarkSources } from '@/lib/reasoning/eval/benchmark-registry'
import { normalizeSourceAnalysis } from '@/lib/types/source'
import type { SourceAnalysis } from '@/lib/types/source'

export type BaselineFixture = {
  id: string
  question: string
  /** Synthesis job for LIVE baseline fixtures with cached transcripts. */
  synthesisJobId?: string
  /** Embedded benchmark sources (evaluation layer only). */
  benchmarkDataKey?: string
  outputLanguage?: 'ko' | 'en'
  /** Re-run coverage pass on cached transcripts before reasoning eval (LIVE only). */
  refreshClaimExtraction?: boolean
  /** When set, only these sources are re-covered (others keep cached analysis). */
  refreshClaimExtractionSourceIds?: string[]
  kind?: 'baseline' | 'benchmark'
}

export function loadBaselineFixture(fixtureId = 'mcp-3video-baseline'): BaselineFixture {
  const path = join(process.cwd(), 'evals', 'fixtures', `${fixtureId}.json`)
  return JSON.parse(readFileSync(path, 'utf8')) as BaselineFixture
}

export function loadFixtureSources(fixture: BaselineFixture): SourceAnalysis[] {
  if (fixture.benchmarkDataKey || isBenchmarkFixture(fixture.id)) {
    const key = fixture.benchmarkDataKey ?? fixture.id
    return loadBenchmarkSources(key as Parameters<typeof loadBenchmarkSources>[0])
  }
  if (!fixture.synthesisJobId) {
    throw new Error(`Fixture ${fixture.id} has no synthesisJobId or benchmarkDataKey`)
  }
  return loadSourcesFromSynthesisJob(fixture.synthesisJobId)
}

export function loadSourcesFromSynthesisJob(jobId: string): SourceAnalysis[] {
  const path = join(process.cwd(), '.data', 'synthesis-jobs', jobId, 'document.json')
  const doc = JSON.parse(readFileSync(path, 'utf8')) as {
    voices: Array<{
      source?: { url?: string }
      analysis?: SourceAnalysis
    }>
  }
  return doc.voices
    .map((v) => {
      const analysis = v.analysis
      if (!analysis) return null
      const normalized = normalizeSourceAnalysis(analysis)
      return normalized
    })
    .filter((a): a is SourceAnalysis => Boolean(a))
}

export function loadSourceUrlsFromSynthesisJob(jobId: string): Map<string, string> {
  const path = join(process.cwd(), '.data', 'synthesis-jobs', jobId, 'document.json')
  const doc = JSON.parse(readFileSync(path, 'utf8')) as {
    voices: Array<{ source?: { sourceId?: string; url?: string } }>
  }
  const map = new Map<string, string>()
  for (const v of doc.voices) {
    if (v.source?.sourceId && v.source.url) map.set(v.source.sourceId, v.source.url)
  }
  return map
}
