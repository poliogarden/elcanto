import type { RelationshipGraph } from '@/lib/types/relationship'
import type { SetAnalysis } from '@/lib/types/knowledge'

/** Trim relationship graph for synthesis/relationship LLM prompts. */
export function compactRelationshipGraphForPrompt(graph: RelationshipGraph): unknown {
  const relationships = [...graph.relationships]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 28)

  return {
    relationships,
    clusters: graph.clusters.slice(0, 8),
    independentSourceIds: graph.independentSourceIds,
    stats: graph.stats,
  }
}

/** Trim set analysis for synthesis LLM prompts. */
export function compactSetAnalysisForPrompt(setAnalysis: SetAnalysis): unknown {
  return {
    intersections: setAnalysis.intersections.slice(0, 10),
    differences: setAnalysis.differences.slice(0, 10),
    contradictions: setAnalysis.contradictions.slice(0, 8),
    noStrongIntersection: setAnalysis.noStrongIntersection,
  }
}
