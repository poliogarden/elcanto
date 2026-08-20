import type { WhatNextView } from '@/lib/types/view-model'

type Props = {
  whatNext: WhatNextView | null
  onExplore?: () => void
}

export function WhatNextPanel({ whatNext, onExplore }: Props) {
  if (!whatNext) return null

  return (
    <section className="border-b border-line px-5 py-10 md:px-8 md:py-12">
      <span className="mono-label text-[10px] text-ink-soft">WHAT NEXT?</span>
      <h2 className="mt-4 max-w-3xl font-serif text-2xl font-medium leading-tight md:text-3xl">
        {whatNext.question}
      </h2>
      <p className="mt-4 max-w-2xl font-serif text-base leading-relaxed text-ink-soft">
        {whatNext.description}
      </p>

      {whatNext.recommendationReason && (
        <div className="mt-8 max-w-2xl border border-line p-5">
          <span className="mono-label text-[10px] text-ink-soft">WHY THIS DIRECTION</span>
          {whatNext.recommendationTitle && (
            <p className="mt-3 font-serif text-lg font-medium">{whatNext.recommendationTitle}</p>
          )}
          <p className="mt-2 font-serif text-sm leading-relaxed text-ink-soft">
            {whatNext.recommendationReason}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onExplore}
        className="mono-label mt-8 bg-ink px-6 py-3 text-[10px] text-background hover:opacity-90"
      >
        EXPLORE →
      </button>
    </section>
  )
}
