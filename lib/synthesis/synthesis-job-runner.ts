import { AI_CONFIG } from '@/lib/ai/config'
import { runWithAIContext } from '@/lib/ai/usage/context'
import { analyzeOneSource } from '@/lib/pipeline/analyze-source'
import { synthesizeCollectionWithCost } from '@/lib/pipeline/synthesize-collection'
import type { SynthesisJobPhase } from '@/lib/synthesis/synthesis-job-types'
import {
  loadSynthesisJob,
  tryClaimSynthesisJob,
  updateSynthesisJob,
} from '@/lib/synthesis/synthesis-job-repository'
import type { SynthesisProgressPhase } from '@/lib/synthesis/progress-events'
import { getSynthesisTopic } from '@/lib/types/analysis'
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

function mapProgressPhaseToJobPhase(phase: SynthesisProgressPhase): SynthesisJobPhase {
  switch (phase) {
    case 'relationship':
    case 'combined_analysis':
    case 'set_analysis':
      return 'connecting'
    case 'emergent_insight':
      return 'synthesizing'
    case 'fourth_idea':
      return 'exploring'
    case 'insight_map':
    case 'db_save':
      return 'exploring'
    default:
      return 'synthesizing'
  }
}

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

        const { result, perfSummary } = await synthesizeCollectionWithCost({
          question: synthesisQuestion,
          sources: analyses,
          failedSources: failures,
          requestId,
          synthesisId: document.id,
          mode: document.mode ?? 'discover',
          outputLanguage,
          deferKnowledgeExtension: true,
          onProgress: (event) => {
            if (event.type === 'phase' && event.status === 'start') {
              const phase = mapProgressPhaseToJobPhase(event.phase)
              void updateSynthesisJob(jobId, { phase })
            }
          },
        })

        const enrichedPerf = perfSummary
          ? {
              ...perfSummary,
              individualAnalysisMs,
              endToEndMs: individualAnalysisMs + perfSummary.totalMs,
            }
          : undefined

        const finalDoc: SynthesisDocument = {
          ...document,
          status: 'complete',
          result,
          topic: getSynthesisTopic(result),
          userQuestion: document.userQuestion ?? synthesisQuestion,
        }

        await updateSynthesisJob(jobId, {
          status: 'completed',
          phase: 'complete',
          document: finalDoc,
          result,
          perfSummary: enrichedPerf,
          completedAt: new Date().toISOString(),
          error: undefined,
        })

        synthesisLog('synthesis-job-complete', {
          jobId,
          synthesisId: claimed.synthesisId,
          voices: voiceTotal,
          analyzed: analyses.length,
        })
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
