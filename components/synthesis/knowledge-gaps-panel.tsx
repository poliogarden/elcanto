import type { KnowledgeGapView } from '@/lib/types/view-model'

export function KnowledgeGapsPanel({
  gaps,
  onAskGap,
}: {
  gaps: KnowledgeGapView[]
  onAskGap?: (gap: KnowledgeGapView) => void
}) {
  return (
    <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
      <div className="mb-6 border-b border-line pb-4">
        <span className="mono-label text-xs text-ink-soft">WHAT&apos;S MISSING?</span>
        <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
          Knowledge gaps
        </h2>
        <p className="mono-label mt-2 text-xs text-ink-soft">
          Questions these sources leave unanswered
        </p>
      </div>

      {gaps.length > 0 ? (
        <div className="space-y-4">
          {gaps.map((gap) => (
            <article key={gap.id} className="border border-line p-5 md:p-6">
              <span className="mono-label text-[10px] text-ink-soft">KNOWN → MISSING</span>
              <h3 className="mt-3 font-serif text-xl font-medium leading-tight md:text-2xl">
                {gap.question}
              </h3>
              <p className="mt-3 font-serif text-base leading-relaxed text-ink-soft">
                {gap.description}
              </p>
              {onAskGap && (
                <button
                  type="button"
                  onClick={() => onAskGap(gap)}
                  className="mono-label mt-5 text-[11px] hover:opacity-60"
                >
                  Explore this gap →
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="font-serif text-base text-ink-soft">
          No specific knowledge gaps identified. Sources may be too independent or already cover their
          scope.
        </p>
      )}
    </section>
  )
}
