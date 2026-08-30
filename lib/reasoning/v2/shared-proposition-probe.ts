import {
  isHazardHealthComplementaryPair,
  isNullEffectOpposition,
  isNumericRangeEquivalent,
  isOpposingDirectionPair,
  isPhenomenonOutcomeComplementaryPair,
  hasSemanticPredicateCompatibility,
} from '@/lib/reasoning/proposition-semantics'
import { assessMinimumSharedProposition } from '@/lib/reasoning/proposition-alignment'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type SharedPropositionClass =
  | 'EXACT'
  | 'COMPATIBLE'
  | 'OPPOSING'
  | 'COMPLEMENTARY'
  | 'TOPIC_ONLY'
  | 'DIFFERENT_DIMENSION'
  | 'UNRELATED'

export type SharedPropositionProbeResult = {
  class: SharedPropositionClass
  candidateAllowed: boolean
  sharedProposition?: string
  detail?: string
}

function semanticBypass(from: ReasoningClaim, to: ReasoningClaim): SharedPropositionClass | null {
  if (hasSemanticPredicateCompatibility(from.statement, to.statement)) return 'COMPATIBLE'
  if (isNumericRangeEquivalent(from.statement, to.statement)) return 'EXACT'
  if (isNullEffectOpposition(from.statement, to.statement) || isOpposingDirectionPair(from.statement, to.statement)) {
    return 'OPPOSING'
  }
  if (
    isHazardHealthComplementaryPair(from.statement, to.statement) ||
    isPhenomenonOutcomeComplementaryPair(from.statement, to.statement)
  ) {
    return 'COMPLEMENTARY'
  }
  return null
}

export function probeSharedProposition(
  from: ReasoningClaim,
  to: ReasoningClaim,
): SharedPropositionProbeResult {
  const bypass = semanticBypass(from, to)
  if (bypass) {
    return {
      class: bypass,
      candidateAllowed: true,
      detail: 'semantic_bypass',
    }
  }

  const msp = assessMinimumSharedProposition(from, to)
  if (msp.passed) {
    const cls: SharedPropositionClass =
      msp.abstractionLevel === 'SPECIFIC' ? 'EXACT' : 'COMPATIBLE'
    return {
      class: cls,
      candidateAllowed: true,
      sharedProposition: msp.sharedProposition,
      detail: 'minimum_shared_proposition',
    }
  }

  if (msp.rejectionReason === 'DIFFERENT_DIMENSION') {
    return {
      class: 'DIFFERENT_DIMENSION',
      candidateAllowed: false,
      detail: msp.rejectionDetail,
    }
  }

  if (
    msp.rejectionReason === 'ALIGNMENT_FAILED' &&
    (isOpposingDirectionPair(from.statement, to.statement) ||
      isNullEffectOpposition(from.statement, to.statement))
  ) {
    return {
      class: 'OPPOSING',
      candidateAllowed: true,
      detail: 'opposition_detected',
    }
  }

  if (msp.dimensionsCompatible && msp.abstractionLevel === 'GENERIC_TOPIC') {
    return {
      class: 'TOPIC_ONLY',
      candidateAllowed: false,
      detail: msp.rejectionDetail ?? 'generic_topic_overlap',
    }
  }

  return {
    class: 'UNRELATED',
    candidateAllowed: false,
    detail: msp.rejectionDetail ?? msp.rejectionReason ?? 'no_shared_proposition',
  }
}

export function isCandidateProbeAllowed(classification: SharedPropositionClass): boolean {
  return (
    classification === 'EXACT' ||
    classification === 'COMPATIBLE' ||
    classification === 'OPPOSING' ||
    classification === 'COMPLEMENTARY'
  )
}
