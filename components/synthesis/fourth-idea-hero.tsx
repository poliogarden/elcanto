import type { FourthIdeaView } from '@/lib/types/view-model'

type Props = {
  view: {
    readyVoiceCount: number
    synthesisTypeLabel: string
    noStrongRelationship: boolean
    noStrongIntersection: boolean
  }
  fourthIdea: FourthIdeaView | null
  fallbackStatement?: string
}

export function FourthIdeaHero({ view, fourthIdea, fallbackStatement }: Props) {
  const statement = fourthIdea?.statement ?? fallbackStatement
  const showNoRelationship = view.noStrongRelationship || view.noStrongIntersection

  return (
    <section className="border-b border-line px-5 py-12 md:px-8 md:py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <span className="mono-label text-xs text-ink">
          {String(view.readyVoiceCount).padStart(2, '0')} SOURCES
        </span>
        <span className="mono-label text-xs text-ink-soft">{view.synthesisTypeLabel}</span>
      </div>

      <span className="mono-label text-[10px] text-ink-soft">FOURTH IDEA</span>

      {statement ? (
        <blockquote className="mt-6 max-w-4xl font-serif text-3xl font-medium leading-[1.15] tracking-tight text-balance md:text-5xl">
          &ldquo;{statement}&rdquo;
        </blockquote>
      ) : showNoRelationship ? (
        <div className="mt-6 max-w-3xl">
          <p className="font-serif text-3xl font-medium leading-tight md:text-4xl">
            No strong relationship
          </p>
          <p className="mt-4 font-serif text-lg leading-relaxed text-ink-soft">
            These sources may share a topic, but no meaningful cross-source insight emerged.
            No insight is better than a fake insight.
          </p>
        </div>
      ) : (
        <p className="mt-6 font-serif text-2xl text-ink-soft">
          A fourth idea could not be formed from these sources.
        </p>
      )}

      {fourthIdea?.explanation && (
        <p className="mt-8 max-w-2xl font-serif text-base leading-relaxed text-ink-soft md:text-lg">
          {fourthIdea.explanation}
        </p>
      )}
    </section>
  )
}
