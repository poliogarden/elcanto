import { extractSharedDimension } from '@/lib/reasoning/candidate-discovery'
import {
  assessDimensionCompatibility,
  classifyPropositionDimension,
} from '@/lib/reasoning/proposition-alignment'
import {
  claimEffectPolarity as semanticClaimEffectPolarity,
  hasPlausibleComparabilitySignal,
  hasPropositionTargetOverlap,
  isCoalRetirementOpposition,
  isHazardHealthComplementaryPair,
  isNullEffectOpposition,
  isNumericRangeEquivalent,
  isOpposingDirectionPair,
  isPhenomenonOutcomeComplementaryPair,
} from '@/lib/reasoning/proposition-semantics'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import type { ReasoningClaim, ReasoningRelationshipType } from '@/lib/reasoning/types'

const POSITIVE_MARKERS = /\b(reduces|simplifies|easier|improves|enables|benefit|advantage|friendly|faster|quick)\b/i
const NEGATIVE_MARKERS =
  /\b(increases|adds|harder|worse|complexity|difficult|concern|risk|resist|barrier|slow)\b/i

const SUBJECT_MARKERS =
  /\b(mcp|api|protocol|tool|model|application|integration|server|desktop|industry)\b/i

const PREDICATE_MARKERS =
  /\b(reduces|simplifies|enables|deploy|offers|leads|accelerat|integrat|standard|install|require|connect|complex|adopt|friendly|quick|fast)\b/i

const ABSTRACTION_HIGH = /\b(ecosystem|landscape|industry|society|future|world|overall|in general|hot topic)\b/i
const ABSTRACTION_LOW =
  /\b(this tool|this api|desktop|install|prerequisite|specifically|click|subscribe)\b/i

function tokenSet(text: string, minLen = 3): Set<string> {
  return new Set(
    normalizeStatement(text)
      .split(/\W+/)
      .filter((w) => w.length >= minLen),
  )
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / Math.min(a.size, b.size)
}

function markerOverlap(statementA: string, statementB: string, pattern: RegExp): number {
  const a = [...statementA.matchAll(new RegExp(pattern.source, 'gi'))].map((m) =>
    m[0].toLowerCase(),
  )
  const b = [...statementB.matchAll(new RegExp(pattern.source, 'gi'))].map((m) =>
    m[0].toLowerCase(),
  )
  if (a.length === 0 && b.length === 0) return 0.5
  if (a.length === 0 || b.length === 0) return 0.15
  const setB = new Set(b)
  let shared = 0
  for (const t of a) if (setB.has(t)) shared++
  return shared / Math.max(a.length, b.length, 1)
}

function abstractionLevel(statement: string): 'high' | 'mid' | 'low' {
  if (ABSTRACTION_HIGH.test(statement)) return 'high'
  if (ABSTRACTION_LOW.test(statement)) return 'low'
  return 'mid'
}

export function productivityDirection(statement: string): 'up' | 'down' | null {
  if (!/\b(productivity|output|performance)\b/i.test(statement)) return null
  if (/\b(increases?|raises?|boosts?|improves?|enhances?)\b/i.test(statement)) return 'up'
  if (/\b(decreases?|lowers?|diminishes?)\b/i.test(statement)) return 'down'
  return null
}

export function isOpposingProductivityPair(from: ReasoningClaim, to: ReasoningClaim): boolean {
  const a = productivityDirection(from.statement)
  const b = productivityDirection(to.statement)
  return a !== null && b !== null && a !== b
}

function claimPolarity(statement: string): 'pos' | 'neg' | 'neu' | 'null_effect' {
  const effect = semanticClaimEffectPolarity(statement)
  if (effect === 'null_effect') return 'null_effect'
  if (effect === 'positive') return 'pos'
  if (effect === 'negative') return 'neg'
  return 'neu'
}

function polarityAlignment(
  fromPol: ReturnType<typeof claimPolarity>,
  toPol: ReturnType<typeof claimPolarity>,
  fromStatement: string,
  toStatement: string,
): PolarityAlignment {
  if (isNullEffectOpposition(fromStatement, toStatement)) return 'OPPOSE'
  if (isOpposingDirectionPair(fromStatement, toStatement)) return 'OPPOSE'

  if (fromPol === 'pos' && toPol === 'pos' || fromPol === 'neg' && toPol === 'neg') {
    return 'MATCH'
  }
  if (
    (fromPol === 'pos' && toPol === 'neg') ||
    (fromPol === 'neg' && toPol === 'pos') ||
    (fromPol === 'null_effect' && (toPol === 'pos' || toPol === 'neg')) ||
    (toPol === 'null_effect' && (fromPol === 'pos' || fromPol === 'neg'))
  ) {
    return 'OPPOSE'
  }
  if (fromPol === 'neu' && toPol === 'neu') return 'UNKNOWN'
  return 'NEUTRAL'
}

export type PolarityAlignment = 'MATCH' | 'OPPOSE' | 'NEUTRAL' | 'UNKNOWN'

export type VerificationAlignmentScores = {
  semanticSimilarity: number
  topicAlignment: number
  subjectEntityAlignment: number
  predicateAlignment: number
  polarity: PolarityAlignment
  scopeCompatibility: number
  evidenceCompatibility: number
  finalAlignment: number
  requiredThreshold: number
  failedConditions: string[]
  passed: boolean
  reason: string
}

export type VerificationAlignmentStage = 'pre_llm' | 'post_llm'

export const AGREEMENT_RELATIONSHIP_TYPES: ReadonlySet<ReasoningRelationshipType> = new Set([
  'AGREEMENT',
  'PARTIAL_AGREEMENT',
  'SAME_TOPIC_DIFFERENT_PERSPECTIVE',
])

const COMPLEMENTARY_TYPES: ReadonlySet<ReasoningRelationshipType> = new Set([
  'COMPLEMENTARY',
  'MECHANISM_OUTCOME',
  'PROBLEM_SOLUTION',
  'CAUSE_EFFECT',
  'DEPENDENCY',
  'ENABLER',
  'PREREQUISITE',
  'EXAMPLE_OF',
  'GENERALIZATION',
  'SPECIALIZATION',
  'TEMPORAL_PROGRESSION',
])

const CONTRADICTION_TYPES: ReadonlySet<ReasoningRelationshipType> = new Set([
  'CONTRADICTION',
  'TENSION',
  'TRADE_OFF',
  'CONSTRAINT',
])

export function assessVerificationAlignment(
  from: ReasoningClaim,
  to: ReasoningClaim,
  relationshipType: ReasoningRelationshipType,
): VerificationAlignmentScores {
  const fromTokens = tokenSet(from.statement)
  const toTokens = tokenSet(to.statement)
  const semanticSimilarity = overlapRatio(fromTokens, toTokens)

  const sharedConcepts = from.conceptIds.filter((id) => to.conceptIds.includes(id))
  const sharedDimension = extractSharedDimension(from.statement, to.statement)
  const subjectOverlap = markerOverlap(from.statement, to.statement, SUBJECT_MARKERS)
  const propositionOverlap = hasPropositionTargetOverlap(from.statement, to.statement) ? 0.55 : 0
  const numericEquivalence = isNumericRangeEquivalent(from.statement, to.statement) ? 0.6 : 0
  const coalOpposition = isCoalRetirementOpposition(from.statement, to.statement) ? 0.5 : 0
  const phenomenonComplementary = isPhenomenonOutcomeComplementaryPair(from.statement, to.statement)
    ? 0.55
    : 0
  const hazardComplementary = isHazardHealthComplementaryPair(from.statement, to.statement) ? 0.55 : 0
  const topicAlignment = Math.min(
    1,
    Math.max(
      semanticSimilarity,
      sharedConcepts.length > 0 ? 0.55 : 0,
      sharedDimension ? 0.5 : 0,
      subjectOverlap,
      propositionOverlap,
      numericEquivalence,
      coalOpposition,
      phenomenonComplementary,
      hazardComplementary,
    ),
  )

  const subjectEntityAlignment = Math.min(
    1,
    Math.max(
      sharedConcepts.length > 0 ? 0.7 : 0,
      subjectOverlap,
      semanticSimilarity * 0.6,
      propositionOverlap,
      numericEquivalence,
      coalOpposition,
      phenomenonComplementary ? 0.48 : 0,
      hazardComplementary ? 0.48 : 0,
    ),
  )

  const fromPol = claimPolarity(from.statement)
  const toPol = claimPolarity(to.statement)
  const polarity = polarityAlignment(fromPol, toPol, from.statement, to.statement)

  let predicateAlignment = Math.max(
    markerOverlap(from.statement, to.statement, PREDICATE_MARKERS),
    fromPol === 'pos' && toPol === 'pos' ? 0.45 : 0,
    numericEquivalence > 0 ? 0.5 : 0,
    isNullEffectOpposition(from.statement, to.statement) ? 0.55 : 0,
    isOpposingDirectionPair(from.statement, to.statement) ? 0.5 : 0,
    isCoalRetirementOpposition(from.statement, to.statement) ? 0.55 : 0,
  )

  const fromAbs = abstractionLevel(from.statement)
  const toAbs = abstractionLevel(to.statement)
  let scopeCompatibility = 0.55
  if (fromAbs === toAbs) scopeCompatibility = 0.9
  else if (fromAbs === 'mid' || toAbs === 'mid') scopeCompatibility = 0.65
  else scopeCompatibility = semanticSimilarity >= 0.2 ? 0.55 : 0.25

  const evidenceCompatibility =
    from.evidenceIds.length > 0 && to.evidenceIds.length > 0 ? 0.75 : 0.45

  let finalAlignment = Math.min(
    1,
    semanticSimilarity * 0.22 +
      topicAlignment * 0.28 +
      subjectEntityAlignment * 0.22 +
      predicateAlignment * 0.14 +
      scopeCompatibility * 0.12 +
      evidenceCompatibility * 0.04,
  )

  if (
    polarity === 'OPPOSE' &&
    (isNullEffectOpposition(from.statement, to.statement) ||
      isCoalRetirementOpposition(from.statement, to.statement) ||
      isOpposingDirectionPair(from.statement, to.statement))
  ) {
    finalAlignment = Math.max(finalAlignment, 0.62)
  }

  if (
    COMPLEMENTARY_TYPES.has(relationshipType) &&
    (isHazardHealthComplementaryPair(from.statement, to.statement) ||
      isPhenomenonOutcomeComplementaryPair(from.statement, to.statement))
  ) {
    finalAlignment = Math.max(finalAlignment, 0.58)
  }

  const evaluation = evaluateVerificationAlignment(relationshipType, {
    semanticSimilarity,
    topicAlignment,
    subjectEntityAlignment,
    predicateAlignment,
    polarity,
    scopeCompatibility,
    evidenceCompatibility,
    finalAlignment,
    requiredThreshold: 0,
    failedConditions: [],
    passed: false,
    reason: '',
  }, 'pre_llm')

  return {
    semanticSimilarity,
    topicAlignment,
    subjectEntityAlignment,
    predicateAlignment,
    polarity,
    scopeCompatibility,
    evidenceCompatibility,
    finalAlignment,
    requiredThreshold: evaluation.requiredThreshold,
    failedConditions: evaluation.failedConditions,
    passed: evaluation.passed,
    reason: evaluation.reason,
  }
}

export function evaluateVerificationAlignment(
  relationshipType: ReasoningRelationshipType,
  scores: Pick<
    VerificationAlignmentScores,
    | 'semanticSimilarity'
    | 'topicAlignment'
    | 'subjectEntityAlignment'
    | 'predicateAlignment'
    | 'polarity'
    | 'scopeCompatibility'
    | 'evidenceCompatibility'
    | 'finalAlignment'
  >,
  stage: VerificationAlignmentStage,
): {
  passed: boolean
  requiredThreshold: number
  failedConditions: string[]
  reason: string
} {
  const failed: string[] = []

  if (relationshipType === 'INDEPENDENT') {
    return {
      passed: false,
      requiredThreshold: 1,
      failedConditions: ['independent_type'],
      reason: 'INDEPENDENT proposals are always rejected.',
    }
  }

  const minTopic = stage === 'pre_llm' ? 0.18 : 0.28
  const minSubject = stage === 'pre_llm' ? 0.22 : 0.32
  const minSemantic = stage === 'pre_llm' ? 0.08 : 0.18

  if (scores.topicAlignment < minTopic) failed.push('topic_alignment')
  if (scores.subjectEntityAlignment < minSubject) failed.push('subject_entity_alignment')
  if (scores.semanticSimilarity < minSemantic) failed.push('semantic_similarity')

  let requiredThreshold = stage === 'pre_llm' ? 0.42 : 0.58

  if (AGREEMENT_RELATIONSHIP_TYPES.has(relationshipType)) {
    requiredThreshold = stage === 'pre_llm' ? 0.48 : 0.62
    const minPredicate = stage === 'pre_llm' ? 0.32 : 0.45
    if (scores.predicateAlignment < minPredicate) failed.push('predicate_alignment')
    if (scores.polarity === 'OPPOSE') failed.push('polarity_mismatch')
  } else if (COMPLEMENTARY_TYPES.has(relationshipType)) {
    requiredThreshold = stage === 'pre_llm' ? 0.38 : 0.52
    const minScope = stage === 'pre_llm' ? 0.35 : 0.45
    if (scores.scopeCompatibility < minScope) failed.push('scope_compatibility')
    // Complementary pairs may use different predicates — do not require high predicate overlap.
  } else if (CONTRADICTION_TYPES.has(relationshipType)) {
    requiredThreshold = stage === 'pre_llm' ? 0.4 : 0.55
    if (scores.polarity !== 'OPPOSE') failed.push('polarity_not_opposed')
  } else {
    requiredThreshold = stage === 'pre_llm' ? 0.4 : 0.55
  }

  if (scores.finalAlignment < requiredThreshold) failed.push('final_alignment')

  const passed = failed.length === 0
  let reason = 'Alignment sufficient for verification.'
  if (failed.includes('topic_alignment')) reason = 'Insufficient shared topic or subject.'
  else if (failed.includes('predicate_alignment'))
    reason = 'Predicates/actions do not align for agreement-type relationship.'
  else if (failed.includes('polarity_not_opposed'))
    reason = 'Contradiction-type relationship lacks opposing polarity.'
  else if (failed.includes('polarity_mismatch'))
    reason = 'Agreement-type relationship has opposing polarity.'
  else if (failed.includes('scope_compatibility'))
    reason = 'Scope or abstraction levels are incompatible.'
  else if (failed.includes('semantic_similarity'))
    reason = 'Insufficient semantic overlap for meaningful comparison.'
  else if (failed.includes('final_alignment'))
    reason = 'Composite alignment score below required threshold.'

  return { passed, requiredThreshold, failedConditions: failed, reason }
}

export type PreLlmComparabilityVerdict = 'CLEAR_INVALID' | 'PLAUSIBLY_COMPARABLE'

export type PreLlmComparabilityResult = {
  verdict: PreLlmComparabilityVerdict
  reason: string
  scores: VerificationAlignmentScores
  rejectingGate?: string
  rejectingFunction?: string
}

function isGenericTopicOverlapOnly(scores: VerificationAlignmentScores): boolean {
  return (
    scores.semanticSimilarity < 0.12 &&
    scores.topicAlignment < 0.18 &&
    scores.subjectEntityAlignment < 0.2
  )
}

function isObviousDifferentDimension(from: ReasoningClaim, to: ReasoningClaim): boolean {
  const dimA = classifyPropositionDimension(from.statement)
  const dimB = classifyPropositionDimension(to.statement)
  if (dimA === 'GENERAL' && dimB === 'GENERAL') return false
  const compat = assessDimensionCompatibility(dimA, dimB, from.statement, to.statement)
  if (compat !== 'DIFFERENT') return false
  return dimA !== 'GENERAL' && dimB !== 'GENERAL'
}

export function assessPreLlmComparability(
  from: ReasoningClaim,
  to: ReasoningClaim,
  relationshipType: ReasoningRelationshipType,
): PreLlmComparabilityResult {
  const scores = assessVerificationAlignment(from, to, relationshipType)

  if (from.sourceId === to.sourceId) {
    return {
      verdict: 'CLEAR_INVALID',
      reason: 'Same source — cross-source verification only.',
      scores,
      rejectingGate: 'SAME_SOURCE',
      rejectingFunction: 'assessPreLlmComparability',
    }
  }

  if (isGenericTopicOverlapOnly(scores)) {
    const dimA = classifyPropositionDimension(from.statement)
    const dimB = classifyPropositionDimension(to.statement)
    const dimensionCompat =
      assessDimensionCompatibility(dimA, dimB, from.statement, to.statement) !== 'DIFFERENT'
    if (dimensionCompat && hasPlausibleComparabilitySignal(from.statement, to.statement)) {
      return {
        verdict: 'PLAUSIBLY_COMPARABLE',
        reason: 'Comparable proposition target despite low lexical overlap — defer to full verifier.',
        scores,
      }
    }
    return {
      verdict: 'CLEAR_INVALID',
      reason: 'Generic topic overlap without comparable proposition target.',
      scores,
      rejectingGate: 'GENERIC_TOPIC_ONLY',
      rejectingFunction: 'assessPreLlmComparability',
    }
  }

  if (isObviousDifferentDimension(from, to)) {
    const complementaryMechanismOutcome =
      COMPLEMENTARY_TYPES.has(relationshipType) &&
      (isPhenomenonOutcomeComplementaryPair(from.statement, to.statement) ||
        isHazardHealthComplementaryPair(from.statement, to.statement))
    if (!complementaryMechanismOutcome) {
      return {
        verdict: 'CLEAR_INVALID',
        reason: `Obvious different dimension: ${classifyPropositionDimension(from.statement)} vs ${classifyPropositionDimension(to.statement)}`,
        scores,
        rejectingGate: 'DIFFERENT_DIMENSION',
        rejectingFunction: 'assessDimensionCompatibility',
      }
    }
  }

  if (scores.topicAlignment < 0.1 && scores.subjectEntityAlignment < 0.12) {
    return {
      verdict: 'CLEAR_INVALID',
      reason: 'Subject mismatch — no shared proposition target.',
      scores,
      rejectingGate: 'SUBJECT_MISMATCH',
      rejectingFunction: 'assessPreLlmComparability',
    }
  }

  return {
    verdict: 'PLAUSIBLY_COMPARABLE',
    reason: 'Pair is plausibly comparable — defer to full verifier.',
    scores,
  }
}

/** Type-aware pre-LLM gate — rejects only clearly invalid pairs; plausible pairs reach full verifier. */
export function passesVerificationPreGate(
  from: ReasoningClaim,
  to: ReasoningClaim,
  relationshipType: ReasoningRelationshipType,
): VerificationAlignmentScores {
  const comparability = assessPreLlmComparability(from, to, relationshipType)
  return {
    ...comparability.scores,
    passed: comparability.verdict === 'PLAUSIBLY_COMPARABLE',
    reason: comparability.reason,
    failedConditions:
      comparability.verdict === 'CLEAR_INVALID' ? [comparability.rejectingGate ?? 'clear_invalid'] : [],
  }
}

export function passesVerificationPostGate(
  from: ReasoningClaim,
  to: ReasoningClaim,
  relationshipType: ReasoningRelationshipType,
): VerificationAlignmentScores {
  const scores = assessVerificationAlignment(from, to, relationshipType)
  const post = evaluateVerificationAlignment(relationshipType, scores, 'post_llm')
  return {
    ...scores,
    requiredThreshold: post.requiredThreshold,
    failedConditions: post.failedConditions,
    passed: post.passed,
    reason: post.reason,
  }
}
