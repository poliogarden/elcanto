import { isTooGeneric } from '@/lib/synthesis/consensus-rules'
import type { Insight } from '@/lib/types/relationship'

const GENERIC_INSIGHT_PATTERNS = [
  /technology is (changing|shaping)/i,
  /innovation creates?( new)? opportunit/i,
  /both (sources?|videos?|industries?) (use|show|discuss|mention)/i,
  /importance of technology/i,
  /challenges?.{0,20}drive innovation/i,
  /shaping both industries/i,
  /the future will be different/i,
  /ai is becoming important/i,
  /transforming the world/i,
  /can drive innovation/i,
]

export function isGenericInsight(statement: string): boolean {
  if (isTooGeneric(statement)) return true
  return GENERIC_INSIGHT_PATTERNS.some((p) => p.test(statement))
}

/** Novelty: must reference multiple sources or cross-source inference */
export function passesNoveltyTest(insight: Insight): boolean {
  if (insight.type === 'direct' && insight.sourceIds.length < 2) return false
  if (insight.noveltyScore < 0.45) return false
  return true
}

/** Specificity: reject statements applicable to arbitrary videos */
export function passesSpecificityTest(insight: Insight): boolean {
  return !isGenericInsight(insight.statement)
}

/** Traceability: must link to claims or relationships */
export function passesTraceabilityTest(insight: Insight): boolean {
  const hasLineage =
    insight.claimIds.length > 0 ||
    insight.relationshipIds.length > 0 ||
    insight.patternIds.length > 0
  const hasDerivation = insight.derivation.trim().length > 20
  return hasLineage && hasDerivation
}

/** Added value: cross-source insight requires 2+ sources */
export function passesAddedValueTest(insight: Insight): boolean {
  if (insight.type === 'cross_source_inference' || insight.type === 'interpretive') {
    return insight.sourceIds.length >= 2
  }
  return insight.sourceIds.length >= 1
}

export function filterQualityInsights(insights: Insight[]): Insight[] {
  return insights.filter(
    (insight) =>
      passesNoveltyTest(insight) &&
      passesSpecificityTest(insight) &&
      passesTraceabilityTest(insight) &&
      passesAddedValueTest(insight),
  )
}
