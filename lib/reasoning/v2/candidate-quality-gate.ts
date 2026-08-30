import { pairKey } from '@/lib/reasoning/alignment'
import type { ReasoningClaim, RelationshipCandidate } from '@/lib/reasoning/types'
import {
  isCrossSourceRelationshipEligibleClaim,
  type ClaimShapeIssue,
} from '@/lib/reasoning/v2/claim-shape-guards'
import {
  probeSharedProposition,
  type SharedPropositionClass,
} from '@/lib/reasoning/v2/shared-proposition-probe'
import type { ClaimAlignmentRecord } from '@/lib/reasoning/v2/claim-question-alignment'

export type CandidateQualityStats = {
  inputCandidates: number
  questionAlignedCandidates: number
  sharedPropositionCandidates: number
  topicOnlyRejected: number
  differentDimensionRejected: number
  unrelatedRejected: number
  genericSuppressed: number
  malformedSuppressed: number
  outputCandidates: number
}

export type CandidateQualityRejection = {
  fromClaimId: string
  toClaimId: string
  reason:
    | 'TOPIC_ONLY'
    | 'DIFFERENT_DIMENSION'
    | 'UNRELATED'
    | 'GENERIC_ANCHOR'
    | 'MALFORMED_CLAIM'
    | 'LOW_QUESTION_ALIGNMENT'
  probeClass?: SharedPropositionClass
  shapeIssue?: ClaimShapeIssue
}

export function filterCandidatesByComparability(input: {
  candidates: RelationshipCandidate[]
  claimById: Map<string, ReasoningClaim>
  alignments?: ClaimAlignmentRecord[]
  questionAsksGeneric?: boolean
}): {
  candidates: RelationshipCandidate[]
  stats: CandidateQualityStats
  rejections: CandidateQualityRejection[]
} {
  const alignmentByClaim = new Map(
    (input.alignments ?? []).map((a) => [a.claimId, a]),
  )

  const stats: CandidateQualityStats = {
    inputCandidates: input.candidates.length,
    questionAlignedCandidates: 0,
    sharedPropositionCandidates: 0,
    topicOnlyRejected: 0,
    differentDimensionRejected: 0,
    unrelatedRejected: 0,
    genericSuppressed: 0,
    malformedSuppressed: 0,
    outputCandidates: 0,
  }
  const rejections: CandidateQualityRejection[] = []
  const accepted: RelationshipCandidate[] = []
  const seen = new Set<string>()

  for (const c of input.candidates) {
    const from = input.claimById.get(c.fromClaimId)
    const to = input.claimById.get(c.toClaimId)
    if (!from || !to) continue

    const fromShape = isCrossSourceRelationshipEligibleClaim(from, input.questionAsksGeneric)
    const toShape = isCrossSourceRelationshipEligibleClaim(to, input.questionAsksGeneric)
    if (!fromShape.eligible || !toShape.eligible) {
      if (fromShape.issue === 'GENERIC_CROSS_SOURCE_ANCHOR' || toShape.issue === 'GENERIC_CROSS_SOURCE_ANCHOR') {
        stats.genericSuppressed++
        rejections.push({
          fromClaimId: c.fromClaimId,
          toClaimId: c.toClaimId,
          reason: 'GENERIC_ANCHOR',
          shapeIssue: fromShape.issue ?? toShape.issue,
        })
      } else {
        stats.malformedSuppressed++
        rejections.push({
          fromClaimId: c.fromClaimId,
          toClaimId: c.toClaimId,
          reason: 'MALFORMED_CLAIM',
          shapeIssue: fromShape.issue ?? toShape.issue,
        })
      }
      continue
    }

    const fromAlign = alignmentByClaim.get(from.id)
    const toAlign = alignmentByClaim.get(to.id)
    if (fromAlign && toAlign) {
      const lowAlign =
        fromAlign.alignment === 'CONTEXTUAL' ||
        fromAlign.alignment === 'UNRELATED' ||
        toAlign.alignment === 'CONTEXTUAL' ||
        toAlign.alignment === 'UNRELATED'
      if (lowAlign) {
        rejections.push({
          fromClaimId: c.fromClaimId,
          toClaimId: c.toClaimId,
          reason: 'LOW_QUESTION_ALIGNMENT',
        })
        continue
      }
      stats.questionAlignedCandidates++
    }

    const probe = probeSharedProposition(from, to)
    if (!probe.candidateAllowed) {
      if (probe.class === 'TOPIC_ONLY') stats.topicOnlyRejected++
      else if (probe.class === 'DIFFERENT_DIMENSION') stats.differentDimensionRejected++
      else stats.unrelatedRejected++
      rejections.push({
        fromClaimId: c.fromClaimId,
        toClaimId: c.toClaimId,
        reason:
          probe.class === 'TOPIC_ONLY'
            ? 'TOPIC_ONLY'
            : probe.class === 'DIFFERENT_DIMENSION'
              ? 'DIFFERENT_DIMENSION'
              : 'UNRELATED',
        probeClass: probe.class,
      })
      continue
    }

    stats.sharedPropositionCandidates++
    const key = pairKey(c.fromClaimId, c.toClaimId)
    if (seen.has(key)) continue
    seen.add(key)
    accepted.push(c)
  }

  stats.outputCandidates = accepted.length
  return { candidates: accepted, stats, rejections }
}
