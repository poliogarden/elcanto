'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VideoAnalysis } from '@/lib/types/analysis'
import {
  countFailedVoices,
  countReadyVoices,
  createSynthesisDocument,
  type SynthesisDocument,
} from '@/lib/types/synthesis-document'
import { loadDraft, saveSynthesisDocument } from '@/lib/storage/synthesis-session'
import { mapWithConcurrency } from '@/lib/utils/concurrency'
import { AI_CONFIG } from '@/lib/ai/config'

const SYNTHESIS_STEPS = [
  'Reading transcripts',
  'Understanding each argument',
  'Extracting key claims',
  'Finding agreements',
  'Finding disagreements',
  'Checking evidence',
  'Building synthesis',
] as const

type AnalysisProgressProps = {
  synthesisId: string
}

export function AnalysisProgress({ synthesisId }: AnalysisProgressProps) {
  const router = useRouter()
  const started = useRef(false)
  const docRef = useRef<SynthesisDocument | null>(null)
  const [doc, setDoc] = useState<SynthesisDocument | null>(null)
  const [phase, setPhase] = useState<'analyzing' | 'synthesizing' | 'complete' | 'failed'>(
    'analyzing',
  )
  const [activeStep, setActiveStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const updateDoc = useCallback((updater: (prev: SynthesisDocument) => SynthesisDocument) => {
    setDoc((prev) => {
      const base = prev ?? docRef.current
      if (!base) return prev
      const next = updater(base)
      docRef.current = next
      saveSynthesisDocument(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function run() {
      const draft = loadDraft(synthesisId)
      if (!draft || draft.length < 2) {
        setError('Need at least two voices to synthesize.')
        setPhase('failed')
        return
      }

      let document = createSynthesisDocument(synthesisId, draft)
      document.status = 'analyzing'
      docRef.current = document
      setDoc(document)
      saveSynthesisDocument(document)

      await mapWithConcurrency(document.voices, AI_CONFIG.maxConcurrency, async (entry, index) => {
        updateDoc((prev) => {
          const voices = [...prev.voices]
          voices[index] = {
            ...voices[index],
            voice: { ...voices[index].voice, status: 'fetching_transcript' },
          }
          return { ...prev, voices }
        })

        updateDoc((prev) => {
          const voices = [...prev.voices]
          voices[index] = {
            ...voices[index],
            voice: { ...voices[index].voice, status: 'analyzing' },
          }
          return { ...prev, voices }
        })

        const res = await fetch('/api/videos/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            youtubeId: entry.voice.youtubeId,
            title: entry.voice.title,
            channel: entry.voice.channel,
            voiceIndex: entry.voice.n,
          }),
        })

        const data = (await res.json()) as {
          analysis?: VideoAnalysis
          error?: string
        }

        updateDoc((prev) => {
          const voices = [...prev.voices]
          if (!res.ok || !data.analysis) {
            voices[index] = {
              ...voices[index],
              error: data.error ?? 'Analysis failed.',
              voice: { ...voices[index].voice, status: 'failed' },
            }
          } else {
            voices[index] = {
              ...voices[index],
              analysis: data.analysis,
              voice: { ...voices[index].voice, status: 'done' },
            }
          }
          return { ...prev, voices }
        })

        setActiveStep((s) => Math.min(s + 1, 4))
      })

      const workingDoc = docRef.current
      if (!workingDoc) return

      const ready = countReadyVoices(workingDoc)
      if (ready < 1) {
        updateDoc((prev) => ({ ...prev, status: 'failed' }))
        setPhase('failed')
        setError('No voices could be analyzed. Check transcript availability.')
        return
      }

      setPhase('synthesizing')
      setActiveStep(5)

      const analyses = workingDoc.voices
        .filter((v) => v.analysis)
        .map((v) => ({
          voiceIndex: v.voice.n,
          youtubeId: v.voice.youtubeId,
          analysis: v.analysis!,
        }))

      const synthRes = await fetch('/api/synthesis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyses }),
      })

      const synthData = (await synthRes.json()) as {
        result?: SynthesisDocument['result']
        error?: string
      }

      if (!synthRes.ok || !synthData.result) {
        updateDoc((prev) => ({
          ...prev,
          status: 'failed',
          synthesisError: synthData.error ?? 'Synthesis failed.',
        }))
        setPhase('failed')
        setError(synthData.error ?? 'Synthesis failed.')
        return
      }

      setActiveStep(7)
      const finalDoc: SynthesisDocument = {
        ...workingDoc,
        status: 'complete',
        result: synthData.result,
        topic: synthData.result.topic,
      }
      docRef.current = finalDoc
      saveSynthesisDocument(finalDoc)
      setDoc(finalDoc)
      setPhase('complete')
      router.push(`/synthesis/${synthesisId}`)
    }

    void run()
  }, [synthesisId, router, updateDoc])

  const ready = doc ? countReadyVoices(doc) : 0
  const failed = doc ? countFailedVoices(doc) : 0
  const total = doc?.voices.length ?? 0

  return (
    <section className="mx-auto flex min-h-[calc(100vh-1px)] max-w-6xl flex-col justify-center px-5 py-16 md:px-8">
      <p className="mono-label mb-8 text-xs text-ink-soft">
        {doc?.number ?? 'SYNTHESIS'} / in production
      </p>

      <h1 className="mb-6 font-serif text-5xl font-medium leading-[0.98] tracking-tight text-balance md:text-7xl">
        {phase === 'synthesizing' ? (
          <>
            Building
            <br />
            synthesis.
          </>
        ) : (
          <>
            Listening to
            <br />
            {total} voices.
          </>
        )}
      </h1>

      {total > 0 && (
        <p className="mono-label mb-10 text-xs text-ink">
          {ready} OF {total} VOICES READY
          {failed > 0 && <span className="text-ink-soft"> / {failed} failed</span>}
        </p>
      )}

      <ol className="border-t border-line">
        {SYNTHESIS_STEPS.map((step, i) => {
          const state = i < activeStep ? 'done' : i === activeStep ? 'now' : 'wait'
          return (
            <li
              key={step}
              className="flex items-center justify-between gap-4 border-b border-line py-4"
            >
              <div className="flex items-baseline gap-4">
                <span className="mono text-xs text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                <span
                  className={`font-serif text-xl transition-colors md:text-2xl ${
                    state === 'wait' ? 'text-ink-soft/50' : 'text-ink'
                  }`}
                >
                  {step}
                </span>
              </div>
              <span className="mono-label text-[10px]">
                {state === 'done' && <span className="text-ink">done</span>}
                {state === 'now' && (
                  <span className="text-mint-ink">
                    {phase === 'synthesizing' ? 'building…' : 'reading…'}
                  </span>
                )}
                {state === 'wait' && <span className="text-ink-soft/40">—</span>}
              </span>
            </li>
          )
        })}
      </ol>

      {doc && (
        <div className="mt-8 border-t border-line pt-6">
          {doc.voices.map((entry) => (
            <div
              key={entry.voice.id}
              className="flex items-center justify-between border-b border-line py-3 last:border-b-0"
            >
              <span className="mono text-xs text-ink-soft">
                {String(entry.voice.n).padStart(2, '0')} / {entry.voice.title.slice(0, 48)}
                {entry.voice.title.length > 48 ? '…' : ''}
              </span>
              <span
                className={`mono-label text-[10px] uppercase ${
                  entry.voice.status === 'failed' ? 'text-destructive' : 'text-ink'
                }`}
              >
                {entry.error ? 'transcript unavailable' : entry.voice.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mono mt-6 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
