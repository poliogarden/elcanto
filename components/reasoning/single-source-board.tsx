'use client'

import type { SingleSourceReasoning } from '@/lib/reasoning/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { SurvivalArchiveActions } from '@/components/survival/survival-archive-actions'

type Props = {
  reasoning: SingleSourceReasoning
  document: SynthesisDocument
}

export function SingleSourceBoard({ reasoning, document }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 font-ui sm:px-6">
      <SurvivalArchiveActions document={document} />

      <p className="text-xs font-semibold tracking-wide text-ink-soft">SINGLE SOURCE ANALYSIS</p>
      <h1 className="mt-3 font-serif text-2xl font-medium leading-snug text-ink sm:text-3xl">
        {reasoning.coreArgument}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{reasoning.summary}</p>

      {reasoning.stanceSummary && (
        <p className="mt-3 text-sm text-ink">
          <span className="font-semibold">Stance:</span> {reasoning.stanceSummary}
        </p>
      )}

      <section className="mt-10">
        <p className="text-xs font-semibold tracking-wide text-ink-soft">KEY CLAIMS</p>
        <div className="mt-3 space-y-3">
          {reasoning.claims.map((claim) => (
            <div key={claim.id} className="rounded-xl border border-line bg-paper-2/40 p-4">
              <p className="text-sm font-medium text-ink">&ldquo;{claim.statement}&rdquo;</p>
              {claim.evidenceIds.length > 0 && (
                <p className="mt-2 text-xs text-ink-soft">
                  Evidence:{' '}
                  {reasoning.evidence.find((e) => e.id === claim.evidenceIds[0])?.text.slice(0, 200)}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {reasoning.assumptions.length > 0 && (
        <section className="mt-10">
          <p className="text-xs font-semibold tracking-wide text-ink-soft">ASSUMPTIONS</p>
          <ul className="mt-3 list-inside list-disc text-sm text-ink-soft">
            {reasoning.assumptions.map((a) => (
              <li key={a.id}>{a.statement}</li>
            ))}
          </ul>
        </section>
      )}

      {reasoning.weakPoints.length > 0 && (
        <section className="mt-10">
          <p className="text-xs font-semibold tracking-wide text-ink-soft">WEAK POINTS</p>
          <ul className="mt-3 list-inside list-disc text-sm text-ink-soft">
            {reasoning.weakPoints.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {reasoning.keyInsight && (
        <section className="mt-10 rounded-2xl border border-line bg-paper-2/30 p-5 text-center">
          <p className="text-xs font-semibold tracking-wide text-coral">KEY INSIGHT</p>
          <p className="mt-3 font-serif text-xl text-ink">&ldquo;{reasoning.keyInsight}&rdquo;</p>
        </section>
      )}

      {reasoning.questions.length > 0 && (
        <section className="mt-10">
          <p className="text-xs font-semibold tracking-wide text-ink-soft">QUESTIONS TO EXPLORE</p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            {reasoning.questions.map((q) => (
              <li key={q}>→ {q}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
