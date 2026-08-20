import type { SynthesisResult } from '@/lib/types/analysis'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SourceReasoning } from '@/lib/types/relationship'

const EMPTY_SET_ANALYSIS: SynthesisResult['setAnalysis'] = {
  intersections: [],
  differences: [],
  contradictions: [],
  noStrongIntersection: true,
}

const EMPTY_KNOWLEDGE: SynthesisResult['knowledge'] = {
  gaps: [],
  recommendations: [],
  rejectedInsights: [],
}

function buildSourcesFromVoices(doc: SynthesisDocument): SourceReasoning[] {
  return doc.voices
    .filter((v) => v.analysis && !v.error)
    .map((entry) => ({
      sourceId: entry.analysis!.sourceId,
      title: entry.voice.title,
      coreClaims: (entry.analysis!.claims ?? []).slice(0, 8).map((claim) => ({
        id: claim.id,
        statement: claim.statement,
        evidenceIds: [],
      })),
    }))
}

/** Backfill v3 and older cached/archive documents missing reasoning fields. */
export function normalizeSynthesisResult(doc: SynthesisDocument): SynthesisResult | null {
  const raw = doc.result as Partial<SynthesisResult> & {
    bottomLine?: string
    topic?: string
    sections?: SynthesisResult['synthesis']['sections']
    synthesisType?: SynthesisResult['synthesis']['synthesisType']
  } | null

  if (!raw) return null

  const synthesis =
    raw.synthesis ??
    (raw.bottomLine || raw.topic
      ? {
          synthesisType: raw.synthesisType ?? 'mixed',
          topic: raw.topic ?? doc.topic ?? 'Synthesis',
          bottomLine: raw.bottomLine ?? '',
          overallConclusion: raw.bottomLine ?? '',
          emergentStatement: '',
          sections: raw.sections ?? [],
          usedSourceIds: doc.voices
            .filter((v) => v.analysis && !v.error)
            .map((v) => v.analysis!.sourceId),
          sourceContributions: [],
          noStrongRelationship: true,
        }
      : null)

  if (!synthesis) return null

  const sources =
    raw.sources && raw.sources.length > 0 ? raw.sources : buildSourcesFromVoices(doc)

  return {
    sources,
    relationships: raw.relationships ?? [],
    patterns: raw.patterns ?? [],
    setAnalysis: raw.setAnalysis ?? EMPTY_SET_ANALYSIS,
    synthesis: {
      ...synthesis,
      sections: synthesis.sections ?? [],
      usedSourceIds:
        synthesis.usedSourceIds?.length > 0
          ? synthesis.usedSourceIds
          : sources.map((s) => s.sourceId),
      sourceContributions: synthesis.sourceContributions ?? [],
      emergentStatement: synthesis.emergentStatement ?? '',
      noStrongRelationship: synthesis.noStrongRelationship ?? true,
    },
    insights: raw.insights ?? [],
    knowledge: raw.knowledge ?? EMPTY_KNOWLEDGE,
    fourthIdea: raw.fourthIdea ?? null,
    fourthIdeaCandidates: raw.fourthIdeaCandidates ?? [],
    understandingChange: raw.understandingChange ?? null,
    relationshipGraph: raw.relationshipGraph,
    themes: raw.themes ?? [],
    findings: raw.findings ?? [],
    editorialAgreements: raw.editorialAgreements ?? [],
    editorialDisagreements: raw.editorialDisagreements ?? [],
    reportMeta: raw.reportMeta,
    insightGraph: raw.insightGraph,
  }
}
