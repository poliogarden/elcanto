import type { Synthesis } from '@/lib/mock-data'

export function QuietVoiceArticle({ minority }: { minority: Synthesis['minority'] }) {
  return (
    <article className="border border-line p-6 md:p-10">
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-5">
          <span className="mono-label text-[11px] text-ink-soft">03 / Quiet voices</span>
          <h3 className="mt-4 font-serif text-3xl font-medium leading-[1.05] tracking-tight text-balance md:text-5xl">
            Almost nobody talked about this.
          </h3>
          <p className="mono-label mt-6 text-[11px] text-ink">
            Only {minority.mentionedBy} of {minority.total} voices mentioned it
          </p>
        </div>

        <div className="flex flex-col justify-between md:col-span-7 md:border-l md:border-line md:pl-8">
          <blockquote className="font-serif text-2xl leading-snug text-pretty md:text-3xl">
            {minority.claim}
          </blockquote>
          <p className="mt-6 font-serif text-base leading-relaxed text-ink-soft text-pretty md:text-lg">
            {minority.detail}
          </p>
          <p className="mono-label mt-8 border-t border-line pt-4 text-[11px] text-ink-soft">
            {minority.mentionedBy} / {minority.total} voices
            <span className="mx-3 text-line">|</span>
            <span className="text-ink">Minority {'\u2260'} wrong</span>
          </p>
        </div>
      </div>
    </article>
  )
}
