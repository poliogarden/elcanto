import { isGenericInsight } from '@/lib/synthesis/insight-quality'
import type {
  ConfidenceLevel,
  ConsensusItem,
  EmergentInsight,
  SurvivalClaim,
  SurvivalRelationship,
} from '@/lib/survival/types'

const MIN_CLAIM_WORDS = 5
const MIN_CLAIM_CHARS = 18
const MIN_EMERGENT_WORDS = 8

export function normalizeClaimText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isTopicLabelClaim(claim: string): boolean {
  const trimmed = claim.trim()
  if (trimmed.length >= 30) return false
  if (/[.!?]/.test(trimmed)) return false
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length <= 2 && trimmed.length < 24) return true
  if (words.length <= 3 && /^[A-Z0-9][\w\s-]*$/.test(trimmed) && !trimmed.includes(' is ')) {
    return true
  }
  return false
}

export function filterSurvivalClaims(claims: SurvivalClaim[]): SurvivalClaim[] {
  const seenText = new Set<string>()
  const seenIds = new Set<string>()
  const result: SurvivalClaim[] = []

  for (const claim of claims) {
    if (seenIds.has(claim.claimId)) continue
    const words = claim.claim.trim().split(/\s+/).filter(Boolean).length
    if (words < MIN_CLAIM_WORDS && claim.claim.length < MIN_CLAIM_CHARS) continue
    if (isTopicLabelClaim(claim.claim)) continue
    if (claim.confidence === 'weak') continue

    const key = normalizeClaimText(claim.claim)
    if (seenText.has(key)) continue
    seenText.add(key)
    seenIds.add(claim.claimId)
    result.push(claim)
  }

  return result
}

function relationshipPairKey(a: string, b: string): string {
  return [a, b].sort().join('::')
}

export function isKeywordOnlyRelationship(
  relationship: SurvivalRelationship,
): boolean {
  const explanation = relationship.explanation.toLowerCase()
  const keywordOnly =
    /both (mention|use|discuss|share|talk about|reference)/i.test(explanation) &&
    !/because|however|whereas|contradict|disagree|unlike|while|although|but/i.test(
      explanation,
    )
  return keywordOnly
}

export function filterVerifiedRelationships(
  verified: SurvivalRelationship[],
  claimById: Map<string, SurvivalClaim>,
): SurvivalRelationship[] {
  const seen = new Set<string>()
  const result: SurvivalRelationship[] = []

  for (const relationship of verified) {
    if (relationship.type === 'INDEPENDENT') continue
    const from = claimById.get(relationship.fromClaimId)
    const to = claimById.get(relationship.toClaimId)
    if (!from || !to) continue
    if (from.videoId === to.videoId) continue
    if (relationship.confidence === 'weak') continue
    if (isKeywordOnlyRelationship(relationship)) continue

    const key = relationshipPairKey(relationship.fromClaimId, relationship.toClaimId)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(relationship)
  }

  return result
}

export function filterEmergentInsights(
  insights: EmergentInsight[],
  claims: SurvivalClaim[],
  claimById: Map<string, SurvivalClaim>,
  relById: Map<string, SurvivalRelationship>,
): EmergentInsight[] {
  const claimTexts = claims.map((c) => normalizeClaimText(c.claim))

  return insights
    .filter((insight) => {
      const words = insight.statement.trim().split(/\s+/).filter(Boolean).length
      if (words < MIN_EMERGENT_WORDS) return false
      if (isGenericInsight(insight.statement)) return false
      if (insight.confidence === 'weak') return false

      const norm = normalizeClaimText(insight.statement)
      if (claimTexts.some((ct) => ct === norm || (ct.length > 20 && norm.includes(ct)))) {
        return false
      }

      if (insight.reasoningPath.length < 2) return false
      const videoIds = new Set<string>()
      for (const step of insight.reasoningPath) {
        if (step.step === 'claim') {
          const claim = claimById.get(step.refId)
          if (!claim) return false
          videoIds.add(claim.videoId)
        } else {
          const rel = relById.get(step.refId)
          if (!rel) return false
          videoIds.add(rel.fromVideoId)
          videoIds.add(rel.toVideoId)
        }
      }
      return videoIds.size >= 2
    })
    .slice(0, 2)
}

const AGREEMENT_TYPES = new Set(['AGREEMENT', 'PARTIAL_AGREEMENT', 'COMPLEMENTARY'])

export function deriveConsensusFromRelationships(
  verified: SurvivalRelationship[],
  claimById: Map<string, SurvivalClaim>,
  llmConsensus: ConsensusItem[],
): ConsensusItem[] {
  const derived: ConsensusItem[] = []
  const seen = new Set<string>()

  for (const [i, rel] of verified.entries()) {
    if (!AGREEMENT_TYPES.has(rel.type)) continue
    if (rel.confidence === 'weak') continue

    const from = claimById.get(rel.fromClaimId)
    const to = claimById.get(rel.toClaimId)
    if (!from || !to) continue

    const key = relationshipPairKey(rel.fromClaimId, rel.toClaimId)
    if (seen.has(key)) continue
    seen.add(key)

    derived.push({
      id: `consensus_verified_${i + 1}`,
      title: from.claim.length >= to.claim.length ? from.claim : to.claim,
      oneLineSummary: rel.explanation.slice(0, 160),
      supportingVideoIds: [...new Set([from.videoId, to.videoId])],
      confidence: rel.confidence as ConfidenceLevel,
    })
  }

  const multiVideoLlm = llmConsensus.filter((c) => c.supportingVideoIds.length >= 2)
  const merged = [...derived]
  for (const item of multiVideoLlm) {
    if (merged.length >= 3) break
    const dup = merged.some(
      (d) => normalizeClaimText(d.title) === normalizeClaimText(item.title),
    )
    if (!dup) merged.push(item)
  }

  return merged.slice(0, 3)
}

export function mergeDisagreementRelationships(
  verified: SurvivalRelationship[],
  claimById: Map<string, SurvivalClaim>,
): SurvivalRelationship[] {
  return verified.filter(
    (r) =>
      (r.type === 'DISAGREEMENT' || r.type === 'CONTRADICTION') &&
      claimById.has(r.fromClaimId) &&
      claimById.has(r.toClaimId),
  )
}
