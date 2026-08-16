import type { ConsensusView } from '@/lib/types/view-model'
import { VoiceTags } from './voice-tags'

export function ConsensusArticle({
  item,
  heading = 'Where they agree',
}: {
  item: ConsensusView
  heading?: string
}) {
  return (
    <article className="flex flex-col border border-line p-6 md:p-8">
      <div className="flex items-center justify-between">
        <span className="mono-label text-[11px] text-ink-soft">{item.index}</span>
        <span className="mono-label text-[11px] text-ink">
          {item.agreeCount} of {item.total} agree
        </span>
      </div>

      <h3 className="mt-5 font-serif text-2xl font-medium leading-tight md:text-3xl">{heading}</h3>

      <blockquote className="mt-5 border-l-2 border-line pl-4 font-serif text-lg leading-relaxed text-pretty md:text-xl">
        {item.claim}
      </blockquote>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
        <VoiceTags voices={item.voices} />
        <a href="#evidence" className="mono-label shrink-0 text-[11px] hover:opacity-60">
          View evidence {'\u2192'}
        </a>
      </div>
    </article>
  )
}
