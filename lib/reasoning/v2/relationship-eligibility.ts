import {
  classifyClaimRelevanceTier,
  extractTopicTokens,
  type ClaimRelevanceDiagnostic,
  type PipelineWarning,
  type RelevanceFunnel,
} from '@/lib/reasoning/claim-relevance'
import { normalizeClaimRoles } from '@/lib/reasoning/claim-normalization'
import type { EnhancedSourceRelevance } from '@/lib/reasoning/source-relevance-enhance'
import type { ReasoningClaim, SourceRelevance } from '@/lib/reasoning/types'

/**
 * V2: Claim-level relationship eligibility — do not require source to be in synthesis set
 * if the individual claim scores PRIMARY or SUPPORTING on the central question.
 */
export function resolveClaimLevelRelevanceFunnel(input: {
  allClaims: ReasoningClaim[]
  centralQuestion: string
  sourceRelevance: Array<SourceRelevance | EnhancedSourceRelevance>
  lockedOffTopicIds?: Set<string>
}): {
  usableClaims: ReasoningClaim[]
  peripheralClaims: ReasoningClaim[]
  relationshipEligibleSourceIds: Set<string>
  funnel: RelevanceFunnel
  diagnostics: ClaimRelevanceDiagnostic[]
  warnings: PipelineWarning[]
} {
  const topicTokens = extractTopicTokens(input.centralQuestion)
  const normalized = normalizeClaimRoles(input.allClaims)
  const diagnostics: ClaimRelevanceDiagnostic[] = []
  const usableClaims: ReasoningClaim[] = []
  const peripheralClaims: ReasoningClaim[] = []
  const relationshipEligibleSourceIds = new Set<string>()

  for (const claim of normalized) {
    const locked = input.lockedOffTopicIds?.has(claim.sourceId) ?? false
    const rel = input.sourceRelevance.find((r) => r.sourceId === claim.sourceId)
    const sourceTier =
      rel && 'tier' in rel && rel.tier
        ? rel.tier
        : rel?.classification === 'off_topic'
          ? 'OFF_TOPIC'
          : rel?.classification === 'direct'
            ? 'PRIMARY'
            : 'SECONDARY'

    const scored = classifyClaimRelevanceTier({
      claim,
      centralQuestion: input.centralQuestion,
      topicTokens,
      sourceTier,
      lockedOffTopic: locked,
    })

    diagnostics.push({
      claimId: claim.id,
      sourceId: claim.sourceId,
      claimText: claim.statement.slice(0, 200),
      relevanceScore: scored.relevanceScore,
      topicScore: scored.topicScore,
      questionAlignmentScore: scored.questionAlignmentScore,
      sourcePriorScore: scored.sourcePriorScore,
      tier: scored.tier,
      decision:
        scored.tier === 'PRIMARY' || scored.tier === 'SUPPORTING'
          ? 'KEEP'
          : scored.tier === 'PERIPHERAL'
            ? 'SOFT_KEEP'
            : 'DROP',
      reason: scored.reason,
    })

    if (scored.tier === 'OFF_TOPIC') continue

    if (scored.tier === 'PRIMARY' || scored.tier === 'SUPPORTING') {
      usableClaims.push({
        ...claim,
        relevanceScore: scored.relevanceScore,
        rejectionReason: undefined,
      })
      relationshipEligibleSourceIds.add(claim.sourceId)
    } else if (scored.tier === 'PERIPHERAL') {
      peripheralClaims.push({
        ...claim,
        relevanceScore: scored.relevanceScore,
        rejectionReason: undefined,
      })
      if (scored.topicScore >= 0.12 || scored.questionAlignmentScore >= 0.2) {
        relationshipEligibleSourceIds.add(claim.sourceId)
      }
    }
  }

  let topicRelevant = 0
  let questionAligned = 0
  let primaryTier = 0
  let supportingTier = 0
  let peripheralTier = 0
  let offTopicTier = 0

  for (const d of diagnostics) {
    if (d.tier === 'PRIMARY') primaryTier++
    else if (d.tier === 'SUPPORTING') supportingTier++
    else if (d.tier === 'PERIPHERAL') peripheralTier++
    else if (d.tier === 'OFF_TOPIC') offTopicTier++
    if (d.topicScore >= 0.15 || d.sourcePriorScore >= 0.45) topicRelevant++
    if (d.questionAlignmentScore >= 0.25) questionAligned++
  }

  const funnel: RelevanceFunnel = {
    extracted: input.allClaims.length,
    fromSynthesisSources: normalized.length,
    topicRelevant,
    questionAligned,
    primaryTier,
    supportingTier,
    peripheralTier,
    offTopicTier,
    finalUsable: usableClaims.length,
  }

  const warnings: PipelineWarning[] = []
  const collapseRatio =
    funnel.extracted > 0 ? funnel.finalUsable / funnel.extracted : 0
  if (
    (funnel.extracted >= 20 && collapseRatio < 0.05 && relationshipEligibleSourceIds.size >= 2) ||
    (funnel.fromSynthesisSources >= 15 &&
      funnel.finalUsable === 0 &&
      relationshipEligibleSourceIds.size >= 2)
  ) {
    warnings.push({
      code: 'ABNORMAL_RELEVANCE_COLLAPSE',
      message: `Relevance collapse (claim-level): ${funnel.extracted} extracted → ${funnel.finalUsable} usable (${relationshipEligibleSourceIds.size} relationship-eligible sources).`,
      extractedClaims: funnel.extracted,
      relevantClaims: funnel.finalUsable,
      relevantSources: relationshipEligibleSourceIds.size,
    })
  }

  return {
    usableClaims,
    peripheralClaims,
    relationshipEligibleSourceIds,
    funnel,
    diagnostics,
    warnings,
  }
}

export function canProceedToRelationshipDiscovery(input: {
  generationClaims: ReasoningClaim[]
  relationshipEligibleSourceIds: Set<string>
  synthesisSourceIds: Set<string>
}): { ok: boolean; reason?: string } {
  const genSources = new Set(input.generationClaims.map((c) => c.sourceId))
  const participating = new Set([
    ...genSources,
    ...input.relationshipEligibleSourceIds,
    ...input.synthesisSourceIds,
  ])

  if (input.generationClaims.length >= 2 && genSources.size >= 2) {
    return { ok: true }
  }

  return {
    ok: false,
    reason: `Insufficient cross-source claims for relationship discovery (${input.generationClaims.length} generation-eligible, ${genSources.size} sources with generation claims, ${participating.size} participating sources).`,
  }
}
