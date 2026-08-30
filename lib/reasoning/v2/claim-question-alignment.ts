import { classifyClaimRelevanceTier, type ClaimRelevanceDiagnostic } from '@/lib/reasoning/claim-relevance'
import type { ReasoningClaim } from '@/lib/reasoning/types'
import { extractQuestionIntent, type QuestionIntent } from '@/lib/reasoning/v2/question-intent'

export type ClaimQuestionAlignment = 'DIRECT' | 'SUPPORTING' | 'CONTEXTUAL' | 'UNRELATED'

export type ClaimAlignmentRecord = {
  claimId: string
  sourceId: string
  alignment: ClaimQuestionAlignment
  questionAlignmentScore: number
  topicScore: number
  tier: string
  reason?: string
}

export function classifyClaimQuestionAlignment(input: {
  claim: ReasoningClaim
  intent: QuestionIntent
  sourceTier: string
  lockedOffTopic?: boolean
  diagnostic?: ClaimRelevanceDiagnostic
}): ClaimAlignmentRecord {
  const scored =
    input.diagnostic ??
    classifyClaimRelevanceTier({
      claim: input.claim,
      centralQuestion: input.intent.rawQuestion,
      topicTokens: input.intent.topicTokens,
      sourceTier: input.sourceTier as 'PRIMARY' | 'SECONDARY' | 'PERIPHERAL' | 'OFF_TOPIC',
      lockedOffTopic: input.lockedOffTopic ?? false,
    })

  if (scored.tier === 'OFF_TOPIC' || input.lockedOffTopic) {
    return {
      claimId: input.claim.id,
      sourceId: input.claim.sourceId,
      alignment: 'UNRELATED',
      questionAlignmentScore: scored.questionAlignmentScore,
      topicScore: scored.topicScore,
      tier: scored.tier,
      reason: 'off_topic',
    }
  }

  const qScore = scored.questionAlignmentScore
  const tScore = scored.topicScore

  if (scored.tier === 'PRIMARY' && qScore >= 0.35) {
    return {
      claimId: input.claim.id,
      sourceId: input.claim.sourceId,
      alignment: 'DIRECT',
      questionAlignmentScore: qScore,
      topicScore: tScore,
      tier: scored.tier,
      reason: 'primary_question_match',
    }
  }

  if (qScore >= 0.42) {
    return {
      claimId: input.claim.id,
      sourceId: input.claim.sourceId,
      alignment: 'DIRECT',
      questionAlignmentScore: qScore,
      topicScore: tScore,
      tier: scored.tier,
      reason: 'high_question_alignment',
    }
  }

  if (
    (scored.tier === 'PRIMARY' || scored.tier === 'SUPPORTING') &&
    qScore >= 0.22 &&
    tScore >= 0.15
  ) {
    return {
      claimId: input.claim.id,
      sourceId: input.claim.sourceId,
      alignment: 'SUPPORTING',
      questionAlignmentScore: qScore,
      topicScore: tScore,
      tier: scored.tier,
      reason: 'supporting_evidence',
    }
  }

  if (tScore >= 0.12 || scored.tier === 'PERIPHERAL') {
    return {
      claimId: input.claim.id,
      sourceId: input.claim.sourceId,
      alignment: 'CONTEXTUAL',
      questionAlignmentScore: qScore,
      topicScore: tScore,
      tier: scored.tier,
      reason: 'same_topic_not_question',
    }
  }

  return {
    claimId: input.claim.id,
    sourceId: input.claim.sourceId,
    alignment: 'UNRELATED',
    questionAlignmentScore: qScore,
    topicScore: tScore,
    tier: scored.tier,
    reason: 'low_alignment',
  }
}

export function buildClaimAlignmentDistribution(
  records: ClaimAlignmentRecord[],
): Record<ClaimQuestionAlignment, number> {
  const dist: Record<ClaimQuestionAlignment, number> = {
    DIRECT: 0,
    SUPPORTING: 0,
    CONTEXTUAL: 0,
    UNRELATED: 0,
  }
  for (const r of records) dist[r.alignment]++
  return dist
}

export function alignmentEligibleForCrossSource(alignment: ClaimQuestionAlignment): boolean {
  return alignment === 'DIRECT' || alignment === 'SUPPORTING'
}
