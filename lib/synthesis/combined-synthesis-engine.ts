import { getAIProvider } from '@/lib/ai/openai'
import { normalizeGraph } from '@/lib/synthesis/relationship-engine'
import { postProcessSynthesis } from '@/lib/synthesis/synthesis-engine'
import { synthesisLog } from '@/lib/synthesis/logger'
import { computeSetAnalysis, toSourceKnowledgeSet } from '@/lib/types/knowledge'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { RelationshipGraph } from '@/lib/types/relationship'
import type { SetAnalysis } from '@/lib/types/knowledge'
import type { SourceAnalysis, SourceFailure } from '@/lib/types/source'
import type { SynthesisMode } from '@/lib/types/synthesis-mode'
import { normalizeSourceAnalysis } from '@/lib/types/source'
import {
  relationshipCacheHash,
  setCachedRelationshipGraph,
} from '@/lib/repositories/relationship-cache'
import { getAnalysisVersionsFromSources } from '@/lib/ai/compact-prompt'

export type RunCombinedSynthesisInput = {
  question?: string
  sources: SourceAnalysis[]
  failedSources?: SourceFailure[]
  missingSourceIds?: string[]
  mode?: SynthesisMode
  outputLanguage?: import('@/lib/i18n/types').ResolvedOutputLanguage
}

export type CombinedSynthesisOutput = {
  graph: RelationshipGraph
  setAnalysis: SetAnalysis
  result: SynthesisResult
}

/** Single LLM pass: relationship discovery + synthesis + emergent insights. */
export async function runCombinedSynthesisEngine(
  input: RunCombinedSynthesisInput,
): Promise<CombinedSynthesisOutput> {
  const sources = input.sources.map(normalizeSourceAnalysis)
  const ai = getAIProvider()

  const combined = await ai.runCombinedSynthesis({
    question: input.question,
    sources,
    failedSources: input.failedSources,
    missingSourceIds: input.missingSourceIds,
    mode: input.mode,
    outputLanguage: input.outputLanguage,
  })

  const graph = normalizeGraph(combined.graph, sources)

  const sourceIds = sources.map((s) => s.sourceId)
  const analysisVersions = getAnalysisVersionsFromSources(sources)
  const cacheKey = relationshipCacheHash(sourceIds, analysisVersions)
  await setCachedRelationshipGraph(cacheKey, graph)

  const knowledge = toSourceKnowledgeSet(sources)
  const setAnalysis = computeSetAnalysis(knowledge, graph.relationships)

  const rawResult: SynthesisResult = {
    sources: combined.sources,
    relationships: graph.relationships,
    patterns: combined.patterns,
    setAnalysis,
    synthesis: combined.synthesis,
    insights: combined.insights,
    knowledge: { gaps: [], recommendations: [], rejectedInsights: [] },
    relationshipGraph: graph,
  }

  const result = postProcessSynthesis(rawResult, sources, graph, setAnalysis)

  synthesisLog('combined-synthesis-complete', {
    sources: sources.length,
    relationships: graph.relationships.length,
    insights: result.insights.length,
    fourthIdea: Boolean(result.fourthIdea),
  })

  return { graph, setAnalysis, result }
}

export function shouldUseCombinedSynthesis(sourceCount: number): boolean {
  if (process.env.SYNTHESIS_COMBINED !== '1') return false
  const max = Number(process.env.SYNTHESIS_COMBINED_MAX_SOURCES ?? '8')
  if (!Number.isFinite(max) || max < 2) return false
  return sourceCount >= 2 && sourceCount <= max
}
