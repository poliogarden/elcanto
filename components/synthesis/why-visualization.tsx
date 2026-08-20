import type { SynthesisViewModel } from '@/lib/types/view-model'

type Props = {
  view: SynthesisViewModel
}

export function WhyVisualization({ view }: Props) {
  const voices = view.sourceReasoning.map((s) => s.voice)
  const ideaLabel = 'FOURTH IDEA'

  if (view.workspaceMode === 'pair' && view.twoSourceView) {
    const { sourceA, sourceB } = view.twoSourceView
    return (
      <section className="border-b border-line px-5 py-10 md:px-8">
        <span className="mono-label text-[10px] text-ink-soft">WHY?</span>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div className="border border-line p-5">
            <span className="mono-label text-[10px] text-ink-soft">ONLY {String(sourceA.voice).padStart(2, '0')}</span>
            <ul className="mt-4 space-y-2">
              {view.twoSourceView.onlyA.slice(0, 2).map((d) =>
                d.statements.slice(0, 1).map((s, i) => (
                  <li key={`${d.id}-${i}`} className="font-serif text-sm leading-relaxed">
                    {s}
                  </li>
                )),
              )}
            </ul>
          </div>
          <div className="border border-line p-5">
            <span className="mono-label text-[10px] text-ink-soft">SHARED</span>
            <ul className="mt-4 space-y-2">
              {view.twoSourceView.shared.slice(0, 2).map((s) => (
                <li key={s.id} className="font-serif text-sm leading-relaxed">
                  {s.description}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-line pt-4 text-center">
              <span className="mono-label text-[10px] text-ink">●</span>
              <p className="mono-label mt-2 text-[10px]">{ideaLabel}</p>
            </div>
          </div>
          <div className="border border-line p-5">
            <span className="mono-label text-[10px] text-ink-soft">ONLY {String(sourceB.voice).padStart(2, '0')}</span>
            <ul className="mt-4 space-y-2">
              {view.twoSourceView.onlyB.slice(0, 2).map((d) =>
                d.statements.slice(0, 1).map((s, i) => (
                  <li key={`${d.id}-${i}`} className="font-serif text-sm leading-relaxed">
                    {s}
                  </li>
                )),
              )}
            </ul>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="border-b border-line px-5 py-10 md:px-8">
      <span className="mono-label text-[10px] text-ink-soft">WHY?</span>
      <div className="mt-10 flex flex-col items-center">
        <div className="flex w-full max-w-2xl flex-wrap justify-center gap-6 md:gap-10">
          {voices.slice(0, 6).map((voice) => (
            <div key={voice} className="flex flex-col items-center">
              <span className="mono text-[11px] text-ink">SOURCE {String(voice).padStart(2, '0')}</span>
              <span className="mt-2 h-12 w-px bg-line" aria-hidden />
            </div>
          ))}
        </div>
        <div className="relative -mt-1 flex w-full max-w-xl items-center justify-center">
          <div className="h-px flex-1 bg-line" />
          <div className="mx-4 flex flex-col items-center">
            <span className="text-2xl text-ink" aria-hidden>
              ●
            </span>
            <span className="mono-label mt-2 text-[10px] text-ink">{ideaLabel}</span>
          </div>
          <div className="h-px flex-1 bg-line" />
        </div>
        {view.patterns[0] && (
          <p className="mt-8 max-w-xl text-center font-serif text-base leading-relaxed text-ink-soft">
            {view.patterns[0].description}
          </p>
        )}
      </div>
    </section>
  )
}
