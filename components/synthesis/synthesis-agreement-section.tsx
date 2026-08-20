'use client'

import { useState } from 'react'
import { EvidenceDrawer } from '@/components/synthesis/evidence-drawer'
import { SourceChip } from '@/components/synthesis/source-chip'
import type { EditorialComparisonView, ThemeEvidenceView } from '@/lib/types/view-model'
import type { Voice } from '@/lib/types/voice'

type Props = {
  agreements: EditorialComparisonView[]
  disagreements: EditorialComparisonView[]
  allRelationshipsCount: number
  voices: Voice[]
}

function toEvidence(side: EditorialComparisonView['sideA']): ThemeEvidenceView {
  return {
    claimId: side.claimId,
    statement: side.statement,
    voice: side.voice,
    sourceTitle: side.title,
    thumbnail: side.thumbnail,
  }
}

function ComparisonBlock({
  item,
  voices,
  onViewEvidence,
}: {
  item: EditorialComparisonView
  voices: Voice[]
  onViewEvidence: () => void
}) {
  return (
    <article className="max-w-4xl border-t border-line py-10">
      <h3 className="font-serif text-2xl font-medium">{item.title}</h3>
      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <div>
          <p className="mono-label text-[10px] text-ink-soft">{item.sideA.label}</p>
          <SourceChip voice={item.sideA.voice} title={item.sideA.title} thumbnail={item.sideA.thumbnail} voices={voices} />
          <p className="mt-4 font-serif text-lg leading-relaxed">{item.sideA.statement}</p>
        </div>
        <p className="mono self-center text-center text-xs text-ink-soft md:pt-8">VS</p>
        <div>
          <p className="mono-label text-[10px] text-ink-soft">{item.sideB.label}</p>
          <SourceChip voice={item.sideB.voice} title={item.sideB.title} thumbnail={item.sideB.thumbnail} voices={voices} />
          <p className="mt-4 font-serif text-lg leading-relaxed">{item.sideB.statement}</p>
        </div>
      </div>
      <div className="mt-8 border-l-2 border-line pl-5">
        <span className="mono-label text-[10px] text-ink-soft">WHY THIS MATTERS</span>
        <p className="mt-3 max-w-3xl font-serif text-base leading-relaxed text-ink-soft">
          {item.whyItMatters}
        </p>
      </div>
      <button
        type="button"
        onClick={onViewEvidence}
        className="mono-label mt-5 border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
      >
        View evidence
      </button>
    </article>
  )
}

export function SynthesisAgreementSection({
  agreements,
  disagreements,
  allRelationshipsCount,
  voices,
}: Props) {
  const [drawer, setDrawer] = useState<{ title: string; items: ThemeEvidenceView[] } | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (agreements.length === 0 && disagreements.length === 0) return null

  const visibleAgreements = showAll ? agreements : agreements.slice(0, 3)
  const visibleDisagreements = showAll ? disagreements : disagreements.slice(0, 3)

  return (
    <>
      <section className="border-b border-line py-6 md:py-8">
        {disagreements.length > 0 && (
          <>
            <span className="mono-label text-[10px] text-ink-soft">WHERE THEY DISAGREE</span>
            <div className="mt-6">
              {visibleDisagreements.map((item) => (
                <ComparisonBlock
                  key={item.id}
                  item={item}
                  voices={voices}
                  onViewEvidence={() =>
                    setDrawer({
                      title: item.title,
                      items: [toEvidence(item.sideA), toEvidence(item.sideB)],
                    })
                  }
                />
              ))}
            </div>
          </>
        )}

        {agreements.length > 0 && (
          <>
            <span className="mono-label mt-12 block text-[10px] text-ink-soft">
              WHERE THEY AGREE
            </span>
            <div className="mt-6">
              {visibleAgreements.map((item) => (
                <ComparisonBlock
                  key={item.id}
                  item={item}
                  voices={voices}
                  onViewEvidence={() =>
                    setDrawer({
                      title: item.title,
                      items: [toEvidence(item.sideA), toEvidence(item.sideB)],
                    })
                  }
                />
              ))}
            </div>
          </>
        )}

        {!showAll && agreements.length + disagreements.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mono-label mt-8 border border-line px-5 py-3 text-[10px] hover:bg-ink hover:text-background"
          >
            View all relationships ({allRelationshipsCount})
          </button>
        )}
      </section>

      <EvidenceDrawer
        open={Boolean(drawer)}
        items={drawer?.items ?? []}
        title={drawer?.title}
        onClose={() => setDrawer(null)}
      />
    </>
  )
}
