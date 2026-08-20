import type { SynthesisViewModel } from '@/lib/types/view-model'

export function BottomLineFeature({ view }: { view: SynthesisViewModel }) {
  return (
    <article className="border border-line bg-mint p-5 text-mint-ink md:p-7">
      <span className="mono-label inline-block border border-mint-ink px-2 py-1 text-[10px]">
        {view.bottomLineLabel}
      </span>

      <h2 className="mt-5 font-serif text-2xl font-medium leading-[1.08] tracking-tight text-balance md:text-3xl">
        {view.bottomLineHeadline.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </h2>

      <div className="mt-5 space-y-3 border-t border-mint-ink/30 pt-4">
        {view.bottomLine.map((p, i) => (
          <p key={i} className="font-serif text-sm leading-relaxed text-pretty md:text-base">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-mint-ink/30 pt-4">
        <span className="mono-label text-[10px]">{view.synthesisTypeLabel}</span>
        <span className="mono-label text-[10px]">{view.readyVoiceCount} voices</span>
      </div>
    </article>
  )
}
