import type {
  ReasoningKnowledgeGap,
  ReasoningLandscape,
  RelationshipCluster,
} from '@/lib/reasoning/types'

/** Landscape counts and cards are derived only from verified evidence graph — never LLM counts. */
export function deriveLandscapeFromEvidence(input: {
  significantClusters: RelationshipCluster[]
  knowledgeGaps: ReasoningKnowledgeGap[]
}): ReasoningLandscape {
  const agreeClusters = input.significantClusters.filter((c) => c.visualKind === 'agree')
  const divideClusters = input.significantClusters.filter(
    (c) => c.visualKind === 'divide' || c.visualKind === 'trade-off',
  )

  const agreeSourceIds = new Set(agreeClusters.flatMap((c) => c.supportingSourceIds))
  const divideSourceIds = new Set(divideClusters.flatMap((c) => c.supportingSourceIds))

  return {
    agree: {
      countLabel: String(agreeClusters.length),
      cards: agreeClusters.map((c) => ({
        id: c.id,
        title: c.label,
        summary: `${c.sourceCount} source${c.sourceCount !== 1 ? 's' : ''} · ${c.memberRelationshipIds.length} evidence pair${c.memberRelationshipIds.length !== 1 ? 's' : ''}`,
      })),
    },
    divide: {
      countLabel: String(divideSourceIds.size),
      cards:
        divideClusters.length === 0
          ? []
          : divideClusters.map((c) => ({
              id: c.id,
              title: c.label,
              summary: `${c.sourceCount} source${c.sourceCount !== 1 ? 's' : ''} · ${c.memberRelationshipIds.length} verified link${c.memberRelationshipIds.length !== 1 ? 's' : ''}`,
            })),
    },
    unclear: {
      countLabel: String(input.knowledgeGaps.length),
      cards: input.knowledgeGaps.map((g) => ({
        id: g.id,
        title: g.question.length > 80 ? `${g.question.slice(0, 78)}…` : g.question,
        summary: g.whyItMatters,
      })),
    },
  }
}

export function agreementSourceCount(clusters: RelationshipCluster[]): number {
  return new Set(
    clusters.filter((c) => c.visualKind === 'agree').flatMap((c) => c.supportingSourceIds),
  ).size
}

export function divideSourceCount(clusters: RelationshipCluster[]): number {
  return new Set(
    clusters
      .filter((c) => c.visualKind === 'divide' || c.visualKind === 'trade-off')
      .flatMap((c) => c.supportingSourceIds),
  ).size
}
