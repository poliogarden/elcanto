import { AI_CONFIG } from '@/lib/ai/config'
import { runWithAIContext } from '@/lib/ai/usage/context'
import { analyzeOneSource } from '@/lib/pipeline/analyze-source'
import { runReasoningPipeline } from '@/lib/reasoning/pipeline'
import { runSingleSourceReasoning } from '@/lib/reasoning/single-source'
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
  resolveDraftQuestion,
  resolveDraftSynthesisMode,
} from '@/lib/types/synthesis-draft'
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

    await runWithAIContext(
      { requestId, synthesisId: claimed.synthesisId },
      async () => {
        let document = createSynthesisDocument(claimed.synthesisId, claimed.draft.voices)
        document.mode = resolveDraftSynthesisMode(claimed.draft)
        const synthesisQuestion = resolveDraftQuestion(claimed.draft)
        if (synthesisQuestion) {
          document = {
            ...document,
            userQuestion: synthesisQuestion,
            topic: synthesisQuestion,
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

        const useReasoning = analyses.length >= 2

        if (useReasoning) {
          const voiceMeta = document.voices
            .filter((v) => v.analysis)
            .map((v) => ({ channel: v.voice.channel, thumbnail: v.voice.thumbnail }))

          const reasoning = await runReasoningPipeline({
            sources: analyses,
            voices: voiceMeta,
            userQuestion: synthesisQuestion,
            outputLanguage: outputLanguage ?? undefined,
            onProgress: (event) => {
              if (event.type === 'phase') {
                const phaseMap: Partial<Record<ReasoningProgressPhase, typeof document.survivalProgressPhase>> =
                  {
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
          })

          const finalDoc: SynthesisDocument = {
            ...document,
            status: 'complete',
            reasoning,
            topic: reasoning.judgment?.statement ?? reasoning.centralQuestion,
            userQuestion: document.userQuestion ?? synthesisQuestion,
          }

          await updateSynthesisJob(jobId, {
            status: 'completed',
            phase: 'complete',
            document: finalDoc,
            perfSummary: {
              phases: [],
              totalMs: Date.now() - analyzeStartedAt,
              stagesMs: 0,
              llmCalls: 0,
              inputTokens: 0,
              outputTokens: 0,
              estimatedCostUsd: null,
              cachedSources: 0,
              uncachedSources: analyses.length,
              individualAnalysisMs,
              endToEndMs: Date.now() - analyzeStartedAt,
            },
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
          const finalDoc: SynthesisDocument = {
            ...document,
            status: 'complete',
            reasoning: single,
            topic: single.keyInsight ?? single.summary,
            userQuestion: document.userQuestion ?? synthesisQuestion,
          }

          await updateSynthesisJob(jobId, {
            status: 'completed',
            phase: 'complete',
            document: finalDoc,
            completedAt: new Date().toISOString(),
            error: undefined,
          })

          synthesisLog('single-source-reasoning-complete', {
            jobId,
            synthesisId: claimed.synthesisId,
          })
          return
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
