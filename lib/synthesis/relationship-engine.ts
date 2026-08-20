import { getAnalysisVersionsFromSources } from '@/lib/ai/compact-prompt'
import { getAIProvider } from '@/lib/ai/openai'
import {
  getCachedRelationshipGraph,
  relationshipCacheHash,
  setCachedRelationshipGraph,
} from '@/lib/repositories/relationship-cache'
import { synthesisLog } from '@/lib/synthesis/logger'
import { computeRelationshipStats } from '@/lib/synthesis/relationship-stats'
import type { ClaimRelationship, RelationshipGraph } from '@/lib/types/relationship'
import type { SourceAnalysis } from '@/lib/types/source'
import { normalizeSourceAnalysis } from '@/lib/types/source'

function normalizeGraph(
  graph: RelationshipGraph,
  sources: SourceAnalysis[],
): RelationshipGraph {
  const sourceIds = new Set(sources.map((s) => s.sourceId))

  const relationships = graph.relationships
    .filter(
      (r) =>
        sourceIds.has(r.fromSourceId) &&
        sourceIds.has(r.toSourceId) &&
        r.fromClaimId &&
        r.toClaimId,
    )
    .map((r) => sanitizeRelationship(r))

  const clusters = graph.clusters
    .filter((c) => c.sourceIds.length >= 1)
    .filter((c) => c.sourceIds.every((id) => sourceIds.has(id)))

  const inRelationship = new Set(
    relationships.flatMap((r) => [r.fromSourceId, r.toSourceId]),
  )
  const clusteredIds = new Set(clusters.flatMap((c) => c.sourceIds))

  const independentSourceIds = sources
    .map((s) => s.sourceId)
    .filter((id) => !clusteredIds.has(id) && !inRelationship.has(id))

  const stats = computeRelationshipStats(relationships)

  return {
    relationships,
    clusters,
    independentSourceIds: [
      ...new Set([...graph.independentSourceIds, ...independentSourceIds]),
    ].filter((id) => sourceIds.has(id)),
    stats,
  }
}

export { normalizeGraph }

function sanitizeRelationship(r: ClaimRelationship): ClaimRelationship {
  if (
    r.type === 'agreement' &&
    (r.explanation.toLowerCase().includes('both mention') ||
      r.explanation.toLowerCase().includes('both use'))
  ) {
    return { ...r, type: 'shared_topic' }
  }
  return r
}

export async function discoverRelationships(
  sources: SourceAnalysis[],
): Promise<RelationshipGraph> {
  const normalized = sources.map(normalizeSourceAnalysis)
  const sourceIds = normalized.map((s) => s.sourceId)
  const analysisVersions = getAnalysisVersionsFromSources(normalized)
  const cacheKey = relationshipCacheHash(sourceIds, analysisVersions)

  const cached = await getCachedRelationshipGraph(cacheKey)
  if (cached) {
    synthesisLog('relationship-cache-hit', { sources: sourceIds.length })
    return cached
  }

  const ai = getAIProvider()
  const graph = await ai.discoverRelationships({ sources: normalized })

  const result = normalizeGraph(graph, normalized)
  await setCachedRelationshipGraph(cacheKey, result)

  synthesisLog('relationship-complete', {
    sources: sourceIds.length,
    relationships: result.relationships.length,
    clusters: result.clusters.length,
    independent: result.independentSourceIds.length,
    strong: result.stats.strong,
    moderate: result.stats.moderate,
    weak: result.stats.weak,
  })

  return result
}
