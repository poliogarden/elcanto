'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { StoryBlockList } from '@/components/story/story-block-list'
import { StoryModePicker } from '@/components/story/story-mode-picker'
import { StoryPreview } from '@/components/story/story-preview'
import { useTranslation } from '@/lib/i18n/locale-context'
import { saveStoryProject } from '@/lib/storage/story-session'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { StoryMode, StoryPlan, StoryProject } from '@/lib/types/story-plan'

type Props = {
  synthesisId: string
  document: SynthesisDocument
  initialProject?: StoryProject | null
}

export function StoryBuilder({ synthesisId, document, initialProject }: Props) {
  const { t } = useTranslation()
  const loadingSteps = useMemo(
    () => [
      t('story.loadingStep1'),
      t('story.loadingStep2'),
      t('story.loadingStep3'),
      t('story.loadingStep4'),
      t('story.loadingStep5'),
    ],
    [t],
  )

  const [mode, setMode] = useState<StoryMode>(initialProject?.mode ?? 'insight')
  const [plan, setPlan] = useState<StoryPlan | null>(initialProject?.plan ?? null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLoadingStep(0)

    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, loadingSteps.length - 1))
    }, 2200)

    try {
      const res = await fetch('/api/story/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document, mode }),
      })
      const data = (await res.json()) as { plan?: StoryPlan; error?: string }
      if (!res.ok || !data.plan) {
        throw new Error(data.error ?? t('story.generationFailed'))
      }

      setPlan(data.plan)
      setShowPreview(true)
      const project: StoryProject = {
        id: synthesisId,
        synthesisId,
        mode,
        plan: data.plan,
        status: 'ready',
        updatedAt: new Date().toISOString(),
      }
      saveStoryProject(project)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('story.generationFailed'))
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }, [document, mode, synthesisId, t, loadingSteps.length])

  function handleBlocksChange(blocks: StoryPlan['blocks']) {
    if (!plan) return
    const next = { ...plan, blocks }
    setPlan(next)
    saveStoryProject({
      id: synthesisId,
      synthesisId,
      mode,
      plan: next,
      status: 'ready',
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-8 md:px-6 md:py-10">
      <Link
        href={`/synthesis/${synthesisId}`}
        className="mono-label text-[10px] text-ink-soft hover:text-ink"
      >
        {t('story.backToSynthesis')}
      </Link>

      <p className="mono-label mt-6 text-[10px] text-ink-soft">{t('story.title')}</p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
        {t('story.headline')}
      </h1>
      <p className="mt-3 max-w-2xl font-serif text-base text-ink-soft">{t('story.description')}</p>

      <div className="mt-8 border-t border-line pt-8">
        <StoryModePicker mode={mode} onChange={setMode} disabled={loading} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void generate()}
          className="mono-label bg-ink px-6 py-3 text-[11px] text-background hover:opacity-90 disabled:opacity-40"
        >
          {loading ? t('story.building') : plan ? t('story.regenerate') : t('story.build')}
        </button>
        {plan && (
          <>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="mono-label border border-line px-6 py-3 text-[11px] hover:bg-ink hover:text-background lg:hidden"
            >
              {showPreview ? t('story.hidePreview') : t('story.showPreview')}
            </button>
            <Link
              href={`/compose/${synthesisId}`}
              className="mono-label border border-line px-6 py-3 text-[11px] hover:bg-ink hover:text-background"
            >
              {t('story.composeLink')}
            </Link>
          </>
        )}
      </div>

      {loading && (
        <p className="mono mt-4 text-[11px] text-ink-soft" aria-live="polite">
          {loadingSteps[loadingStep]}
        </p>
      )}

      {error && (
        <p className="mono mt-4 text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}

      {plan?.qualityNote && (
        <p className="mono mt-4 border border-line bg-paper-2/60 px-4 py-3 text-[11px] text-ink-soft">
          {plan.qualityNote}
        </p>
      )}

      {plan && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mono-label mb-4 text-[10px] text-ink-soft">
              {t('story.planMeta', {
                title: plan.title,
                duration: plan.durationTarget,
                sources: plan.sourceCount,
              })}
            </p>
            <StoryBlockList blocks={plan.blocks} onChange={handleBlocksChange} />
          </div>

          <div
            className={`${showPreview ? 'block' : 'hidden'} lg:block lg:sticky lg:top-6 lg:self-start`}
          >
            <StoryPreview plan={plan} />
            <p className="mono mt-3 max-w-sm text-center text-[10px] text-ink-soft">
              {t('story.previewNote')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
