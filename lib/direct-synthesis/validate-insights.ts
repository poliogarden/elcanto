import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'
import type {
  ConnectionConcept,
  DirectInsight,
  DirectSourceAnswer,
  SourceConcept,
} from '@/lib/direct-synthesis/types'

function isComparableForCrossSource(
  answerability: DirectSourceAnswer['answerability'],
): boolean {
  return answerability !== 'NOT_RELEVANT'
}

function allComparableSourceIds(
  sourceIds: string[],
  sourceAnswers: DirectSourceAnswer[],
): boolean {
  if (sourceIds.length === 0) return false
  return sourceIds.every((id) => {
    const sa = sourceAnswers.find((a) => a.sourceId === id)
    return sa && isComparableForCrossSource(sa.answerability)
  })
}

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

function filterSourceConcept(
  concept: Omit<SourceConcept, 'origin'>,
  catalog: Map<string, EvidenceSnippet>,
): SourceConcept | null {
  const validRefs = concept.evidenceRefs.filter((r) => catalog.has(r))
  if (validRefs.length === 0) return null
  return {
    id: concept.id,
    sourceId: concept.sourceId,
    label: concept.label,
    summary: concept.summary ?? undefined,
    evidenceRefs: validRefs,
    origin: 'SOURCE',
  }
}

function validateSingleInsight(
  raw: Omit<DirectInsight, 'sourceConcepts' | 'connectionConcepts'> & {
    sourceConcepts: Array<Omit<SourceConcept, 'origin'>>
    connectionConcepts: Array<Omit<ConnectionConcept, 'origin'>>
  },
  catalog: Map<string, EvidenceSnippet>,
  sourceAnswers: DirectSourceAnswer[],
): DirectInsight | null {
  const groundedConcepts: SourceConcept[] = []
  for (const sc of raw.sourceConcepts) {
    const kept = filterSourceConcept(sc, catalog)
    if (!kept) continue
    if (!allComparableSourceIds([kept.sourceId], sourceAnswers)) continue
    groundedConcepts.push(kept)
  }

  const sourceIds = [...new Set(groundedConcepts.map((c) => c.sourceId))]
  if (sourceIds.length < 2) return null

  const conceptIds = new Set(groundedConcepts.map((c) => c.id))
  const connectionConcepts: ConnectionConcept[] = []
  for (const cc of raw.connectionConcepts) {
    const derived = cc.derivedFromConceptIds.filter((id) => conceptIds.has(id))
    if (derived.length === 0) continue
    connectionConcepts.push({
      id: cc.id,
      label: cc.label,
      explanation: cc.explanation,
      derivedFromConceptIds: derived,
      origin: 'AI_DERIVED',
    })
  }

  const evidenceRefs = raw.evidenceRefs.filter((r) => catalog.has(r))

  return withOrigins({
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    explanation: raw.explanation,
    sourceIds,
    sourceConcepts: groundedConcepts,
    connectionConcepts,
    evidenceRefs,
  })
}

export function validateInsights(
  rawInsights: Array<
    Omit<DirectInsight, 'sourceConcepts' | 'connectionConcepts'> & {
      sourceConcepts: Array<Omit<SourceConcept, 'origin'>>
      connectionConcepts: Array<Omit<ConnectionConcept, 'origin'>>
    }
  >,
  catalog: Map<string, EvidenceSnippet>,
  sourceAnswers: DirectSourceAnswer[],
): { insights: DirectInsight[]; removed: number } {
  let removed = 0
  const insights: DirectInsight[] = []

  for (const raw of rawInsights.slice(0, 4)) {
    const validated = validateSingleInsight(raw, catalog, sourceAnswers)
    if (validated) {
      insights.push(validated)
    } else {
      removed++
    }
  }

  return { insights, removed }
}
