import { filterReasoningClaims } from '@/lib/reasoning/claim-normalization'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import type { ReasoningClaim, SourceRelevance } from '@/lib/reasoning/types'

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

const SOURCE_CLASS_WEIGHT: Record<string, number> = {
  direct: 1,
  supporting: 0.85,
  contrasting: 0.85,
  contextual: 0.7,
  weak: 0.5,
  off_topic: 0.15,
}

export function scoreClaimRelevance(
  claim: ReasoningClaim,
  centralQuestion: string,
  sourceRelevance?: SourceRelevance[],
): number {
  const questionTokens = tokenize(centralQuestion)
  const claimTokens = tokenize(claim.statement)
  const lexical = overlapScore(questionTokens, claimTokens)

  const sourceRel = sourceRelevance?.find((r) => r.sourceId === claim.sourceId)
  if (sourceRel?.classification === 'off_topic') return 0

  const sourceWeight = sourceRel
    ? (SOURCE_CLASS_WEIGHT[sourceRel.classification] ?? 0.5)
    : 0.75

  if (
    sourceRel?.sourceId === claim.sourceId &&
    sourceRel.relevantClaimIds?.includes(claim.id)
  ) {
    return Math.min(1, 0.85 + lexical * 0.15)
  }

  const combined = lexical * 0.65 + sourceWeight * 0.35
  return Math.min(1, Math.max(0, combined))
}

export function applyClaimRelevance(
  claims: ReasoningClaim[],
  centralQuestion: string,
  sourceRelevance: SourceRelevance[],
): ReasoningClaim[] {
  return claims.map((claim) => ({
    ...claim,
    relevanceScore: scoreClaimRelevance(claim, centralQuestion, sourceRelevance),
  }))
}

export function filterByClaimRelevance(
  claims: ReasoningClaim[],
  minScore = 0.35,
): ReasoningClaim[] {
  return claims.filter((c) => (c.relevanceScore ?? 0) >= minScore)
}

export function resolveUsableClaims(input: {
  allClaims: ReasoningClaim[]
  synthesisSourceIds: Set<string>
  centralQuestion: string
  sourceRelevance: SourceRelevance[]
  minRelevance?: number
}): ReasoningClaim[] {
  const fromSources = input.allClaims.filter((c) =>
    input.synthesisSourceIds.has(c.sourceId),
  )
  const scored = applyClaimRelevance(
    fromSources,
    input.centralQuestion,
    input.sourceRelevance,
  )
  const reasoning = filterReasoningClaims(scored, input.centralQuestion)
  return filterByClaimRelevance(reasoning, input.minRelevance ?? 0.35)
}
