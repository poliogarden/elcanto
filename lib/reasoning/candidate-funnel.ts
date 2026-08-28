import { selectClaimsForGenerationWithSourceFloor } from '@/lib/reasoning/claim-transition'
import type { ReasoningClaim, RelationshipCandidate } from '@/lib/reasoning/types'

export type CandidateFunnel = {
  claimsAfterRelevance: number
  claimsAfterNormalization: number
  claimsForCandidateGeneration: number
  participatingSourceCount: number
  claimsPerSource: Record<string, number>
  possibleCrossSourcePairs: number
  pairsAfterSourceFilter: number
  heuristicDirect: number
  heuristicSemantic: number
  heuristicInference: number
  heuristicBridge: number
  heuristicTotal: number
  llmCandidatesAdded: number
  sameSourceCandidatesDropped: number
  candidatePairs: number
}

export type CandidateRejectionReason =
  | 'SAME_SOURCE_PAIR'
  | 'NO_CROSS_SOURCE_MATCH'
  | 'SOURCE_REMOVED_BY_RELEVANCE'
  | 'CLAIM_REMOVED_BY_RELEVANCE'
  | 'TOPIC_GATE_REJECTED'
  | 'TYPE_GATE_REJECTED'
  | 'SEMANTIC_SCORE_TOO_LOW'
  | 'DUPLICATE_COLLAPSE'
  | 'LANGUAGE_NORMALIZATION_FAILURE'

export type CandidateGenerationDiagnostic = {
  fromClaimId: string
  toClaimId: string
  fromSourceId: string
  toSourceId: string
  reason: CandidateRejectionReason
  stage: 'SOURCE_FILTER' | 'TOPIC_GATE' | 'TYPE_GATE' | 'SEMANTIC_PREFILTER' | 'DEDUP'
  similarity?: number
  topicScore?: number
}

export type CandidatePipelineWarning =
  | {
      code: 'CROSS_SOURCE_CANDIDATE_COLLAPSE'
      message: string
      participatingSourceCount: number
      possibleCrossSourcePairs: number
      candidatePairs: number
    }
  | {
      code: 'CANDIDATE_VERIFICATION_COLLAPSE'
      message: string
      candidateCount: number
      verifiedCount: number
    }

/** Count unordered cross-source claim pairs. */
export function countPossibleCrossSourcePairs(claims: ReasoningClaim[]): number {
  let n = 0
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      if (claims[i].sourceId !== claims[j].sourceId) n++
    }
  }
  return n
}

export function claimsPerSourceMap(claims: ReasoningClaim[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const c of claims) {
    map[c.sourceId] = (map[c.sourceId] ?? 0) + 1
  }
  return map
}

export function participatingSourceCount(claims: ReasoningClaim[]): number {
  return new Set(claims.map((c) => c.sourceId)).size
}

/**
 * Preserve source diversity for candidate generation.
 * Stage A: minimum viable claims per source (by relevance).
 * Stage B: fill remaining budget by global relevance.
 */
export function selectClaimsForCandidateGeneration(
  claims: ReasoningClaim[],
  options?: { maxTotal?: number; minPerSource?: number },
): ReasoningClaim[] {
  const maxTotal = options?.maxTotal ?? 24
  const minPerSource = options?.minPerSource ?? 1

  if (claims.length <= maxTotal) return claims

  const bySource = new Map<string, ReasoningClaim[]>()
  for (const c of claims) {
    const list = bySource.get(c.sourceId) ?? []
    list.push(c)
    bySource.set(c.sourceId, list)
  }

  for (const list of bySource.values()) {
    list.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
  }

  const selected: ReasoningClaim[] = []
  const selectedIds = new Set<string>()

  for (const list of bySource.values()) {
    for (const c of list.slice(0, minPerSource)) {
      if (!selectedIds.has(c.id)) {
        selected.push(c)
        selectedIds.add(c.id)
      }
    }
  }

  const remainder = [...claims]
    .filter((c) => !selectedIds.has(c.id))
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))

  for (const c of remainder) {
    if (selected.length >= maxTotal) break
    selected.push(c)
    selectedIds.add(c.id)
  }

  return selected
}

type HeuristicBundle = {
  direct: RelationshipCandidate[]
  semantic: RelationshipCandidate[]
  inference: RelationshipCandidate[]
  bridge: RelationshipCandidate[]
  all: RelationshipCandidate[]
}

export function buildCandidateFunnelSnapshot(input: {
  claimsAfterRelevance: number
  claimsForGeneration: ReasoningClaim[]
  heuristic: HeuristicBundle
  finalCandidates: RelationshipCandidate[]
  sameSourceDropped: number
  llmCandidatesAdded: number
}): CandidateFunnel {
  const claimsPerSource = claimsPerSourceMap(input.claimsForGeneration)
  const participating = participatingSourceCount(input.claimsForGeneration)
  const possiblePairs = countPossibleCrossSourcePairs(input.claimsForGeneration)

  return {
    claimsAfterRelevance: input.claimsAfterRelevance,
    claimsAfterNormalization: input.claimsForGeneration.length,
    claimsForCandidateGeneration: input.claimsForGeneration.length,
    participatingSourceCount: participating,
    claimsPerSource,
    possibleCrossSourcePairs: possiblePairs,
    pairsAfterSourceFilter: possiblePairs,
    heuristicDirect: input.heuristic.direct.length,
    heuristicSemantic: input.heuristic.semantic.length,
    heuristicInference: input.heuristic.inference.length,
    heuristicBridge: input.heuristic.bridge.length,
    heuristicTotal: input.heuristic.all.length,
    llmCandidatesAdded: input.llmCandidatesAdded,
    sameSourceCandidatesDropped: input.sameSourceDropped,
    candidatePairs: input.finalCandidates.length,
  }
}

/**
 * When accepted claims lack source diversity, add best peripheral claims per missing source.
 * Does not revive off-topic claims — supplemental must already be relevance-scored.
 */
export function enrichClaimsForCrossSourceCandidates(input: {
  acceptedClaims: ReasoningClaim[]
  supplementalClaims?: ReasoningClaim[]
  synthesisSourceIds?: Set<string>
  minPerSource?: number
  maxTotal?: number
}): {
  claims: ReasoningClaim[]
  augmentedFromSupplemental: number
} {
  const minPerSource = input.minPerSource ?? 2
  const maxTotal = input.maxTotal ?? 24
  const supplemental = input.supplementalClaims ?? []

  const targetSources =
    input.synthesisSourceIds ??
    new Set([...input.acceptedClaims, ...supplemental].map((c) => c.sourceId))

  let selected = selectClaimsForGenerationWithSourceFloor({
    acceptedClaims: input.acceptedClaims,
    synthesisSourceIds: targetSources,
    maxTotal,
    minPerSourceFloor: 1,
  })

  const sourcesPresent = new Set(selected.map((c) => c.sourceId))
  let augmented = 0
  if (targetSources.size >= 2 && supplemental.length > 0) {
    const selectedIds = new Set(selected.map((c) => c.id))
    for (const sourceId of targetSources) {
      if (sourcesPresent.has(sourceId)) continue
      const best = [...supplemental]
        .filter((c) => c.sourceId === sourceId && !selectedIds.has(c.id))
        .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))[0]
      if (best) {
        selected.push(best)
        selectedIds.add(best.id)
        sourcesPresent.add(sourceId)
        augmented++
      }
    }
  }

  if (selected.length > maxTotal) {
    selected = selectClaimsForGenerationWithSourceFloor({
      acceptedClaims: selected,
      synthesisSourceIds: targetSources,
      maxTotal,
      minPerSourceFloor: 1,
    })
  }

  return { claims: selected, augmentedFromSupplemental: augmented }
}

export function evaluateCandidateCollapseWarning(
  funnel: Pick<
    CandidateFunnel,
  'participatingSourceCount' | 'possibleCrossSourcePairs' | 'candidatePairs'
  >,
): CandidatePipelineWarning | null {
  if (
    funnel.participatingSourceCount >= 2 &&
    funnel.possibleCrossSourcePairs > 0 &&
    funnel.candidatePairs === 0
  ) {
    return {
      code: 'CROSS_SOURCE_CANDIDATE_COLLAPSE',
      message: `Cross-source candidate collapse: ${funnel.participatingSourceCount} sources, ${funnel.possibleCrossSourcePairs} possible pairs → 0 candidates.`,
      participatingSourceCount: funnel.participatingSourceCount,
      possibleCrossSourcePairs: funnel.possibleCrossSourcePairs,
      candidatePairs: funnel.candidatePairs,
    }
  }
  return null
}
