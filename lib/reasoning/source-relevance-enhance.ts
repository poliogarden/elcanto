import { extractTopicTokens, scoreTopicRelevance } from '@/lib/reasoning/claim-relevance'
import { isSynthesisCandidate } from '@/lib/reasoning/relevance'
import type {
  ReasoningClaim,
  ReasoningEvidence,
  SourceRelevance,
  SourceRelevanceClass,
} from '@/lib/reasoning/types'

export type SourceClassificationTier = 'PRIMARY' | 'SECONDARY' | 'PERIPHERAL' | 'OFF_TOPIC'

export type EnhancedSourceRelevance = SourceRelevance & {
  tier: SourceClassificationTier
  centralQuestionSimilarity: number
  topicCoverage: number
  relevantClaimRatio: number
  evidenceDensity: number
}

function tierFromClass(cls: SourceRelevanceClass): SourceClassificationTier {
  if (cls === 'off_topic') return 'OFF_TOPIC'
  if (cls === 'direct') return 'PRIMARY'
  if (cls === 'supporting' || cls === 'contrasting') return 'SECONDARY'
  return 'PERIPHERAL'
}

function classFromTier(tier: SourceClassificationTier): SourceRelevanceClass {
  if (tier === 'OFF_TOPIC') return 'off_topic'
  if (tier === 'PRIMARY') return 'direct'
  if (tier === 'SECONDARY') return 'supporting'
  return 'weak'
}

export function enhanceSourceRelevance(input: {
  sources: Array<{ sourceId: string }>
  claims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  centralQuestion: string
  existing: SourceRelevance[]
  lockedOffTopicIds?: Set<string>
}): EnhancedSourceRelevance[] {
  const { sources, claims, evidence, centralQuestion, existing, lockedOffTopicIds } = input
  const bySource = new Map(existing.map((r) => [r.sourceId, r]))

  const topicTokens = extractTopicTokens(centralQuestion)

  return sources.map((src) => {
    const base = bySource.get(src.sourceId)

    if (lockedOffTopicIds?.has(src.sourceId) || base?.classification === 'off_topic') {
      return {
        sourceId: src.sourceId,
        classification: 'off_topic' as SourceRelevanceClass,
        score: base?.score ?? 0.05,
        reason:
          base?.reason ??
          'Excluded: source classified off-topic for the central question.',
        relevantClaimIds: [],
        tier: 'OFF_TOPIC' as SourceClassificationTier,
        centralQuestionSimilarity: 0,
        topicCoverage: 0,
        relevantClaimRatio: 0,
        evidenceDensity: 0,
      }
    }

    const sourceClaims = claims.filter((c) => c.sourceId === src.sourceId)
    const sourceEvidence = evidence.filter((e) => e.sourceId === src.sourceId)
    const totalClaimsFromSource = sourceClaims.length

    const topicScored = sourceClaims.map((c) => scoreTopicRelevance(c, topicTokens))
    const relevantCount = topicScored.filter((s) => s >= 0.15).length
    const relevantClaimRatio =
      totalClaimsFromSource > 0 ? relevantCount / totalClaimsFromSource : 0
    const evidenceDensity =
      totalClaimsFromSource > 0 ? sourceEvidence.length / totalClaimsFromSource : 0
    const centralQuestionSimilarity =
      topicScored.length > 0 ? topicScored.reduce((a, b) => a + b, 0) / topicScored.length : 0
    const topicCoverage = Math.min(1, relevantClaimRatio * 0.6 + centralQuestionSimilarity * 0.4)

    let tier = base ? tierFromClass(base.classification) : 'SECONDARY'

    if (relevantClaimRatio < 0.12 && centralQuestionSimilarity < 0.22) {
      tier = 'OFF_TOPIC'
    } else if (relevantClaimRatio < 0.2 && centralQuestionSimilarity < 0.3) {
      tier = 'PERIPHERAL'
    } else if (centralQuestionSimilarity >= 0.5 && relevantClaimRatio >= 0.35) {
      tier = 'PRIMARY'
    } else if (tier === 'PRIMARY' && relevantClaimRatio < 0.25) {
      tier = 'SECONDARY'
    } else if (tier === 'PERIPHERAL' && centralQuestionSimilarity >= 0.4 && relevantClaimRatio >= 0.3) {
      tier = 'SECONDARY'
    }

    const classification = classFromTier(tier)
    const relevantClaimIds = sourceClaims
      .filter((c) => scoreTopicRelevance(c, topicTokens) >= 0.15)
      .map((c) => c.id)

    return {
      sourceId: src.sourceId,
      classification,
      score: Math.min(1, centralQuestionSimilarity * 0.5 + relevantClaimRatio * 0.5),
      reason:
        base?.reason ??
        `Transcript evidence: ${relevantCount}/${totalClaimsFromSource} claims relevant (${tier})`,
      relevantClaimIds,
      tier,
      centralQuestionSimilarity,
      topicCoverage,
      relevantClaimRatio,
      evidenceDensity,
    }
  })
}

export function synthesisIdsFromEnhanced(relevance: EnhancedSourceRelevance[]): Set<string> {
  return new Set(
    relevance
      .filter((r) => r.tier === 'PRIMARY' || r.tier === 'SECONDARY')
      .filter((r) => isSynthesisCandidate(r.classification) && r.classification !== 'off_topic')
      .map((r) => r.sourceId),
  )
}

export function countTiers(relevance: EnhancedSourceRelevance[]): Record<SourceClassificationTier, number> {
  const counts: Record<SourceClassificationTier, number> = {
    PRIMARY: 0,
    SECONDARY: 0,
    PERIPHERAL: 0,
    OFF_TOPIC: 0,
  }
  for (const r of relevance) counts[r.tier]++
  return counts
}
