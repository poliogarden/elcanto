'use client'

import type { TwoSourceSetView } from '@/lib/types/view-model'

function Column({
  title,
  subtitle,
  children,
  onAsk,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  onAsk?: () => void
}) {
  return (
    <div className="flex flex-col border border-line">
      <div className="border-b border-line px-4 py-3">
        <h4 className="mono-label text-[10px] text-ink">{title}</h4>
        {subtitle && <p className="mono mt-1 text-[10px] text-ink-soft">{subtitle}</p>}
      </div>
      <div className="flex-1 space-y-3 p-4">{children}</div>
      {onAsk && (
        <button
          type="button"
          onClick={onAsk}
          className="mono-label border-t border-line px-4 py-3 text-left text-[10px] hover:bg-ink hover:text-background"
        >
          Ask this section →
        </button>
      )}
    </div>
  )
}

export function IntersectionDifferencePanel({
  view,
  onAskSection,
}: {
  view: TwoSourceSetView
  onAskSection?: (scope: { type: string; label: string; context: string }) => void
}) {
  const hasShared = view.shared.length > 0
  const hasOnlyA = view.onlyA.some((d) => d.statements.length > 0)
  const hasOnlyB = view.onlyB.some((d) => d.statements.length > 0)

  return (
    <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
      <div className="mb-6 border-b border-line pb-4">
        <span className="mono-label text-xs text-ink-soft">HOW THEY RELATE</span>
        <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
          Intersection & difference
        </h2>
      </div>

      <div className="grid gap-0 md:grid-cols-3">
        <Column
          title={`ONLY ${view.sourceA.title.slice(0, 24)}${view.sourceA.title.length > 24 ? '…' : ''}`}
          subtitle={`Source ${String(view.sourceA.voice).padStart(2, '0')}`}
          onAsk={
            onAskSection
              ? () =>
                  onAskSection({
                    type: 'difference',
                    label: 'Only in source A',
                    context: view.onlyA.map((d) => d.statements.join('; ')).join('\n'),
                  })
              : undefined
          }
        >
          {hasOnlyA ? (
            view.onlyA.flatMap((d) =>
              d.statements.map((s, i) => (
                <p key={`${d.id}-${i}`} className="font-serif text-sm leading-relaxed">
                  {s}
                </p>
              )),
            )
          ) : (
            <p className="mono text-[11px] text-ink-soft">Nothing unique to this source in synthesis.</p>
          )}
        </Column>

        <Column
          title="SHARED"
          subtitle={hasShared ? `${view.shared.length} connection(s)` : 'No strong intersection'}
          onAsk={
            onAskSection && hasShared
              ? () =>
                  onAskSection({
                    type: 'intersection',
                    label: 'Shared area',
                    context: view.shared.map((s) => s.description).join('\n'),
                  })
              : undefined
          }
        >
          {hasShared ? (
            view.shared.map((s) => (
              <div key={s.id} className="border-l-2 border-ink pl-3">
                <p className="mono-label text-[10px] text-ink-soft">{s.kind.replace(/_/g, ' ')}</p>
                <p className="mt-1 font-serif text-sm leading-relaxed">{s.description}</p>
              </div>
            ))
          ) : (
            <p className="mono text-[11px] text-ink-soft">NO STRONG INTERSECTION</p>
          )}
        </Column>

        <Column
          title={`ONLY ${view.sourceB.title.slice(0, 24)}${view.sourceB.title.length > 24 ? '…' : ''}`}
          subtitle={`Source ${String(view.sourceB.voice).padStart(2, '0')}`}
          onAsk={
            onAskSection
              ? () =>
                  onAskSection({
                    type: 'difference',
                    label: 'Only in source B',
                    context: view.onlyB.map((d) => d.statements.join('; ')).join('\n'),
                  })
              : undefined
          }
        >
          {hasOnlyB ? (
            view.onlyB.flatMap((d) =>
              d.statements.map((s, i) => (
                <p key={`${d.id}-${i}`} className="font-serif text-sm leading-relaxed">
                  {s}
                </p>
              )),
            )
          ) : (
            <p className="mono text-[11px] text-ink-soft">Nothing unique to this source in synthesis.</p>
          )}
        </Column>
      </div>

      {view.contradictions.length > 0 && (
        <div className="mt-6 border border-line p-5">
          <h4 className="mono-label text-[10px] text-ink">CONTRADICTIONS</h4>
          <div className="mt-3 space-y-3">
            {view.contradictions.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-4">
                <p className="font-serif text-sm leading-relaxed">{c.description}</p>
                {onAskSection && (
                  <button
                    type="button"
                    onClick={() =>
                      onAskSection({
                        type: 'contradiction',
                        label: 'Contradiction',
                        context: c.description,
                      })
                    }
                    className="mono-label shrink-0 text-[10px] hover:opacity-60"
                  >
                    Ask →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
