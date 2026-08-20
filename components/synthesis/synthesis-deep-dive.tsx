'use client'

import { useState } from 'react'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { ClusterPanel } from '@/components/synthesis/cluster-panel'
import { DiscoveryPanel } from '@/components/synthesis/discovery-panel'
import { EvidenceArticle } from '@/components/synthesis/evidence-article'
import { InsightsArticle } from '@/components/synthesis/insights-article'
import { IntersectionDifferencePanel } from '@/components/synthesis/intersection-difference-panel'
import { KnowledgeGapsPanel } from '@/components/synthesis/knowledge-gaps-panel'
import { SynthesisMap } from '@/components/synthesis/synthesis-map'
import { VoiceIndex } from '@/components/voice-index'
import { WhatEmerges } from '@/components/synthesis/what-emerges'
import type { AskScope } from '@/components/synthesis-view'

type Props = {
  view: SynthesisViewModel
  document: SynthesisDocument
  askScope: AskScope | null
  onAskScope: (scope: AskScope | null) => void
}

type Panel = 'map' | 'claims' | 'sources' | 'relationships' | 'insights' | 'gaps' | 'discovery' | null

export function SynthesisDeepDive({ view, document, askScope, onAskScope }: Props) {
  const [open, setOpen] = useState<Panel>(null)

  const links: Array<{ id: Panel; label: string }> = [
    { id: 'map', label: 'Relationship map' },
    { id: 'claims', label: 'All claims' },
    { id: 'sources', label: 'Source summaries' },
    { id: 'relationships', label: 'All relationships' },
    { id: 'insights', label: 'All insights' },
    { id: 'gaps', label: 'Knowledge gaps' },
    { id: 'discovery', label: 'Discovery' },
  ]

  return (
    <section className="border-b border-line py-6 md:py-8">
      <span className="mono-label text-[10px] text-ink-soft">EXPLORE THE EVIDENCE</span>
      <h2 className="mt-3 font-serif text-3xl font-medium">Deep dive</h2>
      <p className="mt-3 max-w-2xl font-serif text-base text-ink-soft">
        Relationship graph, raw claims, source details, and engine diagnostics — for when you want
        to verify the reasoning yourself.
      </p>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-line pb-6">
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => setOpen(open === link.id ? null : link.id)}
            className={`mono-label border px-4 py-2 text-[10px] ${
              open === link.id
                ? 'border-ink bg-ink text-background'
                : 'border-line text-ink hover:bg-ink hover:text-background'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>

      {open === 'map' && (
        <>
          {view.workspaceMode === 'pair' && view.twoSourceView && (
            <IntersectionDifferencePanel
              view={view.twoSourceView}
              onAskSection={(scope) => onAskScope(scope)}
            />
          )}
          {(view.workspaceMode === 'small' || view.workspaceMode === 'cluster') && (
            <SynthesisMap
              sources={view.sourceReasoning}
              relationships={view.meaningfulRelationships}
              independentRelationships={view.independentRelationships}
              patterns={view.patterns}
              noStrongRelationship={view.noStrongIntersection || view.noStrongRelationship}
            />
          )}
          {view.workspaceMode === 'cluster' && <ClusterPanel clusters={view.clusters} />}
          <WhatEmerges
            emergentStatement={view.emergentStatement}
            sections={view.sections}
            noStrongRelationship={view.noStrongIntersection}
          />
        </>
      )}

      {open === 'claims' && (
        <div className="py-6">
          <InsightsArticle items={view.insights} />
          <div className="mt-8 space-y-4">
            {view.sourceReasoning.map((source) => (
              <article key={source.sourceId} className="border border-line p-5">
                <p className="mono text-[10px] text-ink-soft">
                  SOURCE {String(source.voice).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-serif text-xl font-medium">{source.title}</h3>
                <ul className="mt-4 space-y-2">
                  {source.coreClaims.map((claim) => (
                    <li key={claim.id} className="font-serif text-base text-ink-soft">
                      {claim.statement}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      )}

      {open === 'sources' && (
        <div className="py-6">
          <VoiceIndex voices={view.voices} />
        </div>
      )}

      {open === 'relationships' && (
        <div className="py-6">
          <SynthesisMap
            sources={view.sourceReasoning}
            relationships={view.relationships}
            independentRelationships={view.independentRelationships}
            patterns={view.patterns}
            noStrongRelationship={view.noStrongRelationship}
          />
        </div>
      )}

      {open === 'insights' && (
        <div className="py-6">
          <InsightsArticle items={view.insights} />
        </div>
      )}

      {open === 'gaps' && (
        <div className="py-6">
          <KnowledgeGapsPanel
            gaps={view.knowledgeGaps}
            onAskGap={(gap) =>
              onAskScope({ type: 'gap', label: gap.question, context: gap.description })
            }
          />
        </div>
      )}

      {open === 'discovery' && (
        <div className="py-6">
          <DiscoveryPanel recommendations={view.recommendations} />
        </div>
      )}

      {open === 'map' && view.allEvidence.length > 0 && (
        <div className="border-t border-line py-6">
          <EvidenceArticle items={view.allEvidence} />
        </div>
      )}
    </section>
  )
}
