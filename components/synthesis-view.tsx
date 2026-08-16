'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { IssueNavigation } from '@/components/issue-navigation'
import { AskSynthesis } from '@/components/synthesis/ask-synthesis'
import { BottomLineFeature } from '@/components/synthesis/bottom-line-feature'
import { ConsensusArticle } from '@/components/synthesis/consensus-article'
import { DisagreementArticle } from '@/components/synthesis/disagreement-article'
import { EvidenceArticle } from '@/components/synthesis/evidence-article'
import { QuietVoiceArticle } from '@/components/synthesis/quiet-voice-article'
import { VoiceIndex } from '@/components/voice-index'
import { markSavedToArchive } from '@/lib/storage/synthesis-session'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SynthesisViewModel } from '@/lib/types/view-model'

type SynthesisViewProps = {
  view: SynthesisViewModel
  document: SynthesisDocument
}

export function SynthesisView({ view, document }: SynthesisViewProps) {
  const { data: session } = useSession()
  const [saved, setSaved] = useState(document.savedToArchive ?? false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!session) {
      void signIn('google')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document }),
      })
      if (res.ok) {
        markSavedToArchive(document.id)
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <IssueNavigation issue={view.number} active="youtube" />

      <section className="border-b border-line px-5 py-12 md:px-8 md:py-16">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <span className="mono-label text-xs text-ink">
            elcanto / {view.number.toLowerCase()}
          </span>
          <span className="mono-label text-xs text-ink-soft">
            {view.readyVoiceCount} of {view.voiceCount} voices / {view.totalDuration}
          </span>
        </div>

        <h1 className="font-serif text-5xl font-medium leading-[0.98] tracking-tight text-balance md:text-7xl lg:text-8xl">
          {view.question.includes('?') ? (
            <>
              {view.question.split('?')[0]}?
              <br />
              {view.question.split('?').slice(1).join('?').trim() || null}
            </>
          ) : (
            view.question
          )}
        </h1>
        <p className="mono-label mt-6 text-xs text-ink-soft">
          A synthesis of {view.readyVoiceCount} YouTube voices.
        </p>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saved || saving}
            className="mono-label border border-line px-5 py-3 text-xs text-ink transition-colors hover:bg-ink hover:text-background disabled:opacity-40"
          >
            {saved ? 'Saved to archive' : saving ? 'Saving…' : 'Save this synthesis →'}
          </button>
          {!session && !saved && (
            <p className="mono mt-2 text-[11px] text-ink-soft">
              Sign in with Google to save to your archive.
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <BottomLineFeature view={view} />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5">
            {view.consensus.map((c, i) => (
              <ConsensusArticle
                key={c.index}
                item={c}
                heading={i === 0 ? 'Where they agree' : 'And they also agree'}
              />
            ))}
          </div>
        </div>
      </section>

      {view.disagreement && (
        <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
          <DisagreementArticle item={view.disagreement} />
        </section>
      )}

      {view.minority && (
        <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
          <QuietVoiceArticle minority={view.minority} />
        </section>
      )}

      {view.evidence.length > 0 && (
        <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
          <EvidenceArticle items={view.evidence} />
        </section>
      )}

      <section id="the-voices" className="px-5 pt-14 md:px-8">
        <div className="mb-4 flex items-baseline justify-between border-b border-line pb-4">
          <h2 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">The voices</h2>
          <span className="mono-label text-xs text-ink-soft">{view.voiceCount} sources</span>
        </div>
      </section>
      <VoiceIndex voices={view.voices} />

      <AskSynthesis view={view} document={document} />
    </>
  )
}
