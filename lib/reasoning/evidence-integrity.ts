import type { RelationshipCluster } from '@/lib/reasoning/types'
import type {
  ReasoningInsight,
  ReasoningJudgment,
  ReasoningKnowledgeGap,
  ReasoningPattern,
  ReasoningRelationship,
} from '@/lib/reasoning/types'

function gapTerms(gaps: ReasoningKnowledgeGap[]): Set<string> {
  const terms = new Set<string>()
  for (const g of gaps) {
    for (const w of g.question.toLowerCase().split(/\W+/)) {
      if (w.length > 4) terms.add(w)
    }
  }
  return terms
}

function overlapsGapTerms(text: string, gapTermsSet: Set<string>): boolean {
  const words = text.toLowerCase().split(/\W+/)
  let hits = 0
  for (const w of words) {
    if (gapTermsSet.has(w)) hits++
  }
  return hits >= 2
}

export function isPatternEvidenceBacked(
  pattern: ReasoningPattern,
  significantClusters: RelationshipCluster[],
  verifiedRelationships: ReasoningRelationship[],
): boolean {
  const significantRelIds = new Set(
    significantClusters.flatMap((c) => c.memberRelationshipIds),
  )
  if (pattern.relationshipIds.some((id) => significantRelIds.has(id))) return true

  const verifiedIds = new Set(
    verifiedRelationships
      .filter((r) => r.verificationStatus === 'SUPPORTED')
      .map((r) => r.id),
  )
  if (pattern.relationshipIds.some((id) => verifiedIds.has(id))) return true

  const uniqueSources = new Set(pattern.sourceIds)
  return uniqueSources.size >= 2 && pattern.claimIds.length >= 2
}

export function filterInsightsForIntegrity(input: {
  insights: ReasoningInsight[]
  significantClusterIds: Set<string>
  significantRelationshipIds: Set<string>
  patternIds: Set<string>
  knowledgeGaps: ReasoningKnowledgeGap[]
}): ReasoningInsight[] {
  const gapTermsSet = gapTerms(input.knowledgeGaps)

  return input.insights.filter((insight) => {
    if (insight.verificationStatus === 'REJECTED') return false
    if (insight.evidencePath.length < 2) return false

    const relRefs = insight.relationshipIds.filter((id) => input.significantRelationshipIds.has(id))
    const clusterBacked =
      relRefs.length >= 1 ||
      insight.patternIds.some((id) => input.patternIds.has(id)) ||
      insight.evidencePath.some(
        (s) => s.step === 'relationship' && input.significantRelationshipIds.has(s.refId),
      )

    if (!clusterBacked && insight.relationshipIds.length > 0) return false

    if (overlapsGapTerms(insight.statement, gapTermsSet) && relRefs.length === 0) return false

    const isFuturePrediction =
      /\b(will|going to|future|predict|forecast|inevitable)\b/i.test(insight.statement) &&
      insight.evidencePath.filter((s) => s.step === 'relationship').length === 0
    if (isFuturePrediction) return false

    return insight.sourceIds.length >= 2
  })
}

export function validateJudgmentGrounding(input: {
  judgment: ReasoningJudgment | null
  significantClusters: RelationshipCluster[]
  patterns: ReasoningPattern[]
  knowledgeGaps: ReasoningKnowledgeGap[]
  verifiedRelationships?: ReasoningRelationship[]
}): { judgment: ReasoningJudgment | null; unsupportedRemoved: number } {
  const { judgment, significantClusters, patterns, knowledgeGaps } = input
  const verifiedRelationships = input.verifiedRelationships ?? []
  if (!judgment) return { judgment: null, unsupportedRemoved: 0 }

  const gapTermsSet = gapTerms(knowledgeGaps)
  const backedPatterns = patterns.filter((p) =>
    isPatternEvidenceBacked(p, significantClusters, verifiedRelationships),
  )

  const clusterTerms = new Set<string>()
  for (const c of significantClusters) {
    for (const w of c.canonicalClaim.toLowerCase().split(/\W+/)) {
      if (w.length > 4) clusterTerms.add(w)
    }
  }
  for (const p of backedPatterns) {
    for (const w of p.title.toLowerCase().split(/\W+/)) {
      if (w.length > 4) clusterTerms.add(w)
    }
  }

  const statementUsesOnlyGaps =
    overlapsGapTerms(judgment.statement, gapTermsSet) && clusterTerms.size === 0
  if (statementUsesOnlyGaps) {
    return { judgment: null, unsupportedRemoved: 1 }
  }

  if (significantClusters.length === 0 && backedPatterns.length === 0) {
    return { judgment: null, unsupportedRemoved: 1 }
  }

  let unsupportedRemoved = 0
  const filteredMissing = judgment.missingEvidence.filter((m) => {
    if (overlapsGapTerms(m, gapTermsSet) && !overlapsGapTerms(m, clusterTerms)) {
      unsupportedRemoved++
      return false
    }
    return true
  })

  if (unsupportedRemoved === 0 && filteredMissing.length === judgment.missingEvidence.length) {
    return { judgment, unsupportedRemoved: 0 }
  }

  return {
    judgment: { ...judgment, missingEvidence: filteredMissing },
    unsupportedRemoved,
  }
}
