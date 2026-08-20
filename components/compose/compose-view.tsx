'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HomePageShell } from '@/components/home/home-page-shell'
import { ComposeExportPanel } from '@/components/compose/compose-export-panel'
import { ComposeNarrative } from '@/components/compose/compose-narrative'
import { ComposePreviewPlayer } from '@/components/compose/compose-preview-player'
import { ComposeProgress } from '@/components/compose/compose-progress'
import { ComposeStoryWorkspace } from '@/components/compose/compose-story-workspace'
import {
  loadCompositionDocument,
  saveCompositionDocument,
} from '@/lib/storage/compose-session'
import { COMPOSE_LOADING_STEPS, getSynthesisHeadline } from '@/lib/types/composition'
import type { Composition, CompositionDocument, CompositionSection } from '@/lib/types/composition'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

import type { TranscriptSegment } from '@/lib/youtube/transcript'

type TranscriptSource = {
  sourceId: string
  voiceIndex: number
  youtubeId: string
  title: string
  segments: TranscriptSegment[]
}

type Props = {
  synthesisDoc: SynthesisDocument
  synthesisId: string
}

function recalcDuration(composition: Composition): Composition {
  let total = 0
  for (const section of composition.sections) {
    for (const item of section.items) {
      total +=
        item.kind === 'clip'
          ? Math.max(1, item.clip.endSeconds - item.clip.startSeconds)
          : item.interlude.durationSeconds
    }
  }
  return { ...composition, totalDurationSeconds: Math.round(total) }
}

export function ComposeView({ synthesisDoc, synthesisId }: Props) {
  const [composeDoc, setComposeDoc] = useState<CompositionDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState(0)
  const [instruction, setInstruction] = useState('')
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptSource>>({})
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runCompose = useCallback(
    async (userInstruction?: string, force = false) => {
      if (!force) {
        const cached = loadCompositionDocument(synthesisId)
        if (cached?.status === 'ready' && cached.composition && !userInstruction) {
          setComposeDoc(cached)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setError(null)
      setLoadingStep(0)

      const stepTimer = window.setInterval(() => {
        setLoadingStep((s) => Math.min(s + 1, COMPOSE_LOADING_STEPS.length - 1))
      }, 1600)

      try {
        const res = await fetch('/api/compose/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: synthesisDoc,
            instruction: userInstruction?.trim() || undefined,
          }),
        })

        const data = (await res.json()) as { document?: CompositionDocument; error?: string }
        if (!res.ok || !data.document) {
          throw new Error(data.error ?? 'Composition failed.')
        }

        saveCompositionDocument(data.document)
        setComposeDoc(data.document)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Composition failed.')
      } finally {
        window.clearInterval(stepTimer)
        setLoadingStep(COMPOSE_LOADING_STEPS.length - 1)
        setLoading(false)
      }
    },
    [synthesisDoc, synthesisId],
  )

  useEffect(() => {
    void runCompose()
  }, [runCompose])

  useEffect(() => {
    async function loadTranscripts() {
      const res = await fetch('/api/compose/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: synthesisDoc }),
      })
      if (!res.ok) return
      const data = (await res.json()) as { transcripts?: Record<string, TranscriptSource> }
      if (data.transcripts) setTranscripts(data.transcripts)
    }
    void loadTranscripts()
  }, [synthesisDoc])

  function handleUpdateSection(sectionId: string, section: CompositionSection) {
    if (!composeDoc?.composition) return
    const sections = composeDoc.composition.sections.map((s) =>
      s.id === sectionId ? section : s,
    )
    handleUpdateComposition(recalcDuration({ ...composeDoc.composition, sections }))
  }

  function handleUpdateComposition(nextComposition: Composition) {
    if (!composeDoc) return
    const updated: CompositionDocument = {
      ...composeDoc,
      composition: nextComposition,
      updatedAt: new Date().toISOString(),
    }
    setComposeDoc(updated)
    saveCompositionDocument(updated)
  }

  if (loading) {
    return (
      <HomePageShell>
        <ComposeProgress step={loadingStep} />
      </HomePageShell>
    )
  }

  if (error || !composeDoc?.composition) {
    return (
      <HomePageShell className="py-16">
        <p className="mono-label text-xs text-ink-soft">{error ?? 'Composition unavailable.'}</p>
        <button
          type="button"
          onClick={() => void runCompose(undefined, true)}
          className="mono-label mt-4 border border-line px-5 py-3 text-xs hover:bg-ink hover:text-background"
        >
          Try again
        </button>
      </HomePageShell>
    )
  }

  const composition = composeDoc.composition
  const voiceCount = composeDoc.voiceCount
  const synthesisHeadline = synthesisDoc.result
    ? getSynthesisHeadline(synthesisDoc.result)
    : synthesisDoc.topic

  return (
    <>
      <HomePageShell>
      <section className="border-b border-line py-10 md:py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <span className="mono-label text-xs text-ink">
            SYNTHESIS / {String(voiceCount).padStart(2, '0')} SOURCES
          </span>
          <Link
            href={`/synthesis/${synthesisId}`}
            className="mono-label text-xs text-ink-soft hover:text-ink"
          >
            ← Back to synthesis
          </Link>
        </div>

        <p className="mono-label text-[10px] text-ink-soft">What these voices reveal together</p>
        <h1 className="mt-4 max-w-4xl font-serif text-3xl font-medium leading-tight tracking-tight md:text-5xl">
          &ldquo;{composition.thesis || synthesisHeadline}&rdquo;
        </h1>
        <p className="mono-label mt-6 text-[10px] text-ink-soft">
          {composition.title} · ~{Math.ceil(composition.totalDurationSeconds / 60)} min thread
        </p>
      </section>

      <section className="border-b border-line py-8 md:py-10">
        <ComposeStoryWorkspace
          composition={composition}
          transcripts={transcripts}
          onUpdateComposition={handleUpdateComposition}
          onPreview={() => setPreviewOpen(true)}
        />
      </section>

      <section className="border-b border-line py-10">
        <div className="mb-8 border-b border-line pb-4">
          <span className="mono-label text-[10px] text-ink-soft">NARRATIVE</span>
          <h2 className="mt-2 font-serif text-2xl font-medium md:text-3xl">The thread</h2>
        </div>

        <ComposeNarrative
          composition={composition}
          transcripts={transcripts}
          onUpdateSection={handleUpdateSection}
        />

        {composition.conclusion && (
          <div className="mt-12 border-t border-line pt-10">
            <span className="mono-label text-[10px] text-ink-soft">CONCLUSION</span>
            <p className="mt-4 max-w-3xl font-serif text-xl leading-relaxed text-ink-soft">
              {composition.conclusion}
            </p>
          </div>
        )}
      </section>

      <section className="border-b border-line py-10">
        <ComposeExportPanel composition={composition} compositionId={synthesisId} />
      </section>

      <section className="py-10">
        <div className="border border-line p-5 md:p-8">
          <span className="mono-label text-[10px] text-ink-soft">REFINE COMPOSITION</span>
          <h2 className="mt-2 font-serif text-2xl font-medium">Ask for a different thread</h2>
          <p className="mt-2 max-w-2xl font-serif text-sm text-ink-soft">
            Focus on disagreements, shorten the arc, or limit which sources appear — without
            re-reading everything from scratch.
          </p>
          <div className="mt-8 flex w-full flex-col border border-line sm:flex-row sm:items-stretch">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              placeholder='e.g. "Focus more on disagreements. Keep it under 2 minutes."'
              className="min-h-[5.5rem] flex-1 resize-none border-0 bg-transparent p-4 font-serif text-base outline-none focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void runCompose(instruction, true)}
              className="mono-label flex shrink-0 items-center justify-center border-t border-line bg-ink px-5 py-3 text-[10px] text-background transition-opacity hover:opacity-90 disabled:opacity-40 sm:border-l sm:border-t-0 sm:px-6"
            >
              {loading ? 'Regenerating…' : 'Regenerate composition →'}
            </button>
          </div>
        </div>
      </section>
      </HomePageShell>

      <ComposePreviewPlayer
        items={composition.sections.flatMap((s) => s.items)}
        sections={composition.sections.map((s) => ({ title: s.title, items: s.items }))}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  )
}
