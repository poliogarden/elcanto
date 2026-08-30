import { AI_CONFIG, getModelForRole } from '@/lib/ai/config'
import { runWithAIContext, buildSynthesisCostSummary } from '@/lib/ai/usage/context'
import type { AIUsageRecord } from '@/lib/ai/usage/types'
import { analyzeOneSource } from '@/lib/pipeline/analyze-source'
import { buildProductionPipelineDiagnostics } from '@/lib/production/build-pipeline-diagnostics'
import { buildDirectProductionDiagnostics } from '@/lib/production/build-direct-diagnostics'
import {
  DIRECT_SYNTHESIS_ENGINE_VERSION,
  resolveProductionReasoningEngine,
} from '@/lib/direct-synthesis/engine-config'
import { runDirectSynthesisPipeline } from '@/lib/direct-synthesis/pipeline'
import { toPersistedDirectSynthesis } from '@/lib/direct-synthesis/persisted'
import { runReasoningPipeline } from '@/lib/reasoning/pipeline'
import { REASONING_V2_ENGINE_VERSION } from '@/lib/reasoning/v2/engine-config'
import { runSingleSourceReasoning } from '@/lib/reasoning/single-source'
import { SynthesisPerfCollector } from '@/lib/synthesis/synthesis-perf'
import type { ReasoningProgressPhase } from '@/lib/reasoning/types'
import type { SynthesisJobPhase } from '@/lib/synthesis/synthesis-job-types'
import {
  loadSynthesisJob,
  tryClaimSynthesisJob,
  updateSynthesisJob,
} from '@/lib/synthesis/synthesis-job-repository'
import {
  createSynthesisDocument,
  type SynthesisDocument,
} from '@/lib/types/synthesis-document'
import {
  resolveDraftSynthesisMode,
} from '@/lib/types/synthesis-draft'
import {
  hasUserSubmittedQuestion,
  isGenericCentralQuestion,
  resolveJobCentralQuestion,
} from '@/lib/synthesis/resolve-central-question'
import type { SourceAnalysis, SourceFailure } from '@/lib/types/source'
import { createSourceId } from '@/lib/types/source'
import { normalizeDraftVoice } from '@/lib/voice/normalize-voice'
import { mapWithConcurrency } from '@/lib/utils/concurrency'
import { synthesisLog } from '@/lib/synthesis/logger'

const inflightRunners = new Set<string>()

export async function runSynthesisJob(jobId: string): Promise<void> {
  if (inflightRunners.has(jobId)) return
  inflightRunners.add(jobId)

  try {
    const claimed = await tryClaimSynthesisJob(jobId)
    if (!claimed) {
      synthesisLog('synthesis-job-skip', { jobId, reason: 'not-queued' })
      return
    }

    const requestId = crypto.randomUUID()
    const analyzeStartedAt = Date.now()
    const costAccumulator: AIUsageRecord[] = []
    const perf = new SynthesisPerfCollector()
    perf.start('total')

    await runWithAIContext(
      { requestId, synthesisId: claimed.synthesisId, costAccumulator },
      async () => {
        let document = createSynthesisDocument(claimed.synthesisId, claimed.draft.voices)
        document.mode = resolveDraftSynthesisMode(claimed.draft)
        let centralQuestion = resolveJobCentralQuestion(claimed.draft)
        if (hasUserSubmittedQuestion(claimed.draft)) {
          document = {
            ...document,
            userQuestion: centralQuestion,
            topic: centralQuestion,
          }
        }
        document.status = 'analyzing'

        await updateSynthesisJob(jobId, {
          status: 'running',
          phase: 'analyzing',
          analyzeCompleted: 0,
          analyzeTotal: document.voices.length,
          document,
        })

        const voiceTotal = document.voices.length
        const failures: SourceFailure[] = []
        const analyses: SourceAnalysis[] = []

        let updateChain = Promise.resolve()

        const enqueueDocumentUpdate = (
          fn: () => Promise<void>,
        ): Promise<void> => {
          updateChain = updateChain.then(fn)
          return updateChain
        }

        perf.start('individual_analysis')

        await mapWithConcurrency(
          document.voices,
          AI_CONFIG.maxAnalyzeConcurrency,
          async (entry, index) => {
            const normalized = normalizeDraftVoice({
              id: entry.voice.id,
              n: entry.voice.n,
              youtubeId: entry.voice.youtubeId,
              url: entry.voice.url,
              title: entry.voice.title,
              channel: entry.voice.channel,
              thumbnail: entry.voice.thumbnail,
              duration: entry.voice.duration,
              durationSeconds: entry.voice.durationSeconds,
            })

            if (!normalized) {
              failures.push({
                sourceId: createSourceId(entry.voice.n || index + 1),
                videoId: entry.voice.youtubeId,
                title: entry.voice.title,
                code: 'invalid',
                message: 'Invalid video metadata.',
              })
              await enqueueDocumentUpdate(async () => {
                const current = await loadSynthesisJob(jobId)
                if (!current?.document) return
                const voices = [...current.document.voices]
                voices[index] = {
                  ...voices[index],
                  error: 'Invalid video metadata.',
                  voice: { ...voices[index].voice, status: 'failed' },
                }
                const analyzeCompleted = voices.filter((v) => v.analysis || v.error).length
                document = { ...current.document, voices }
                await updateSynthesisJob(jobId, {
                  phase: 'analyzing',
                  analyzeCompleted,
                  analyzeTotal: voiceTotal,
                  document,
                })
              })
              return
            }

            const outcome = await analyzeOneSource({
              sourceId: createSourceId(normalized.n),
              videoId: normalized.youtubeId,
              voiceIndex: normalized.n,
              title: normalized.title,
              channel: normalized.channel,
              url: normalized.url,
            })

            if (outcome.ok) {
              analyses.push(outcome.analysis)
            } else {
              failures.push(outcome.failure)
            }

            await enqueueDocumentUpdate(async () => {
              const current = await loadSynthesisJob(jobId)
              if (!current?.document) return
              const voices = [...current.document.voices]
              if (outcome.ok) {
                voices[index] = {
                  ...voices[index],
                  analysis: outcome.analysis,
                  voice: { ...voices[index].voice, status: 'done' },
                }
              } else {
                voices[index] = {
                  ...voices[index],
                  error: outcome.failure.message,
                  failure: outcome.failure,
                  voice: { ...voices[index].voice, status: 'failed' },
                }
              }
              const analyzeCompleted = voices.filter((v) => v.analysis || v.error).length
              document = { ...current.document, voices }
              await updateSynthesisJob(jobId, {
                phase: 'analyzing',
                analyzeCompleted,
                analyzeTotal: voiceTotal,
                document,
              })
            })
          },
        )

        await updateChain

        perf.end('individual_analysis')
        analyses.sort((a, b) => a.voiceIndex - b.voiceIndex)

        const latest = await loadSynthesisJob(jobId)
        if (latest?.document) document = latest.document

        if (analyses.length < 1) {
          throw new Error('No voices could be analyzed. Check transcript availability.')
        }

        document = { ...document, status: 'synthesizing' }
        await updateSynthesisJob(jobId, {
          phase: 'connecting',
          document,
        })

        const individualAnalysisMs = Date.now() - analyzeStartedAt
        const outputLanguage = claimed.draft.outputLanguage
        const reasoningEngine = resolveProductionReasoningEngine(
          process.env.ELCANTO_REASONING_ENGINE,
        )

        if (analyses.length >= 1) {
          document = {
            ...document,
            status: 'synthesizing',
            survivalProgressPhase: 'claims',
          }
          await updateSynthesisJob(jobId, {
            phase: 'connecting',
            document,
          })

          if (reasoningEngine === 'direct') {
            centralQuestion = resolveJobCentralQuestion(claimed.draft, document)
            if (!isGenericCentralQuestion(centralQuestion)) {
              document = {
                ...document,
                userQuestion: centralQuestion,
                topic: centralQuestion,
              }
            }
            const directRun = await perf.time('reasoning', async () => {
              await updateSynthesisJob(jobId, {
                phase: 'synthesizing',
                document: {
                  ...document,
                  survivalProgressPhase: 'synthesis',
                },
              })
              return runDirectSynthesisPipeline({
                centralQuestion,
                sources: analyses,
                outputLanguage: outputLanguage ?? undefined,
              })
            })

            const directSynthesis = toPersistedDirectSynthesis(directRun)
            const diagnostics = buildDirectProductionDiagnostics({
              document,
              direct: directSynthesis,
            })
            const costSummary = buildSynthesisCostSummary(costAccumulator, analyses.length)
            perf.end('total')
            const perfSummary = perf.summary(costAccumulator, {
              cached: 0,
              uncached: analyses.length,
            })
            perfSummary.individualAnalysisMs = individualAnalysisMs
            perfSummary.endToEndMs = Date.now() - analyzeStartedAt

            const finalDoc: SynthesisDocument = {
              ...document,
              status: 'complete',
              reasoningEngine: 'direct',
              directSynthesis,
              topic: directSynthesis.directAnswer.slice(0, 200),
              userQuestion: isGenericCentralQuestion(centralQuestion)
                ? document.userQuestion
                : centralQuestion,
              productionMeta: {
                reasoningEngine: 'direct',
                reasoningEngineVersion: DIRECT_SYNTHESIS_ENGINE_VERSION,
                analysisVersion: AI_CONFIG.analysisVersion,
                analysisSchemaVersion: AI_CONFIG.analysisSchemaVersion,
                analysisModel: getModelForRole('analysis'),
                synthesisModel: getModelForRole('synthesis'),
                pipelineRunAt: new Date().toISOString(),
                analyzedCount: analyses.length,
                failedCount: failures.length,
                requestedCount: voiceTotal,
                diagnostics,
                costSummary,
                perfSummary,
              },
            }

            await updateSynthesisJob(jobId, {
              status: 'completed',
              phase: 'complete',
              document: finalDoc,
              perfSummary,
              completedAt: new Date().toISOString(),
              error: undefined,
            })

            synthesisLog('direct-synthesis-job-complete', {
              jobId,
              synthesisId: claimed.synthesisId,
              voices: voiceTotal,
              analyzed: analyses.length,
              agreements: directSynthesis.agreements.length,
              disagreements: directSynthesis.disagreements.length,
              llmCalls: directRun.cost.llmCalls,
            })
            return
          }

          // Legacy V2.2 — only when ELCANTO_REASONING_ENGINE=legacy-v2
          if (analyses.length >= 2) {
            const voiceMeta = document.voices
              .filter((v) => v.analysis)
              .map((v) => ({ channel: v.voice.channel, thumbnail: v.voice.thumbnail }))

            const reasoning = await perf.time('reasoning', () =>
              runReasoningPipeline({
                sources: analyses,
                voices: voiceMeta,
                userQuestion: centralQuestion,
                outputLanguage: outputLanguage ?? undefined,
                onProgress: (event) => {
                  if (event.type === 'phase') {
                    const phaseMap: Partial<
                      Record<ReasoningProgressPhase, typeof document.survivalProgressPhase>
                    > = {
                      source_ingest: 'coherence',
                      clustering: 'coherence',
                      alignment: 'claims',
                      relationships: 'relationships',
                      verification: 'verification',
                      patterns: 'synthesis',
                      synthesis: 'synthesis',
                      judgment: 'synthesis',
                      emergent: 'synthesis',
                      critic: 'synthesis',
                    }
                    const jobPhase =
                      event.phase === 'source_ingest' || event.phase === 'clustering'
                        ? 'connecting'
                        : event.phase === 'relationships' || event.phase === 'verification'
                          ? 'connecting'
                          : 'synthesizing'

                    if (event.status === 'start') {
                      void updateSynthesisJob(jobId, {
                        phase: jobPhase,
                        document: {
                          ...document,
                          status: 'synthesizing',
                          survivalProgressPhase: phaseMap[event.phase] ?? 'synthesis',
                        },
                      })
                    }
                  }
                },
              }),
            )

            const diagnostics = buildProductionPipelineDiagnostics({ document, reasoning })
            const costSummary = buildSynthesisCostSummary(costAccumulator, analyses.length)
            perf.end('total')
            const perfSummary = perf.summary(costAccumulator, {
              cached: 0,
              uncached: analyses.length,
            })
            perfSummary.individualAnalysisMs = individualAnalysisMs
            perfSummary.endToEndMs = Date.now() - analyzeStartedAt

            const finalDoc: SynthesisDocument = {
              ...document,
              status: 'complete',
              reasoningEngine: 'legacy-v2',
              reasoning,
              topic: reasoning.judgment?.statement ?? reasoning.centralQuestion,
              userQuestion: document.userQuestion ?? centralQuestion,
              productionMeta: {
                reasoningEngine: 'legacy-v2',
                reasoningEngineVersion: reasoning.version ?? REASONING_V2_ENGINE_VERSION,
                analysisVersion: AI_CONFIG.analysisVersion,
                analysisSchemaVersion: AI_CONFIG.analysisSchemaVersion,
                analysisModel: getModelForRole('analysis'),
                synthesisModel: getModelForRole('synthesis'),
                pipelineRunAt: new Date().toISOString(),
                analyzedCount: analyses.length,
                failedCount: failures.length,
                requestedCount: voiceTotal,
                diagnostics,
                costSummary,
                perfSummary,
              },
            }

            await updateSynthesisJob(jobId, {
              status: 'completed',
              phase: 'complete',
              document: finalDoc,
              perfSummary,
              completedAt: new Date().toISOString(),
              error: undefined,
            })

            synthesisLog('reasoning-job-complete', {
              jobId,
              synthesisId: claimed.synthesisId,
              voices: voiceTotal,
              analyzed: analyses.length,
              relationships: reasoning.relationships.length,
              patterns: reasoning.patterns.length,
              insights: reasoning.insights.length,
              excluded: reasoning.excludedSources.length,
            })
            return
          }

          if (analyses.length === 1) {
            const single = runSingleSourceReasoning({ source: analyses[0] })
            const costSummary = buildSynthesisCostSummary(costAccumulator, 1)
            perf.end('total')
            const perfSummary = perf.summary(costAccumulator, { cached: 0, uncached: 1 })
            perfSummary.individualAnalysisMs = individualAnalysisMs
            perfSummary.endToEndMs = Date.now() - analyzeStartedAt

            const finalDoc: SynthesisDocument = {
              ...document,
              status: 'complete',
              reasoningEngine: 'legacy-v2',
              reasoning: single,
              topic: single.keyInsight ?? single.summary,
              userQuestion: document.userQuestion ?? centralQuestion,
              productionMeta: {
                reasoningEngine: 'legacy-v2',
                reasoningEngineVersion: single.version ?? REASONING_V2_ENGINE_VERSION,
                analysisVersion: AI_CONFIG.analysisVersion,
                analysisSchemaVersion: AI_CONFIG.analysisSchemaVersion,
                analysisModel: getModelForRole('analysis'),
                pipelineRunAt: new Date().toISOString(),
                analyzedCount: 1,
                failedCount: failures.length,
                requestedCount: voiceTotal,
                diagnostics: buildProductionPipelineDiagnostics({
                  document,
                  reasoning: single,
                }),
                costSummary,
                perfSummary,
              },
            }

            await updateSynthesisJob(jobId, {
              status: 'completed',
              phase: 'complete',
              document: finalDoc,
              perfSummary,
              completedAt: new Date().toISOString(),
              error: undefined,
            })

            synthesisLog('single-source-reasoning-complete', {
              jobId,
              synthesisId: claimed.synthesisId,
            })
            return
          }
        }
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synthesis job failed.'
    synthesisLog('synthesis-job-failed', { jobId, message })

    const existing = await loadSynthesisJob(jobId)
    const failedDoc = existing?.document
      ? { ...existing.document, status: 'failed' as const, synthesisError: message }
      : undefined

    await updateSynthesisJob(jobId, {
      status: 'failed',
      phase: existing?.phase ?? 'analyzing',
      error: message,
      document: failedDoc,
      completedAt: new Date().toISOString(),
    })
  } finally {
    inflightRunners.delete(jobId)
  }
}

export function scheduleSynthesisJobRun(jobId: string, run: (id: string) => Promise<void>): void {
  void run(jobId).catch((error) => {
    console.error('[SYNTHESIS JOB] runner error', jobId, error)
  })
}
