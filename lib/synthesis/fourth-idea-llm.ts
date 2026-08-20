import { getAIProvider } from '@/lib/ai/openai'
import { selectFourthIdea } from '@/lib/synthesis/fourth-idea-engine'
import { isGenericInsight } from '@/lib/synthesis/insight-quality'
import { synthesisLog } from '@/lib/synthesis/logger'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { FourthIdea } from '@/lib/types/fourth-idea'
import type { RelationshipGraph } from '@/lib/types/relationship'
import type { SetAnalysis } from '@/lib/types/knowledge'
import type { SourceAnalysis } from '@/lib/types/source'
import type { ResolvedOutputLanguage } from '@/lib/i18n/types'

export type RunFourthIdeaEngineInput = {
  sources: SourceAnalysis[]
  graph: RelationshipGraph
  setAnalysis: SetAnalysis
  result: SynthesisResult
  outputLanguage?: ResolvedOutputLanguage
}

function passesFourthIdeaQuality(idea: FourthIdea): boolean {
  if (isGenericInsight(idea.statement)) return false
  if (!idea.derivationSummary?.trim() && !idea.explanation?.trim()) return false
  if (idea.statement.split(/\s+/).length < 8) return false
  return true
}

/** Stage 4: LLM-generated Fourth Idea with deterministic fallback. */
export async function runFourthIdeaEngine(
  input: RunFourthIdeaEngineInput,
): Promise<SynthesisResult> {
  const { result, sources, graph, setAnalysis } = input
  const fallback = selectFourthIdea({
    insights: result.insights,
    synthesis: result.synthesis,
    patterns: result.patterns,
    noStrongRelationship: result.synthesis.noStrongRelationship,
  })

  if (sources.length < 2) {
    return {
      ...result,
      fourthIdea: fallback.fourthIdea,
      fourthIdeaCandidates: fallback.candidates,
      knowledge: {
        ...result.knowledge,
        rejectedInsights: [
          ...result.knowledge.rejectedInsights,
          ...fallback.rejected,
        ],
      },
    }
  }

  let llmIdea: FourthIdea | null = null
  try {
    const ai = getAIProvider()
    llmIdea = await ai.runFourthIdea({
      sources,
      graph,
      setAnalysis,
      synthesis: result.synthesis,
      patterns: result.patterns,
      insights: result.insights,
      outputLanguage: input.outputLanguage,
    })
  } catch (error) {
    synthesisLog('fourth-idea-llm-failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    })
  }

  const fourthIdea =
    llmIdea && passesFourthIdeaQuality(llmIdea) ? llmIdea : fallback.fourthIdea

  synthesisLog('fourth-idea-complete', {
    source: llmIdea && passesFourthIdeaQuality(llmIdea) ? 'llm' : 'fallback',
    hasIdea: Boolean(fourthIdea),
  })

  const candidates = fourthIdea
    ? [
        {
          ...fourthIdea,
          selected: true,
        },
        ...fallback.candidates.filter((c) => c.id !== fourthIdea.id),
      ]
    : fallback.candidates

  return {
    ...result,
    fourthIdea,
    fourthIdeaCandidates: candidates,
    knowledge: {
      ...result.knowledge,
      rejectedInsights: [
        ...result.knowledge.rejectedInsights,
        ...fallback.rejected,
      ],
    },
  }
}
