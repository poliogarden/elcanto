import { AI_CONFIG, maxDeepSectionsForAnalysis } from '@/lib/ai/config'
import { getAIProvider } from '@/lib/ai/openai'
import { logCacheBatch } from '@/lib/ai/cache-log'
import {
  getCachedAnalysis,
  getCachedTranscript,
  markAnalysisFailed,
  setCachedAnalysis,
  setCachedTranscript,
  tryAcquireAnalysisLock,
  waitForCachedAnalysis,
} from '@/lib/repositories/video-cache'
import type { Source, SourceAnalysis, SourceFailure } from '@/lib/types/source'
import { logSourceAnalysis, synthesisLog } from '@/lib/synthesis/logger'
import { chunkTranscript, normalizeTranscript } from '@/lib/youtube/transcript'
import { getTranscriptProvider } from '@/lib/youtube/youtube-transcript-provider'
import { mapWithConcurrency } from '@/lib/utils/concurrency'
import {
  buildTranscriptSections,
  transcriptDurationSeconds,
} from '@/lib/pipeline/section-builder'
import { runCoveragePass, runDeepSectionAnalysis } from '@/lib/pipeline/hierarchical-analyze'
import {
  mergeHierarchicalAnalysis,
  selectSectionsForDeepAnalysis,
} from '@/lib/pipeline/video-knowledge-merge'
import { ANALYSIS_SCHEMA_VERSION, ANALYSIS_VERSION } from '@/lib/ai/config'
import { logAnalyzeDebug } from '@/lib/pipeline/analyze-debug-log'
import { logVideoAnalyzeTiming, type VideoAnalyzeTiming } from '@/lib/pipeline/analyze-timing'

const inflightAnalysis = new Map<string, Promise<AnalyzeSourceOutcome>>()

export type AnalyzeSourceOutcome =
  | {
      ok: true
      analysis: SourceAnalysis
      transcriptChars: number
      fromCache?: boolean
      timing?: VideoAnalyzeTiming
    }
  | { ok: false; failure: SourceFailure; transcriptChars: number; timing?: VideoAnalyzeTiming }

async function analyzeHierarchical(
  source: Source,
  segments: ReturnType<typeof normalizeTranscript>,
): Promise<SourceAnalysis> {
  const sections = buildTranscriptSections(segments)
  const duration = transcriptDurationSeconds(segments)
  const ai = getAIProvider()

  if (sections.length <= 2) {
    const chunks = chunkTranscript(segments, AI_CONFIG.maxSectionChars)
    const analysis = await ai.analyzeSource({
      source,
      transcript: chunks.map((c) => ({ start: c.start, text: c.text })),
      operation: 'VIDEO_ANALYSIS',
    })

    const sectionKnowledge = sections.map((s, i) => ({
      sectionId: s.sectionId,
      startTime: s.startTime,
      endTime: s.endTime,
      topic: analysis.topics[i] ?? `section ${i + 1}`,
      summary: analysis.summary,
      claims: analysis.claims.slice(0, 6).map((c) => ({
        id: c.id,
        statement: c.statement,
        topic: c.topic,
        confidence: c.confidence,
      })),
      entities: analysis.entities.slice(0, 6),
      importanceScore: 0.8,
      noveltyScore: 0.5,
      argumentDensity: 0.6,
      evidenceDensity: 0.6,
      deepAnalyzed: true,
    }))

    return {
      ...analysis,
      coverage: {
        transcriptDurationSeconds: duration,
        analyzedDurationSeconds: duration,
        coverageRatio: 1,
        sectionCount: sections.length || 1,
        coverageSectionCount: sections.length || 1,
        deepAnalyzedSectionCount: sections.length || 1,
        transcriptCharCount: segments.reduce((n, s) => n + s.text.length, 0),
        analyzedCharCount: segments.reduce((n, s) => n + s.text.length, 0),
      },
      videoKnowledge: {
        sections: sectionKnowledge,
        coverage: {
          transcriptDurationSeconds: duration,
          analyzedDurationSeconds: duration,
          coverageRatio: 1,
          sectionCount: sections.length || 1,
          coverageSectionCount: sections.length || 1,
          deepAnalyzedSectionCount: sections.length || 1,
        },
        analysisVersion: ANALYSIS_VERSION,
        schemaVersion: ANALYSIS_SCHEMA_VERSION,
      },
    }
  }

  const { sections: coverageSections, failedSectionIds } = await runCoveragePass({
    source,
    sections,
  })

  const deepTargets = selectSectionsForDeepAnalysis(
    coverageSections,
    maxDeepSectionsForAnalysis(),
  )
  const deepIdSet = new Set(deepTargets.map((s) => s.sectionId))

  const sectionById = new Map(sections.map((s) => [s.sectionId, s]))
  const deepPartials = await mapWithConcurrency(deepTargets, AI_CONFIG.maxConcurrency, async (target) => {
    const raw = sectionById.get(target.sectionId)
    if (!raw) return null
    return runDeepSectionAnalysis({
      source,
      section: target,
      transcriptText: raw.text,
    })
  })

  const markedSections = coverageSections.map((s) => ({
    ...s,
    text: sectionById.get(s.sectionId)?.text ?? s.text,
    deepAnalyzed: deepIdSet.has(s.sectionId),
  }))

  return mergeHierarchicalAnalysis({
    base: source,
    sections: markedSections,
    deepPartials: deepPartials.filter((p): p is SourceAnalysis => p != null),
    coverageSectionCount: coverageSections.length,
    failedSectionIds,
    transcriptDurationSeconds: duration,
  })
}

async function analyzeOneSourceInner(source: Source): Promise<AnalyzeSourceOutcome> {
  const wallStart = Date.now()
  const timing: Omit<VideoAnalyzeTiming, 'analysisEndMs' | 'durationMs'> = {
    videoId: source.videoId,
    sourceId: source.sourceId,
    title: source.title,
    analysisStartMs: wallStart,
    fromCache: false,
    transcriptCacheMs: 0,
    transcriptFetchMs: 0,
    normalizationMs: 0,
    openaiAnalysisMs: 0,
    storageMs: 0,
    lockWaitMs: 0,
    transcriptChars: 0,
    inputTokens: null,
    outputTokens: null,
    model: null,
  }

  function finish<T extends AnalyzeSourceOutcome>(outcome: T): T {
    const analysisEndMs = Date.now()
    const profile: VideoAnalyzeTiming = {
      ...timing,
      analysisEndMs,
      durationMs: analysisEndMs - wallStart,
      transcriptChars: outcome.transcriptChars,
      fromCache: outcome.ok ? Boolean(outcome.fromCache) : timing.fromCache,
    }
    logVideoAnalyzeTiming(profile)
    return { ...outcome, timing: profile }
  }

  const debugBase = {
    videoId: source.videoId,
    title: source.title,
    metadataSuccess: true,
    transcriptSuccess: false,
    transcriptLength: 0,
    transcriptLanguage: null as string | null,
    transcriptSource: 'none' as const,
    isAnalyzable: false,
    failureReason: null as string | null,
  }

  const cached = await getCachedAnalysis(source.videoId)
  if (cached) {
    const normalized = cached.claims?.length
      ? cached
      : {
          ...cached,
          claims: (cached.mainClaims ?? []).map((statement, i) => ({
            id: `${source.sourceId}_claim_${i + 1}`,
            sourceId: source.sourceId,
            statement,
            topic: cached.keyTopics?.[0] ?? 'general',
            confidence: 0.7,
          })),
        }
    if (normalized.sourceId || normalized.mainClaims || normalized.claims?.length) {
      logSourceAnalysis(source.sourceId, source.title, 0, true)
      logAnalyzeDebug({
        ...debugBase,
        transcriptSuccess: true,
        transcriptSource: 'cache',
        isAnalyzable: true,
        failureReason: null,
        stage: 'analysis_cache_hit',
        fromCache: true,
      })
      return finish({
        ok: true,
        analysis: {
          ...normalized,
          sourceId: source.sourceId,
          voiceIndex: source.voiceIndex,
          title: source.title,
        },
        transcriptChars: 0,
        fromCache: true,
      })
    }
  }

  const lockWaitStart = Date.now()
  const lockAcquired = await tryAcquireAnalysisLock(source.videoId)
  timing.lockWaitMs = Date.now() - lockWaitStart
  if (!lockAcquired) {
    const waited = await waitForCachedAnalysis(source.videoId)
    if (waited) {
      logAnalyzeDebug({
        ...debugBase,
        transcriptSuccess: true,
        transcriptSource: 'cache',
        isAnalyzable: true,
        failureReason: null,
        stage: 'analysis_lock_wait_hit',
        fromCache: true,
      })
      return finish({
        ok: true,
        analysis: {
          ...waited,
          sourceId: source.sourceId,
          voiceIndex: source.voiceIndex,
          title: source.title,
        },
        transcriptChars: 0,
        fromCache: true,
      })
    }
  }

  const transcriptCacheStart = Date.now()
  let segments = await getCachedTranscript(source.videoId)
  timing.transcriptCacheMs = Date.now() - transcriptCacheStart
  let transcriptChars = 0
  let transcriptSource: 'cache' | 'fetch' = 'cache'

  if (!segments) {
    transcriptSource = 'fetch'
    logCacheBatch(source.videoId, { transcript: 'MISS' })
    const fetchStart = Date.now()
    const transcriptResult = await getTranscriptProvider().getTranscript(source.videoId)
    timing.transcriptFetchMs = Date.now() - fetchStart
    if (!transcriptResult.ok) {
      const failureReason = transcriptResult.message
      logAnalyzeDebug({
        ...debugBase,
        transcriptSuccess: false,
        transcriptSource: 'fetch',
        isAnalyzable: false,
        failureReason,
        stage: 'transcript_fetch',
        failureCode: transcriptResult.code,
      })
      await markAnalysisFailed(source.videoId)
      return finish({
        ok: false,
        transcriptChars: 0,
        failure: {
          sourceId: source.sourceId,
          videoId: source.videoId,
          title: source.title,
          code: transcriptResult.code,
          message:
            transcriptResult.code === 'unavailable' || transcriptResult.code === 'disabled'
              ? 'TRANSCRIPT UNAVAILABLE'
              : transcriptResult.message,
        },
      })
    }
    const normStart = Date.now()
    segments = normalizeTranscript(transcriptResult.segments)
    timing.normalizationMs = Date.now() - normStart
    await setCachedTranscript(source.videoId, segments, transcriptResult.language)
    debugBase.transcriptLanguage = transcriptResult.language ?? null
    logCacheBatch(source.videoId, { transcript: 'MISS' })
  }

  transcriptChars = segments.reduce((acc, s) => acc + s.text.length, 0)
  const normalizedSegmentCount = segments.length

  if (segments.length === 0) {
    logAnalyzeDebug({
      ...debugBase,
      transcriptSuccess: false,
      transcriptLength: transcriptChars,
      transcriptSource,
      isAnalyzable: false,
      failureReason: 'normalized_transcript_empty',
      stage: 'transcript_normalize',
      normalizedSegmentCount: 0,
    })
    await markAnalysisFailed(source.videoId)
    return finish({
      ok: false,
      transcriptChars,
      failure: {
        sourceId: source.sourceId,
        videoId: source.videoId,
        title: source.title,
        code: 'unavailable',
        message: 'TRANSCRIPT UNAVAILABLE',
      },
    })
  }

  try {
    const llmStart = Date.now()
    const analysis = await analyzeHierarchical(source, segments)
    timing.openaiAnalysisMs = Date.now() - llmStart
    if (analysis.videoKnowledge) {
      analysis.videoKnowledge.analysisVersion = ANALYSIS_VERSION
      analysis.videoKnowledge.schemaVersion = ANALYSIS_SCHEMA_VERSION
    }

    const storageStart = Date.now()
    await setCachedAnalysis(source.videoId, analysis)
    timing.storageMs = Date.now() - storageStart
    logSourceAnalysis(source.sourceId, source.title, transcriptChars, true)
    logAnalyzeDebug({
      ...debugBase,
      transcriptSuccess: true,
      transcriptLength: transcriptChars,
      transcriptSource,
      isAnalyzable: true,
      failureReason: null,
      stage: 'openai_analysis_complete',
      normalizedSegmentCount,
    })
    synthesisLog('video-knowledge-complete', {
      videoId: source.videoId,
      sections: analysis.coverage?.sectionCount ?? 0,
      coverageRatio: analysis.coverage?.coverageRatio ?? 0,
      claims: analysis.claims.length,
      deepSections: analysis.coverage?.deepAnalyzedSectionCount ?? 0,
    })

    return finish({ ok: true, analysis, transcriptChars })
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : 'Analysis failed.'
    logAnalyzeDebug({
      ...debugBase,
      transcriptSuccess: true,
      transcriptLength: transcriptChars,
      transcriptSource,
      isAnalyzable: false,
      failureReason,
      stage: 'openai_analysis',
      normalizedSegmentCount,
      failureCode: 'openai_error',
    })
    await markAnalysisFailed(source.videoId)
    throw error
  }
}

export async function analyzeOneSource(source: Source): Promise<AnalyzeSourceOutcome> {
  const inflight = inflightAnalysis.get(source.videoId)
  if (inflight) return inflight

  const promise = analyzeOneSourceInner(source)
  inflightAnalysis.set(source.videoId, promise)
  try {
    return await promise
  } finally {
    inflightAnalysis.delete(source.videoId)
  }
}

export type AnalyzeAllSourcesResult = {
  analyses: SourceAnalysis[]
  failures: SourceFailure[]
}

export async function analyzeAllSources(sources: Source[]): Promise<AnalyzeAllSourcesResult> {
  synthesisLog('analyze-start', { requestedSources: sources.length })

  const outcomes = await mapWithConcurrency(sources, AI_CONFIG.maxConcurrency, async (source) =>
    analyzeOneSource(source),
  )

  const analyses: SourceAnalysis[] = []
  const failures: SourceFailure[] = []

  for (const outcome of outcomes) {
    if (outcome.ok) {
      analyses.push(outcome.analysis)
    } else {
      failures.push(outcome.failure)
      logSourceAnalysis(outcome.failure.sourceId, outcome.failure.title, outcome.transcriptChars, false)
    }
  }

  synthesisLog('analyze-complete', {
    analyzedSources: analyses.length,
    failedSources: failures.length,
    avgCoverage:
      analyses.length > 0
        ? (
            analyses.reduce((n, a) => n + (a.coverage?.coverageRatio ?? 0), 0) / analyses.length
          ).toFixed(2)
        : 0,
  })

  return { analyses, failures }
}

export { AI_CONFIG }
