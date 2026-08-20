'use client'

import { AsterismMark } from '@/components/brand/asterism-mark'
import type { FourthIdeaView } from '@/lib/types/view-model'
import type { InsightGraphSummary } from '@/lib/types/insight-graph'

type Props = {
  statement: string
  fourthIdea: FourthIdeaView | null
  graphSummary: InsightGraphSummary
  claimsCount?: number
  noStrongRelationship: boolean
  onExploreMap: () => void
}

export function SynthesisInsightHero({
  statement,
  fourthIdea,
  graphSummary,
  claimsCount,
  noStrongRelationship,
  onExploreMap,
}: Props) {
  if (!statement && noStrongRelationship) {
    return (
      <section className="border-b border-line bg-paper-2 py-10 md:py-12">
        <p className="mono-label text-[10px] text-ink-soft">03 / SEE WHAT EMERGES</p>
        <p className="mt-6 max-w-3xl font-serif text-3xl font-medium leading-tight md:text-4xl">
          These voices do not strongly converge.
        </p>
        <p className="mt-4 max-w-2xl font-serif text-lg text-ink-soft">
          No strong emergent insight found — and that is a valid result.
        </p>
      </section>
    )
  }

  if (!statement) return null

  return (
    <section id="what-emerges" className="border-b border-line bg-paper-2 py-10 md:py-12">
      <p className="mono-label text-[10px] text-ink-soft">03 / SEE WHAT EMERGES</p>

      <div className="mt-8 flex justify-center">
        <AsterismMark size={32} className="text-mint-ink" />
      </div>

      <p className="mono-label mt-6 text-center text-[10px] text-mint-ink">EMERGENT INSIGHT</p>

      <blockquote className="mx-auto mt-4 max-w-3xl text-center font-serif text-3xl font-medium leading-[1.12] tracking-tight md:text-5xl">
        &ldquo;{statement}&rdquo;
      </blockquote>

      {fourthIdea?.explanation && (
        <p className="mx-auto mt-6 max-w-2xl text-center font-serif text-lg leading-relaxed text-ink-soft">
          {fourthIdea.explanation.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ')}
        </p>
      )}

      <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-8 gap-y-3 border-t border-line pt-6">
        <Stat label="VOICES" value={graphSummary.voiceCount} />
        {claimsCount != null && claimsCount > 0 && (
          <Stat label="CLAIMS" value={claimsCount} />
        )}
        <Stat label="CONNECTIONS" value={graphSummary.connectionCount} />
        <Stat label="DISAGREEMENTS" value={graphSummary.disagreementCount} />
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onExploreMap}
          className="mono-label border border-ink bg-ink px-6 py-3 text-[10px] text-background transition-opacity hover:opacity-90"
        >
          VIEW RELATIONSHIP MAP →
        </button>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-serif text-2xl font-medium tabular-nums">{value}</p>
      <p className="mono-label mt-1 text-[10px] text-ink-soft">{label}</p>
    </div>
  )
}
