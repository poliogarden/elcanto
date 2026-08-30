import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'
import type {
  CrossSourceInsight,
  CrossSourceRelation,
  CrossSourceSynthesisPayload,
  DirectInsight,
  DirectSourceAnswer,
  EvidenceValidationStatus,
} from '@/lib/direct-synthesis/types'
import { legacyInsightToInsights } from '@/lib/direct-synthesis/legacy-insight'
import { validateInsights } from '@/lib/direct-synthesis/validate-insights'
import { isComparableForCrossSource } from '@/lib/direct-synthesis/synthesize-direct'

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function textSupportedByEvidence(
  text: string,
  refs: string[],
  catalog: Map<string, EvidenceSnippet>,
): EvidenceValidationStatus {
  if (refs.length === 0) return 'UNSUPPORTED'
  const norm = normalize(text)
  let best = 0
  for (const ref of refs) {
    const ev = catalog.get(ref)
    if (!ev) continue
    const evNorm = normalize(ev.text)
    if (
      evNorm.includes(norm.slice(0, Math.min(40, norm.length))) ||
      norm.includes(evNorm.slice(0, 40))
    ) {
      return 'SUPPORTED'
    }
    const words = norm.split(' ').filter((w) => w.length > 4)
    const hits = words.filter((w) => evNorm.includes(w)).length
    best = Math.max(best, hits / Math.max(words.length, 1))
  }
  if (best >= 0.35) return 'PARTIAL'
  return 'UNSUPPORTED'
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

function filterValidatedRelations(
  items: CrossSourceRelation[],
  catalog: Map<string, EvidenceSnippet>,
  minSources: number,
  sourceAnswers: DirectSourceAnswer[],
): { kept: CrossSourceRelation[]; removed: number } {
  let removed = 0
  const kept: CrossSourceRelation[] = []
  for (const item of items) {
    if (item.sourceIds.length < minSources) {
      removed++
      continue
    }
    if (!allComparableSourceIds(item.sourceIds, sourceAnswers)) {
      removed++
      continue
    }
    const validRefs = item.evidenceRefs.filter((r) => catalog.has(r))
    const status = textSupportedByEvidence(item.statement, validRefs, catalog)
    if (status === 'SUPPORTED' || status === 'PARTIAL') {
      kept.push({ ...item, evidenceRefs: validRefs })
    } else {
      removed++
    }
  }
  return { kept, removed }
}

function validateInsight(
  insight: CrossSourceInsight | null | undefined,
  catalog: Map<string, EvidenceSnippet>,
  sourceAnswers: DirectSourceAnswer[],
): { insight: CrossSourceInsight | null; removed: number } {
  if (!insight) return { insight: null, removed: 0 }
  if (insight.sourceIds.length < 2) return { insight: null, removed: 1 }
  if (!allComparableSourceIds(insight.sourceIds, sourceAnswers)) {
    return { insight: null, removed: 1 }
  }
  const validRefs = insight.evidenceRefs.filter((r) => catalog.has(r))
  const status = textSupportedByEvidence(insight.statement, validRefs, catalog)
  if (status === 'SUPPORTED' || status === 'PARTIAL') {
    return {
      insight: { ...insight, evidenceRefs: validRefs },
      removed: 0,
    }
  }
  return { insight: null, removed: 1 }
}

export function validateAndFilterSynthesis(input: {
  synthesis: CrossSourceSynthesisPayload
  sourceAnswers: DirectSourceAnswer[]
  evidenceCatalog: EvidenceSnippet[]
}): {
  agreements: CrossSourceSynthesisPayload['agreements']
  disagreements: CrossSourceSynthesisPayload['disagreements']
  complementaryViews: CrossSourceSynthesisPayload['complementaryViews']
  uniqueViews: CrossSourceSynthesisPayload['uniqueViews']
  insights: DirectInsight[]
  insight: CrossSourceSynthesisPayload['insight']
  removedUnsupported: {
    agreements: number
    disagreements: number
    complementaryViews: number
    uniqueViews: number
    insights: number
    insight: number
  }
} {
  const catalog = new Map(input.evidenceCatalog.map((e) => [e.ref, e]))

  const agreementsResult = filterValidatedRelations(
    input.synthesis.agreements,
    catalog,
    2,
    input.sourceAnswers,
  )
  const disagreementsResult = filterValidatedRelations(
    input.synthesis.disagreements,
    catalog,
    2,
    input.sourceAnswers,
  )
  const complementaryResult = filterValidatedRelations(
    input.synthesis.complementaryViews,
    catalog,
    2,
    input.sourceAnswers,
  )
  const uniqueResult = filterValidatedRelations(
    input.synthesis.uniqueViews ?? [],
    catalog,
    1,
    input.sourceAnswers,
  )
  const insightsResult = validateInsights(
    input.synthesis.insights ?? [],
    catalog,
    input.sourceAnswers,
  )
  const insightResult = validateInsight(
    input.synthesis.insight,
    catalog,
    input.sourceAnswers,
  )

  let insights = insightsResult.insights
  let extraInsightsRemoved = 0

  if (insights.length === 0 && insightResult.insight) {
    const legacyPayload = legacyInsightToInsights(
      insightResult.insight,
      input.evidenceCatalog.map((e) => ({ ref: e.ref, sourceId: e.sourceId })),
    ).map((i) => ({
      ...i,
      sourceConcepts: i.sourceConcepts.map(({ origin: _o, ...sc }) => sc),
      connectionConcepts: i.connectionConcepts.map(({ origin: _o, ...cc }) => cc),
    }))
    const legacyValidated = validateInsights(legacyPayload, catalog, input.sourceAnswers)
    insights = legacyValidated.insights
    extraInsightsRemoved = legacyValidated.removed
  }

  return {
    agreements: agreementsResult.kept,
    disagreements: disagreementsResult.kept,
    complementaryViews: complementaryResult.kept,
    uniqueViews: uniqueResult.kept,
    insights,
    insight: insights.length > 0 ? null : insightResult.insight,
    removedUnsupported: {
      agreements: agreementsResult.removed,
      disagreements: disagreementsResult.removed,
      complementaryViews: complementaryResult.removed,
      uniqueViews: uniqueResult.removed,
      insights: insightsResult.removed + extraInsightsRemoved,
      insight: insightResult.removed,
    },
  }
}
