import {
  filterQualityInsights,
  isGenericInsight,
  passesAddedValueTest,
  passesNoveltyTest,
  passesSpecificityTest,
  passesTraceabilityTest,
} from '@/lib/synthesis/insight-quality'
import type { Insight } from '@/lib/types/relationship'
import type { RejectedInsight, RejectReason } from '@/lib/types/knowledge'

export function rejectInsightWithReasons(insight: Insight): RejectedInsight | null {
  const reasons: RejectReason[] = []

  if (!passesNoveltyTest(insight)) reasons.push('LOW_NOVELTY')
  if (!passesSpecificityTest(insight) || isGenericInsight(insight.statement)) {
    reasons.push('LOW_SPECIFICITY')
    reasons.push('GENERIC')
  }
  if (!passesTraceabilityTest(insight)) reasons.push('NO_TRACEABILITY')
  if (!passesAddedValueTest(insight)) reasons.push('NO_ADDED_VALUE')

  if (reasons.length === 0) return null

  return {
    id: insight.id,
    statement: insight.statement,
    reasons: [...new Set(reasons)],
  }
}

export function partitionInsights(insights: Insight[]): {
  accepted: Insight[]
  rejected: RejectedInsight[]
} {
  const accepted = filterQualityInsights(insights)
  const acceptedIds = new Set(accepted.map((i) => i.id))
  const rejected: RejectedInsight[] = []

  for (const insight of insights) {
    if (acceptedIds.has(insight.id)) continue
    const rejection = rejectInsightWithReasons(insight)
    if (rejection) rejected.push(rejection)
  }

  return { accepted, rejected }
}
