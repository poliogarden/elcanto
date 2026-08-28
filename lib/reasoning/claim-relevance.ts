import { normalizeClaimRoles } from '@/lib/reasoning/claim-normalization'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import type { EnhancedSourceRelevance } from '@/lib/reasoning/source-relevance-enhance'
import type { ReasoningClaim, SourceRelevance } from '@/lib/reasoning/types'

export type ClaimRelevanceTier = 'PRIMARY' | 'SUPPORTING' | 'PERIPHERAL' | 'OFF_TOPIC'

export type ClaimRelevanceDecision = 'KEEP' | 'SOFT_KEEP' | 'DROP'

export type ClaimRelevanceDropReason =
  | 'off_topic'
  | 'off_topic_source'
  | 'too_generic'
  | 'question_mismatch'
  | 'low_semantic_similarity'
  | 'low_topic_overlap'
  | 'excluded_source'
  | 'insufficient_context'

export type ClaimRelevanceDiagnostic = {
  claimId: string
  sourceId: string
  claimText: string
  relevanceScore: number
  topicScore: number
  questionAlignmentScore: number
  sourcePriorScore: number
  tier: ClaimRelevanceTier
  decision: ClaimRelevanceDecision
  reason?: ClaimRelevanceDropReason
}

export type RelevanceFunnel = {
  extracted: number
  fromSynthesisSources: number
  topicRelevant: number
  questionAligned: number
  primaryTier: number
  supportingTier: number
  peripheralTier: number
  offTopicTier: number
  finalUsable: number
}

export type RelevanceCollapseWarning = {
  code:
    | 'ABNORMAL_RELEVANCE_COLLAPSE'
    | 'RELEVANCE_COLLAPSE_RECOVERY'
    | 'SOURCE_PARTICIPATION_COLLAPSE'
    | 'EVIDENCE_INTEGRITY_VIOLATION'
  message: string
  extractedClaims?: number
  relevantClaims?: number
  relevantSources?: number
  claimId?: string
  sourceId?: string
}

export type PipelineWarning =
  | RelevanceCollapseWarning
  | import('@/lib/reasoning/candidate-funnel').CandidatePipelineWarning

const QUESTION_STOP = new Set([
  'what',
  'how',
  'why',
  'when',
  'where',
  'which',
  'who',
  'does',
  'do',
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'about',
  'its',
  'has',
  'have',
  'been',
  'are',
  'was',
  'were',
])

const MECHANISM_PATTERNS =
  /\b(reduces|simplifies|enables|provides|standardizes|integrat|integration|apis?|tool|protocol|complexity|adoption|connect|interface|compared|versus|vs\.?|allows|creates|offers|deploy|workflow|developer|effectively as)\b/i

const PRIMARY_PATTERNS =
  /\b(is|are|means|defines|refers to|stands for|known as|purpose of|role of|what mcp|mcp is)\b/i

function tokenize(text: string): string[] {
  return normalizeStatement(text)
    .split(/\W+/)
    .filter((w) => w.length > 2)
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b)
  let shared = 0
  for (const t of a) if (setB.has(t)) shared++
  return shared / Math.max(a.length, b.length)
}

export function extractTopicTokens(centralQuestion: string): string[] {
  const tokens = tokenize(centralQuestion).filter((t) => !QUESTION_STOP.has(t))
  return [...new Set(tokens)]
}

function sourceTierFor(
  sourceId: string,
  sourceRelevance: Array<SourceRelevance | EnhancedSourceRelevance>,
): EnhancedSourceRelevance['tier'] | 'SECONDARY' {
  const rel = sourceRelevance.find((r) => r.sourceId === sourceId)
  if (!rel) return 'SECONDARY'
  if ('tier' in rel && rel.tier) return rel.tier
  if (rel.classification === 'off_topic') return 'OFF_TOPIC'
  if (rel.classification === 'direct') return 'PRIMARY'
  if (rel.classification === 'supporting' || rel.classification === 'contrasting') {
    return 'SECONDARY'
  }
  return 'PERIPHERAL'
}

function priorFromSourceTier(tier: EnhancedSourceRelevance['tier']): number {
  switch (tier) {
    case 'PRIMARY':
      return 0.9
    case 'SECONDARY':
      return 0.75
    case 'PERIPHERAL':
      return 0.45
    case 'OFF_TOPIC':
      return 0
  }
}

export function scoreTopicRelevance(claim: ReasoningClaim, topicTokens: string[]): number {
  if (topicTokens.length === 0) return 0.4
  const claimTokens = tokenize(claim.statement)
  const topicOverlap = overlapScore(claimTokens, topicTokens)
  const stmt = claim.normalizedStatement
  const mentionsCoreTopic = topicTokens.some(
    (t) => t.length >= 3 && stmt.includes(t),
  )
  let score = topicOverlap
  if (mentionsCoreTopic) {
    score = Math.max(score, 0.42)
    if (claim.conceptIds.length > 0) score = Math.max(score, 0.38)
  }
  if (mentionsCoreTopic && MECHANISM_PATTERNS.test(claim.statement)) {
    score = Math.max(score, 0.58)
  }
  return Math.min(1, score)
}

export function scoreQuestionAlignment(claim: ReasoningClaim, centralQuestion: string): number {
  const questionTokens = tokenize(centralQuestion)
  const claimTokens = tokenize(claim.statement)
  return overlapScore(questionTokens, claimTokens)
}

export function classifyClaimRelevanceTier(input: {
  claim: ReasoningClaim
  centralQuestion: string
  topicTokens: string[]
  sourceTier: EnhancedSourceRelevance['tier']
  lockedOffTopic?: boolean
}): {
  tier: ClaimRelevanceTier
  topicScore: number
  questionAlignmentScore: number
  sourcePriorScore: number
  relevanceScore: number
  reason?: ClaimRelevanceDropReason
} {
  const { claim, centralQuestion, topicTokens, sourceTier, lockedOffTopic } = input

  if (lockedOffTopic || sourceTier === 'OFF_TOPIC') {
    return {
      tier: 'OFF_TOPIC',
      topicScore: 0,
      questionAlignmentScore: 0,
      sourcePriorScore: 0,
      relevanceScore: 0,
      reason: 'off_topic_source',
    }
  }

  const topicScore = scoreTopicRelevance(claim, topicTokens)
  const questionAlignmentScore = scoreQuestionAlignment(claim, centralQuestion)
  const prior = priorFromSourceTier(sourceTier)
  const relevanceScore = Math.min(
    1,
    topicScore * 0.5 + questionAlignmentScore * 0.25 + prior * 0.25,
  )

  const mentionsCoreTopic = topicTokens.some(
    (t) => t.length >= 3 && claim.normalizedStatement.includes(t),
  )

  if (!mentionsCoreTopic && topicScore < 0.1 && questionAlignmentScore < 0.15) {
    if (prior >= 0.7 && MECHANISM_PATTERNS.test(claim.statement)) {
      return {
        tier: 'SUPPORTING',
        topicScore: Math.max(topicScore, 0.12),
        questionAlignmentScore,
        sourcePriorScore: prior,
        relevanceScore,
      }
    }
    return {
      tier: 'OFF_TOPIC',
      topicScore,
      questionAlignmentScore,
      sourcePriorScore: prior,
      relevanceScore,
      reason: 'low_topic_overlap',
    }
  }

  if (
    questionAlignmentScore >= 0.38 ||
    (mentionsCoreTopic && PRIMARY_PATTERNS.test(claim.statement))
  ) {
    return {
      tier: 'PRIMARY',
      topicScore,
      questionAlignmentScore,
      sourcePriorScore: prior,
      relevanceScore,
    }
  }

  if (
    topicScore >= 0.22 ||
    (mentionsCoreTopic && MECHANISM_PATTERNS.test(claim.statement)) ||
    (prior >= 0.7 && topicScore >= 0.08)
  ) {
    return {
      tier: 'SUPPORTING',
      topicScore,
      questionAlignmentScore,
      sourcePriorScore: prior,
      relevanceScore,
    }
  }

  if (topicScore >= 0.1 || (prior >= 0.4 && topicScore >= 0.05)) {
    return {
      tier: 'PERIPHERAL',
      topicScore,
      questionAlignmentScore,
      sourcePriorScore: prior,
      relevanceScore,
      reason: 'question_mismatch',
    }
  }

  return {
    tier: 'OFF_TOPIC',
    topicScore,
    questionAlignmentScore,
    sourcePriorScore: prior,
    relevanceScore,
    reason: 'low_semantic_similarity',
  }
}

export function resolveClaimsThroughRelevanceFunnel(input: {
  allClaims: ReasoningClaim[]
  synthesisSourceIds: Set<string>
  centralQuestion: string
  sourceRelevance: Array<SourceRelevance | EnhancedSourceRelevance>
  lockedOffTopicIds?: Set<string>
}): {
  usableClaims: ReasoningClaim[]
  peripheralClaims: ReasoningClaim[]
  funnel: RelevanceFunnel
  diagnostics: ClaimRelevanceDiagnostic[]
  warnings: PipelineWarning[]
} {
  const topicTokens = extractTopicTokens(input.centralQuestion)
  const fromSources = input.allClaims.filter((c) =>
    input.synthesisSourceIds.has(c.sourceId),
  )
  const normalized = normalizeClaimRoles(fromSources)

  const diagnostics: ClaimRelevanceDiagnostic[] = []
  const usableClaims: ReasoningClaim[] = []
  const peripheralClaims: ReasoningClaim[] = []

  let topicRelevant = 0
  let questionAligned = 0
  let primaryTier = 0
  let supportingTier = 0
  let peripheralTier = 0
  let offTopicTier = 0

  for (const claim of normalized) {
    const sourceTier = sourceTierFor(claim.sourceId, input.sourceRelevance)
    const locked = input.lockedOffTopicIds?.has(claim.sourceId) ?? false
    const scored = classifyClaimRelevanceTier({
      claim,
      centralQuestion: input.centralQuestion,
      topicTokens,
      sourceTier,
      lockedOffTopic: locked,
    })

    if (scored.topicScore >= 0.15 || scored.sourcePriorScore >= 0.45) topicRelevant++
    if (scored.questionAlignmentScore >= 0.25) questionAligned++

    let decision: ClaimRelevanceDecision = 'DROP'
    if (scored.tier === 'PRIMARY' || scored.tier === 'SUPPORTING') {
      decision = 'KEEP'
      const enriched: ReasoningClaim = {
        ...claim,
        relevanceScore: scored.relevanceScore,
        rejectionReason: undefined,
      }
      if (scored.tier === 'PRIMARY') {
        primaryTier++
        usableClaims.push(enriched)
      } else {
        supportingTier++
        usableClaims.push(enriched)
      }
    } else if (scored.tier === 'PERIPHERAL') {
      decision = 'SOFT_KEEP'
      peripheralTier++
      peripheralClaims.push({ ...claim, relevanceScore: scored.relevanceScore })
    } else {
      offTopicTier++
    }

    diagnostics.push({
      claimId: claim.id,
      sourceId: claim.sourceId,
      claimText: claim.statement.slice(0, 200),
      relevanceScore: scored.relevanceScore,
      topicScore: scored.topicScore,
      questionAlignmentScore: scored.questionAlignmentScore,
      sourcePriorScore: scored.sourcePriorScore,
      tier: scored.tier,
      decision,
      reason: decision === 'DROP' ? scored.reason : undefined,
    })
  }

  const funnel: RelevanceFunnel = {
    extracted: input.allClaims.length,
    fromSynthesisSources: fromSources.length,
    topicRelevant,
    questionAligned,
    primaryTier,
    supportingTier,
    peripheralTier,
    offTopicTier,
    finalUsable: usableClaims.length,
  }

  const warnings: PipelineWarning[] = []
  const relevantSourceCount = input.synthesisSourceIds.size
  const collapseRatio =
    funnel.extracted > 0 ? funnel.finalUsable / funnel.extracted : 0
  if (
    (funnel.extracted >= 20 &&
      collapseRatio < 0.05 &&
      relevantSourceCount >= 2) ||
    (funnel.fromSynthesisSources >= 15 &&
      funnel.finalUsable === 0 &&
      relevantSourceCount >= 2)
  ) {
    warnings.push({
      code: 'ABNORMAL_RELEVANCE_COLLAPSE',
      message: `Relevance collapse: ${funnel.extracted} extracted → ${funnel.finalUsable} usable (${relevantSourceCount} synthesis sources).`,
      extractedClaims: funnel.extracted,
      relevantClaims: funnel.finalUsable,
      relevantSources: relevantSourceCount,
    })
  }

  return { usableClaims, peripheralClaims, funnel, diagnostics, warnings }
}
