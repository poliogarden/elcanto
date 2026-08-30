import type {
  CrossSourceInsight,
  DirectInsight,
  SourceConcept,
} from '@/lib/direct-synthesis/types'

function withOrigins(insight: DirectInsight): DirectInsight {
  return {
    ...insight,
    sourceConcepts: insight.sourceConcepts.map((sc) => ({
      ...sc,
      origin: 'SOURCE' as const,
    })),
    connectionConcepts: insight.connectionConcepts.map((cc) => ({
      ...cc,
      origin: 'AI_DERIVED' as const,
    })),
  }
}

/** Client-safe: convert legacy single insight for Insight Explorer UI. */
export function legacyInsightToInsights(
  insight: CrossSourceInsight,
  evidence: Array<{ ref: string; sourceId: string }>,
): DirectInsight[] {
  const evidenceByRef = new Map(evidence.map((e) => [e.ref, e]))
  const concepts: SourceConcept[] = []

  for (const sourceId of insight.sourceIds) {
    const refs = insight.evidenceRefs.filter(
      (r) => evidenceByRef.get(r)?.sourceId === sourceId,
    )
    if (refs.length === 0) continue
    concepts.push({
      id: `legacy_sc_${sourceId}`,
      sourceId,
      label: insight.statement.slice(0, 60),
      evidenceRefs: refs,
      origin: 'SOURCE',
    })
  }

  if (concepts.length < 2) return []

  return [
    withOrigins({
      id: 'insight_1',
      title: insight.statement.slice(0, 120),
      summary: insight.statement,
      explanation: insight.statement,
      sourceIds: concepts.map((c) => c.sourceId),
      sourceConcepts: concepts,
      connectionConcepts: [
        {
          id: 'legacy_conn_1',
          label: 'Cross-source connection',
          explanation: insight.statement,
          derivedFromConceptIds: concepts.map((c) => c.id),
          origin: 'AI_DERIVED',
        },
      ],
      evidenceRefs: insight.evidenceRefs,
    }),
  ]
}
