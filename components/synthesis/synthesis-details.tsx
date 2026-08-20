'use client'

import { useState } from 'react'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { AskSynthesis } from '@/components/synthesis/ask-synthesis'
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

type Panel = 'relationships' | 'evidence' | 'voices' | 'insights' | 'gaps' | 'discovery' | null

export function SynthesisDetails({ view, document, askScope, onAskScope }: Props) {
  const [open, setOpen] = useState<Panel>(null)

  const links: Array<{ id: Panel; label: string }> = [
    { id: 'relationships', label: 'Explore relationships' },
    { id: 'evidence', label: 'View evidence' },
    { id: 'insights', label: 'All insights' },
    { id: 'gaps', label: 'Knowledge gaps' },
    { id: 'discovery', label: 'Discovery' },
    { id: 'voices', label: 'Sources' },
  ]

  return (
    <section className="border-b border-line px-5 py-8 md:px-8">
      <div className="flex flex-wrap gap-2 border-b border-line pb-6">
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

      {open === 'relationships' && (
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

      {open === 'evidence' && view.evidence.length > 0 && (
        <div className="py-6">
          <EvidenceArticle items={view.evidence} />
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

      {open === 'voices' && (
        <div className="py-6">
          <VoiceIndex voices={view.voices} />
        </div>
      )}

      <AskSynthesis
        view={view}
        document={document}
        scope={askScope}
        onClearScope={() => onAskScope(null)}
      />
    </section>
  )
}
