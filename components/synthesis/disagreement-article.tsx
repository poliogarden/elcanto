import type { DisagreementView } from '@/lib/types/view-model'
import { VoiceTags } from './voice-tags'

function Side({
  label,
  count,
  summary,
  voices,
  filled,
}: {
  label: string
  count: number
  summary: string
  voices: number[]
  filled?: boolean
}) {
  return (
    <div
      className={`flex flex-col p-6 md:p-8 ${filled ? 'bg-ink text-background' : 'bg-background text-ink'}`}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-serif text-4xl font-medium md:text-5xl">{label}</span>
        <span className="mono-label text-[11px] opacity-70">{count} voices</span>
      </div>
      <p className="mt-5 font-serif text-base leading-relaxed text-pretty md:text-lg">{summary}</p>
      <div className="mt-6 border-t border-current/25 pt-4">
        <p className="mono-label mb-2 text-[10px] opacity-70">Voices</p>
        <div className="[&_span]:border-current [&_span]:text-current">
          <VoiceTags voices={voices} />
        </div>
      </div>
    </div>
  )
}

export function DisagreementArticle({ item }: { item: DisagreementView }) {
  return (
    <section className="border border-line">
      <div className="border-b border-line p-6 md:p-8">
        <span className="mono-label text-[11px] text-ink-soft">02 / Disagreement</span>
        <h3 className="mt-4 font-serif text-3xl font-medium leading-tight tracking-tight text-balance md:text-4xl">
          Where they disagree
        </h3>
        <p className="mt-3 font-serif text-xl italic text-ink-soft md:text-2xl">{item.question}</p>
      </div>

      <div className="relative grid md:grid-cols-2">
        <div className="md:border-r md:border-line">
          <Side {...item.yes} filled />
        </div>
        <div className="border-t border-line md:border-t-0">
          <Side {...item.no} />
        </div>
        <span className="mono-label absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 border border-line bg-background px-3 py-2 text-[11px] text-ink md:block">
          vs
        </span>
      </div>
    </section>
  )
}
