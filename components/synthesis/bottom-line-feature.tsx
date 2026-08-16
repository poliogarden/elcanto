import type { SynthesisViewModel } from '@/lib/types/view-model'

export function BottomLineFeature({ view }: { view: SynthesisViewModel }) {
  return (
    <article className="flex h-full flex-col justify-between border border-line bg-mint p-6 text-mint-ink md:p-10">
      <div>
        <span className="mono-label inline-block border border-mint-ink px-2 py-1 text-[10px]">
          {view.bottomLineLabel}
        </span>

        <h2 className="mt-8 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-balance md:text-6xl">
          {view.bottomLineHeadline.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h2>

        <div className="mt-8 space-y-4 border-t border-mint-ink/30 pt-6">
          {view.bottomLine.map((p, i) => (
            <p key={i} className="font-serif text-base leading-relaxed text-pretty md:text-lg">
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-mint-ink/30 pt-5">
        <span className="mono-label text-[11px]">Based on {view.readyVoiceCount} voices</span>
        <a href="#the-voices" className="mono-label text-[11px] hover:opacity-60">
          Read full synthesis {'\u2192'}
        </a>
      </div>
    </article>
  )
}
