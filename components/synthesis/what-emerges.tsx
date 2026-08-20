import type { SectionView } from '@/lib/types/view-model'
import { SynthesisSectionArticle } from './synthesis-section-article'

export function WhatEmerges({
  emergentStatement,
  sections,
  noStrongRelationship,
}: {
  emergentStatement: string
  sections: SectionView[]
  noStrongRelationship: boolean
}) {
  if (!emergentStatement && sections.length === 0) return null

  return (
    <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
      <div className="mb-8 border-b border-line pb-4">
        <span className="mono-label text-xs text-ink-soft">03 / WHAT EMERGES</span>
        <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
          Cross-source synthesis
        </h2>
      </div>

      {emergentStatement && (
        <blockquote className="mb-8 border-l-2 border-ink pl-5 font-serif text-xl leading-relaxed md:text-2xl">
          {emergentStatement}
        </blockquote>
      )}

      {noStrongRelationship && !emergentStatement && (
        <p className="mb-8 font-serif text-lg text-ink-soft">
          No strong cross-source pattern emerged. Each source stands on its own.
        </p>
      )}

      {sections.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((s) => (
            <SynthesisSectionArticle key={s.id} item={s} />
          ))}
        </div>
      )}
    </section>
  )
}
