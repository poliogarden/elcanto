import type { RecommendationView } from '@/lib/types/view-model'

const TYPE_ACTION: Record<string, string> = {
  deepen: 'Go deeper →',
  counter: 'Find counterargument →',
  bridge: 'Bridge clusters →',
  evidence: 'Find evidence →',
  missing_piece: 'Explore this gap →',
}

export function DiscoveryPanel({ recommendations }: { recommendations: RecommendationView[] }) {
  if (recommendations.length === 0) return null

  return (
    <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
      <div className="mb-6 border-b border-line pb-4">
        <span className="mono-label text-xs text-ink-soft">WHERE TO GO NEXT</span>
        <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
          Knowledge-driven discovery
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((rec) => (
          <article key={rec.id} className="flex flex-col border border-line p-5 md:p-6">
            <span className="mono-label text-[10px] text-ink-soft">{rec.typeLabel.toUpperCase()}</span>
            <h3 className="mt-3 font-serif text-xl font-medium leading-tight">{rec.title}</h3>

            <div className="mt-4 border-l-2 border-line pl-4">
              <p className="mono-label text-[10px] text-ink-soft">WHY THIS VIDEO?</p>
              <p className="mt-2 font-serif text-sm leading-relaxed">{rec.reason}</p>
            </div>

            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.searchQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono-label mt-6 inline-block border border-line px-4 py-2 text-[11px] transition-colors hover:bg-ink hover:text-background"
            >
              {TYPE_ACTION[rec.type] ?? 'Search YouTube →'}
            </a>
            <p className="mono mt-2 text-[10px] text-ink-soft">Query: {rec.searchQuery}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
