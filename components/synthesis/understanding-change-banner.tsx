import type { UnderstandingChangeView } from '@/lib/types/view-model'

type Props = {
  change: UnderstandingChangeView
}

export function UnderstandingChangeBanner({ change }: Props) {
  return (
    <section className="border-b border-line bg-paper-2 py-5 md:py-6">
      <span className="mono-label text-[10px] text-ink-soft">YOUR UNDERSTANDING CHANGED</span>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <span className="mono-label text-[10px] text-ink-soft">BEFORE</span>
          <p className="mt-3 font-serif text-lg leading-relaxed">&ldquo;{change.before}&rdquo;</p>
        </div>
        <div>
          <span className="mono-label text-[10px] text-ink-soft">AFTER</span>
          <p className="mt-3 font-serif text-lg leading-relaxed">&ldquo;{change.after}&rdquo;</p>
        </div>
      </div>
    </section>
  )
}
