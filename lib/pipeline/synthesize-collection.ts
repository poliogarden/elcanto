import { synthesisCollectionKey } from '@/lib/cache/keys'
import { logCacheEvent } from '@/lib/ai/cache-log'
import { buildSynthesisCostSummary, runWithAIContext } from '@/lib/ai/usage/context'
import type { AIUsageRecord } from '@/lib/ai/usage/types'
import { assertSynthesisCoverage } from '@/lib/synthesis/coverage'
import { runKnowledgeExtension } from '@/lib/synthesis/knowledge-extension-engine'
import { synthesisLog } from '@/lib/synthesis/logger'
import { discoverRelationships } from '@/lib/synthesis/relationship-engine'
import {
  runCombinedSynthesisEngine,
  shouldUseCombinedSynthesis,
} from '@/lib/synthesis/combined-synthesis-engine'
import type { SynthesisProgressEvent, SynthesisProgressPhase } from '@/lib/synthesis/progress-events'
import { shouldRetrySynthesisCoverage } from '@/lib/ai/config'
import { attachInsightGraph } from '@/lib/insight-graph/build-insight-graph'
import { enrichSynthesisReport } from '@/lib/synthesis/report-enrichment'
import { SynthesisPerfCollector, type SynthesisPerfSummary } from '@/lib/synthesis/synthesis-perf'
import { createPipelineRunId, logPipeline } from '@/lib/pipeline/pipeline-run-log'
import type { SynthesisMode } from '@/lib/types/synthesis-mode'
import { DEFAULT_SYNTHESIS_MODE, parseSynthesisMode } from '@/lib/types/synthesis-mode'
import { runFourthIdeaEngine } from '@/lib/synthesis/fourth-idea-llm'
import { runSynthesisEngine } from '@/lib/synthesis/synthesis-engine'
import { computeSetAnalysis, toSourceKnowledgeSet } from '@/lib/types/knowledge'
import { getSynthesisUsedSourceIds, type SynthesisResult } from '@/lib/types/analysis'
import type { SourceAnalysis, SourceFailure } from '@/lib/types/source'
import { MemoryCache } from '@/lib/cache/memory'
import { createClient } from '@supabase/supabase-js'
import type { ResolvedOutputLanguage } from '@/lib/i18n/types'

const synthesisCache = new MemoryCache<SynthesisResult>(1000 * 60 * 60 * 24)
const inflightSynthesis = new Map<string, Promise<SynthesizeCollectionResult>>()

export type SynthesizeCollectionInput = {
  question?: string
  sources: SourceAnalysis[]
  failedSources?: SourceFailure[]
  requestId?: string
  synthesisId?: string
  userId?: string
  mode?: SynthesisMode
  outputLanguage?: ResolvedOutputLanguage
  /** When true, skip knowledge extension on critical path (lazy-loaded on result page). */
  deferKnowledgeExtension?: boolean
  onProgress?: (event: SynthesisProgressEvent) => void
}

export type SynthesizeCollectionResult = {
  result: SynthesisResult
  costSummary?: ReturnType<typeof buildSynthesisCostSummary>
  perfSummary?: SynthesisPerfSummary
}

function shuffleSources<T extends { sourceId: string }>(sources: T[]): T[] {
  return [...sources].sort((a, b) => a.sourceId.localeCompare(b.sourceId))
}

function logSynthesisCostSummary(
  summary: ReturnType<typeof buildSynthesisCostSummary>,
): void {
  if (process.env.NODE_ENV === 'production' && process.env.AI_COST_DEBUG !== '1') return

  console.log('[SYNTHESIS COST]')
  console.log(`Videos: ${summary.videoCount}`)
  for (const [op, stats] of Object.entries(summary.byOperation)) {
    const cost =
      stats.costUsd != null && stats.costUsd > 0 ? `$${stats.costUsd.toFixed(4)}` : 'n/a'
    console.log(`${op}: ${stats.calls} calls, ${cost}`)
  }
  if (summary.totalEstimatedCostUsd != null) {
    console.log(`TOTAL: $${summary.totalEstimatedCostUsd.toFixed(4)}`)
  } else {
    console.log('TOTAL: unknown (pricing not configured for some models)')
  }
}

export async function synthesizeCollection(
  input: SynthesizeCollectionInput,
): Promise<SynthesisResult> {
  const wrapped = await synthesizeCollectionWithCost(input)
  return wrapped.result
}

export async function synthesizeCollectionWithCost(
  input: SynthesizeCollectionInput,
): Promise<SynthesizeCollectionResult> {
  const sourceIds = input.sources.map((s) => s.sourceId)
  const cacheKey = synthesisCollectionKey(sourceIds, input.question)
  const inflight = inflightSynthesis.get(cacheKey)
  if (inflight) {
    synthesisLog('synthesis-inflight-join', { inputSources: sourceIds.length })
    return inflight
  }

  const promise = synthesizeCollectionWithCostInner(input, cacheKey)
  inflightSynthesis.set(cacheKey, promise)
  try {
    return await promise
  } finally {
    inflightSynthesis.delete(cacheKey)
  }
}

function emitProgress(
  input: SynthesizeCollectionInput,
  event: SynthesisProgressEvent,
): void {
  input.onProgress?.(event)
}

async function withHeartbeat<T>(
  input: SynthesizeCollectionInput,
  phase: SynthesisProgressPhase,
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now()
  const interval = setInterval(() => {
    emitProgress(input, {
      type: 'heartbeat',
      phase,
      elapsedMs: Date.now() - started,
      message,
    })
  }, 3000)

  try {
    return await fn()
  } finally {
    clearInterval(interval)
  }
}

async function runSynthesisPhase(
  input: SynthesizeCollectionInput,
  orderedSources: SourceAnalysis[],
  sourceIds: string[],
  mode: ReturnType<typeof parseSynthesisMode>,
  perf: SynthesisPerfCollector,
  pipelineRunId: string,
): Promise<{
  graph: import('@/lib/types/relationship').RelationshipGraph
  setAnalysis: import('@/lib/types/knowledge').SetAnalysis
  result: SynthesisResult
}> {
  const useCombined = shouldUseCombinedSynthesis(orderedSources.length)

  if (useCombined) {
    emitProgress(input, { type: 'phase', phase: 'combined_analysis', status: 'start' })
    try {
      const combined = await withHeartbeat(
        input,
        'combined_analysis',
        'Reading across voices and finding relationships…',
        () =>
          perf.time('combined_analysis', () =>
            runCombinedSynthesisEngine({
              question: input.question,
              sources: orderedSources,
              failedSources: input.failedSources,
              mode,
              outputLanguage: input.outputLanguage,
            }),
          ),
      )
      emitProgress(input, { type: 'phase', phase: 'combined_analysis', status: 'complete' })

      let { result, graph, setAnalysis } = combined
      let coverage = assertSynthesisCoverage(sourceIds, getSynthesisUsedSourceIds(result))
      if (!coverage.ok && shouldRetrySynthesisCoverage()) {
        const missingSourceIds = coverage.missingSourceIds
        synthesisLog('combined-synthesis-retry', { missingSources: missingSourceIds.length })
        const retry = await withHeartbeat(
          input,
          'combined_analysis',
          'Ensuring every voice is included…',
          () =>
            perf.time('combined_analysis_retry', () =>
              runCombinedSynthesisEngine({
                question: input.question,
                sources: orderedSources,
                failedSources: input.failedSources,
                missingSourceIds,
                mode,
                outputLanguage: input.outputLanguage,
              }),
            ),
        )
        result = retry.result
        graph = retry.graph
        setAnalysis = retry.setAnalysis
        coverage = assertSynthesisCoverage(sourceIds, getSynthesisUsedSourceIds(result))
      }

      if (!coverage.ok) {
        throw new Error(
          `Combined synthesis did not cover all sources. Missing: ${coverage.missingSourceIds.join(', ')}`,
        )
      }

      return { graph, setAnalysis, result }
    } catch (error) {
      synthesisLog('combined-synthesis-fallback', {
        reason: error instanceof Error ? error.message : 'unknown',
      })
      emitProgress(input, { type: 'phase', phase: 'combined_analysis', status: 'complete', metadata: { fallback: true } })
    }
  }

  emitProgress(input, { type: 'phase', phase: 'relationship', status: 'start' })
  logPipeline(pipelineRunId, 'relationship START')
  const graph = await withHeartbeat(
    input,
    'relationship',
    'Mapping how these voices relate…',
    () => perf.time('relationship_analysis', () => discoverRelationships(orderedSources)),
  )
  emitProgress(input, { type: 'phase', phase: 'relationship', status: 'complete' })

  const knowledge = toSourceKnowledgeSet(orderedSources)
  emitProgress(input, { type: 'phase', phase: 'set_analysis', status: 'start' })
  perf.start('set_analysis')
  const setAnalysis = computeSetAnalysis(knowledge, graph.relationships)
  perf.end('set_analysis', {
    intersections: setAnalysis.intersections.length,
    differences: setAnalysis.differences.length,
  })
  emitProgress(input, { type: 'phase', phase: 'set_analysis', status: 'complete' })

  emitProgress(input, { type: 'phase', phase: 'emergent_insight', status: 'start' })
  logPipeline(pipelineRunId, 'emergent_insight START')
  let result = await withHeartbeat(
    input,
    'emergent_insight',
    'Discovering what emerges across these voices…',
    () =>
      perf.time('emergent_insight', () =>
        runSynthesisEngine({
          question: input.question,
          sources: orderedSources,
          graph,
          setAnalysis,
          failedSources: input.failedSources,
          mode,
          outputLanguage: input.outputLanguage,
        }),
      ),
  )

  let coverage = assertSynthesisCoverage(sourceIds, getSynthesisUsedSourceIds(result))
  if (!coverage.ok && shouldRetrySynthesisCoverage()) {
    const missingSourceIds = coverage.missingSourceIds
    synthesisLog('synthesis-retry', { missingSources: missingSourceIds.length })
    result = await perf.time('emergent_insight_retry', () =>
      runSynthesisEngine({
        question: input.question,
        sources: orderedSources,
        graph,
        setAnalysis,
        failedSources: input.failedSources,
        missingSourceIds,
        mode,
        outputLanguage: input.outputLanguage,
      }),
    )
    coverage = assertSynthesisCoverage(sourceIds, getSynthesisUsedSourceIds(result))
  }
  emitProgress(input, { type: 'phase', phase: 'emergent_insight', status: 'complete' })

  if (!coverage.ok) {
    throw new Error(
      `Synthesis did not cover all sources. Missing: ${coverage.missingSourceIds.join(', ')}`,
    )
  }

  return { graph, setAnalysis, result }
}

async function runFourthIdeaPhase(
  input: SynthesizeCollectionInput,
  orderedSources: SourceAnalysis[],
  graph: import('@/lib/types/relationship').RelationshipGraph,
  setAnalysis: import('@/lib/types/knowledge').SetAnalysis,
  result: SynthesisResult,
  perf: SynthesisPerfCollector,
  pipelineRunId: string,
): Promise<SynthesisResult> {
  emitProgress(input, { type: 'phase', phase: 'fourth_idea', status: 'start' })
  logPipeline(pipelineRunId, 'fourth_idea START')
  const enriched = await withHeartbeat(
    input,
    'fourth_idea',
    'Generating the insight only visible across these voices…',
    () =>
      perf.time('fourth_idea', () =>
        runFourthIdeaEngine({
          sources: orderedSources,
          graph,
          setAnalysis,
          result,
          outputLanguage: input.outputLanguage,
        }),
      ),
  )
  emitProgress(input, { type: 'phase', phase: 'fourth_idea', status: 'complete' })
  return enriched
}

async function synthesizeCollectionWithCostInner(
  input: SynthesizeCollectionInput,
  cacheKey: string,
): Promise<SynthesizeCollectionResult> {
  const costAccumulator: AIUsageRecord[] = []
  const perf = new SynthesisPerfCollector()
  const pipelineRunId = createPipelineRunId()

  return runWithAIContext(
    {
      requestId: input.requestId,
      synthesisId: input.synthesisId,
      userId: input.userId,
      costAccumulator,
    },
    async () => {
      const sourceIds = input.sources.map((s) => s.sourceId)
      logPipeline(pipelineRunId, 'START', {
        synthesisId: input.synthesisId,
        sources: sourceIds.length,
        requestId: input.requestId,
      })
      perf.start('total')

      const cached = synthesisCache.get(cacheKey)
      if (cached?.setAnalysis && cached?.knowledge) {
        synthesisLog('synthesis-cache-hit', { inputSources: sourceIds.length })
        logCacheEvent({ layer: 'SYNTHESIS', key: cacheKey, result: 'HIT' })
        const result = cached.insightGraph
          ? cached
          : attachInsightGraph(cached, input.sources)
        perf.end('total', { cache: 'memory' })
        const costSummary = buildSynthesisCostSummary(costAccumulator, input.sources.length)
        const perfSummary = perf.summary(costSummary.records, undefined, pipelineRunId)
        logPipeline(pipelineRunId, 'END', { cache: 'memory', wallMs: perfSummary.totalMs })
        perf.log(perfSummary, costSummary.records)
        return { result, costSummary, perfSummary }
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data } = await supabase
          .from('synthesis_results')
          .select('result')
          .eq('collection_hash', cacheKey)
          .maybeSingle()

        if (data?.result) {
          const cachedResult = data.result as SynthesisResult
          if (cachedResult.setAnalysis && cachedResult.knowledge) {
            const result = cachedResult.insightGraph
              ? cachedResult
              : attachInsightGraph(cachedResult, input.sources)
            synthesisCache.set(cacheKey, result)
            logCacheEvent({ layer: 'SYNTHESIS', key: cacheKey, result: 'HIT' })
            perf.end('total', { cache: 'db' })
            const costSummary = buildSynthesisCostSummary(costAccumulator, input.sources.length)
            const perfSummary = perf.summary(costSummary.records, undefined, pipelineRunId)
            logPipeline(pipelineRunId, 'END', { cache: 'db', wallMs: perfSummary.totalMs })
            perf.log(perfSummary, costSummary.records)
            return { result, costSummary, perfSummary }
          }
        }
      }

      logCacheEvent({ layer: 'SYNTHESIS', key: cacheKey, result: 'MISS' })

      const orderedSources = shuffleSources(input.sources)
      const mode = parseSynthesisMode(input.mode ?? DEFAULT_SYNTHESIS_MODE)

      const { graph, setAnalysis, result: synthesized } = await runSynthesisPhase(
        input,
        orderedSources,
        sourceIds,
        mode,
        perf,
        pipelineRunId,
      )

      let result = await runFourthIdeaPhase(
        input,
        orderedSources,
        graph,
        setAnalysis,
        synthesized,
        perf,
        pipelineRunId,
      )

      const deferExtension = input.deferKnowledgeExtension !== false
      if (deferExtension) {
        perf.end('knowledge_extension', { deferred: true })
      } else {
        const extension = await perf.time('knowledge_extension', () =>
          runKnowledgeExtension(orderedSources, setAnalysis, result),
        )
        result = {
          ...result,
          knowledge: {
            gaps: extension.gaps,
            recommendations: extension.recommendations,
            rejectedInsights: [
              ...result.knowledge.rejectedInsights,
              ...extension.rejectedInsights,
            ],
          },
        }
      }

      result = enrichSynthesisReport({
        sources: orderedSources,
        graph,
        setAnalysis,
        result,
      })

      emitProgress(input, { type: 'phase', phase: 'insight_map', status: 'start' })
      result = await perf.time('insight_map', () =>
        Promise.resolve(attachInsightGraph(result, orderedSources)),
      )
      emitProgress(input, { type: 'phase', phase: 'insight_map', status: 'complete' })

      const coverage = assertSynthesisCoverage(sourceIds, getSynthesisUsedSourceIds(result))

      synthesisLog('synthesis-complete', {
        inputSources: sourceIds.length,
        usedSources: getSynthesisUsedSourceIds(result).length,
        synthesisType: result.synthesis.synthesisType,
        gaps: result.knowledge.gaps.length,
        recommendations: result.knowledge.recommendations.length,
        missingSources: coverage.ok ? 0 : coverage.missingSourceIds.length,
        fourthIdeaSources: result.fourthIdea?.sourceIds.length ?? 0,
        avgCoverage:
          orderedSources.length > 0
            ? (
                orderedSources.reduce((n, s) => n + (s.coverage?.coverageRatio ?? 0), 0) /
                orderedSources.length
              ).toFixed(2)
            : 0,
      })

      if (!coverage.ok) {
        throw new Error(
          `Synthesis did not cover all sources. Missing: ${coverage.missingSourceIds.join(', ')}`,
        )
      }

      synthesisCache.set(cacheKey, result)

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        emitProgress(input, { type: 'phase', phase: 'db_save', status: 'start' })
        await perf.time('db_save', async () => {
          await supabase.from('synthesis_results').upsert({
            collection_hash: cacheKey,
            result,
            cached_at: new Date().toISOString(),
          })
        })
        emitProgress(input, { type: 'phase', phase: 'db_save', status: 'complete' })
      }

      const costSummary = buildSynthesisCostSummary(costAccumulator, orderedSources.length)
      logSynthesisCostSummary(costSummary)
      perf.end('total')
      const perfSummary = perf.summary(costSummary.records, undefined, pipelineRunId)
      logPipeline(pipelineRunId, 'END', {
        wallMs: perfSummary.totalMs,
        stagesMs: perfSummary.stagesMs,
        llmCalls: perfSummary.llmCalls,
      })
      perf.log(perfSummary, costSummary.records)

      return { result, costSummary, perfSummary }
    },
  )
}
