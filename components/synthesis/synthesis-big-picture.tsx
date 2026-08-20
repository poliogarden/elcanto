'use client'

import { useState } from 'react'
import { EvidenceDrawer } from '@/components/synthesis/evidence-drawer'
import { SourceChip } from '@/components/synthesis/source-chip'
import type { ThemeView, ThemeEvidenceView } from '@/lib/types/view-model'
import type { Voice } from '@/lib/types/voice'

type Props = {
  themes: ThemeView[]
  voices: Voice[]
}

export function SynthesisBigPicture({ themes, voices }: Props) {
  const [drawer, setDrawer] = useState<{ title: string; items: ThemeView['evidence'] } | null>(
    null,
  )

  if (themes.length === 0) return null

  return (
    <>
      <section className="border-b border-line py-6 md:py-8">
        <span className="mono-label text-[10px] text-ink-soft">THE BIG PICTURE</span>
        <div className="mt-10 space-y-14">
          {themes.slice(0, 6).map((theme) => (
            <article key={theme.id} className="max-w-4xl">
              <span className="mono-label text-[10px] text-ink-soft">{theme.index}</span>
              <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight md:text-4xl">
                {theme.title}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {theme.voices.map((voice) => (
                  <SourceChip key={`${theme.id}-${voice}`} voice={voice} voices={voices} />
                ))}
              </div>
              <p className="mt-5 font-serif text-lg leading-relaxed text-ink-soft">
                {theme.description}
              </p>

              {theme.evidence.length > 0 && (
                <ul className="mt-6 space-y-2 border-l border-line pl-5">
                  {theme.evidence.slice(0, 4).map((ev) => (
                    <li key={ev.claimId} className="font-serif text-base text-ink-soft">
                      <span className="mono mr-2 text-[10px] text-ink">
                        {String(ev.voice).padStart(2, '0')}
                      </span>
                      {ev.statement}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 border-l-2 border-mint bg-paper-2/60 py-4 pl-5 pr-4">
                <span className="mono-label text-[10px] text-ink-soft">SYNTHESIS</span>
                <p className="mt-2 font-serif text-lg leading-relaxed">{theme.synthesisSentence}</p>
              </div>

              {theme.evidence.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDrawer({ title: theme.title, items: theme.evidence })}
                  className="mono-label mt-5 border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
                >
                  View evidence
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <EvidenceDrawer
        open={Boolean(drawer)}
        items={drawer?.items ?? []}
        title={drawer?.title}
        onClose={() => setDrawer(null)}
      />
    </>
  )
}
