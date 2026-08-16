import type { EvidenceView } from '@/lib/types/view-model'

export function EvidenceArticle({ items }: { items: EvidenceView[] }) {
  return (
    <section id="evidence" className="border border-line">
      <div className="border-b border-line p-6 md:p-8">
        <span className="mono-label text-[11px] text-ink-soft">04 / Evidence</span>
        <h3 className="mt-4 font-serif text-3xl font-medium leading-tight tracking-tight text-balance md:text-4xl">
          Don&apos;t trust the summary. Check the tape.
        </h3>
        <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft text-pretty">
          Every claim links back to the moment it was made. Verify the synthesis against the source.
        </p>
      </div>

      <div className="grid md:grid-cols-2">
        {items.map((e, i) => (
          <article
            key={`${e.voice}-${e.timestamp}`}
            className={`flex flex-col p-6 md:p-8 ${i % 2 === 0 ? 'md:border-r md:border-line' : ''} ${
              i >= 2 ? 'border-t border-line' : ''
            } ${i >= 1 && i < 2 ? 'border-t border-line md:border-t-0' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="mono-label text-[11px] text-ink">
                Voice {String(e.voice).padStart(2, '0')}
              </span>
              <span className="mono text-[11px] text-ink-soft">{e.timestamp}</span>
            </div>
            <h4 className="mt-3 font-serif text-xl font-medium leading-tight md:text-2xl">{e.title}</h4>
            <p className="mt-4 flex-1 font-serif text-base leading-relaxed text-pretty md:text-lg">
              {e.excerpt}
            </p>
            <a
              href={e.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mono-label mt-6 inline-flex w-fit border border-line px-3 py-2 text-[10px] text-ink transition-colors hover:bg-ink hover:text-background"
            >
              Watch from {e.timestamp} {'\u2192'}
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
