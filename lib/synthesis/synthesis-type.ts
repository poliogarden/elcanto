import { isMeaningfulRelationship, RELATIONSHIP_STRENGTH } from '@/lib/synthesis/consensus-rules'
import type { ClaimRelationship, RelationshipGraph } from '@/lib/types/relationship'

/** Infer synthesis type from relationship graph */
export function inferSynthesisType(
  graph: RelationshipGraph,
  sourceCount: number,
): import('@/lib/types/relationship').SynthesisType {
  if (sourceCount < 2) return 'mostly_independent'

  const meaningful = graph.relationships.filter(
    (r) => r.type !== 'independent' && isMeaningfulRelationship(r.strength),
  )

  const agreements = meaningful.filter(
    (r) => r.type === 'agreement' || r.type === 'partial_agreement',
  )
  const disagreements = meaningful.filter((r) => r.type === 'disagreement')
  const structural = meaningful.filter((r) => r.type === 'structural_parallel')
  const clusters = graph.clusters.filter((c) => c.sourceIds.length >= 2)
  const independentCount = graph.independentSourceIds.length

  const hasMeaningful =
    meaningful.length > 0 || structural.length > 0 || graph.stats.strong > 0

  if (!hasMeaningful && independentCount >= sourceCount - 1) {
    return 'mostly_independent'
  }

  if (clusters.length >= 2) {
    return 'clustered'
  }

  if (disagreements.length > 0 && (agreements.length > 0 || structural.length > 0)) {
    return 'mixed'
  }

  if (disagreements.length > agreements.length) {
    return 'divergent'
  }

  const sourcesInStrongAgreement = new Set(
    agreements
      .filter((r) => r.strength >= RELATIONSHIP_STRENGTH.strongMin)
      .flatMap((r) => [r.fromSourceId, r.toSourceId]),
  )

  if (sourcesInStrongAgreement.size >= Math.ceil(sourceCount * 0.67) && agreements.length > 0) {
    return 'strong_consensus'
  }

  if (meaningful.length > 0 || structural.length > 0) return 'mixed'
  return 'mostly_independent'
}

export function getMeaningfulRelationships(
  relationships: ClaimRelationship[],
): ClaimRelationship[] {
  return relationships.filter(
    (r) => r.type !== 'independent' && isMeaningfulRelationship(r.strength),
  )
}
