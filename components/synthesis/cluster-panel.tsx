import type { ClusterView } from '@/lib/types/view-model'

export function ClusterPanel({ clusters }: { clusters: ClusterView[] }) {
  if (clusters.length === 0) return null

  return (
    <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
      <div className="mb-6 border-b border-line pb-4">
        <span className="mono-label text-xs text-ink-soft">CLUSTERS</span>
        <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
          Schools of thought
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clusters.map((cluster) => (
          <article key={cluster.id} className="border border-line p-5">
            <span className="mono-label text-[10px] text-ink-soft">
              {cluster.sourceIds.length} sources
            </span>
            <h3 className="mt-2 font-serif text-xl font-medium">{cluster.label}</h3>
            <p className="mono-label mt-1 text-[10px] text-ink-soft">{cluster.topic}</p>
            <p className="mt-3 font-serif text-sm leading-relaxed text-ink-soft">
              {cluster.explanation}
            </p>
            <p className="mono mt-4 text-[11px] text-ink-soft">
              Voices: {cluster.voices.map((v) => String(v).padStart(2, '0')).join(', ')}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
