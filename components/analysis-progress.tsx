'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  countFailedVoices,
  countReadyVoices,
  isCompleteDocument,
  type SynthesisDocument,
} from '@/lib/types/synthesis-document'
import {
  loadDraft,
  loadSynthesisJobId,
  saveSynthesisDocument,
  saveSynthesisJobId,
} from '@/lib/storage/synthesis-session'
import { VoiceRelationshipCanvas } from '@/components/home/voice-relationship-canvas'
import { InsightExplorerResult } from '@/components/insight-explorer/insight-explorer-result'
import { isDirectSynthesisDocument } from '@/lib/direct-synthesis/persisted'
import { useTranslation } from '@/lib/i18n/locale-context'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import type { SynthesisPerfSummary } from '@/lib/synthesis/synthesis-perf'
import type { SynthesisJobPhase, SynthesisJobPublic } from '@/lib/synthesis/synthesis-job-types'
import {
  createOrResumeSynthesisJob,
  fetchSynthesisJob,
  fetchSynthesisJobBySynthesisId,
  isSynthesisJobTerminal,
  jobPhaseLabel,
  SYNTHESIS_JOB_POLL_MS,
} from '@/lib/synthesis/synthesis-job-client'
import { SynthesisLoadingBar } from '@/components/synthesis/synthesis-loading-bar'
import type { SynthesisProgressPhase } from '@/lib/synthesis/progress-events'

const USER_PHASE_IDS = ['listening', 'connecting', 'emerging'] as const

type AnalysisProgressProps = {
  synthesisId: string
}

function uiPhaseFromJob(job: SynthesisJobPublic): 'analyzing' | 'synthesizing' | 'complete' | 'failed' {
  if (job.status === 'failed') return 'failed'
  if (job.status === 'completed' || job.phase === 'complete') return 'complete'
  if (job.phase === 'analyzing' || job.phase === 'queued') return 'analyzing'
  return 'synthesizing'
}

function synthesisStepFromJob(
  phase: SynthesisJobPhase,
  survivalPhase?: SynthesisDocument['survivalProgressPhase'],
): number {
  switch (phase) {
    case 'connecting':
      if (survivalPhase === 'verification' || survivalPhase === 'synthesis') return 1
      return 0
    case 'synthesizing':
    case 'exploring':
      return 1
    case 'complete':
      return 2
    default:
      return 0
  }
}

function shouldShowLegacyRelationshipGraph(doc: SynthesisDocument | null): boolean {
  if (!doc) return false
  if (isDirectSynthesisDocument(doc)) return false
  return Boolean(doc.reasoning?.mode === 'multi' || doc.survival)
}

function backendPhaseFromJob(
  phase: SynthesisJobPhase,
  survivalPhase?: SynthesisDocument['survivalProgressPhase'],
): SynthesisProgressPhase | null {
  if (survivalPhase === 'relationships' || survivalPhase === 'verification') {
    return 'relationship'
  }
  if (survivalPhase === 'synthesis') {
    return 'emergent_insight'
  }
  switch (phase) {
    case 'connecting':
      return 'relationship'
    case 'synthesizing':
      return 'emergent_insight'
    case 'exploring':
      return 'fourth_idea'
    default:
      return null
  }
}

export function AnalysisProgress({ synthesisId }: AnalysisProgressProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const initStarted = useRef(false)
  const completedHandled = useRef(false)

  const [job, setJob] = useState<SynthesisJobPublic | null>(null)
  const [doc, setDoc] = useState<SynthesisDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [perfSummary, setPerfSummary] = useState<SynthesisPerfSummary | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [creatingJob, setCreatingJob] = useState(false)
  const processingStartedAt = useRef<number | null>(null)

  const phase = job ? uiPhaseFromJob(job) : creatingJob ? 'analyzing' : 'analyzing'
  const total = doc?.voices.length ?? job?.analyzeTotal ?? 0
  const ready = doc ? countReadyVoices(doc) : job?.analyzeCompleted ?? 0
  const failed = doc ? countFailedVoices(doc) : 0
  const synthesisStep = job
    ? synthesisStepFromJob(job.phase, job.document?.survivalProgressPhase)
    : 0
  const isDirectDoc = doc ? isDirectSynthesisDocument(doc) : false
  const isDirectComplete =
    isDirectDoc && job?.status === 'completed' && Boolean(doc?.directSynthesis)
  const showLegacyGraph = shouldShowLegacyRelationshipGraph(doc)
  const showProcessingUi = !isDirectComplete && phase !== 'complete'
  const canvasPhase = phase === 'complete' ? 'complete' : 'processing'
  const statusLabel = job ? jobPhaseLabel(job) : creatingJob ? 'QUEUED' : 'QUEUED'

  const userPhases = useMemo(
    () =>
      USER_PHASE_IDS.map((id) => ({
        id,
        label: t(`loading.${id}`),
      })),
    [t],
  )

  const synthesisSteps = useMemo(
    () => [t('loading.synthStepConnecting'), t('loading.synthStepEmerging')] as const,
    [t],
  )

  const currentStepLabel = useMemo(() => {
    if (!job) return statusLabel
    if (job.phase === 'queued') return 'QUEUED'
    if (job.phase === 'analyzing') {
      return job.analyzeTotal > 0
        ? `ANALYZING ${job.analyzeCompleted} / ${job.analyzeTotal}`
        : 'ANALYZING'
    }
    if (job.phase === 'connecting') return 'CONNECTING'
    if (job.phase === 'synthesizing') return 'SYNTHESIZING'
    if (job.phase === 'exploring') return 'EXPLORING'
    if (job.phase === 'complete') return 'COMPLETE'
    return statusLabel
  }, [job, statusLabel])

  useEffect(() => {
    if (phase === 'complete' || phase === 'failed') return
    if (processingStartedAt.current == null) {
      processingStartedAt.current = Date.now()
    }

    const tick = window.setInterval(() => {
      if (processingStartedAt.current == null) return
      setElapsedSec(Math.floor((Date.now() - processingStartedAt.current) / 1000))
    }, 1000)

    return () => window.clearInterval(tick)
  }, [phase])

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true

    async function bootstrap() {
      setCreatingJob(true)
      setError(null)

      try {
        const storedJobId = loadSynthesisJobId(synthesisId)
        if (storedJobId) {
          try {
            const existing = await fetchSynthesisJob(storedJobId)
            setJob(existing)
            if (existing.document) setDoc(existing.document)
            if (existing.perfSummary) setPerfSummary(existing.perfSummary)
            if (existing.status === 'failed') {
              setError(existing.error ?? t('loading.synthesisFailed'))
            }
            setCreatingJob(false)
            return
          } catch {
            // fall through to recovery by synthesisId
          }
        }

        const recovered = await fetchSynthesisJobBySynthesisId(synthesisId)
        if (recovered) {
          saveSynthesisJobId(synthesisId, recovered.id)
          setJob(recovered)
          if (recovered.document) setDoc(recovered.document)
          if (recovered.perfSummary) setPerfSummary(recovered.perfSummary)
          if (recovered.status === 'failed') {
            setError(recovered.error ?? t('loading.synthesisFailed'))
          }
          setCreatingJob(false)
          return
        }

        const draft = loadDraft(synthesisId)
        if (!draft || draft.voices.length < 1) {
          setError(t('loading.needOneVoice'))
          setCreatingJob(false)
          return
        }

        const { job: created } = await createOrResumeSynthesisJob({ synthesisId, draft })
        saveSynthesisJobId(synthesisId, created.id)
        setJob(created)
        if (created.document) setDoc(created.document)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loading.synthesisFailed'))
      } finally {
        setCreatingJob(false)
      }
    }

    void bootstrap()
  }, [synthesisId, t])

  useEffect(() => {
    if (!job || isSynthesisJobTerminal(job)) return

    const timer = window.setInterval(async () => {
      try {
        const next = await fetchSynthesisJob(job.id)
        setJob(next)
        if (next.document) setDoc(next.document)
        if (next.perfSummary) setPerfSummary(next.perfSummary)
      } catch {
        // keep polling on transient errors
      }
    }, SYNTHESIS_JOB_POLL_MS)

    return () => window.clearInterval(timer)
  }, [job])

  useEffect(() => {
    if (!job || completedHandled.current) return

    if (job.status === 'failed') {
      completedHandled.current = true
      setError(job.error ?? t('loading.synthesisFailed'))
      if (job.document) {
        saveSynthesisDocument({ ...job.document, status: 'failed', synthesisError: job.error })
      }
      return
    }

    if (job.status !== 'completed' || !job.document || !isCompleteDocument(job.document)) return

    completedHandled.current = true
    const finalDoc = job.document
    saveSynthesisDocument(finalDoc)

    if (job.perfSummary) {
      try {
        sessionStorage.setItem(`synthesis-perf-${synthesisId}`, JSON.stringify(job.perfSummary))
      } catch {
        // ignore
      }
    }

    if (isDirectSynthesisDocument(finalDoc)) {
      return
    }

    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, 900))
      router.push(`/synthesis/${synthesisId}`)
    })()
  }, [job, router, synthesisId, t])

  const analyzingIndex = job?.analyzeCompleted ?? 0
  const backendPhase = job
    ? backendPhaseFromJob(job.phase, job.document?.survivalProgressPhase)
    : null

  if (isDirectComplete && doc?.directSynthesis) {
    return <InsightExplorerResult direct={doc.directSynthesis} document={doc} embedded />
  }

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 py-4 md:px-6 md:py-6">
      {showProcessingUi && (
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="mono-label text-xs text-ink-soft">
            {doc?.number ?? 'SYNTHESIS'} / {t('loading.inProduction')}
          </p>

          <h1 className="mt-4 mb-3 font-serif text-3xl font-medium leading-tight tracking-tight text-balance md:text-4xl lg:text-5xl">
            {phase === 'synthesizing' ? (
              <>
                {t('loading.bringingTogether')}
                <br />
                {t('loading.voicesTogether', { count: ready })}
              </>
            ) : (
              <>
                {t('loading.listeningTo')}
                <br />
                {t('loading.voices', { count: total })}
              </>
            )}
          </h1>

          <p className="mono text-sm text-ink" aria-live="polite">
            {currentStepLabel}
          </p>

          {phase === 'synthesizing' && (
            <>
              <p className="mono mt-2 text-[11px] text-ink-soft">
                {elapsedSec > 0
                  ? t('loading.elapsedHint', { seconds: elapsedSec })
                  : t('loading.elapsedBody')}
              </p>
              <SynthesisLoadingBar
                step={synthesisStep}
                backendPhase={backendPhase}
                elapsedSec={elapsedSec}
                statusLabel={t('loading.synthesizing')}
              />
            </>
          )}

          {total > 0 && doc && (
            <div className="mx-auto mt-6 flex flex-wrap justify-center gap-2">
              {doc.voices.map((entry) => {
                const thumb = resolveVideoThumbnail(
                  entry.voice.youtubeId,
                  entry.voice.thumbnail,
                )
                const done = Boolean(entry.analysis) || entry.voice.status === 'done'
                const failedVoice = entry.voice.status === 'failed'
                return (
                  <div
                    key={entry.voice.id}
                    className={`relative h-14 w-24 overflow-hidden rounded-lg ${
                      failedVoice ? 'opacity-40' : done ? 'ring-2 ring-coral' : 'opacity-70'
                    }`}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-paper-2 text-xs">
                        {String(entry.voice.n).padStart(2, '0')}
                      </div>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-white">
                      {String(entry.voice.n).padStart(2, '0')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {total > 0 && (
            <p className="mono-label mt-4 text-xs text-ink">
              {t('loading.voicesAnalyzed', { ready, total })}
              {failed > 0 && (
                <span className="text-ink-soft">
                  {t('loading.voicesFailed', { count: failed })}
                </span>
              )}
            </p>
          )}

          {phase === 'analyzing' && analyzingIndex > 0 && (
            <p className="mono-label mt-2 text-xs text-ink-soft">
              {t('loading.analyzingVoice', { current: analyzingIndex, total })}
            </p>
          )}
        </div>
      )}

      {showProcessingUi && doc && phase === 'analyzing' && (
        <div className="mx-auto mt-8 w-full max-w-2xl border-t border-line pt-4 text-left">
          {doc.voices.map((entry) => (
            <div
              key={entry.voice.id}
              className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0"
            >
              <span className="mono text-xs text-ink-soft">
                {String(entry.voice.n).padStart(2, '0')} /{' '}
                {entry.voice.title.slice(0, 48)}
                {entry.voice.title.length > 48 ? '…' : ''}
              </span>
              <span
                className={`mono-label shrink-0 text-[10px] uppercase ${
                  entry.voice.status === 'failed' ? 'text-destructive' : 'text-ink'
                }`}
              >
                {entry.error ? t('errors.transcriptUnavailable') : entry.voice.status.replace(/_/g, ' ')}
                {entry.analysis ? ' ✓' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {showProcessingUi &&
        showLegacyGraph &&
        phase === 'synthesizing' &&
        doc && (
        <div className="mx-auto mt-10 w-full max-w-3xl">
          <p className="mono-label mb-4 text-center text-[10px] text-ink-soft">
            {t('loading.bringingThemTogether')}
          </p>
          <VoiceRelationshipCanvas
            voices={doc.voices.map((v) => v.voice)}
            phase={canvasPhase}
          />
        </div>
      )}

      {showProcessingUi && (
      <ol className="mx-auto mt-10 w-full max-w-xl border-t border-line">
        <ProgressRow
          index={1}
          phaseLabel={userPhases[0]?.label ?? ''}
          label={
            total > 0
              ? phase === 'analyzing'
                ? t('loading.videosProgress', { ready, total })
                : t('source.videoCount', { count: total })
              : t('loading.videos')
          }
          state={phase === 'analyzing' ? 'now' : phase === 'failed' && ready === 0 ? 'wait' : 'done'}
          phase={phase}
          t={t}
        />
        <ProgressRow
          index={2}
          phaseLabel={userPhases[1]?.label ?? ''}
          label={synthesisSteps[0]}
          state={
            phase === 'synthesizing'
              ? synthesisStep === 0
                ? 'now'
                : 'done'
              : 'wait'
          }
          phase={phase}
          t={t}
        />
        <ProgressRow
          index={3}
          phaseLabel={userPhases[2]?.label ?? ''}
          label={synthesisSteps[1]}
          state={
            phase === 'synthesizing'
              ? synthesisStep >= 1
                ? 'now'
                : 'wait'
              : 'wait'
          }
          phase={phase}
          t={t}
        />
      </ol>
      )}

      {showProcessingUi && perfSummary && process.env.NODE_ENV !== 'production' && (
        <div className="mono mx-auto mt-8 max-w-xl border border-line p-4 text-center text-[10px] text-ink-soft">
          <p className="mb-2 text-ink">SYNTHESIS PERF (dev)</p>
          {perfSummary.individualAnalysisMs != null && (
            <p>individual_analysis: {perfSummary.individualAnalysisMs}ms</p>
          )}
          {perfSummary.phases.map((p) => (
            <p key={p.name}>
              {p.name}: {p.durationMs}ms
            </p>
          ))}
          <p className="mt-2">
            pipeline (wall): {(perfSummary.totalMs / 1000).toFixed(1)}s
            {perfSummary.stagesMs > 0 && perfSummary.stagesMs !== perfSummary.totalMs
              ? ` · stages sum: ${(perfSummary.stagesMs / 1000).toFixed(1)}s`
              : ''}
            {perfSummary.endToEndMs != null
              ? ` · end-to-end: ${(perfSummary.endToEndMs / 1000).toFixed(1)}s`
              : ''}
          </p>
          {perfSummary.pipelineRunId && (
            <p className="mt-1 text-ink-soft">run: {perfSummary.pipelineRunId}</p>
          )}
        </div>
      )}

      {error && (
        <p className="mono mx-auto mt-6 max-w-xl text-center text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

function ProgressRow({
  index,
  phaseLabel,
  label,
  state,
  phase,
  t,
}: {
  index: number
  phaseLabel: string
  label: string
  state: 'done' | 'now' | 'wait'
  phase: 'analyzing' | 'synthesizing' | 'complete' | 'failed'
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  return (
    <li className="flex flex-col items-center gap-2 border-b border-line py-5 text-center">
      <span className="mono-label text-[10px] text-ink-soft">{phaseLabel}</span>
      <span
        className={`font-serif text-xl transition-colors md:text-2xl ${
          state === 'wait' ? 'text-ink-soft/50' : 'text-ink'
        }`}
      >
        {label}
      </span>
      <span className="mono-label text-[10px]">
        {state === 'done' && <span className="text-ink">{t('loading.done')}</span>}
        {state === 'now' && (
          <span className="text-mint-ink">
            {phase === 'synthesizing' ? t('loading.synthesizing') : t('loading.readingStatus')}
          </span>
        )}
        {state === 'wait' && <span className="text-ink-soft/40">—</span>}
      </span>
    </li>
  )
}
