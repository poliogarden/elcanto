import { getAIProvider } from '@/lib/ai/openai'
import {
  filterGenericSections,
  normalizeSynthesisSections,
} from '@/lib/synthesis/consensus-rules'
import { partitionInsights } from '@/lib/synthesis/insight-partition'
import { synthesisLog } from '@/lib/synthesis/logger'
import {
  hasStrongCrossSourceRelationship,
  isDisplayableRelationship,
} from '@/lib/synthesis/relationship-stats'
import { inferSynthesisType } from '@/lib/synthesis/synthesis-type'
import type { SetAnalysis } from '@/lib/types/knowledge'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { RelationshipGraph } from '@/lib/types/relationship'
import type { SourceAnalysis, SourceFailure } from '@/lib/types/source'
import type { SynthesisMode } from '@/lib/types/synthesis-mode'
import { normalizeSourceAnalysis } from '@/lib/types/source'

export type RunSynthesisEngineInput = {
  question?: string
  sources: SourceAnalysis[]
  graph: RelationshipGraph
  setAnalysis: SetAnalysis
  failedSources?: SourceFailure[]
  missingSourceIds?: string[]
  mode?: SynthesisMode
  outputLanguage?: import('@/lib/i18n/types').ResolvedOutputLanguage
}

export async function runSynthesisEngine(
  input: RunSynthesisEngineInput,
): Promise<SynthesisResult> {
  const sources = input.sources.map(normalizeSourceAnalysis)
  const ai = getAIProvider()

  let result = await ai.runSynthesis({
    question: input.question,
    sources,
    graph: input.graph,
    setAnalysis: input.setAnalysis,
    failedSources: input.failedSources,
    missingSourceIds: input.missingSourceIds,
    mode: input.mode,
    outputLanguage: input.outputLanguage,
  })

  result = postProcessSynthesis(result, sources, input.graph, input.setAnalysis)

  synthesisLog('synthesis-engine-complete', {
    synthesisType: result.synthesis.synthesisType,
    sections: result.synthesis.sections.length,
    insights: result.insights.length,
    patterns: result.patterns.length,
    relationships: result.relationships.length,
    intersections: result.setAnalysis.intersections.length,
    differences: result.setAnalysis.differences.length,
    contradictions: result.setAnalysis.contradictions.length,
  })

  return result
}

export function postProcessSynthesis(
  result: SynthesisResult,
  sources: SourceAnalysis[],
  graph: RelationshipGraph,
  setAnalysis: SetAnalysis,
): SynthesisResult {
  const totalSources = sources.length
  const inferred = inferSynthesisType(graph, totalSources)
  const noStrongRelationship = !hasStrongCrossSourceRelationship(graph.stats)

  let sections = normalizeSynthesisSections(result.synthesis.sections, totalSources)
  sections = filterGenericSections(sections)

  if (inferred === 'mostly_independent') {
    sections = sections.filter((s) => s.section !== 'agreement')
  }

  const synthesisType =
    result.synthesis.synthesisType === 'strong_consensus' && inferred === 'mostly_independent'
      ? inferred
      : result.synthesis.synthesisType

  const { accepted, rejected } = partitionInsights(result.insights)
  const displayableRelationships = result.relationships.filter(isDisplayableRelationship)
  const resolvedNoStrong =
    (noStrongRelationship && displayableRelationships.length === 0) ||
    setAnalysis.noStrongIntersection

  return {
    ...result,
    setAnalysis,
    insights: accepted,
    knowledge: {
      ...result.knowledge,
      rejectedInsights: rejected,
    },
    synthesis: {
      ...result.synthesis,
      synthesisType,
      sections,
      noStrongRelationship: resolvedNoStrong,
      bottomLine: truncateBottomLine(result.synthesis.bottomLine),
    },
    relationshipGraph: graph,
  }
}

function truncateBottomLine(text: string): string {
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return sentences.slice(0, 4).join(' ')
}
