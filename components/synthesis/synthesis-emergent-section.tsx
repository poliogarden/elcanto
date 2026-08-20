'use client'

import { useState } from 'react'
import { SourceChip } from '@/components/synthesis/source-chip'
import type { FourthIdeaView } from '@/lib/types/view-model'
import type { Voice } from '@/lib/types/voice'

type Props = {
  fourthIdea: FourthIdeaView | null
  fallbackStatement?: string
  noStrongRelationship: boolean
  voices: Voice[]
}

export function SynthesisEmergentSection({
  fourthIdea,
  fallbackStatement,
  noStrongRelationship,
  voices,
}: Props) {
  const [showReasoning, setShowReasoning] = useState(false)
  const statement = fourthIdea?.statement ?? fallbackStatement

  if (!statement && noStrongRelationship) {
    return (
      <section id="emergent" className="border-b border-line bg-paper-2 py-8 md:py-10">
        <span className="mono-label text-[10px] text-ink-soft">✦ EMERGENT INSIGHT</span>
        <p className="mt-6 max-w-3xl font-serif text-2xl leading-relaxed">
          These sources do not strongly converge.
        </p>
        <p className="mt-4 max-w-2xl font-serif text-lg text-ink-soft">
          No strong emergent insight found — and that is a valid result. Forcing a conclusion would
          reduce trust.
        </p>
      </section>
    )
  }

  if (!statement) return null

  return (
    <section id="emergent" className="border-b border-line bg-paper-2 py-8 md:py-10">
      <span className="mono-label text-[10px] text-ink-soft">✦ EMERGENT INSIGHT</span>
      <blockquote className="mt-6 max-w-4xl font-serif text-3xl font-medium leading-[1.15] tracking-tight md:text-5xl">
        &ldquo;{statement}&rdquo;
      </blockquote>

      {fourthIdea?.explanation && (
        <div className="mt-8 max-w-3xl space-y-4">
          {fourthIdea.explanation
            .split(/(?<=[.!?])\s+/)
            .filter(Boolean)
            .map((p) => (
              <p key={p.slice(0, 40)} className="font-serif text-lg leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
        </div>
      )}

      <p className="mono mt-8 text-[10px] uppercase text-ink-soft">
        No single source states this directly
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {fourthIdea?.voices.map((voice) => (
          <SourceChip key={voice} voice={voice} voices={voices} />
        ))}
      </div>

      {fourthIdea && fourthIdea.derivationSteps.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowReasoning((v) => !v)}
            className="mono-label border border-line bg-background px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
          >
            {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
          </button>
          {showReasoning && (
            <ol className="mt-6 max-w-2xl space-y-3 border-l border-line pl-5">
              {fourthIdea.derivationSteps.map((step) => (
                <li key={`${step.kind}-${step.label}`}>
                  <span className="mono text-[10px] text-ink-soft">{step.label}</span>
                  <p className="mt-1 font-serif text-base leading-relaxed text-ink-soft">
                    {step.detail}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}
