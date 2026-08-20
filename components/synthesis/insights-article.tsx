'use client'

import { useState } from 'react'
import type {
  InsightView,
  InspectStatsView,
  RejectedInsightView,
  RelationshipView,
} from '@/lib/types/view-model'
import type { SynthesisResult } from '@/lib/types/analysis'
import { isSynthesisDebugEnabled } from '@/lib/synthesis/debug'

function DerivationChain({ steps }: { steps: InsightView['derivationSteps'] }) {
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <span className="mono-label shrink-0 text-[10px] text-ink-soft">
            {step.kind === 'claim'
              ? 'CLAIM'
              : step.kind === 'relationship'
                ? 'REL'
                : step.kind === 'pattern'
                  ? 'PATTERN'
                  : 'INSIGHT'}
          </span>
          <div>
            <p className="mono-label text-[10px] text-ink">{step.label}</p>
            <p className="mt-1 font-serif text-sm leading-relaxed text-ink-soft">{step.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function InsightCard({ item }: { item: InsightView }) {
  const [showDerivation, setShowDerivation] = useState(false)

  return (
    <article className="flex flex-col border border-line p-6 md:p-8">
      <span className="mono-label text-[10px] text-ink-soft">{item.typeLabel}</span>
      <h3 className="mt-4 font-serif text-xl font-medium leading-tight md:text-2xl">
        {item.statement}
      </h3>

      {process.env.NEXT_PUBLIC_SYNTHESIS_DEBUG === 'true' && (
        <p className="mono mt-2 text-[10px] text-ink-soft">
          novelty {item.noveltyScore.toFixed(2)} · confidence {item.confidence.toFixed(2)}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowDerivation((v) => !v)}
        className="mono-label mt-5 self-start text-[11px] hover:opacity-60"
      >
        {showDerivation ? 'Hide derivation' : 'Why this insight? →'}
      </button>

      {showDerivation && <DerivationChain steps={item.derivationSteps} />}
    </article>
  )
}

export function InsightsArticle({ items }: { items: InsightView[] }) {
  return (
    <section className="border-b border-line py-6 md:py-8 md:py-10">
      <div className="mb-8 border-b border-line pb-4">
        <span className="mono-label text-xs text-ink-soft">04 / SO WHAT?</span>
        <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
          New understanding
        </h2>
        <p className="mono-label mt-2 text-xs text-ink-soft">
          Insights you could not get from any single source alone
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <InsightCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="border border-line p-6 text-center">
          <p className="mono-label text-[11px] text-ink-soft">NO CROSS-SOURCE INSIGHT GENERATED</p>
          <p className="mt-2 font-serif text-base text-ink-soft">
            No insight is better than a fake insight. These sources may be too independent to
            synthesize meaningfully.
          </p>
        </div>
      )}
    </section>
  )
}

export function SynthesisInspectPanel({
  stats,
  relationships,
  rejectedInsights,
  result,
}: {
  stats: InspectStatsView
  relationships: RelationshipView[]
  rejectedInsights: RejectedInsightView[]
  result: SynthesisResult
}) {
  const [open, setOpen] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  if (!isSynthesisDebugEnabled()) return null

  const topRel = relationships.find((r) => r.isMeaningful)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mono-label fixed bottom-6 right-6 z-50 border border-line bg-background px-4 py-2 text-[11px] shadow-sm hover:bg-ink hover:text-background"
      >
        Inspect synthesis
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/20">
          <div className="h-full w-full max-w-lg overflow-y-auto border-l border-line bg-background p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="mono-label text-xs">INSPECT SYNTHESIS</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mono-label text-[11px] hover:opacity-60"
              >
                Close ×
              </button>
            </div>

            <dl className="mono mt-6 space-y-3 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-ink-soft">SOURCES</dt>
                <dd>{stats.sourceCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">CLAIMS EXTRACTED</dt>
                <dd>{stats.claimsExtracted}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">RELATIONSHIPS TESTED</dt>
                <dd>{stats.relationshipsTested}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">MEANINGFUL RELATIONSHIPS</dt>
                <dd>{stats.meaningfulRelationships}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">AGREEMENTS</dt>
                <dd>{stats.agreements}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">CONTRADICTIONS</dt>
                <dd>{stats.contradictions}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">STRUCTURAL PARALLELS</dt>
                <dd>{stats.structuralParallels}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">MODERATE</dt>
                <dd>{stats.moderate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">WEAK</dt>
                <dd>{stats.weak}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">INDEPENDENT</dt>
                <dd>{stats.independent}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">PATTERNS</dt>
                <dd>{stats.patterns}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">INSIGHTS GENERATED</dt>
                <dd>{stats.insights}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">INSIGHTS REJECTED</dt>
                <dd>{stats.rejectedInsights}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">KNOWLEDGE GAPS</dt>
                <dd>{stats.knowledgeGaps}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">CLUSTERS</dt>
                <dd>{stats.clusters}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">FOURTH IDEA</dt>
                <dd>{result.fourthIdea ? 'selected' : 'none'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">FOURTH IDEA CANDIDATES</dt>
                <dd>{result.fourthIdeaCandidates?.length ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">STRONG</dt>
                <dd>{stats.strong}</dd>
              </div>
            </dl>

            {rejectedInsights.length > 0 && (
              <div className="mt-8 border-t border-line pt-6">
                <p className="mono-label text-[10px] text-ink-soft">REJECTED INSIGHTS</p>
                <div className="mt-3 space-y-3">
                  {rejectedInsights.map((r) => (
                    <div key={r.id} className="border border-dashed border-line p-3">
                      <p className="font-serif text-sm">{r.statement}</p>
                      <p className="mono mt-2 text-[10px] text-ink-soft">
                        {r.reasons.join(' · ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topRel && (
              <div className="mt-8 border-t border-line pt-6">
                <p className="mono-label text-[10px] text-ink-soft">SELECTED RELATIONSHIP</p>
                <p className="mono mt-2 text-[11px]">{topRel.id}</p>
                <p className="mt-2 font-serif text-sm">{topRel.fromClaim}</p>
                <p className="mono-label my-2 text-center text-[10px]">{topRel.typeLabel}</p>
                <p className="font-serif text-sm">{topRel.toClaim}</p>
                <p className="mono mt-3 text-[11px] text-ink-soft">
                  STRENGTH {topRel.strength.toFixed(2)} · CONFIDENCE {topRel.confidence.toFixed(2)}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="mono-label mt-8 text-[11px] hover:opacity-60"
            >
              {showRaw ? 'Hide raw JSON' : 'View raw synthesis JSON →'}
            </button>

            {showRaw && (
              <pre className="mono mt-4 max-h-96 overflow-auto border border-line p-3 text-[9px] leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </>
  )
}
